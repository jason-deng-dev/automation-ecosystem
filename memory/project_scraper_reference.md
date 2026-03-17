---
name: RunJapan scraper reference
description: Working scraper implementation from openclaw repo that we can reference when building scraper.js
type: project
---

A working RunJapan scraper already exists in the openclaw-automation-deployment repo at `race-platform/race-updater/scraper-runjapan-detailed.js`.

**How it works:**
1. Fetch RunJapan homepage with axios
2. Use cheerio to parse HTML and extract race links (each race has a `raceId` in the URL e.g. `raceId=E335908`)
3. For each race link, fetch the detail page
4. Extract structured data from detail page using regex patterns:
   - Dates: `/(\w+\s+\d{1,2}\s+\d{4})/`
   - Locations: `/([A-Za-z\s]+City|Town|Village)\s*\(\s*([^)]+)\)/`
   - Distances: `/(?:Full Marathon|Half Marathon|Marathon)\s*\(?[\d\.]*\s*km?\)?/gi`
5. Write to races.json

**Key insight:** It's a two-pass scrape — listing page first to get race IDs/links, then detail pages for full data.

**races.json output schema:**
```json
{
  "id": "E335908",
  "name": "Shimanto River Sakura Marathon",
  "date": "2026-03-29",
  "location": "Kochi",
  "distance": ["Marathon", "10km"],
  "link": "https://runjapan.jp/entry/runtes/smp/competitiondetail.do?raceId=E335908&div=1",
  "source": "runjapan",
  "scraped_at": "2026-03-04T06:07:05.936Z"
}
```

**Config via .env:**
- `RUNJAPAN_BASE_URL=https://runjapan.jp`
- `RUNJAPAN_TIMEOUT=10000`
- `RUNJAPAN_RACES_LIMIT=5` (raise this)

**Why:** Claude (openclaw) built this, not Jason. Jason wants to rebuild it here himself to actually understand how it works. Use it as a reference only — never copy-paste from it. Guide Jason through the logic step by step.
