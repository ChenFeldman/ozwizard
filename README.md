# OzWizard

> **NOTICE — Educational / demo material.** Provided **AS IS**, with **no warranty**, and
> **not production-ready**. Review it and run it only under your own organization's
> security policies. See [docs/USING_SAFELY.md](docs/USING_SAFELY.md).

A small, self-contained **dependency/artifact policy & vulnerability-triage** service —
built as teaching code for an AI-assisted-development workshop. It clones and runs in ~2
minutes and behaves identically on any laptop: **no database, no native modules** (a
pure-JS JSON file store).

Flow: **submit** an artifact + manifest → **index** → **scan** deps (direct + transitive)
against a mock advisory DB → **evaluate** policy into a verdict (`allow | warn | block`)
with findings → record an **escalation** (human override).

---

## 2-minute quickstart

Requires **Node ≥ 20** (`.nvmrc` pins 20.x — run `nvm use`).

```bash
git clone <your-fork-url> ozwizard && cd ozwizard
nvm use
npm install                 # API deps
npm run dev                 # API on http://localhost:3000
```

In another terminal:

```bash
curl -s localhost:3000/health      # -> {"status":"ok"}
```

Want the dashboard too?

```bash
npm install --prefix web           # one-time: web deps
npm run dev:all                    # API :3000 + dashboard :5173 together
```

Open **http://localhost:5173**, submit the prefilled artifact, and watch the verdict +
findings render.

### Command cheat-sheet

```bash
nvm use                    # picks up .nvmrc (Node 20 LTS)
npm install                # API deps (once)
npm install --prefix web   # web deps (once) — web is not an npm workspace, so install it too
npm run dev:all            # API on http://localhost:3000, web on http://localhost:5173
# — or separately —
npm run dev                # API only
cd web && npm run dev      # FE only

# verify the API (exact payloads are in README "Run & verify" + sample-requests.http)
curl localhost:3000/health
# submit an artifact and read the verdict — see "Run & verify" below for the exact JSON

# open the dashboard
#   http://localhost:5173  → submit a sample artifact, see the verdict + findings

npm test                   # unit tests
npm run e2e                # Playwright FE→BE end-to-end

# MCP (inside Claude Code, in the repo)
/mcp                       # confirm the in-repo store MCP is connected
# then ask: "which artifacts were blocked and why?"
```

---

## Run & verify

Copy-paste these against a running API (`npm run dev`). Or open
[`sample-requests.http`](./sample-requests.http) in VS Code (REST Client) / JetBrains.

**1. Health**

```bash
curl -s localhost:3000/health
# {"status":"ok"}
```

**2. Submit an artifact** (returns an `id`)

```bash
curl -s -X POST localhost:3000/artifacts \
  -H 'content-type: application/json' \
  -d '{"name":"payments-svc","version":"2.3.0",
       "dependencies":[{"name":"log4jira","version":"2.10.0"}]}'
```

**3. Scan it → get the verdict** (use the id from step 2)

```bash
ARTIFACT_ID=<paste-id>
curl -s -X POST localhost:3000/scans \
  -H 'content-type: application/json' \
  -d "{\"artifactId\":\"$ARTIFACT_ID\"}"
# -> { "verdict": "block", "findings": [ { "package":"log4jira", "severity":"critical", ... } ], ... }
```

**4. Fetch a stored scan**

```bash
SCAN_ID=<paste-scan-id>
curl -s localhost:3000/scans/$SCAN_ID
```

**5. Escalate (record an override)**

```bash
curl -s -X POST localhost:3000/escalations \
  -H 'content-type: application/json' \
  -d "{\"scanId\":\"$SCAN_ID\",\"reason\":\"patched fork in use\",\"requestedBy\":\"you\"}"
# -> effectiveVerdict becomes "allow"; original "block" kept for audit
```

**6. Inspect the active policy**

```bash
curl -s localhost:3000/policies
```

### Scripts

| script            | what                                       |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | API (tsx watch, :3000)                     |
| `npm run dev:all` | API + dashboard (:5173) together           |
| `npm run build`   | `tsc` + copy data into `dist/`             |
| `npm test`        | Vitest unit tests                          |
| `npm run e2e`     | Playwright end-to-end (boots both servers) |
| `npm run lint`    | ESLint + Prettier                          |
| `npm run mcp`     | run the local MCP server (stdio)           |

### Config (environment only)

`PORT` (3000) · `HOST` (0.0.0.0) · `DATA_PATH` (`./data/ozwizard.json`) · `LOG_LEVEL`
(info) · `NODE_ENV` (development). Nothing is hardcoded.

---

## Workshop materials

- **[docs/runsheet.md](docs/runsheet.md)** — zero-to-hero golden path, each step with the
  exact prompt to paste.
- **[docs/mcp.md](docs/mcp.md)** — build-your-own MCP + connect real Jira/Grafana.
- **[docs/architecture.md](docs/architecture.md)** — short architecture tour.
- **[.claude/](.claude/)** — the AI harness: project guide, path rules, reviewer agents,
  skills, and quality hooks.

---

## Using this safely

You do **not** need to clone this to benefit from it. Pick the path that fits your org's
policy — fuller detail in [docs/USING_SAFELY.md](docs/USING_SAFELY.md).

- **Just browse it** — read the code on GitHub, or watch the facilitator drive it. No
  clone, no install, nothing runs on your machine.
- **Run it** — do one of:
  - **Fork it into your own org**, or **import it to your internal GitLab**, and run it
    from there; or
  - **have your security team review it first**, then run it.

It runs **fully offline**: no accounts, no network calls, no database, no native modules.
So "running it" means a local Node process serving `localhost` — nothing leaves your
machine.

## What this does and does not do

**Does not:**

- ❌ No **outbound network calls** — the service never phones home or fetches anything.
- ❌ No **telemetry / analytics** of any kind.
- ❌ No **database** — state is a local JSON file (`DATA_PATH`).
- ❌ No **native modules** — pure JavaScript/TypeScript; clones and runs anywhere.
- ✅ Runs **offline**, on `localhost`, under your control.

**Intentionally contains planted example vulnerabilities.** For the workshop review
exercises, the repo deliberately includes example flaws — a **fake hardcoded API key**, a
**PII-in-logs** example, and an **unescaped-input** example. They:

- use **fake values** (the "API key" is a made-up placeholder, not a real credential);
- are **documented** in [docs/PLANTED.md](docs/PLANTED.md); and
- **cannot leak anything** — because the service makes **no network calls**, there is
  nowhere for data to go.

So if a scanner flags one of these, that's **the exercise working**, not a real finding.
See [docs/USING_SAFELY.md](docs/USING_SAFELY.md) for the full explanation.

---

## Facilitator vs. participant build

This repo is the **facilitator** copy. Some files reveal answers or hold teaching IP and
must be stripped before handing the repo to participants:

- `docs/PLANTED.md` — the deliberately-planted-issues answer key.
- `docs/METHOD_*.md` — methodology / IP prose (kept in clearly-named files so an
  open-source strip is trivial).

Produce a clean participant copy:

```bash
npm run participant                 # -> ./participant-build (facilitator files removed)
# or: bash scripts/participant-build.sh my-out-dir
```

The script copies the working tree (excluding `node_modules`, build output, `.git`, etc.),
then deletes `docs/PLANTED.md` and `docs/METHOD_*.md`. The generated `participant-build/`
is git-ignored. Its own `.gitignore` also lists `docs/PLANTED.md`, so if a participant
re-inits git, the answer key can't be re-committed by accident.

---

## License

[MIT](./LICENSE).
