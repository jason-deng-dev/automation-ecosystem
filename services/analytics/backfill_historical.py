"""
One-time backfill: reads 笔记列表明细表 .xlsx, classifies each post by type,
inserts into xhs_post_archive with performance metrics.
Skips rows where title already exists in DB.
"""

import re
import pandas as pd
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

EXCEL_PATH = "笔记列表明细表 .xlsx"

RACE_KEYWORDS = [
    "东京马", "大阪马", "富士山马拉松", "富士山马", "冲绳", "福州马拉松",
    "日本马拉松", "日本半马", "日本.*月.*马拉松", "还能报名", "落选",
    "春季.*马拉松", "秋季.*马拉松", "日本最值得跑", "日本.*场马拉松",
    "日本.*城市", "海外.*马拉松", "第一次日本马拉松",
]

NUTRITION_KEYWORDS = [
    "氨基酸", "补给", "碳水", "早餐.*吃", "吃.*靠谱", "能量胶", "盐片",
    "补盐", "营养补给", "饮食", "赛前.*吃", "跑后.*吃", "撞墙.*能量",
    "果冻", "跑者.*误区.*补", "马拉松营养",
]

WEARABLE_KEYWORDS = [
    "跑鞋", "装备",
]


def classify(title: str) -> str:
    t = title.strip()
    for kw in RACE_KEYWORDS:
        if re.search(kw, t):
            return "race"
    for kw in NUTRITION_KEYWORDS:
        if re.search(kw, t):
            return "nutritionSupplement"
    for kw in WEARABLE_KEYWORDS:
        if re.search(kw, t):
            return "wearable"
    return "training"


def parse_published_at(raw: str) -> datetime:
    # Format: "2026年03月05日12时15分54秒"
    try:
        return datetime.strptime(str(raw).strip(), "%Y年%m月%d日%H时%M分%S秒")
    except ValueError:
        return datetime.now()


def main():
    df = pd.read_excel(EXCEL_PATH, header=1)
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
    skipped = 0

    for _, row in df.iterrows():
        title = str(row["title"]).strip()
        if not title or title == "nan":
            continue

        # skip if already exists
        cur.execute("SELECT id FROM xhs_post_archive WHERE title = %s", (title,))
        if cur.fetchone():
            skipped += 1
            continue

        post_type = classify(title)
        published_at = parse_published_at(row["published_at"])

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

        cur.execute("""
            INSERT INTO xhs_post_archive
                (title, post_type, published_at, published,
                 impressions, views, ctr, likes, comments_count,
                 saves, shares, followers_gained, avg_watch_time,
                 input_tokens, output_tokens)
            VALUES
                (%s, %s, %s, %s,
                 %s, %s, %s, %s, %s,
                 %s, %s, %s, %s,
                 0, 0)
        """, (
            title, post_type, published_at, True,
            safe_int(row["impressions"]),
            safe_int(row["views"]),
            safe_float(row["ctr"]),
            safe_int(row["likes"]),
            safe_int(row["comments_count"]),
            safe_int(row["saves"]),
            safe_int(row["shares"]),
            safe_int(row["followers_gained"]),
            safe_float(row["avg_watch_time"]),
        ))
        inserted += 1
        print(f"  [{post_type:20s}] {title[:60]}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone. Inserted: {inserted}, Skipped (already exist): {skipped}")


if __name__ == "__main__":
    main()
