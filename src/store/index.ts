import type { Config } from '../util/config.js';
import { createJsonFileStore } from './jsonStore.js';
import type { Store } from './types.js';

export type { Entity, Repository, Store } from './types.js';

/**
 * Store factory. Today it returns the JSON-file implementation; swapping in a
 * real database later means changing only this function.
 */
export function createStore(config: Config): Store {
  return createJsonFileStore(config.DATA_PATH);
}
