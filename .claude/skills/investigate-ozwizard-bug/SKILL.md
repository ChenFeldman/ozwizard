---
name: investigate-ozwizard-bug
description: Lightweight 5-stage investigation flow for an OzWizard bug (wrong verdict, missed/extra finding, scan or escalation misbehavior). Use when triaging a bug report or an OZ-1xx ticket that needs root-cause + a fix + a regression test.
---

# investigate-ozwizard-bug

A disciplined, domain-aware flow. Don't jump to a fix — move through the stages. Capture
what you learn at the end.

Domain map (the request → logic path):
`src/api/{artifacts,routes}.ts` → `src/core/scanner.ts` (resolve + match) →
`src/core/policy.ts` (evaluate → verdict) → `src/store` (persist). Mock data lives in
`src/data/` (advisories, registry, sample-artifacts).

## Stage 1 — Reproduce & confirm

Pin the exact symptom. What artifact/manifest, what verdict/findings were produced, what was
expected? Reproduce with a test, a `POST /scans`, or a direct `evaluate(...)` call. If you
can't reproduce it, gather the missing detail before continuing.

## Stage 2 — Locate

Trace the flow for THIS case. Grep the path: which resolved deps (direct vs transitive),
which advisories matched, which policy branch ran. Narrow to the file+function responsible
(usually `scanner.ts` or `policy.ts`). Read `.claude/rules/core.md`.

## Stage 3 — Root cause

Explain _why_ the wrong output happens, mechanically — the specific line and condition
(e.g. a filter guarded by `dep.direct &&` dropping transitive matches; a swallowed error
defaulting to `allow`; a version-range off-by-one). State the root cause in one or two
sentences before touching code. Cross-check `docs/PLANTED.md` — the bug may be a known
planted issue tied to a ticket.

## Stage 4 — Minimal fix + regression test

Make the smallest change that fixes the root cause without breaking purity/determinism
(`.claude/rules/core.md`). **Write the failing test first** (the case that was missing), then
apply the fix so it goes green. Keep the diff tight.

## Stage 5 — Verify & record

Run `npm test` and `npm run lint`. Confirm the new test passes and nothing regressed. If the
bug touched the HTTP path, exercise it (`npm run dev` + curl). Then invoke **capture-learning**
to append what you learned to `docs/ai-learnings/` (root cause + how to prevent recurrence).
