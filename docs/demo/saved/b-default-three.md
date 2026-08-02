# Saved run B — the default roster: convention, duplication, structure

**Input:** `docs/demo/oz-102-candidate.diff` (the OZ-102 candidate PR, never applied)
**Roster:** `convention`, `duplication`, `structure` — the default when `/deep-review` is
given no reviewer list. Each ran read-only in its own context and never saw the others.

---

## Ranked findings

```
BLOCKER  src/core/taskPool.ts:22 — runPooled re-implements mapLimit (src/util/collections.ts:6): same shared-cursor worker pool, same Math.min(size, items.length) fan-out, same Promise.all join, same positional-results contract. mapLimit is already covered by test/collections.test.ts, so this is a second unreferenced copy of tested code — and the two disagree, mapLimit throwing RangeError on limit < 1 where runPooled silently treats <= 0 as unbounded — delete src/core/taskPool.ts and test/taskPool.test.ts and import mapLimit in scanner.ts  [dup]
BLOCKER  src/core/scanner.ts:145 — scanDependenciesLive now schedules its own concurrent IO, the option docs/design/OZ-102.md rejects by name ("Overlapping the loop inside scanDependenciesLive … It is the wrong spot"), against .claude/rules/core.md's no-IO/deterministic rule for src/core/**. The note's shape is to gather advisory data at the fetch boundary and hand core an already-gathered array, which would remove refreshAdvisories/loadAdvisorySource from core rather than schedule them in place — as written, routes.ts:51 and every future core test of the live path inherit a fake-feed/timing dependency  [struct]
BLOCKER  src/core/taskPool.ts:1 — a bounded worker pool placed in src/core/, which docs/design/OZ-102.md lists under "Explicitly rejected" and whose home it names as src/util/; it is a generic array-mapping utility with no scan vocabulary in it, so any future non-scan caller has to reach into the domain layer to get at it  [struct]
BLOCKER  test/scanner.test.ts:33 — the existing happy-path test is switched to it.skip with "flaky under parallel scan, re-enable once ordering is settled". The reason is false: that test calls scanDependencies, the synchronous function this diff never touches. It is also the only assertion in the repo on advisoryId, severity, the direct true/false split, and the transitive path — exactly what .claude/rules/core.md requires be provable — un-skip it  [conv, dup, struct]
BLOCKER  src/core/scanner.ts:145 — parallelizing the per-dependency loadAdvisorySource amplifies the per-repository ecosystem cost (docs/llm-wiki/package-types.md): for deb the retrieval unit is the whole repository index, so N deps still parse it N times and the pool just runs 8 of those parses at once — a concurrent CPU/memory burst rather than a fix, on exactly the large artifact OZ-102 targets  [conv]
COMMENT  src/core/scanner.ts:143 — the new matchOne duplicates the advisory-match loop still inline in scanDependencies (src/core/scanner.ts:92-106); the extraction added a copy instead of removing one, so the 7-field Finding literal now exists twice in one file — fold scanDependencies onto matchOne  [dup]
COMMENT  src/api/routes.ts:21 — a socket-ceiling knob is now the 4th parameter of a core matching function and is threaded from the route; routes.ts, scanner.ts:145 and taskPool.ts move together on any change to how concurrency is bounded. Under the design note's shape the bound lives entirely at the boundary and never appears in a core signature  [struct]
COMMENT  src/api/routes.ts:13 — SCAN_POOL_SIZE = 8 is a hardcoded tuning constant in a route file and a second copy of DEFAULT_POOL_SIZE = 8 (src/core/taskPool.ts:123), while CLAUDE.md puts service configuration in src/util/config.ts (env-only)  [struct, conv, dup]
COMMENT  test/scanner.test.ts:62 — the replacement test is named "live scan returns the same findings as the serial scan" but only asserts toHaveLength(2); it never calls the serial scan — assert toEqual(scanDependencies(resolved, ADVISORIES))  [conv]
NIT      src/core/scanner.ts:142 — extracting matchOne is the right split (fetch vs. match) and the one piece worth keeping if the rest moves to the boundary; it does re-check advisory.package === dep.name, which loadAdvisorySource already filtered on  [struct]
```

**REQUEST-CHANGES** — five blockers. The change re-implements a helper the repo already
owns and tests, and lands in the two placements the design note rejects by name.

---

## What changed versus run A

Three reviewers, same diff. Two findings appear here that one generalist did not produce:

- **`runPooled` re-implements `mapLimit`** (`src/util/collections.ts:6`). The duplication
  reviewer found it because its instructions force it to glob `src/util/**` and grep for
  the _shape_ of every new function before reporting — never the name. `runPooled` and
  `mapLimit` share no identifier at all, so nothing in the diff could have led there.
- **The placement is a BLOCKER, not a NIT.** The structure reviewer reads
  `docs/design/OZ-102.md` before judging placement, so "scheduling inside the scanner
  loop" stopped being a matter of taste and became a decision this PR overrides.

Note also what corroboration buys: the skipped test was raised independently by all three,
which is why it sits high in the list rather than being argued about.

Note what the charters buy: the structure reviewer noticed the helper already existed and
**dropped that finding**, because "another copy exists at X" belongs to the duplication
reviewer. That discipline is what makes `eval-green-red-green.md` able to go red.
