---
name: summarize-diff
description: Summarize the current git diff for OzWizard — staged + unstaged changes grouped by area, what changed and why, and anything risky. Use when the user asks to summarize the diff, "what changed", or before a commit/PR.
---

# summarize-diff

Produce a tight, human-readable summary of the working changes.

## Steps

1. Gather the diff:
   - `git status --short` (see untracked + modified at a glance)
   - `git diff` (unstaged) and `git diff --cached` (staged)
   - If both are empty, report "no changes" and stop.
2. Read the diff — don't just count lines. Understand intent.
3. Write the summary in this shape:

   **Summary** — one sentence on the overall change.

   **By area** — group hunks by directory/layer (`src/api`, `src/core`, `src/store`,
   `.claude`, `docs`, `test`, …). For each: what changed and _why_ (1–2 lines).

   **Risk / watch-outs** — anything that could bite: behavior changes, touched policy/scan
   logic, new deps, changes to `src/core/**` purity, secrets/PII risk, missing tests.

   **Tests** — which tests cover this, and whether new tests are warranted.

## Style

- Concise, factual, skimmable. Bullets over paragraphs.
- Name files as `path:line` where it helps.
- Don't invent changes not in the diff. If something is unclear, say so.
