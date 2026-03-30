# Claude Code Instructions — rakuten
> See [docs/rakuten-design-doc.md](docs/rakuten-design-doc.md) for full project context.

## Before Writing Any Code
- Read `docs/rakuten-design-doc.md` in full before starting any task
- Follow the repo structure defined in Section 13 of the design doc
- If a file or folder isn't in the design doc structure, confirm before creating it

## Repo Structure
All source is TypeScript under `src/`. Key files:
- `src/app.ts` — Express entry point
- `src/controller.ts` — all route handler logic
- `src/services/rakutenAPI.ts` — Rakuten API wrapper (keyword, genre, ranking fetch + normalization)
- `src/services/pricing.ts` — margin formula (not yet built)
- `src/services/woocommerce.ts` — WooCommerce REST API wrapper (not yet built)
- `src/db/store.ts` — PostgreSQL product store (not yet built)
- `src/config/genres.ts` — Rakuten genre ID map
- `src/config/config.ts` — per-category margin %, shipping estimate, JPY→CNY rate (not yet built)

No React SPA, no deepl.js — translation is handled by TranslatePress on the WordPress side.

## Keeping Docs in Sync
- Mark completed checklist items in `docs/rakuten-checklist.md` after every task
- When a technical decision is made that differs from or extends the design doc, update the relevant section in `docs/rakuten-design-doc.md` and note the rationale
- When a new engineering challenge is encountered and solved, add it to Section 11 of `docs/rakuten-design-doc.md`

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- Pricing formula is defined in Section 4.3 of the design doc — do not modify the formula without updating the doc
- If something is unclear or undecided in the design doc, flag it and add it to Section 12 (Open Questions) rather than making assumptions