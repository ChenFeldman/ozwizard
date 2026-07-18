import { buildApp } from './app.js';
import { config } from './util/config.js';
import { createLogger } from './util/logger.js';
import { createStore } from './store/index.js';
import { seedStore } from './store/seed.js';

/** Process entrypoint: wire config + logger, seed on first run, and listen. */
async function main(): Promise<void> {
  const logger = createLogger(config);
  const store = createStore(config);

  const seeded = await seedStore(store);
  if (seeded > 0) logger.info({ seeded }, 'seeded sample artifacts');

  const app = buildApp({ config, logger, store });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    logger.error(err, 'failed to start server');
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      logger.info({ signal }, 'shutting down');
      void app.close().then(() => process.exit(0));
    });
  }
}

void main();
