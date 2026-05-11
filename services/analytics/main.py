import io
import logging
import os
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from typing import Optional
from fastapi import FastAPI, File, HTTPException, UploadFile

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

from scoring import (
    METRIC_WEIGHTS, compute_scores, ewma_scores,
    fit_ols_prior, markowitz_weights, monte_carlo_optimize, normalize_weights,
)

load_dotenv()

DATABASE_URL          = os.getenv("DATABASE_URL")
UNDERSAMPLE_THRESHOLD = 15
UNDERSAMPLE_BOOST     = 1.3

# Ordered — integer index used in Monte Carlo type grouping. Must match DB post_type values.
POST_TYPES = ["race", "training", "nutritionSupplement", "wearable"]

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
async def analyze_xhs(file: Optional[UploadFile] = File(default=None)):
    ingested = {"updated": 0, "skipped_unknown": 0}

    if file is not None:
        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="File must be .xlsx or .xls")

        contents = await file.read()
        try:
            df = pd.read_excel(io.BytesIO(contents), header=1)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {e}")

        log.info("Excel columns found: %s", list(df.columns))

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

        required = {"title", "views", "saves", "ctr"}
        missing = required - set(df.columns)
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Missing expected columns after rename: {missing}. Got: {list(df.columns)}"
            )

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
        cur.close()
        conn.close()
        ingested = {"updated": updated, "skipped_unknown": skipped}

    conn2 = _get_db()
    cur2  = conn2.cursor()
    cur2.execute("""
        SELECT post_type, title, views, saves, ctr, published_at
        FROM xhs_post_archive
        WHERE views IS NOT NULL AND saves IS NOT NULL AND ctr IS NOT NULL
        ORDER BY published_at ASC
    """)
    rows = cur2.fetchall()
    cur2.close()
    conn2.close()

    if not rows:
        raise HTTPException(status_code=422, detail="No posts with performance data found")

    # Build metric matrix (scale saves/CTR to views magnitude)
    type_index_map = {t: i for i, t in enumerate(POST_TYPES)}
    post_types, titles_list, metric_rows, type_idx_list, pub_times = [], [], [], [], []

    for post_type, title, views, saves, ctr, published_at in rows:
        metric_rows.append([
            float(views or 0),
            float(saves or 0) * 100,
            float(ctr   or 0) * 1000,
        ])
        post_types.append(post_type)
        titles_list.append(title)
        type_idx_list.append(type_index_map.get(post_type, -1))
        pub_times.append(published_at)

    metric_matrix  = np.array(metric_rows, dtype=np.float64)
    type_idx_array = np.array(type_idx_list, dtype=np.int32)
    raw_scores     = compute_scores(metric_matrix)

    # EWMA per type — smooth scores so recent posts count more; take last value as type score
    type_series: dict[str, list[tuple[float, datetime]]] = {}
    for i, pt in enumerate(post_types):
        type_series.setdefault(pt, []).append((float(raw_scores[i]), pub_times[i]))

    ewma_per_post = np.zeros(len(post_types), dtype=np.float64)
    for pt, series in type_series.items():
        series.sort(key=lambda x: x[1] or datetime.min)
        indices = [i for i, p in enumerate(post_types) if p == pt]
        scores_arr = np.array([s for s, _ in series])
        smoothed   = ewma_scores(scores_arr)
        for k, i in enumerate(indices):
            ewma_per_post[i] = smoothed[k]

    # Undersampling correction — boost EWMA scores for high-signal low-count types
    type_ewma_final: dict[str, float] = {}
    for pt, series in type_series.items():
        last_ewma = float(ewma_per_post[[i for i, p in enumerate(post_types) if p == pt][-1]])
        type_ewma_final[pt] = last_ewma

    median_ewma = float(np.median(list(type_ewma_final.values())))
    flags: list[str] = []

    for i, pt in enumerate(post_types):
        count = len(type_series[pt])
        if count < UNDERSAMPLE_THRESHOLD and type_ewma_final[pt] > median_ewma:
            ewma_per_post[i] *= UNDERSAMPLE_BOOST

    # Flag boosted types
    for pt, series in type_series.items():
        count = len(series)
        if count < UNDERSAMPLE_THRESHOLD and type_ewma_final[pt] > median_ewma:
            flags.append(
                f"{pt} has only {count} posts but strong performance — weight boosted to encourage more posts of this type"
            )

    # OLS prior — fit regression (type one-hot + month + recency → EWMA score)
    # Predict expected score per type at median month, zero recency (fresh post today)
    now_ts = datetime.utcnow().timestamp()
    months_arr    = np.array([p.month if p else 0 for p in pub_times], dtype=np.float64)
    recency_arr   = np.array([(now_ts - p.timestamp()) / 86400 if p else 0 for p in pub_times], dtype=np.float64)
    type_onehot   = np.zeros((len(post_types), len(POST_TYPES)), dtype=np.float64)
    for i, idx in enumerate(type_idx_list):
        if idx >= 0:
            type_onehot[i, idx] = 1.0

    ols_coeffs = fit_ols_prior(ewma_per_post, type_onehot, months_arr, recency_arr)

    # Predict per type: intercept + type_coeff + median_month_coeff + 0*recency
    median_month = float(np.median(months_arr[months_arr > 0])) if months_arr.any() else 6.0
    n_features   = 1 + len(POST_TYPES) + 2  # intercept + onehot + month + recency
    ols_predicted = np.zeros(len(POST_TYPES), dtype=np.float64)
    for t in range(len(POST_TYPES)):
        if len(ols_coeffs) >= n_features:
            ols_predicted[t] = (
                ols_coeffs[0]              # intercept
                + ols_coeffs[1 + t]        # type coefficient
                + ols_coeffs[1 + len(POST_TYPES)] * median_month  # month coefficient
                # recency = 0 (fresh post)
            )

    # Blend EWMA + OLS prediction (50/50) per post — biases MC toward predicted performance
    ols_pred_per_post = np.array([
        ols_predicted[idx] if idx >= 0 else 0.0
        for idx in type_idx_list
    ], dtype=np.float64)
    blended_scores = 0.5 * ewma_per_post + 0.5 * ols_pred_per_post

    # Monte Carlo: bootstrap over blended scores, 10k sims, 4 C++ threads
    # Returns mean + variance per type for Markowitz step
    valid = type_idx_array >= 0
    mc = monte_carlo_optimize(
        blended_scores[valid],
        type_idx_array[valid],
        len(POST_TYPES),
        n_simulations=10000,
    )

    # Markowitz: mean/variance → Sharpe-style weights (consistent > high-variance)
    mc_means     = mc["means"]
    mc_variances = [
        ((mc["ci_high"][i] - mc["ci_low"][i]) / 3.92) ** 2
        for i in range(len(POST_TYPES))
    ]
    mw = markowitz_weights(mc_means, mc_variances)
    content_weights = {POST_TYPES[i]: round(mw[i], 3) for i in range(len(POST_TYPES))}
    ranked = sorted(content_weights.items(), key=lambda x: x[1], reverse=True)

    # Top 5 posts per type — sorted by EWMA score (recency-weighted)
    score_data: dict[str, list] = {}
    for i, pt in enumerate(post_types):
        pub = pub_times[i]
        score_data.setdefault(pt, []).append({
            "title":        titles_list[i],
            "ewma_score":   round(float(ewma_per_post[i])),
            "score":        round(float(raw_scores[i])),
            "views":        int(metric_rows[i][0]),
            "saves":        int(metric_rows[i][1] / 100),
            "ctr":          round(metric_rows[i][2] / 1000, 4),
            "published_at": pub.strftime("%Y-%m-%d") if pub else None,
        })
    top_posts = {
        pt: sorted(posts, key=lambda p: p["ewma_score"], reverse=True)[:5]
        for pt, posts in score_data.items()
    }

    return {
        "ingested":        ingested,
        "ranked_types":    [{"post_type": pt, "weight": w} for pt, w in ranked],
        "content_weights": content_weights,
        "top_posts":       top_posts,
        "flags":           flags,
        "computed_at":     datetime.utcnow().isoformat() + "Z",
    }
