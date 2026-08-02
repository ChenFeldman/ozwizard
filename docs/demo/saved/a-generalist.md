# Saved run A — one generalist review, no sub-agents

**Input:** `docs/demo/oz-102-candidate.diff` (the OZ-102 candidate PR, never applied)
**Roster:** none — a single reviewer reading the diff the way anyone would in a PR tab.

This is the baseline. Read it first, then read `b-default-three.md`. The gap between them
is the whole argument for sub-agents.

---

## Review

```
BLOCKER  test/scanner.test.ts:33 — an existing, passing test is disabled with `it.skip` and a false justification ("flaky under parallel scan, re-enable once ordering is settled"); it exercises `scanDependencies`, a synchronous function this PR does not touch, so it cannot be affected by the pool — this silently drops the only coverage of the direct+transitive happy path — remove `.skip` and, if it actually fails, fix the code rather than the test.

BLOCKER  src/core/scanner.ts:163 (`scanDependenciesLive`) — the loop is parallelized but `loadAdvisorySource` is still called once per dependency, and for `deb` the advisory unit is the whole repository index, not a package: N deps still parse the full index N times, and now up to 8 of those giant parses are in flight simultaneously, trading a linear slowdown for a concurrent memory/CPU spike on the request path — so the ticket's goal ("noticeably faster on large artifacts") is not met for `deb`, and reliability gets worse — load the source once outside the per-dependency path for per-repository ecosystems and only fan out the genuinely per-package ones (`npm`/`pypi`).

COMMENT  test/scanner.test.ts:62 — the new test is named "returns the same findings as the serial scan" but only asserts `toHaveLength(2)`; it verifies neither equality with the serial result nor the ordering the skipped test was blamed for — assert `expect(findings).toEqual(scanDependencies(resolved, ADVISORIES))`, which covers content and order in one line.

COMMENT  src/api/routes.ts:21 — `SCAN_POOL_SIZE = 8` duplicates `DEFAULT_POOL_SIZE = 8` in `taskPool.ts`, so the knob now has two sources of truth that will drift, and it is hardcoded where CLAUDE.md says tunables come from the environment — drop the argument at the call site (let the default apply) or read it from `src/util/config.ts`.

COMMENT  src/core/taskPool.ts:38 — on the first rejection `Promise.all` rejects but the other runners keep pulling from `cursor` and keep hitting upstream, and the error carries no context about which dependency failed — stop the cursor on first failure (or wrap the task error with the item index).

NIT      src/core/taskPool.ts:12 — a concurrency runner is IO-scheduling machinery living in `src/core/**`, which the core rules define as pure domain logic; `src/util/` is the more honest home — move it, or note explicitly why it is core.

NIT      src/core/taskPool.ts:23 — "pass 0 for no ceiling" exposes unbounded fan-out at an upstream feed as a supported mode with no caller that needs it — drop the escape hatch and always clamp.

NIT      src/core/scanner.ts:142 (`matchOne`) — `advisory.package === dep.name` re-checks what `loadAdvisorySource` already filtered on; carried over from the old loop but now visible in a fresh function — drop the redundant condition or add a comment saying it is defensive.
```

**REQUEST-CHANGES** — the PR silently disables a healthy test on a false pretext, and the
parallelism it adds does not address the actual cost driver for per-repository ecosystems
while adding concurrent index-parse pressure to the request path.

---

## What this run missed

This is a genuinely good review. It catches the skipped test, it catches the `deb`
retrieval-unit problem, it even notices — as a **NIT** — that a scheduler in `src/core/**`
is odd.

It still misses the two things the workshop is about:

1. **`runPooled` is a re-implementation of `mapLimit`, which already exists at
   `src/util/collections.ts:6` and is already tested.** Not mentioned anywhere. Nothing in
   the diff hints at it, and a reviewer working from the diff has no reason to go looking
   in `src/util/` for a helper under a different name.
2. **The placement is not a NIT — `docs/design/OZ-102.md` explicitly rejects it by name.**
   Without reading that note, "scheduling in core" reads as a style preference worth a NIT
   rather than a decision the PR overrides.

Both misses have the same cause: one reviewer, one context, working from the diff. Neither
is a reasoning failure — they are search failures, and that is what a roster fixes.
