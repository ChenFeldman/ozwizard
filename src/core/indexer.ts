/**
 * Indexer — the entry point of the flow. Takes a validated manifest and
 * persists it as an Artifact so it can later be scanned by id.
 */
import { randomUUID } from 'node:crypto';
import type { Repository } from '../store/types.js';
import type { Artifact, Manifest } from './types.js';

/** Parse-and-store: turn a manifest into a persisted, addressable Artifact. */
export async function indexArtifact(
  manifest: Manifest,
  artifacts: Repository<Artifact>,
  now: string = new Date().toISOString()
): Promise<Artifact> {
  const artifact: Artifact = {
    id: randomUUID(),
    name: manifest.name,
    version: manifest.version,
    ecosystem: manifest.ecosystem,
    dependencies: manifest.dependencies,
    createdAt: now,
  };
  return artifacts.create(artifact);
}
