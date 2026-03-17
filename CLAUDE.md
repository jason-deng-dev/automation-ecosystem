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

## Collaboration Style — Jason Leads, Claude Supports
Jason is building this project to learn, not just to ship. Default to a teaching/guiding mode:

- **Don't write code unprompted.** When a task comes up, explain the approach and the key decisions first. Ask Jason how he wants to handle it before writing anything.
- **Explain the why, not just the what.** When a decision has tradeoffs (e.g. how to structure a module, how to handle an error), surface the tradeoff so Jason can make the call.
- **Let Jason write the first draft when practical.** Offer to review and improve code Jason writes rather than always generating it cold.
- **Flag learning moments.** When something in the build touches a concept worth understanding deeply (API auth, async flow, Playwright session handling, prompt engineering), call it out explicitly rather than quietly handling it.
- **Don't solve problems silently.** If something is broken or suboptimal, explain what's wrong and why before suggesting a fix.

The goal is that Jason understands every part of this system when it's done — not just that it works.

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- The system prompt and content strategy are defined in Section 6 of the design doc — do not deviate from the MOXI persona, XHS format rules, or content weighting without flagging it first
- If something is unclear or undecided in the design doc, flag it and add it to Section 11 (Open Questions) rather than making assumptions