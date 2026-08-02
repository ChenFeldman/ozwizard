# Saved run — the eval: green → red → green

The three-line eval from `docs/demo/final/deep-review-SKILL.md`:

```
input:     src/core/scanner.ts (the file docs/demo/oz-102-candidate.diff changes)
expect:    flags the re-implemented concurrency helper, severity high
must not:  complain about naming
```

Judged with `.claude/skills/deep-review/evals/judge.md`: one question, no partial credit — did the run flag the thing
`expect` asked for, and did it stay off what `must not` forbids?

An eval you have never seen fail is not an eval. So it is run three times: once whole, once
with the `duplication` reviewer taken out of the roster, and once whole again.

---

## 1. GREEN — default roster (`convention`, `duplication`, `structure`)

The duplication reviewer's first blocker:

> **BLOCKER** `src/core/taskPool.ts:22` — `runPooled` re-implements `mapLimit`
> (`src/util/collections.ts:6`), same worker-cursor pool logic (shared cursor counter,
> `Math.min(size, items.length)` worker count, `Promise.all`) — delete `taskPool.ts` and
> have `scanner.ts` import `mapLimit` instead.

| Check      | Result                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `expect`   | ✅ the re-implemented helper is flagged, at BLOCKER (high), and the other copy is named                              |
| `must not` | ✅ no finding about naming — `runPooled` vs `mapLimit` is raised as one algorithm in two places, never as a bad name |

**Judge: PASS** ✅

---

## 2. RED — same input, `duplication` removed (`convention`, `structure`)

Nothing else in the roster reports it.

- `convention` returns its blockers on the skipped test and on the per-repository
  ecosystem cost. It never mentions `mapLimit` or `src/util/collections.ts`.
- `structure` returns two blockers on **placement** — the pool is in `src/core/` and the
  scheduling is inside the scanner loop, both rejected by name in
  `docs/design/OZ-102.md`. It does not report that the helper already exists: "another
  copy of this logic already exists at X" is outside its charter, and its instructions
  tell it to drop such a finding rather than downgrade it.

The merged run is still **REQUEST-CHANGES** — the gate is not silent, it still blocks the
PR. But it blocks it for the wrong reasons: **no finding anywhere in the run says the
helper already existed.**

| Check      | Result                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `expect`   | ❌ the re-implemented helper is not flagged by any reviewer in the run |
| `must not` | ✅ still no naming complaint                                           |

**Judge: FAIL** ❌

> This is the point of the run. A verdict of REQUEST-CHANGES looks like success from the
> outside; the eval is what tells you the gate stopped catching the specific thing it was
> built to catch. Note also why removal is decisive here where `.claude/skills/deep-review/evals/run.md` warns that
> dropping one of the original three reviewers is not: the six charters are disjoint on
> purpose, and the structure reviewer is explicitly forbidden from covering for the
> duplication reviewer. Overlapping reviewers make a gate feel robust and make its eval
> untestable.

---

## 3. GREEN — `duplication` restored (`convention`, `duplication`, `structure`)

Same roster as step 1, run again from scratch:

> **BLOCKER** `src/core/taskPool.ts:132` — `runPooled` is a re-implementation of
> `mapLimit`, which already exists at `src/util/collections.ts:6` and is already covered by
> `test/collections.test.ts`: identical bounded-worker/cursor pattern … the two copies also
> disagree — `mapLimit` throws `RangeError` on `limit < 1`, `runPooled` silently treats
> `<= 0` as unbounded.

| Check      | Result                                                    |
| ---------- | --------------------------------------------------------- |
| `expect`   | ✅ flagged at BLOCKER, other copy named, drift called out |
| `must not` | ✅ no naming complaint                                    |

**Judge: PASS** ✅

---

## Result

| Step | Roster                             | Judge   |
| ---- | ---------------------------------- | ------- |
| 1    | convention, duplication, structure | PASS ✅ |
| 2    | convention, structure              | FAIL ❌ |
| 3    | convention, duplication, structure | PASS ✅ |

Green → red → green. The eval moves when the gate moves, which is the only evidence that
it is testing the gate and not just re-describing a run that happened to go well.
