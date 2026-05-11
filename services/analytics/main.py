import io
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

import anthropic as _anthropic

from scoring import METRIC_WEIGHTS, compute_scores, ewma_scores, normalize_weights

load_dotenv()

DATABASE_URL           = os.getenv("DATABASE_URL")
ANTHROPIC_API_KEY      = os.getenv("ANTHROPIC_API_KEY")
XHS_PROMPTS_PATH       = os.getenv("XHS_PROMPTS_PATH", "../xhs/config/prompts.json")
XHS_PROMPT_ARCHIVE_DIR = os.getenv("XHS_PROMPT_ARCHIVE_DIR", "../xhs/config/prompt_archive")

UNDERSAMPLE_THRESHOLD = 15
UNDERSAMPLE_BOOST     = 1.3

PROMPT_KEY_MAP = {
    "race_guide":           "raceGuide",
    "training":             "training",
    "nutrition_supplement": "nutritionSupplement",
    "wearables":            "wearables",
}

_executor = ThreadPoolExecutor()
app = FastAPI()


def _get_db():
    return psycopg2.connect(DATABASE_URL)


def _safe_int(val):
    try:
        return int(val) if pd.notna(val) else None
    except (ValueError, TypeError):
        return None


def _safe_float(val):
    try:
        return float(val) if pd.notna(val) else None
    except (ValueError, TypeError):
        return None


@app.post("/analyze/xhs")
async def analyze_xhs(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx or .xls")

    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents), header=1)
    df = df.rename(columns={
        "笔记标题":   "title",
        "首次发布时间": "published_at",
        "曝光":      "impressions",
        "观看量":     "views",
        "封面点击率":  "ctr",
        "点赞":      "likes",
        "评论":      "comments_count",
        "收藏":      "saves",
        "涨粉":      "followers_gained",
        "分享":      "shares",
        "人均观看时长": "avg_watch_time",
    })

    # DB backfill + fetch
    conn = _get_db()
    cur  = conn.cursor()
    updated = skipped = 0

    for _, row in df.iterrows():
        title = str(row.get("title", "")).strip()
        if not title or title == "nan":
            continue
        cur.execute("SELECT id FROM xhs_post_archive WHERE title = %s", (title,))
        if cur.fetchone():
            cur.execute("""
                UPDATE xhs_post_archive
                SET impressions=%s, views=%s, ctr=%s, likes=%s, comments_count=%s,
                    saves=%s, shares=%s, followers_gained=%s, avg_watch_time=%s
                WHERE title=%s
            """, (
                _safe_int(row["impressions"]), _safe_int(row["views"]),
                _safe_float(row["ctr"]),       _safe_int(row["likes"]),
                _safe_int(row["comments_count"]), _safe_int(row["saves"]),
                _safe_int(row["shares"]),      _safe_int(row["followers_gained"]),
                _safe_float(row["avg_watch_time"]), title,
            ))
            updated += 1
        else:
            skipped += 1

    conn.commit()

    cur.execute("""
        SELECT post_type, title, views, saves, ctr, published_at
        FROM xhs_post_archive
        WHERE views IS NOT NULL AND saves IS NOT NULL AND ctr IS NOT NULL
        ORDER BY published_at ASC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        raise HTTPException(status_code=422, detail="No posts with performance data found")

    # Build metric matrix — scale saves/CTR to views magnitude
    post_types, titles_list, metric_rows, pub_times = [], [], [], []
    for post_type, title, views, saves, ctr, published_at in rows:
        metric_rows.append([
            float(views or 0),
            float(saves or 0) * 100,
            float(ctr   or 0) * 1000,
        ])
        post_types.append(post_type)
        titles_list.append(title)
        pub_times.append(published_at)

    metric_matrix = np.array(metric_rows, dtype=np.float64)
    raw_scores    = compute_scores(metric_matrix)

    # EWMA per type — weight recent posts more heavily, take last value as type score
    type_series: dict[str, list[tuple[float, datetime]]] = {}
    for i, pt in enumerate(post_types):
        type_series.setdefault(pt, []).append((float(raw_scores[i]), pub_times[i]))

    type_scores: dict[str, float] = {}
    for pt, series in type_series.items():
        series.sort(key=lambda x: x[1] or datetime.min)
        arr = np.array([s for s, _ in series])
        type_scores[pt] = float(ewma_scores(arr)[-1])

    # Undersampling correction — boost high-signal low-count types
    median_score = float(np.median(list(type_scores.values())))
    flags: list[str] = []
    for pt in list(type_scores):
        count = len(type_series[pt])
        if count < UNDERSAMPLE_THRESHOLD and type_scores[pt] > median_score:
            type_scores[pt] *= UNDERSAMPLE_BOOST
            flags.append(f"{pt} has only {count} posts but strong performance — weight boosted to encourage more posts of this type")

    # Normalize to weights and rank
    content_weights = normalize_weights(type_scores)
    ranked = sorted(content_weights.items(), key=lambda x: x[1], reverse=True)

    # Top 3 posts per type by composite score
    score_data: dict[str, list] = {}
    for i, pt in enumerate(post_types):
        score_data.setdefault(pt, []).append({
            "title": titles_list[i],
            "score": round(float(raw_scores[i])),
            "views": int(metric_rows[i][0]),
            "saves": int(metric_rows[i][1] / 100),
            "ctr":   round(metric_rows[i][2] / 1000, 4),
        })
    top_posts = {
        pt: sorted(posts, key=lambda p: p["score"], reverse=True)[:3]
        for pt, posts in score_data.items()
    }

    return {
        "ingested":       {"updated": updated, "skipped_unknown": skipped},
        "ranked_types":   [{"post_type": pt, "weight": w} for pt, w in ranked],
        "content_weights": content_weights,
        "top_posts":      top_posts,
        "flags":          flags,
        "computed_at":    datetime.utcnow().isoformat() + "Z",
    }


# ---------------------------------------------------------------------------
# POST /tune/xhs
# ---------------------------------------------------------------------------

class TuneRequest(BaseModel):
    post_type:      str
    top_posts:      list[dict]
    current_prompt: str


@app.post("/tune/xhs")
async def tune_xhs(req: TuneRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    client = _anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    posts_text = "\n\n".join([
        f"Post {i + 1}:\nTitle: {p.get('title', '')}\n"
        f"Content: {p.get('hook', p.get('content', ''))}"
        for i, p in enumerate(req.top_posts[:3])
    ])

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": (
                f"You are a content strategist for a Chinese running account focused on Japanese marathons.\n\n"
                f"Analyze the top-performing posts below for post type '{req.post_type}'. "
                f"Identify patterns in structure, tone, framing, and hooks that make them succeed. "
                f"Then rewrite the current prompt to better capture those patterns.\n\n"
                f"Top performing posts:\n{posts_text}\n\n"
                f"Current prompt:\n{req.current_prompt}\n\n"
                f"Return ONLY the updated prompt text. No explanation, no preamble."
            ),
        }],
    )
    updated_prompt = msg.content[0].text.strip()

    # Archive current prompt
    archive_dir = Path(XHS_PROMPT_ARCHIVE_DIR) / date.today().isoformat()
    archive_dir.mkdir(parents=True, exist_ok=True)
    (archive_dir / f"{req.post_type}.txt").write_text(req.current_prompt, encoding="utf-8")

    # Write updated prompt to prompts.json
    prompts_path = Path(XHS_PROMPTS_PATH)
    written = False
    if prompts_path.exists():
        with open(prompts_path, encoding="utf-8") as f:
            prompts = json.load(f)
        key = PROMPT_KEY_MAP.get(req.post_type)
        if key and key in prompts.get("postTypes", {}):
            prompts["postTypes"][key] = updated_prompt
            with open(prompts_path, "w", encoding="utf-8") as f:
                json.dump(prompts, f, ensure_ascii=False, indent="\t")
            written = True

    return {
        "post_type":       req.post_type,
        "updated_prompt":  updated_prompt,
        "archived_to":     str(archive_dir / f"{req.post_type}.txt"),
        "prompts_updated": written,
    }
