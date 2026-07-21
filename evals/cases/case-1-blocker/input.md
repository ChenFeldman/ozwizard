# Case 1 — blocker

Run a deep review over the file that contains the planted security BLOCKER
(S1: a hardcoded secret / API-key fallback).

**Files under review:** `src/util/config.ts`

**Command:**

```
/deep-review src/util/config.ts
```

Capture the full deep-review output (the ranked findings + the verdict). Then
judge it against this case's `expected.md` using `evals/judge.md`.
