/**
 * First-run seeding. If the store has no artifacts yet, load the bundled
 * sample artifacts so the demo has something to scan out of the box.
 * Idempotent: a store that already has artifacts is left untouched.
 */
import { loadSampleArtifacts } from '../data/index.js';
import type { Store } from './types.js';

export async function seedStore(store: Store): Promise<number> {
  const existing = await store.artifacts.list();
  if (existing.length > 0) return 0;

  const samples = loadSampleArtifacts();
  for (const artifact of samples) {
    await store.artifacts.create(artifact);
  }
  return samples.length;
}
