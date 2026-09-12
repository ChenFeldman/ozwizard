/**
 * Typed loaders for the bundled mock data. JSON is imported via ESM import
 * attributes so the files ship as data (copied into dist by scripts/copy-data.mjs)
 * and stay editable without a code change.
 */
import advisoriesJson from './advisories.json' with { type: 'json' };
import registryJson from './registry.json' with { type: 'json' };
import sampleArtifactsJson from './sample-artifacts.json' with { type: 'json' };
import type { Advisory, Artifact, Dependency } from '../core/types.js';

export function loadAdvisories(): Advisory[] {
  return advisoriesJson as Advisory[];
}

/** The mock dependency graph: "name@version" -> its direct dependencies. */
export type Registry = Record<string, Dependency[]>;

export function loadRegistry(): Registry {
  // Drop the human-readable "_comment" key; keep only real graph entries.
  const entries = Object.entries(registryJson as Record<string, unknown>).filter(
    ([key]) => key !== '_comment'
  );
  return Object.fromEntries(entries) as Registry;
}

export function loadSampleArtifacts(): Artifact[] {
  return sampleArtifactsJson as Artifact[];
}
