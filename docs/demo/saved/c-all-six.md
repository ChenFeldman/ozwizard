# Saved run C — all six reviewers

**Input:** `docs/demo/oz-102-candidate.diff` (the OZ-102 candidate PR, never applied)
**Roster:** `security`, `performance`, `convention`, `duplication`, `structure`, `tests` —
all six, each read-only in its own context, none seeing the others' findings.

---

## Ranked findings

```
BLOCKER  src/core/taskPool.ts:132 — runPooled is a re-implementation of mapLimit, which already exists at src/util/collections.ts:6 and is already covered by test/collections.test.ts: identical bounded-worker/cursor pattern (a shared cursor counter, Math.min(limit, items.length) workers, Promise.all, positional results array) and the same (item, index) callback signature. The two copies also disagree — mapLimit throws RangeError on limit < 1, runPooled silently treats <= 0 as unbounded — so the repo would carry two bounded-map helpers with opposite contracts, plus test/taskPool.test.ts duplicating what test/collections.test.ts already asserts. Delete src/core/taskPool.ts and test/taskPool.test.ts and call mapLimit from scanner.ts  [dup]
BLOCKER  src/core/scanner.ts:145 — scanDependenciesLive now schedules its own concurrent IO, which docs/design/OZ-102.md records as rejected ("Overlapping the loop inside scanDependenciesLive… it puts scheduling and IO into the pure layer"). Purity of the pool is not the test — the decision was to gather advisory data at the fetch boundary and hand core an already-gathered array. Cost: core keeps loadAdvisorySource/refreshAdvisories forever, scanner.ts can never be tested without a fake feed, and the note's acceptance line "src/core/ gains no IO, no timers, and no scheduling" is not met  [struct]
BLOCKER  src/core/taskPool.ts:1 — a bounded worker pool placed in src/core/; docs/design/OZ-102.md lists "Putting a bounded worker pool in src/core/" under "Explicitly rejected" and names src/util/ as its home. As written it is a generic array utility trapped in the domain layer — nothing outside src/core/ can reach it without importing across the boundary — move the file and its test to src/util/  [struct]
BLOCKER  test/scanner.test.ts:33 — the existing happy-path test is switched to it.skip with "// TODO(OZ-102): flaky under parallel scan, re-enable once ordering is settled". The premise is false: that test calls scanDependencies, the synchronous function this diff does not touch, with no async and no contact with runPooled — it was applied in a throwaway worktree and run unchanged against the patched tree, and it passes. It is also the suite's only assertion on finding content (advisoryId, severity, the direct true/false split, and the transitive path ['config-loader@1.0.0','netfetch@1.2.0']), which is precisely the .claude/rules/core.md "explain every policy decision" contract. A deleted or skipped test is a blocker regardless of the rest of the change — drop the .skip and the TODO  [test, conv, dup, struct, sec, perf]
BLOCKER  test/scanner.test.ts:62 — the replacement test is titled "live scan returns the same findings as the serial scan" but never calls the serial scan; expect(findings).toHaveLength(2) passes even if order, direct flags, or advisory ids are all wrong. Net scanner-coverage delta for this diff: strong assertions deleted, a length check added. Write expect(await scanDependenciesLive(resolved, ADVISORIES, 'npm')).toEqual(scanDependencies(resolved, ADVISORIES)) — verified to hold over 200 iterations at pool sizes 8, 1 and 0  [test]
BLOCKER  src/core/scanner.ts:145 — parallelizing the per-dependency loadAdvisorySource amplifies the per-repository ecosystem cost (docs/llm-wiki/package-types.md): for deb the retrieval unit is the whole repository index, so N deps still parse the entire index N times — the pool removes no parses, it just runs 8 of them at once, turning a linear slowdown into a concurrent CPU/memory burst on the request path  [conv]
COMMENT  src/core/scanner.ts:143 — the new matchOne duplicates the advisory-match loop still inline in scanDependencies (src/core/scanner.ts:92-106); the extraction added a copy instead of removing one, so the 7-field Finding literal now exists twice — fold scanDependencies onto matchOne  [dup, struct]
COMMENT  src/api/routes.ts:12 — SCAN_POOL_SIZE is declared in the route and threaded into core as a 4th parameter of scanDependenciesLive, so a socket-ceiling knob now sits in a pure signature: routes.ts:51, scanner.ts:75-81 and both scanner tests move together on any change to it. It also duplicates DEFAULT_POOL_SIZE = 8, and CLAUDE.md puts tunables in src/util/config.ts (env-only)  [struct, dup, conv, test]
COMMENT  src/core/taskPool.ts:38 — on first rejection Promise.all rejects but the remaining runners keep advancing the cursor and issuing upstream lookups for a request that has already errored, and the error names no dependency — set a stopped flag in a catch and check it at the top of the runner loop  [test]
COMMENT  test/taskPool.test.ts:1 — the new pool tests cover only happy paths: no rejection case (where out is returned with holes) and no empty-input case, though an artifact with zero dependencies is a realistic POST /scans input  [test]
COMMENT  test/taskPool.test.ts:1 — the first two cases duplicate test/collections.test.ts:6-20 outright: same in-flight/peak counter pattern, same order assertion, for the same algorithm. Falls out with the taskPool deletion  [dup]
COMMENT  src/core/scanner.ts:145 — scanDependenciesLive now does three jobs in one function: gather advisory data over the network, schedule that gathering, and match. The matchOne extraction is the right half of the split; the missing half is lifting the gather out  [struct]
NIT      test/taskPool.test.ts:41 — expect(DEFAULT_POOL_SIZE).toBeGreaterThan(1) is vacuous; it passes for 2 and for 2000 — assert the value or drop the case  [test]
NIT      src/core/taskPool.ts:23 — "pass 0 for no ceiling" is a surprising overload on an IO path: a config value arriving as 0 uncaps the pool rather than failing loudly  [test]
NIT      src/core/scanner.ts:142 — matchOne re-checks advisory.package === dep.name, which loadAdvisorySource already filtered on  [struct, generalist-overlap]
```

**REQUEST-CHANGES** — six blockers. The change re-implements a helper the repo already
owns and tests, lands in both placements the design note rejects by name, disables the
suite's strongest existing test on a premise that does not hold, and replaces it with an
assertion that cannot fail for any reason worth catching.

---

## What the extra three reviewers bought

Against run B (`convention`, `duplication`, `structure`), adding `security`, `performance`
and `tests` produced one new blocker and several sharper comments:

- **`tests` found the second test blocker** — that the replacement test never makes the
  comparison its name promises. Run B had that as a COMMENT; the tests reviewer applied
  the diff in a throwaway worktree, ran it, and came back with the correct assertion plus
  evidence it holds at three pool sizes.
- **`security` found nothing** — correctly. No secrets, no PII, no reflected input, and
  `SCAN_POOL_SIZE` is an internal constant, not user input.
- **`performance` reported no blocker at all**, and called the parallelization sound. It is
  right within its charter: the serial-await hot spot really is fixed. It is also the
  clearest illustration of why a roster is not a vote — a reviewer scoped to wall-clock has
  no reason to ask whether the helper already existed or whether the placement was already
  decided.

Read the corroboration off the tags: the skipped test was raised independently by all six,
which is why it ranks where it does. The re-implemented helper carries a single tag —
`[dup]` — which is exactly what `eval-green-red-green.md` exploits.
