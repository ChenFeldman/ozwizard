---
name: deep-review
description: Reviews named files by dispatching read-only security, performance, and convention sub-agents in parallel and merging their findings into one ranked list and a verdict — use before shipping a change, invoked explicitly as /deep-review [files...].
disable-model-invocation: true
---

# deep-review

## What this does and when

One orchestrator, three read-only reviewers, one answer. Use it on a change you are about
to ship, when a single generalist pass would miss things because it is trying to hold
security, performance and convention in its head at once. Each reviewer runs in its own
context and never sees the others' findings, so when two of them land on the same line,
that is real corroboration and not an echo.

## Input

- `/deep-review src/a.ts src/b.ts` — review exactly those files.
- `/deep-review` — derive scope from `git diff --name-only HEAD` plus untracked files from
  `git status --short`, keeping `src/**` and `test/**`. Nothing to review ⇒ say so and stop.

## Output

One ranked list, one line per finding, then exactly one verdict line.

```
SEVERITY  file:line — problem — one-line fix  [tag]        tag ∈ {sec, perf, conv}
```

- **REQUEST-CHANGES** — any BLOCKER present.
- **APPROVE-WITH-NITS** — only COMMENT/NIT present.
- **APPROVE** — nothing of substance found.

Plus a one-sentence rationale. No files are modified — this is a review.

## Flow

1. **Scope** — resolve the file list, state it in one line.
2. **Dispatch** — one message, three `Agent` calls, so they run concurrently. Give each the
   absolute paths and tell it to review only those.
3. **Synthesize** — merge; deduplicate the same `file:line` raised twice (keep the sharper
   wording, note the overlap); sort BLOCKER → COMMENT → NIT, and within a tier by blast
   radius.
4. **Verdict** — emit one of the three above.

Run this inline. Do **not** fork the orchestrator.

## Sub-agents used

| `subagent_type`        | Catches                                                                | Model  |
| ---------------------- | ---------------------------------------------------------------------- | ------ |
| `security-reviewer`    | Hardcoded secrets, tokens/PII in logs, reflected input, injection      | opus   |
| `performance-reviewer` | Serial awaits over independent work, N+1, hot-path allocation, sync IO | sonnet |
| `convention-reviewer`  | Swallowed errors, layering violations, ESM `.js` slips, naming drift   | haiku  |

All three are read-only: `Read`, `Grep`, `Glob`. None can edit.

The roster deliberately mixes models rather than running one everywhere: the charters
that need open-ended judgement about whether something is exploitable get the expensive
model, while the ones that pattern-match code against a standard already written down in
`.claude/rules/` get the cheap one.

## References

- `.claude/rules/api.md` — validate-at-the-edge rules for `src/api/**`.
- `.claude/rules/core.md` — purity/determinism rules for `src/core/**`.
- `docs/llm-wiki/index.md` — load-on-demand long reference; read before judging
  package-type or ecosystem behaviour.
- `docs/package-facts/deb.md` — per-type quirks a reviewer is expected to know.
- `docs/PLANTED.md` — issues planted for teaching. Reviewers **report** them; nobody fixes
  them on sight.

## Limits

- Reviews only the files it is given. A bug caused by a file outside scope is invisible.
- Three charters only — no duplication, structural, or test-coverage reviewer. Logic that
  already exists elsewhere in the repo will not be flagged.
- Static reading only. Nothing is executed, so no finding is backed by a failing test.
- Wording and line numbers drift between runs; only the _issue_ is stable. That is why the
  eval is judged by a model and not by string match.
- The three charters overlap on glaring issues, so a single missing reviewer is often
  covered by the others — see `evals/run.md`.
- Read-only by construction. It will never fix what it finds.

## Eval

Lives in `evals/`, next to this file. Each case is three lines — one in `input.md`, two in
`expected.md` — judged by `evals/judge.md`. Latest verdicts: `evals/results/latest.md`.

```
input:     src/util/config.ts — roster: security, performance, convention
expect:    BLOCKER — hardcoded ADVISORY_API_KEY fallback in src/util/config.ts
must not:  flag the zod defaults for PORT/HOST/LOG_LEVEL — they are intended
```
