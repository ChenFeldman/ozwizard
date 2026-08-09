/**
 * Data loaders — the mock "database" for the demo. The JSON files alongside this
 * module stand in for a real advisory feed, a package registry (transitive
 * graph), and a first-run artifact seed. Loaders read them and hand typed data
 * to the pure core modules, so core stays IO-free and deterministic.
 *
 * Read via `import.meta.url` so the loaders work identically from `src/` (tsx /
 * vitest) and from `dist/` after `npm run build` copies the JSON next to the
 * compiled output (see scripts/copy-data.mjs).
 */
import { readFileSync } from 'node:fs';
import type { Advisory, Artifact, Dependency } from '../core/types.js';

/** Transitive dependency graph: `name@version` → its direct children. */
export type Registry = Record<string, Dependency[]>;

function readJson<T>(file: string): T {
  const url = new URL(file, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as T;
}

/** The mock advisory database (matched against resolved dependencies). */
export function loadAdvisories(): Advisory[] {
  return readJson<Advisory[]>('./advisories.json');
}

/** The mock package registry used to resolve transitive dependencies. */
export function loadRegistry(): Registry {
  return readJson<Registry>('./registry.json');
}

/** Sample artifacts used to seed an empty store on first run. */
export function loadSampleArtifacts(): Artifact[] {
  return readJson<Artifact[]>('./sample-artifacts.json');
}
