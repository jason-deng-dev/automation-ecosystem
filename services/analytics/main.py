import io
import os
import numpy as np
import pandas as pd
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

METRIC_WEIGHTS = {"views": 0.4, "saves": 0.35, "ctr": 0.25}
UNDERSAMPLE_THRESHOLD = 15
UNDERSAMPLE_BOOST = 1.3


def safe_int(val):
    try:
        return int(val) if pd.notna(val) else None
    except (ValueError, TypeError):
        return None


def safe_float(val):
    try:
        return float(val) if pd.notna(val) else None
    except (ValueError, TypeError):
        return None


def parse_published_at(raw: str) -> datetime:
    try:
        return datetime.strptime(str(raw).strip(), "%Y年%m月%d日%H时%M分%S秒")
    except ValueError:
        return datetime.now()


@app.post("/analyze/xhs")
async def analyze_xhs(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx or .xls")

    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents), header=1)
    df = df.rename(columns={
        "笔记标题": "title",
        "首次发布时间": "published_at",
        "曝光": "impressions",
        "观看量": "views",
        "封面点击率": "ctr",
        "点赞": "likes",
        "评论": "comments_count",
        "收藏": "saves",
        "涨粉": "followers_gained",
        "分享": "shares",
        "人均观看时长": "avg_watch_time",
    })

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0

    for _, row in df.iterrows():
        title = str(row.get("title", "")).strip()
        if not title or title == "nan":
            continue

        cur.execute("SELECT id FROM xhs_post_archive WHERE title = %s", (title,))
        existing = cur.fetchone()

        views = safe_int(row["views"])
        saves = safe_int(row["saves"])
        ctr = safe_float(row["ctr"])
        impressions = safe_int(row["impressions"])
        likes = safe_int(row["likes"])
        comments_count = safe_int(row["comments_count"])
        shares = safe_int(row["shares"])
        followers_gained = safe_int(row["followers_gained"])
        avg_watch_time = safe_float(row["avg_watch_time"])

        if existing:
            cur.execute("""
                UPDATE xhs_post_archive
                SET impressions=%s, views=%s, ctr=%s, likes=%s, comments_count=%s,
                    saves=%s, shares=%s, followers_gained=%s, avg_watch_time=%s
                WHERE title=%s
            """, (impressions, views, ctr, likes, comments_count,
                  saves, shares, followers_gained, avg_watch_time, title))
            updated += 1
        else:
            # title not in archive — skip, post_type unknown without DB reference
            skipped += 1

    conn.commit()

    # --- scoring ---
    cur.execute("""
        SELECT post_type, title, views, saves, ctr
        FROM xhs_post_archive
        WHERE views IS NOT NULL AND saves IS NOT NULL AND ctr IS NOT NULL
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        raise HTTPException(status_code=422, detail="No posts with performance data found")

    score_data: dict[str, list] = {}
    for post_type, title, views, saves, ctr in rows:
        score = (
            METRIC_WEIGHTS["views"] * float(views or 0) +
            METRIC_WEIGHTS["saves"] * float(saves or 0) * 100 +  # normalize saves to views scale
            METRIC_WEIGHTS["ctr"] * float(ctr or 0) * 1000       # normalize CTR to views scale
        )
        if post_type not in score_data:
            score_data[post_type] = []
        score_data[post_type].append({"title": title, "score": score, "views": views, "saves": saves, "ctr": float(ctr or 0)})

    median_score = np.median([p["score"] for posts in score_data.values() for p in posts])

    type_scores: dict[str, float] = {}
    flags: list[str] = []

    for post_type, posts in score_data.items():
        avg = float(np.mean([p["score"] for p in posts]))
        count = len(posts)
        if count < UNDERSAMPLE_THRESHOLD and avg > median_score:
            avg *= UNDERSAMPLE_BOOST
            flags.append(f"{post_type}: undersampled ({count} posts) but high signal — boosted ×{UNDERSAMPLE_BOOST}")
        type_scores[post_type] = avg

    total = sum(type_scores.values())
    content_weights = {k: round(v / total, 3) for k, v in type_scores.items()}
    best_type = max(type_scores, key=lambda k: type_scores[k])

    top_posts = {
        pt: sorted(posts, key=lambda p: p["score"], reverse=True)[:3]
        for pt, posts in score_data.items()
    }

    return {
        "ingested": {"updated": updated, "skipped_unknown": skipped},
        "best_post_type": best_type,
        "content_weights": content_weights,
        "top_posts": top_posts,
        "flags": flags,
        "computed_at": datetime.utcnow().isoformat() + "Z",
    }
