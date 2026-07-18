# METHOD — teaching design (facilitator only)

> **Facilitator / IP material.** This file (and any `docs/METHOD_*.md`) is stripped from
> the participant build. Keep methodology and IP prose here so an open-source strip is a
> one-line delete. Do not reference it from participant-facing docs.

## Purpose of OzWizard as a teaching vehicle

OzWizard is intentionally small but "real-shaped": an HTTP edge, a pure core with genuine
business rules (transitive dependency policy), persistence behind an interface, a web
slice, tests, and an AI harness. That shape lets a workshop exercise the full loop —
onboarding an assistant to a codebase, path-scoped rules, multi-agent review, MCP, and
investigation — without the noise of a large system.

## Planted-issue methodology

The deliberate defects (answer key in `docs/PLANTED.md`) are designed to be **realistic and
subtly hidden**, not toy bugs:

- **One issue per class, each in a predictable file** so facilitators can map a finding to a
  learning objective (security / performance / convention / business-logic).
- **Latent-by-design where possible.** The business-logic bug (transitive denylist bypass,
  OZ-103) passes the existing test suite because current tests only cover the _direct_ case.
  This forces real RCA and a _new_ regression test rather than "make the red test green."
- **Tickets are deliberately under-specified** (OZ-101…104) to train the reflex of
  _investigating before coding_ — e.g. OZ-101 gives no `.toml` example on purpose, so the
  correct first move is to ask for one.

## Facilitation flow

Follow `docs/runsheet.md` live. Suggested emphasis:

1. `/context` + CLAUDE.md — show that good onboarding docs change assistant behavior.
2. Skill authoring — the cheapest "make the assistant repeatable" win.
3. Investigation on a vague ticket — the assistant should _stop and ask_.
4. `/deep-review` — multi-agent review rediscovers the planted issues independently; compare
   to `PLANTED.md` live for the "aha".
5. capture-learning — close the loop; institutional memory.

## Producing the participant build

`npm run participant` copies the working tree and removes `docs/PLANTED.md` +
`docs/METHOD_*.md`. Verify the answer key and this file are gone before distributing.
