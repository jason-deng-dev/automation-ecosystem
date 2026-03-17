# Claude Code Instructions
> This file configures Claude Code's behaviour for this repo.
> See [docs/design-doc.md](docs/design-doc.md) for full project context.

## Before Writing Any Code
- Read `docs/design-doc.md` in full before starting any task
- Follow the repo structure defined in Section 12 of the design doc exactly
- If a file or folder isn't in the design doc structure, confirm before creating it

## Repo Structure
Refer to `docs/design-doc.md` Section 12. Key files:
- `src/` — all pipeline JS files (scraper, generator, formatter, publisher)
- `data/` — races.json, post_history.json, post_archive/
- `demo/` — static portfolio showcase page + pre-generated posts

## Keeping Docs in Sync — REQUIRED, DO NOT SKIP
**After every task, before moving on:**
- Mark completed checklist items in `docs/checklist.md` — do this automatically, never ask for permission
- If a new dependency, technical decision, or architectural choice was made — update `docs/design-doc.md` Section 5 (Technical Decisions)
- If a new engineering challenge was solved — add it to `docs/design-doc.md` Section 9
- If the current state of any component changed — update `docs/design-doc.md` Section 8.1 (Current Status)

This is not optional. Do not wait to be reminded.

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- The system prompt and content strategy are defined in Section 6 of the design doc — do not deviate from the MOXI persona, XHS format rules, or content weighting without flagging it first
- If something is unclear or undecided in the design doc, flag it and add it to Section 11 (Open Questions) rather than making assumptions