import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { artifactRoutes } from './api/artifacts.js';
import { registerRoutes } from './api/routes.js';
import type { Config } from './util/config.js';
import { createStore, type Store } from './store/index.js';

export interface AppOptions {
  config: Config;
  logger: FastifyBaseLogger;
  /** Injectable for tests; defaults to a store built from config. */
  store?: Store;
}

/**
 * Build a fully-wired Fastify instance without starting to listen. Tests use
 * `app.inject()`; the entrypoint calls `.listen()`.
 */
export function buildApp({ config, logger, store }: AppOptions): FastifyInstance {
  const app = Fastify({ loggerInstance: logger });

  app.decorate('store', store ?? createStore(config));

  app.get('/health', async () => {
    return { status: 'ok' as const };
  });

  void app.register(artifactRoutes);
  void app.register(registerRoutes);

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    store: Store;
  }
}
