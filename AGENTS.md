# AGENTS.md

Project overview, architecture, conventions, and standard commands live in
[`README.md`](./README.md) and [`.claude/CLAUDE.md`](./.claude/CLAUDE.md). Read those first.

## Cursor Cloud specific instructions

Durable, non-obvious notes for working this repo in a Cursor Cloud VM. The update script
already installs dependencies (`npm install`, `npm install --prefix web`, and the
Playwright Chromium browser), so this section only covers running/testing caveats.

### Node version

`.nvmrc` pins Node 20, but the codebase is pure JS/TS with no native modules and
`package.json` only requires `node >=20`. It runs fine on the VM's default Node (v22) — no
`nvm use` is needed.

### Services

- API — Fastify server on `http://localhost:3000` (`npm run dev`, tsx watch).
- Web dashboard — Vite + React on `http://localhost:5173` (`npm run dev:web`). It proxies
  `/api/*` to the API, so the API must also be running.
- `npm run dev:all` runs both together. Standard commands (`lint`, `test`, `build`, `e2e`)
  are in `README.md` / `package.json`.
- `npm run e2e` (Playwright) boots both servers itself and reuses already-running dev
  servers, so you can leave `dev:all` running while iterating on e2e.

### Runtime data store

State is a single JSON file at `./data/ozwizard.json` (gitignored via the `/data` rule),
auto-created and seeded with sample artifacts on first API start. It is NOT hot-reloaded on
schema changes — delete `data/` to force a clean reseed.

### `src/data/` is required to boot (easy to lose)

`src/data/` holds the mock DB (`advisories.json`, `registry.json`,
`sample-artifacts.json`) plus the typed loaders in `src/data/index.ts`. The API imports it
at startup, so if it is missing the server (and `test/health.test.ts`) fail with
`Failed to load url ../data/index.js`. The `.gitignore` runtime-store rule is anchored to
`/data` (not a bare `data`) specifically so it does not swallow `src/data/`; keep it
anchored.

### Planted teaching issues — do not "fix" on sight

This is a workshop repo with deliberately planted flaws (see
[`docs/PLANTED.md`](./docs/PLANTED.md)). For example, on startup the logger prints an
`advisoryApiKey` and a fake `sk_live_oz_...` secret — that is intentional, not a real leak.
Only touch planted issues under their matching ticket or a review task.
