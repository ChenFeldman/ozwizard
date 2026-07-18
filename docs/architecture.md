# OzWizard architecture (short)

A thin HTTP edge over a pure, deterministic core, backed by a swappable JSON store.

```
              HTTP (Fastify)                  Pure domain (no IO)             Persistence
  ┌────────────────────────────┐   ┌────────────────────────────────┐   ┌──────────────┐
  │ src/api                     │   │ src/core                       │   │ src/store    │
  │  artifacts.ts  POST /artifacts │ │ indexer.ts    parse+store      │   │ Repository<T>│
  │  routes.ts     POST /scans     │→│ scanner.ts    resolve+match    │→──│ jsonStore.ts │→ DATA_PATH
  │                GET  /scans/:id  │ │ policy.ts     evaluate→verdict │   │ (atomic JSON)│   (*.json)
  │                POST /escalations│ │ escalations.ts override        │   │ seed.ts      │
  │                GET  /policies   │ │ types.ts      vocabulary       │   └──────────────┘
  │  schemas.ts   (zod at the edge) │ └────────────────────────────────┘
  └────────────────────────────┘            ▲
                                            │ injected inputs
                                    ┌────────────────┐
                                    │ src/data       │  advisories.json (mock DB)
                                    │  loaders       │  registry.json  (transitive graph)
                                    └────────────────┘  sample-artifacts.json (seed)
```

## The request flow

1. **Index** — `POST /artifacts` validates the manifest (zod) and persists an `Artifact`.
2. **Scan** — `POST /scans` resolves the dependency set (BFS over the mock registry, so
   **transitive** deps are first-class), then matches each against the advisory DB.
3. **Evaluate** — `policy.evaluate` turns findings into a verdict: denylist → `block`;
   otherwise the highest **effective** severity (transitive findings are dampened one
   level) maps to `allow | warn | block`. Findings explain _why_.
4. **Escalate** — `POST /escalations` records a human override; the scan keeps its original
   verdict for audit and gains an `effectiveVerdict: allow`.

## Design rules that matter

- **Core is pure & deterministic.** No IO, clock, or randomness in logic — timestamps/ids
  are injected at the edge. Advisories, registry, and policy config are inputs. This is why
  the core is trivially unit-testable.
- **Store is swappable.** Everything above persistence depends only on the `Repository`
  interface (`src/store/types.ts`); the JSON file impl could be replaced by a real DB
  without touching call sites.
- **No DB, no native modules.** Keeps the clone-and-run-anywhere guarantee.
- **Read-only MCP** (`mcp/server.ts`) reads the same `DATA_PATH` to expose the store to
  Claude safely. See [mcp.md](./mcp.md).

## Surfaces

- **API** — `src/index.ts` boots config → seed → Fastify (`src/app.ts`).
- **Web** — `web/` React + Vite dashboard, proxying `/api/*` to the API.
- **Tests** — Vitest units (`test/`) + one Playwright E2E (`e2e/`).
