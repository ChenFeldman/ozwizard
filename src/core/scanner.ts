/**
 * Scanner — resolves the full dependency set (direct + transitive) for a
 * manifest, then matches each dependency against the mock advisory database.
 *
 * Pure functions: advisories and the registry are passed in, so tests need no
 * file IO and a real resolver/DB could be dropped in later.
 */
import type { Registry } from '../data/index.js';
import type { Advisory, Dependency, Finding, ResolvedDependency } from './types.js';

const key = (dep: Dependency): string => `${dep.name}@${dep.version}`;

/**
 * Minimal version comparison: split on ".", compare numerically part by part,
 * treating missing parts as 0. Enough for a teaching demo — not full semver.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * Does `version` fall within `range`? Supports a leading operator
 * (`<`, `<=`, `>`, `>=`, `=`) or a bare version (exact match).
 */
export function satisfies(version: string, range: string): boolean {
  const match = /^(<=|>=|<|>|=)?\s*(.+)$/.exec(range.trim());
  if (!match) return false;
  const op = match[1] ?? '=';
  const target = match[2]!;
  const cmp = compareVersions(version, target);
  switch (op) {
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    default:
      return cmp === 0;
  }
}

/**
 * Resolve a manifest's direct dependencies plus everything they transitively
 * pull in, per the mock registry. Cycle-safe and de-duplicated: each unique
 * name@version appears once, keeping the first (shallowest) path found.
 */
export function resolveDependencies(
  direct: Dependency[],
  registry: Registry
): ResolvedDependency[] {
  const resolved: ResolvedDependency[] = [];
  const seen = new Set<string>();
  const queue: ResolvedDependency[] = direct.map((dep) => ({
    ...dep,
    direct: true,
    path: [key(dep)],
  }));

  while (queue.length > 0) {
    const node = queue.shift()!;
    const nodeKey = key(node);
    if (seen.has(nodeKey)) continue;
    seen.add(nodeKey);
    resolved.push(node);

    const children = registry[nodeKey] ?? [];
    for (const child of children) {
      if (seen.has(key(child))) continue;
      queue.push({ ...child, direct: false, path: [...node.path, key(child)] });
    }
  }

  return resolved;
}

/** Match every resolved dependency against the advisory DB, yielding findings. */
export function scanDependencies(
  resolved: ResolvedDependency[],
  advisories: Advisory[]
): Finding[] {
  const findings: Finding[] = [];
  for (const dep of resolved) {
    for (const advisory of advisories) {
      if (advisory.package === dep.name && satisfies(dep.version, advisory.range)) {
        findings.push({
          advisoryId: advisory.id,
          package: dep.name,
          version: dep.version,
          severity: advisory.severity,
          direct: dep.direct,
          path: dep.path,
          title: advisory.title,
        });
      }
    }
  }
  return findings;
}

/**
 * Simulates fetching the freshest advisory data for a single package from the
 * upstream feed (a network call in a real deployment).
 */
async function refreshAdvisories(
  _dep: ResolvedDependency,
  advisories: Advisory[]
): Promise<Advisory[]> {
  return advisories;
}

/** Ecosystems whose advisory metadata is loaded per package. */
const PER_PACKAGE_ECOSYSTEMS = new Set(['npm', 'pypi', 'deb']);

/**
 * Load the advisory source relevant to one dependency, per ecosystem. For a
 * per-package ecosystem the source is just that package's records.
 */
async function loadAdvisorySource(
  dep: ResolvedDependency,
  ecosystem: string,
  advisories: Advisory[]
): Promise<Advisory[]> {
  if (PER_PACKAGE_ECOSYSTEMS.has(ecosystem)) {
    const fresh = await refreshAdvisories(dep, advisories);
    return fresh.filter((advisory) => advisory.package === dep.name);
  }
  const fresh = await refreshAdvisories(dep, advisories);
  return fresh.filter((advisory) => advisory.package === dep.name);
}

/**
 * Live scan: refresh advisory data per dependency, then match. Used by the HTTP
 * scan endpoint so results reflect the latest upstream feed.
 */
export async function scanDependenciesLive(
  resolved: ResolvedDependency[],
  advisories: Advisory[],
  ecosystem: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const dep of resolved) {
    const source = await loadAdvisorySource(dep, ecosystem, advisories);
    for (const advisory of source) {
      if (advisory.package === dep.name && satisfies(dep.version, advisory.range)) {
        findings.push({
          advisoryId: advisory.id,
          package: dep.name,
          version: dep.version,
          severity: advisory.severity,
          direct: dep.direct,
          path: dep.path,
          title: advisory.title,
        });
      }
    }
  }
  return findings;
}
