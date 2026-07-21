# OzWizard — project guide for Claude

OzWizard is a **small, self-contained dependency/artifact policy & vulnerability-triage
service** built as teaching code. It must clone-and-run in ~2 minutes and behave
identically on any laptop: **no database, no native modules** — a pure-JS JSON file store.

Keep changes small and readable. This is a demo people read to learn from.

## The flow (what the service does)

```
submit artifact + manifest  ──▶  INDEX      (persist the manifest)
                                  SCAN       (resolve deps incl. transitive, match advisories)
                                  EVALUATE   (policy → verdict: allow | warn | block + findings)
                                  ESCALATE   (record a human override with a reason)
```

## Architecture map

```
src/
  api/        HTTP edge (Fastify). Validates input, no business logic.
    artifacts.ts   POST /artifacts (index a manifest)
    routes.ts      POST /scans, GET /scans/:id, POST /escalations, GET /policies
    schemas.ts     zod request schemas
  core/       Pure, deterministic domain logic. No IO here.
    indexer.ts     parse + store a manifest
    scanner.ts     resolve deps (BFS over registry) + match advisories
    policy.ts      rules → verdict + findings (thresholds, denylist, transitive dampening)
    escalations.ts record an override
    types.ts       domain vocabulary (shared by api + store)
  store/      Persistence behind a Repository interface (swappable for a real DB).
    jsonStore.ts   pure-JS atomic JSON file store
    types.ts       Repository<T> / Store / DbShape
    seed.ts        first-run sample seeding
    index.ts       createStore(config) factory
  data/       Mock data (the "DB"): advisories.json, registry.json (transitive graph),
              sample-artifacts.json, index.ts (typed loaders)
  util/       config.ts (env-only config, zod-validated), logger.ts (pino)
  app.ts      builds the Fastify app (buildApp) + registers routes; store is injectable
  index.ts    process entrypoint: seed on first run, then listen
test/         Vitest (health, scanner, policy)
docs/         PLANTED.md (deliberately planted issues), ai-learnings/ (capture-learning output)
tickets/      OZ-101..104 (deliberately under-specified)
```

## Commands

- `npm run dev` — tsx watch (pino-pretty logs in dev)
- `npm run build` — `tsc` + copy `src/data` → `dist/data`
- `npm test` — Vitest (`vitest run`)
- `npm run lint` — ESLint + Prettier check

Try a request:
`curl -s localhost:3000/health` → `{"status":"ok"}`

## Configuration (environment only — never hardcode)

`PORT` (3000) · `HOST` (0.0.0.0) · `DATA_PATH` (./data/ozwizard.json) ·
`LOG_LEVEL` (info) · `NODE_ENV` (development). Read them via `src/util/config.ts`.

## Key conventions

- **Strict TypeScript, ESM.** Relative imports MUST use the `.js` extension
  (`./policy.js`, not `./policy`) — NodeNext resolution. This trips people up.
- **Validate at the edge.** All external input is parsed with **zod** in `src/api/**`.
  Core functions trust their typed inputs.
- **Core is pure & deterministic.** No file IO, no `Date.now()`/`Math.random()` inside
  logic — inject a timestamp/clock instead. Advisories, the registry, and the policy
  config are passed **in** so functions are testable without IO.
- **Store is swappable.** Everything above persistence depends only on the `Repository`
  interface in `src/store/types.ts`. Don't reach into `jsonStore` internals.
- **No DB, no native modules.** Keep dependencies pure-JS so the demo runs anywhere.
- **Path rules apply** — see `.claude/rules/api.md` (for `src/api/**`) and
  `.claude/rules/core.md` (for `src/core/**`). Follow them when editing those areas.
- @docs/package-facts/deb.md — per-type quirks the reviewer must know.
- **Package-type behavior → read the wiki first.** When a task touches package-type /
  `ecosystem` behavior (branching on it, grouping ecosystems, advisory loading, scan
  cost/timeouts), read `docs/llm-wiki/package-types.md` **before** acting — do not assume.
  The `docs/llm-wiki/` pages are a **load-on-demand** long-reference layer, not always-on
  context; consult `docs/llm-wiki/index.md` for which page to pull in for a given task.

## Things to skip / avoid

- **`docs/PLANTED.md` lists issues that are deliberately planted for teaching.** Do NOT
  "fix" them on sight — only touch them when explicitly working the matching ticket
  (OZ-102/OZ-103) or a review task.
- Don't edit `dist/` (build output) — change `src/` and rebuild.
- Never commit `data/` (runtime store), `.env`, or `*.log`. `node_modules/` is noise.
- No secrets anywhere in source, logs, or this file. Config comes from the environment.
- Don't add a database or native module to "improve" persistence — that breaks the
  clone-and-run guarantee.
