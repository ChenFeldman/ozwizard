---
name: deep-review
description: Orchestrated deep review of named files — dispatches a selectable roster of read-only reviewer subagents in parallel, then synthesizes one ranked list of findings and a verdict. Invoke explicitly with /deep-review [reviewers...] [files...].
disable-model-invocation: true
---

# deep-review

You are the **orchestrator**. Run this inline (do NOT fork). Dispatch the selected
read-only reviewer subagents in parallel, then merge their findings into one ranked list

- a verdict.

**Every reviewer runs read-only (Read/Grep/Glob only) in its own context — they never see
each other's findings, so agreement between two reviewers is real corroboration.**

## 1. Determine scope

- If the user passed file paths as arguments, review exactly those.
- Otherwise, derive the changed files from the diff:
  `git diff --name-only HEAD` plus untracked (`git status --short`). Keep source files
  (`src/**`, `test/**`). If there is nothing to review, say so and stop.

State the file list you're reviewing in one line.

## 2. Determine the roster

Available reviewers: `security`, `performance`, `convention`, `duplication`, `structure`,
`tests`.

- If the user named reviewers in the arguments (e.g. `/deep-review tests structure src/x.ts`),
  run exactly those.
- If the user passed `all`, run all six.
- **With no reviewer list given, run the default three: `convention`, `duplication`,
  `structure`.**

State the roster you're running in one line.

### Reviewers

| Reviewer      | What it catches                                                                         | What it deliberately does NOT do                  | Model  |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| `security`    | Hardcoded secrets, tokens/PII in logs, reflected user input, missing zod, injection     | Performance, structure, or test quality           | sonnet |
| `performance` | Serial awaits over independent work, N+1 / redundant work, hot-path allocation, sync IO | Whether the code is well placed or well named     | sonnet |
| `convention`  | Swallowed errors, layering violations, ESM `.js` slips, validation & naming drift       | Invent style rules the repo doesn't hold          | sonnet |
| `duplication` | Logic that already exists elsewhere in the repo, repeated blocks, drifted copy-paste    | Judge whether the duplicated logic is **correct** | sonnet |
| `structure`   | Layer/placement, function & file size, boundaries, coupling — "how much must change?"   | Comment on **naming or style**                    | opus   |
| `tests`       | Coverage of the actual change, tautological assertions, deleted/skipped/weakened tests  | Review **production code quality**                | sonnet |

## 3. Dispatch the roster IN PARALLEL

Send **one message with one Agent tool call per selected reviewer** (so they run
concurrently), each scoped to the same file list, using `subagent_type`:
`security-reviewer`, `performance-reviewer`, `convention-reviewer`,
`duplication-reviewer`, `structure-reviewer`, `tests-reviewer`.

Give each the explicit list of files (absolute paths) and tell it to review only those.
Each returns a prioritized `BLOCKER/COMMENT/NIT` list with `file:line` and a one-line fix.

## 4. Synthesize ONE ranked list

- Merge all findings. **Deduplicate** the same `file:line` issue raised by more than one
  reviewer (keep the sharpest wording, note the overlap).
- Sort by severity: all **BLOCKER**, then **COMMENT**, then **NIT**. Within a tier, order by
  blast radius.
- Keep each finding to one line: `SEVERITY  file:line — problem — one-line fix  [tag]`
  where tag ∈ {sec, perf, conv, dup, struct, test}.

## 5. Emit a verdict

End with exactly one:

- **REQUEST-CHANGES** — any BLOCKER present.
- **APPROVE-WITH-NITS** — only COMMENT/NIT present.
- **APPROVE** — nothing of substance found.

Add a one-sentence rationale. Do not modify any files — this is a review.

## Eval

```
input:     src/core/scanner.ts (the file docs/demo/oz-102-candidate.diff changes)
expect:    flags the re-implemented concurrency helper, severity high
must not:  complain about naming
```
