import asyncio
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

from scoring import (
    METRIC_WEIGHTS,
    compute_scores,
    ewma_scores,
    fit_ols_prior,
    markowitz_weights,
    monte_carlo_optimize,
    normalize_weights,
)

load_dotenv()

DATABASE_URL         = os.getenv("DATABASE_URL")
ANTHROPIC_API_KEY    = os.getenv("ANTHROPIC_API_KEY")
XHS_PROMPTS_PATH     = os.getenv("XHS_PROMPTS_PATH", "../xhs/config/prompts.json")
XHS_PROMPT_ARCHIVE_DIR = os.getenv("XHS_PROMPT_ARCHIVE_DIR", "../xhs/config/prompt_archive")

UNDERSAMPLE_THRESHOLD = 15
UNDERSAMPLE_BOOST     = 1.3

# Ordered list matches integer indices used in Monte Carlo
POST_TYPES = ["race_guide", "training", "nutrition_supplement", "wearables", "health_recovery"]

# prompts.json key ↔ POST_TYPES value
PROMPT_KEY_MAP = {
    "race_guide":           "raceGuide",
    "training":             "training",
    "nutrition_supplement": "nutritionSupplement",
    "wearables":            "wearables",
}

_executor = ThreadPoolExecutor()
app = FastAPI()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _scale_metrics(views: float, saves: float, ctr: float) -> tuple[float, float, float]:
    return views, saves * 100, ctr * 1000


# ---------------------------------------------------------------------------
# POST /analyze/xhs
# ---------------------------------------------------------------------------

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

    loop = asyncio.get_event_loop()

    # --- DB backfill (sync psycopg2 — offload to thread) ---
    def _backfill():
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
        return updated, skipped, rows

    updated, skipped, rows = await loop.run_in_executor(_executor, _backfill)

    if not rows:
        raise HTTPException(status_code=422, detail="No posts with performance data found")

    # --- Build arrays for scoring ---
    now_ts = datetime.utcnow().timestamp()
    type_index_map = {t: i for i, t in enumerate(POST_TYPES)}

    titles, post_types, metric_rows, type_indices, months_arr, recency_arr, pub_times = (
        [], [], [], [], [], [], []
    )
    for post_type, title, views, saves, ctr, published_at in rows:
        v, s, c = _scale_metrics(float(views or 0), float(saves or 0), float(ctr or 0))
        metric_rows.append([v, s, c])
        titles.append(title)
        post_types.append(post_type)
        type_indices.append(type_index_map.get(post_type, -1))
        months_arr.append(published_at.month if published_at else 0)
        recency_arr.append((now_ts - published_at.timestamp()) / 86400 if published_at else 0)
        pub_times.append(published_at)

    metric_matrix  = np.array(metric_rows, dtype=np.float64)
    type_idx_array = np.array(type_indices, dtype=np.int32)
    months_np      = np.array(months_arr,   dtype=np.float64)
    recency_np     = np.array(recency_arr,  dtype=np.float64)

    # --- Parallel scoring tasks ---
    def _run_monte_carlo():
        valid = type_idx_array >= 0
        return monte_carlo_optimize(
            metric_matrix[valid], type_idx_array[valid],
            len(POST_TYPES), METRIC_WEIGHTS, n_simulations=10000,
        )

    def _run_ols():
        onehot = np.zeros((len(type_indices), len(POST_TYPES)), dtype=np.float64)
        for i, idx in enumerate(type_indices):
            if idx >= 0:
                onehot[i, idx] = 1.0
        raw_scores = compute_scores(metric_matrix)
        return fit_ols_prior(raw_scores, onehot, months_np, recency_np)

    mc_future  = loop.run_in_executor(_executor, _run_monte_carlo)
    ols_future = loop.run_in_executor(_executor, _run_ols)
    mc_result, ols_coeffs = await asyncio.gather(mc_future, ols_future)

    # --- Per-type aggregation with EWMA ---
    score_data: dict[str, list] = {}
    type_raw_scores: dict[str, list[tuple[float, datetime]]] = {}

    raw_scores = compute_scores(metric_matrix)
    for i, post_type in enumerate(post_types):
        score = float(raw_scores[i])
        entry = {"title": titles[i], "score": score,
                 "views": metric_rows[i][0], "saves": metric_rows[i][1] / 100,
                 "ctr": metric_rows[i][2] / 1000}
        score_data.setdefault(post_type, []).append(entry)
        type_raw_scores.setdefault(post_type, []).append((score, pub_times[i]))

    # EWMA-smooth per type (recent posts weighted more)
    ewma_type_scores: dict[str, float] = {}
    for pt, time_series in type_raw_scores.items():
        time_series.sort(key=lambda x: x[1] or datetime.min)
        scores_arr = np.array([s for s, _ in time_series])
        smoothed = ewma_scores(scores_arr)
        ewma_type_scores[pt] = float(smoothed[-1])  # most recent EWMA value

    # Undersampling correction
    median_score = float(np.median(raw_scores))
    flags: list[str] = []
    type_scores_final: dict[str, float] = {}

    for pt in score_data:
        count = len(score_data[pt])
        avg   = ewma_type_scores.get(pt, float(np.mean([p["score"] for p in score_data[pt]])))
        if count < UNDERSAMPLE_THRESHOLD and avg > median_score:
            avg *= UNDERSAMPLE_BOOST
            flags.append(
                f"{pt}: undersampled ({count} posts) but high signal — boosted ×{UNDERSAMPLE_BOOST}"
            )
        type_scores_final[pt] = avg

    content_weights = normalize_weights(type_scores_final)
    best_type       = max(type_scores_final, key=lambda k: type_scores_final[k])

    # Markowitz weights from Monte Carlo variance
    mc_means = mc_result["means"]
    mc_ci_low  = mc_result["ci_low"]
    mc_ci_high = mc_result["ci_high"]
    mc_variances = [
        ((mc_ci_high[i] - mc_ci_low[i]) / 3.92) ** 2  # approximate std from 90% CI
        for i in range(len(POST_TYPES))
    ]
    mw = markowitz_weights(mc_means, mc_variances)
    markowitz_content_weights = {POST_TYPES[i]: round(mw[i], 3) for i in range(len(POST_TYPES))}

    top_posts = {
        pt: sorted(posts, key=lambda p: p["score"], reverse=True)[:3]
        for pt, posts in score_data.items()
    }
    mc_weights_labeled = {POST_TYPES[i]: round(mc_means[i], 3) for i in range(len(POST_TYPES))}
    mc_ci_labeled = {
        POST_TYPES[i]: {"low": round(mc_ci_low[i], 3), "high": round(mc_ci_high[i], 3)}
        for i in range(len(POST_TYPES))
    }

    return {
        "ingested": {"updated": updated, "skipped_unknown": skipped},
        "best_post_type":           best_type,
        "content_weights":          content_weights,
        "monte_carlo_weights":      mc_weights_labeled,
        "monte_carlo_ci":           mc_ci_labeled,
        "markowitz_weights":        markowitz_content_weights,
        "top_posts":                top_posts,
        "flags":                    flags,
        "computed_at":              datetime.utcnow().isoformat() + "Z",
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

    def _call_claude():
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
        return msg.content[0].text.strip()

    loop = asyncio.get_event_loop()
    updated_prompt = await loop.run_in_executor(_executor, _call_claude)

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
        "post_type":      req.post_type,
        "updated_prompt": updated_prompt,
        "archived_to":    str(archive_dir / f"{req.post_type}.txt"),
        "prompts_updated": written,
    }
