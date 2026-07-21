# Policy verdicts (allow / warn / block)

> **When to load this:** Read before writing or reviewing anything in
> `src/core/policy.ts`, or any task about how findings become a verdict —
> thresholds, the denylist, transitive dampening, verdict precedence, or "why did
> this scan return allow/warn/block?". If a task reasons about _why_ a verdict
> came out the way it did, read this first — do not assume.

## Summary

`evaluate(findings, resolved, policy)` produces one `Verdict` — `allow | warn |
block` — from a scan's findings. Two independent inputs drive it: the **denylist**
(named packages blocked outright, even with no advisory) and **thresholds** (a
`Severity → Verdict` map applied to the highest _effective_ severity). "Effective"
matters because **transitive dampening** lowers a transitive finding's severity one
level before the threshold lookup. The verdict is the **most severe** outcome
across all rules (`block > warn > allow`). Denylist matches are surfaced as
synthetic findings so the output explains itself.

## The rules, in order

From `evaluate` in `src/core/policy.ts`:

1. **Denylist wins.** Any denylisted resolved dependency blocks outright, even
   with no known vulnerability. Each match is emitted as a synthetic finding
   (`advisoryId: 'POLICY-DENYLIST'`, `severity: 'critical'`, title "Package is
   denylisted by policy") so the verdict explains itself.
2. **Threshold by highest effective severity.** Each advisory finding's severity
   is mapped through `policy.thresholds` to a verdict; the run's verdict is the
   most severe of those (and of the denylist result).
3. **Transitive dampening.** When `policy.dampenTransitive` is true, a finding on
   a **transitive** dep has its severity lowered one level (`dampen`, clamped at
   `none`) _before_ the threshold lookup. Rationale: you control direct deps more
   directly than the ones they drag in.

Verdict precedence is `block(2) > warn(1) > allow(0)` via `maxVerdict` — verdicts
only ever escalate as rules fold in; they never downgrade.

## The default policy

`DEFAULT_POLICY` (served verbatim from `GET /policies`):

| Field              | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| `denylist`         | `['left-hand']`                                                           |
| `thresholds`       | `none→allow`, `low→warn`, `moderate→warn`, `high→block`, `critical→block` |
| `dampenTransitive` | `true`                                                                    |

So under defaults: a **direct** `high` finding → `block`; the **same** finding
**transitive** dampens `high→moderate` → `warn`. A `moderate` transitive dampens
to `low` → still `warn`. A `low` transitive dampens to `none` → `allow`.

## Severity and verdict vocabulary

- **Severity order** (`SEVERITIES`, least→most): `none < low < moderate < high <
critical`. Dampening walks this list left by N steps, clamped at `none`.
- **Verdict order** (`VERDICT_RANK`): `allow < warn < block`. `maxVerdict` keeps
  the more severe; the initial verdict is `allow` and only rises.
- Denylist findings are stamped `critical` regardless of any advisory, so a
  denylist hit always maps to `block` under any sane threshold set.

## Worked example

Artifact pulls in `log4jira@2.10.0` (advisory `OZW-2021-0001`, `critical`,
`<2.16.0`):

- **As a direct dep:** `critical` → threshold `block`. Verdict **block**.
- **As a transitive dep (defaults):** dampen `critical→high` → threshold `block`.
  Still **block**. (Dampening softens but doesn't rescue a critical here.)
- **A transitive `moderate` finding:** dampen `moderate→low` → threshold `warn`.
  Verdict **warn** (unless something else escalates it).

## Planted issues in this file (do NOT fix on sight)

Two defects in `policy.ts` are **deliberately planted** for the RCA exercise
(`docs/PLANTED.md`). Document/behave around them; only touch them under the
matching ticket or a review task.

- **B1 / OZ-103 — denylist is direct-only.** The denylist filter is guarded by
  `dep.direct &&`, so a **transitive** denylisted package is never turned into a
  blocking finding. A transitive `left-hand` with no separate advisory evaluates
  to **allow** — shipping a package policy forbids. Intended semantics: denylist
  applies to the _whole resolved set_. (`src/core/policy.ts:70`)
- **C1 — swallowed error in `thresholdFor`.** The threshold lookup is wrapped in
  `try/catch` that silently returns `'allow'` on any error — masking failures and
  defaulting to the _least_ safe verdict, against the "fail closed, never silently"
  rule in `.claude/rules/core.md`. (`src/core/policy.ts:54`)

## Gotchas newcomers miss

- **"Effective" ≠ "reported" severity.** The `Finding` keeps its original
  severity; dampening happens only inside the verdict computation. Don't expect the
  finding's `severity` field to reflect the dampened value.
- **Denylist blocks with zero advisories.** A verdict can be `block` with no CVE
  in play — the denylist is policy, not vulnerability.
- **Verdicts never downgrade.** No rule can turn a `block` back into a `warn`; the
  fold only escalates. A human override is a _separate_ concept — see escalations.
- **Dampening is one level, once.** It's not per-hop along the resolution path;
  transitive = one step down, full stop.
- **Don't reason from the code alone here.** Two planted bugs make the observed
  behavior diverge from the intended rules — cross-check against this page and
  `docs/PLANTED.md`.

## Related

- `src/core/policy.ts` — `evaluate`, `DEFAULT_POLICY`, `dampen`, `maxVerdict`,
  `thresholdFor`.
- `src/core/types.ts` — `PolicyConfig`, `Verdict`, `Severity`, `SEVERITIES`,
  `Evaluation`, `Finding`.
- `.claude/rules/core.md` — "explain every decision" / "fail closed" rules this
  module must honor.
- `docs/PLANTED.md` — B1 (OZ-103) and C1, the planted defects above.
- `docs/llm-wiki/package-types.md` — the sibling domain (how findings are
  produced, before policy turns them into a verdict).

---

<!-- Follows docs/llm-wiki/_TEMPLATE.md. Load-on-demand reference, not always-on. -->

**Last pruned:** 2026-07-21 — verified against `src/core/policy.ts`,
`src/core/types.ts`, and `docs/PLANTED.md` (B1, C1).
