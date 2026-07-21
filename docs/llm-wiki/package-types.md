# Package types (ecosystems) in OzWizard

> **When to load this:** Read before writing or reviewing any code that branches
> on a manifest's `ecosystem`, groups ecosystems together, loads advisory data,
> or reasons about scan cost/timeouts. If a task mentions `npm`, `pypi`, `deb`,
> Maven, or "the ecosystem field" — do not assume behavior, read this first.

## Summary

An artifact declares one `ecosystem` string (a.k.a. **package type**); OzWizard
resolves deps and matches advisories the same _logically_ for all of them, but the
**cost and unit of advisory retrieval differ per type**. The trap: the code path
looks identical across ecosystems, so ecosystems get lumped into one group — and
that grouping is wrong for `deb`, whose advisory metadata is per-**repository**,
not per-package. Ecosystem is a free-form validated string with a default of
`npm`; unknown values are accepted, so never assume the set is closed.

## Where `ecosystem` lives

- **Type:** `Manifest.ecosystem` and `Artifact.ecosystem` are plain `string`
  (`src/core/types.ts`). There is no enum — the domain deliberately does not
  close the set.
- **Validation:** `CreateArtifactSchema` in `src/api/schemas.ts` accepts any
  non-empty string and **defaults to `'npm'`** when omitted. So an artifact
  always has an ecosystem, but it can be a value the scanner has never seen.
- **Flow-through:** indexer copies it verbatim (`src/core/indexer.ts`); the scan
  route reads `artifact.ecosystem` and passes it into `scanDependenciesLive`
  (`src/api/routes.ts`), which is the only place ecosystem changes behavior.

## The types OzWizard knows about

| Ecosystem     | Default? | Advisory retrieval unit                                          | Notes                                                                                                                                                               |
| ------------- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm`         | yes      | **per package** — one small record per lookup                    | The default; safe to process one dependency at a time inside a request.                                                                                             |
| `pypi`        | no       | **per package**                                                  | Same shape/cost as npm.                                                                                                                                             |
| `deb`         | no       | **per repository** — one giant index lists thousands of packages | The odd one out. See "The `deb` gotcha". Full write-up: `docs/package-facts/deb.md`.                                                                                |
| anything else | no       | unknown                                                          | Accepted by validation; scanner currently treats non-listed types as "not per-package" (falls through). Don't assume it's handled correctly — treat as unspecified. |

`PER_PACKAGE_ECOSYSTEMS` in `src/core/scanner.ts` is the one place the set is
enumerated in code. Today it is `{ 'npm', 'pypi', 'deb' }`.

## Per-type metadata rules

- **`npm` / `pypi` — per-package feeds.** To check one dependency you fetch one
  small advisory record. It is fine to do this lookup _inside_ the per-dependency
  loop of a scan: each fetch is cheap and independent. This is the mental model
  most people carry, and it is correct for these two.
- **`deb` — per-repository feed.** A Debian repository publishes a single index
  (the `Packages` / `Sources` file) listing thousands of packages at once. There
  is **no cheap "just this one package" fetch** — the unit of retrieval and parse
  is the whole repository index. The correct model is: **pre-compute/ingest the
  index once (offline or cached) into a per-package lookup table**, then have the
  request read from that table. The request path must never parse a `deb` index —
  not per dependency, not even once per request.
- **Unknown types.** Because validation is open, treat an unrecognized ecosystem
  as "retrieval semantics unknown". Don't silently fold it into the per-package
  group; that is precisely the mistake that makes `deb` wrong.

## The `deb` gotcha (why grouping ecosystems is dangerous)

This is the single most important thing on this page. `deb` is grouped with
`npm`/`pypi` in `PER_PACKAGE_ECOSYSTEMS`, and the code path for all three looks
identical — so a reviewer skimming the code sees nothing wrong. But:

- For an artifact with **N** `deb` dependencies, loading the source _inside_ the
  per-dependency loop parses the entire repository index **N times per request**.
- On a real `deb` index that is seconds of parse work per pass, so a handful of
  deps blows past the **30-second request timeout** and the scan fails.
- **The mock data hides this.** OzWizard's in-memory advisory list is tiny, so the
  demo runs fine; the structural defect only bites against a real repository. That
  is why this class of bug is _invisible in the code and invisible in the demo_ —
  catchable only if you know the per-repository fact.

Rule of thumb: **cost, not correctness, is what differs between package types
here.** Two ecosystems can produce identical findings while one of them silently
does thousands of times more work. When you touch ecosystem-branching code, ask
"what is the retrieval _unit_ for this type?" not just "does it return the right
advisories?".

## How ecosystem does — and doesn't — affect results

- **Does NOT affect:** dependency resolution (`resolveDependencies` is
  ecosystem-agnostic — it walks the mock registry graph identically for every
  type), severity matching logic, or policy evaluation. Findings for the same
  deps are the same regardless of ecosystem.
- **DOES affect:** _how advisory data is loaded_ on the live scan path
  (`loadAdvisorySource` / `scanDependenciesLive`). This is the only behavioral
  fork, and it is about IO shape and cost, not verdicts.

## Gotchas newcomers miss

- **`ecosystem` is not an enum.** It's an open string defaulting to `npm`. Code
  that `switch`es on it needs a real default branch; don't assume a closed set.
- **`deb` is mis-grouped on purpose in this teaching repo.** It sits in
  `PER_PACKAGE_ECOSYSTEMS` even though it is per-repository. Do **not** "fix" this
  on sight — it is a planted teaching issue (see `docs/PLANTED.md`). Only touch it
  when working the matching ticket or an explicit review task.
- **The demo passing proves nothing about `deb` cost.** Tiny mock data masks the
  per-repository blow-up. Reason from the fact, not from "it ran".
- **Same findings ≠ same work.** Don't conclude two ecosystems are equivalent
  because they yield the same findings; their retrieval cost can differ by orders
  of magnitude.

## Related

- `docs/package-facts/deb.md` — the canonical, deeper write-up of the `deb`
  per-repository fact (also referenced directly from `CLAUDE.md`).
- `src/core/scanner.ts` — `PER_PACKAGE_ECOSYSTEMS`, `loadAdvisorySource`,
  `scanDependenciesLive`.
- `src/core/types.ts` — `Manifest`, `Artifact` (the `ecosystem` field).
- `src/api/schemas.ts` — `CreateArtifactSchema` (validation + `npm` default).
- `docs/PLANTED.md` — which of the above are deliberately planted issues.

---

<!-- Follows docs/llm-wiki/_TEMPLATE.md. Load-on-demand reference, not always-on. -->

**Last pruned:** 2026-07-21 — verified against `src/core/scanner.ts`,
`src/core/types.ts`, `src/api/schemas.ts`, and `docs/package-facts/deb.md`.
