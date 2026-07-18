import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DbShape, Entity, Repository, Store } from './types.js';

const EMPTY_DB: DbShape = { artifacts: [], scans: [], escalations: [] };

/**
 * Pure-JS JSON file store. No database, no native modules — just the Node
 * standard library — so it clones-and-runs identically anywhere.
 *
 * All writes serialize the whole document and persist it atomically
 * (write-to-temp then rename) to avoid torn files. A single in-process
 * mutex chains operations so concurrent requests can't interleave writes.
 */
class JsonFileStore implements Store {
  private cache: DbShape | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataPath: string) {}

  readonly artifacts: Repository<DbShape['artifacts'][number]> = this.repositoryFor('artifacts');
  readonly scans: Repository<DbShape['scans'][number]> = this.repositoryFor('scans');
  readonly escalations: Repository<DbShape['escalations'][number]> =
    this.repositoryFor('escalations');

  /** Run `fn` after all previously queued store operations complete. */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    // Keep the chain alive regardless of individual op success/failure.
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async load(): Promise<DbShape> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.dataPath, 'utf8');
      this.cache = { ...EMPTY_DB, ...(JSON.parse(raw) as Partial<DbShape>) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = structuredClone(EMPTY_DB);
        await this.persist(this.cache);
      } else {
        throw err;
      }
    }
    return this.cache;
  }

  private async persist(db: DbShape): Promise<void> {
    await mkdir(dirname(this.dataPath), { recursive: true });
    const tmp = `${this.dataPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await rename(tmp, this.dataPath);
    this.cache = db;
  }

  private repositoryFor<K extends keyof DbShape, T extends Entity = DbShape[K][number]>(
    key: K
  ): Repository<T> {
    const collection = () => this.load().then((db) => db[key] as unknown as T[]);

    return {
      list: () =>
        this.serialize(async () => {
          return structuredClone(await collection());
        }),

      get: (id) =>
        this.serialize(async () => {
          const found = (await collection()).find((e) => e.id === id);
          return found ? structuredClone(found) : undefined;
        }),

      create: (entity) =>
        this.serialize(async () => {
          const db = await this.load();
          const items = db[key] as unknown as T[];
          if (items.some((e) => e.id === entity.id)) {
            throw new Error(`${String(key)} with id "${entity.id}" already exists`);
          }
          items.push(entity);
          await this.persist(db);
          return structuredClone(entity);
        }),

      update: (id, patch) =>
        this.serialize(async () => {
          const db = await this.load();
          const items = db[key] as unknown as T[];
          const idx = items.findIndex((e) => e.id === id);
          if (idx === -1) return undefined;
          const updated = { ...items[idx], ...patch, id } as T;
          items[idx] = updated;
          await this.persist(db);
          return structuredClone(updated);
        }),

      delete: (id) =>
        this.serialize(async () => {
          const db = await this.load();
          const items = db[key] as unknown as T[];
          const idx = items.findIndex((e) => e.id === id);
          if (idx === -1) return false;
          items.splice(idx, 1);
          await this.persist(db);
          return true;
        }),
    };
  }
}

/** Construct a JSON-file-backed store at `dataPath`. */
export function createJsonFileStore(dataPath: string): Store {
  return new JsonFileStore(dataPath);
}
