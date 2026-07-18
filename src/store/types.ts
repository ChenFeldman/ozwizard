/**
 * Storage contracts. Everything above the store depends only on these
 * interfaces, so the JSON-file implementation can later be swapped for a
 * real database without touching call sites.
 *
 * Entity *shapes* (Artifact, Scan, Escalation) live in core/types.ts — the
 * domain vocabulary — and are imported here purely for the persistence layer.
 * These imports are type-only, so the core↔store cycle is erased at runtime.
 */
import type { Artifact, Escalation, Scan } from '../core/types.js';

/** An entity persisted by the store. */
export interface Entity {
  id: string;
}

/** Generic CRUD contract for a collection of entities. */
export interface Repository<T extends Entity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(entity: T): Promise<T>;
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
}

/** Top-level store exposing one repository per collection. */
export interface Store {
  artifacts: Repository<Artifact>;
  scans: Repository<Scan>;
  escalations: Repository<Escalation>;
}

/** Shape of the on-disk JSON document. */
export interface DbShape {
  artifacts: Artifact[];
  scans: Scan[];
  escalations: Escalation[];
}
