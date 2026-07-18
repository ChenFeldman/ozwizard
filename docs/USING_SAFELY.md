# Using OzWizard safely

Plain-language security & usage posture. Read this before you run anything.

## As-is disclaimer

OzWizard is **educational / demo material**. It is provided **AS IS**, with **no
warranty** of any kind, and is **not production-ready**. Do not deploy it or expose it to
untrusted input. Review it and run it only under your own organization's security
policies. The [LICENSE](../LICENSE) (MIT) is the legal baseline — note its "as is" and
no-liability clauses.

## Adoption paths

You do **not** need to clone this repository to get value from it.

- **Just browse it.** Read the code on GitHub, or watch the facilitator drive it during the
  workshop. Nothing runs on your machine, nothing is installed.
- **Run it — pick one:**
  - **Fork it into your own organization**, or **import it into your internal GitLab**, and
    run it from your own copy under your own controls; **or**
  - **Have your security team review it first**, then run it.

Whichever you pick, running OzWizard is just a local Node process listening on `localhost`.
It runs **fully offline** — no accounts, no network calls, no database, no native modules —
so nothing leaves your machine.

## What it does NOT do (audit list)

- **No outbound network calls.** The service never phones home, fetches advisories, or
  contacts any remote host. The "advisory database" is a local JSON file
  (`src/data/advisories.json`).
- **No telemetry or analytics.** Nothing is reported anywhere.
- **No database.** State is a single local JSON file at `DATA_PATH`
  (default `./data/ozwizard.json`).
- **No native modules.** Pure JavaScript/TypeScript; it clones and runs identically on any
  machine with Node ≥ 20.
- **No secrets required.** Configuration is environment variables only; there are no real
  credentials to supply.
- **Runs offline**, on `localhost`, entirely under your control.

(The dev tooling — Vite, Playwright, ESLint, etc. — does download from the npm registry at
`npm install` time, like any Node project. The **service itself** makes no network calls at
runtime. If you only browse the code, nothing is installed at all.)

## About the planted example vulnerabilities

For the review exercises, OzWizard **intentionally** contains a few example flaws:

- a **fake hardcoded API key** (`src/util/config.ts`),
- a **PII-in-logs** example (`src/api/artifacts.ts`),
- an **unescaped-input / reflected-output** example (`src/api/artifacts.ts`),

plus a couple of non-security teaching issues (a performance and a logic bug). They are:

- **fake by construction** — the "API key" is a made-up placeholder string, not a real
  credential, and the "PII" is whatever a workshop attendee types in;
- **fully documented** with exact `file:line` locations in [PLANTED.md](./PLANTED.md); and
- **incapable of leaking anything** — because the service makes **no network calls**, there
  is no channel for data to exfiltrate, even if the code is exercised.

**So a security scanner flagging these is the exercise working as designed, not a real
finding.** The point of the workshop is to have Claude (and you) rediscover and reason
about them. See [PLANTED.md](./PLANTED.md) for the full answer key.

> Facilitators strip `docs/PLANTED.md` (and `docs/METHOD_*.md`) from the participant build
> with `npm run participant`, so participants investigate before seeing the answers.
