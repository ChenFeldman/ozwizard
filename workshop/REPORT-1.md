# Workshop Prompt 1 — Report

Branch: `workshop-s1` · Tag: `s1-step1`

**BASELINE: 10 tests passing. Final: 16 tests passing (+6).**

## One thing I did not do (and why)

Step 3 asked for the 180-day advisory-age rule. Implementing it needs an advisory
publication date, which the advisory feed (`src/data/advisories.json`) did not carry.
I added an optional `publishedAt` to `Advisory`/`Finding` and threaded it through the
scanner, but I **did not back-date any advisory in `src/data/advisories.json`**.

Reason: `e2e/scan.spec.ts:24` asserts that the seeded `legacy-service` artifact
(`log4jira@2.10.0`, critical) evaluates to exactly `block`, and the comment at
`e2e/scan.spec.ts:11` says that assertion going red is the point of the test.
Back-dating that advisory past 180 days would flip it to `warn` and break an
existing test's covered behaviour, so per the instructions I stopped and recorded
it here instead. The rule itself is implemented and covered by unit tests; it is
reachable from a real scan as soon as a feed record carries an old `publishedAt`.

## Results

| Step | Item                                           | Status | Proof                                                                                                                                                     |
| ---- | ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Working tree clean                             | PASS   | `git status --porcelain` -> (no output)                                                                                                                   |
| 0    | Branch `workshop-s1` created                   | PASS   | `git checkout -b workshop-s1` -> `Switched to a new branch 'workshop-s1'`                                                                                 |
| 0    | Baseline green                                 | PASS   | `npm test` -> `Tests  10 passed (10)` — **BASELINE = 10**                                                                                                 |
| 1    | Thresholds + denylist located                  | PASS   | `DEFAULT_POLICY` literal was at `src/core/policy.ts:24` (denylist `['left-hand']`, thresholds none/low/moderate/high/critical)                            |
| 1    | `config/policy.json` created                   | PASS   | `npm run ws:check` -> `\| config/policy.json \| PASS \| present \|`                                                                                       |
| 1    | `config/denylist.json` created                 | PASS   | `npm run ws:check` -> `\| config/denylist.json \| PASS \| present \|`                                                                                     |
| 1    | Loaded from code, behaviour unchanged          | PASS   | `npm test` -> `Tests  12 passed (12)` (all 10 original assertions still green)                                                                            |
| 1    | `data/customers/acme.json` created             | PASS   | `npm run ws:check` -> `\| data/customers/acme.json \| PASS \| present \|`                                                                                 |
| 1    | `customerId` threaded through                  | PASS   | `npx tsc --noEmit` -> (no output); `CreateScanSchema.customerId` -> `policyForCustomer()` -> `evaluate()`                                                 |
| 1    | Two override unit tests                        | PASS   | `npm test` -> `Tests  12 passed (12)` — 12 >= BASELINE + 2                                                                                                |
| 2    | Denylist direct/transitive tests               | PASS   | `npm test` -> `Tests  16 passed (16)`; `ws:check` -> `\| Case 1 transitive denylist test \| PASS \| test/policy.test.ts \|`                               |
| 2    | Bug left unfixed                               | PASS   | `src/core/policy.ts:75` still reads `.filter((dep) => dep.direct && policy.denylist.includes(dep.name))`                                                  |
| 3    | 180-day downgrade implemented                  | PASS   | `npm run ws:check` -> `\| Case 2 advisory-age rule \| PASS \| src/core/policy.ts \|`                                                                      |
| 3    | Fresh-blocks / 200-days-warns tests            | PASS   | `npm test` -> `Tests  16 passed (16)` — 16 >= BASELINE + 4                                                                                                |
| 3    | `workshop/state/{before,after}/claude-rule.md` | PASS   | `ls workshop/state/*/claude-rule.md` -> both listed; `after` holds the rule line, `before` is empty                                                       |
| 3    | Rule NOT yet in CLAUDE.md                      | PASS   | `git status --short` -> (no output); `.claude/CLAUDE.md` unmodified in the commit                                                                         |
| 4    | Silent-allow path present & untouched          | PASS   | `npm run ws:check` -> `\| Case 3 silent-allow path \| PASS \| thresholdFor() returns 'allow' on error \|`                                                 |
| 5    | Tickets OZ-105..108 created                    | PASS   | `npm run ws:check` -> `\| Tickets OZ-105..108 \| PASS \| OZ-105, OZ-106, OZ-107, OZ-108 \|`                                                               |
| 6    | before/after settings snapshots                | PASS   | `npm run ws:before` -> `ws-state: activated "before"`                                                                                                     |
| 6    | `ws:before` + `ws:check`                       | PASS   | `npm run ws:check` -> `11/11 rows PASS` (Active state = `before`)                                                                                         |
| 6    | `ws:after` + `ws:check`                        | PASS   | `npm run ws:check` -> `11/11 rows PASS` (Active state = `after`)                                                                                          |
| 6    | `ws:reset` + `ws:check`                        | PASS   | `npm run ws:reset` -> `ws-state: seeded 3 sample artifacts` / `ws-state: reset complete`; `npm run ws:check` -> `11/11 rows PASS` (Active state = `none`) |
| 6    | Reset leaves a clean tree                      | PASS   | `git status --short` -> (no output)                                                                                                                       |
| 7    | Lint clean                                     | PASS   | `npm run lint` -> only pre-existing `[warn] .claude/settings.local.json` (git-ignored, untracked, not mine)                                               |

## Case 3 — silent-allow path

`src/core/policy.ts:47` — `function thresholdFor(policy, severity)`; the swallowing
`catch` that defaults to `allow` is at **`src/core/policy.ts:50-52`**:

```ts
try {
  return policy.thresholds[severity];
} catch {
  return 'allow';
}
```

Left exactly as found.

## Files created

- `config/policy.json` — global severity -> verdict mapping + `dampenTransitive`
- `config/denylist.json` — denylisted package names
- `data/customers/acme.json` — `{ "id": "acme", "overrides": {} }`
- `src/util/policyConfig.ts` — loads both config files and per-customer overrides; exports `DEFAULT_POLICY`, `loadPolicyConfig`, `loadCustomerOverrides`, `applyOverrides`, `policyForCustomer`
- `test/policyConfig.test.ts` — global mapping loads from `config/policy.json`; a one-severity override changes that customer's verdict and nobody else's
- `tickets/OZ-105.md`, `tickets/OZ-106.md`, `tickets/OZ-107.md`, `tickets/OZ-108.md`
- `scripts/ws-state.mjs` — `before` / `after` / `reset` / `check`
- `workshop/state/before/settings.json`, `workshop/state/after/settings.json`
- `workshop/state/before/claude-rule.md` (empty), `workshop/state/after/claude-rule.md`
- `workshop/REPORT-1.md`, `workshop/NOTES.md`

## Files modified

- `src/core/policy.ts` — `DEFAULT_POLICY` literal moved out to `src/util/policyConfig.ts` (core stays IO-free per `.claude/rules/core.md`); added the 180-day advisory-age downgrade and an optional `now` parameter to `evaluate()`
- `src/core/types.ts` — optional `publishedAt` on `Advisory` and `Finding`
- `src/core/scanner.ts` — carries `publishedAt` into findings in both scan paths
- `src/api/schemas.ts` — optional `customerId` on `CreateScanSchema`
- `src/api/routes.ts` — resolves the policy via `policyForCustomer(body.customerId)`, passes `new Date()` into `evaluate()`, serves `loadPolicyConfig()` from `GET /policies`
- `test/policy.test.ts` — import of `DEFAULT_POLICY` retargeted; four tests added (Case 1 x2, Case 2 x2)
- `.gitignore` — `/data/` -> `/data/*` + `!/data/customers/` so the customer records are tracked while the runtime store stays ignored; ignores `workshop/state/ACTIVE`, `workshop/.counters`, `.claude/audit.log`
- `package.json` — `ws:before`, `ws:after`, `ws:reset`, `ws:check`

## Notes for Prompt 2

- `workshop/state/before/settings.json` and `.../after/settings.json` are currently
  identical copies of the original `.claude/settings.json` (the two PostToolUse hooks).
  Prompt 2 changes the `after` copy.
- `ws:reset` deletes `.claude/settings.local.json` as specified. That file is
  git-ignored and untracked, so it is not restorable from git — I backed the
  facilitator's copy up and put it back after verifying the reset cycle.
- `ws:check` reads the Case 1 / Case 2 / Case 3 markers out of the source, so if a
  participant "fixes" a trap the corresponding row goes FAIL and the script exits 1.
