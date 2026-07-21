# Case 2 — clean

Run a deep review over a clean file (no planted issue; not listed in
`docs/PLANTED.md`).

**Files under review:** `src/core/types.ts`

**Command:**

```
/deep-review src/core/types.ts
```

Capture the full deep-review output (the ranked findings + the verdict). Then
judge it against this case's `expected.md` using `evals/judge.md`.
