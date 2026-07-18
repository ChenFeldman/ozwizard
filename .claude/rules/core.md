---
paths:
  - 'src/core/**'
---

# Rules for `src/core/**` (pure domain logic)

This is the brain: indexing, scanning, policy evaluation, escalations. It must be
**pure and deterministic** so it is trivially testable and behaves identically everywhere.

- **No IO, no ambient state.** No file/network access, no `process.env`, no `Date.now()`,
  no `Math.random()` inside logic. Need a timestamp or id? Take it as a parameter (see how
  `indexArtifact`/`recordEscalation` accept `now`). The advisory DB, registry, and policy
  config are **inputs**, never imported for side effects.
- **Deterministic output.** Same inputs → same findings and verdict, every time. Don't
  depend on object key order or array order beyond what you construct.
- **Explain every policy decision.** A verdict is not enough — emit findings that say
  _why_: the advisory id, severity, whether the dependency is **direct or transitive**,
  its resolution path, and how thresholds/denylist/dampening produced the verdict. A
  reviewer or student must be able to reconstruct the reasoning from the output.
- **Fail closed, never silently.** Don't wrap logic in a `try/catch` that swallows and
  defaults to `allow` — that turns a fault into a security bypass. Surface the problem.
- **Transitive deps are first-class.** Denylist and severity rules must consider the whole
  resolved set (direct + transitive), not just direct dependencies.
- **Keep functions small and named for the concept** (`resolveDependencies`, `evaluate`).
  No HTTP, no store internals here — depend only on `types.ts` and injected data.
