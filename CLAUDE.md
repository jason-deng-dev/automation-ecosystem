# Claude Code Instructions
> This file configures Claude Code's behaviour for this repo.
> See [docs/design-doc.md](docs/design-doc.md) for full project context.

## Before Writing Any Code
- Read `docs/design-doc.md` in full before starting any task
- Follow the repo structure defined in Section 12 of the design doc exactly
- If a file or folder isn't in the design doc structure, confirm before creating it

## Repo Structure
Refer to `docs/design-doc.md` Section 12. Key files:
- `rednote-post-generator.js` — core Claude API integration
- `formatter.js` — XHS format validation + CTA injection
- `publisher.js` — Playwright browser automation
- `post_history.json` — recent topics log for dedup
- `post_archive/` — generated post backup

## Keeping Docs in Sync
- When a checklist item is completed, mark it as done in `docs/checklist.md`
- When a technical decision is made that differs from or extends the design doc, update the relevant section in `docs/design-doc.md` and note the rationale
- When a new engineering challenge is encountered and solved, add it to Section 9 of `docs/design-doc.md`

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- The system prompt and content strategy are defined in Section 6 of the design doc — do not deviate from the MOXI persona, XHS format rules, or content weighting without flagging it first
- If something is unclear or undecided in the design doc, flag it and add it to Section 11 (Open Questions) rather than making assumptions