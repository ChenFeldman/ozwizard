---
name: deep-review
description: Orchestrated deep review of named files — dispatches the security, performance, and convention reviewers in parallel, then synthesizes one ranked list of findings and a verdict. Invoke explicitly with /deep-review [files...].
disable-model-invocation: true
---

# deep-review

You are the **orchestrator**. Run this inline (do NOT fork). Dispatch the three read-only
reviewer subagents in parallel, then merge their findings into one ranked list + a verdict.

## 1. Determine scope

- If the user passed file paths as arguments, review exactly those.
- Otherwise, derive the changed files from the diff:
  `git diff --name-only HEAD` plus untracked (`git status --short`). Keep source files
  (`src/**`, `test/**`). If there is nothing to review, say so and stop.

State the file list you're reviewing in one line.

## 2. Dispatch the three reviewers IN PARALLEL

Send **one message with three Agent tool calls** (so they run concurrently), each scoped to
the same file list:

- `subagent_type: security-reviewer`
- `subagent_type: performance-reviewer`
- `subagent_type: convention-reviewer`

Give each the explicit list of files (absolute paths) and tell it to review only those.
Each returns a prioritized `BLOCKER/COMMENT/NIT` list with `file:line` and a one-line fix.

## 3. Synthesize ONE ranked list

- Merge all findings. **Deduplicate** the same `file:line` issue raised by more than one
  reviewer (keep the sharpest wording, note the overlap).
- Sort by severity: all **BLOCKER**, then **COMMENT**, then **NIT**. Within a tier, order by
  blast radius.
- Keep each finding to one line: `SEVERITY  file:line — problem — one-line fix  [tag]`
  where tag ∈ {sec, perf, conv}.

## 4. Emit a verdict

End with exactly one:

- **REQUEST-CHANGES** — any BLOCKER present.
- **APPROVE-WITH-NITS** — only COMMENT/NIT present.
- **APPROVE** — nothing of substance found.

Add a one-sentence rationale. Do not modify any files — this is a review.
