import { z } from 'zod';

/**
 * Configuration is derived exclusively from the environment so the service
 * behaves identically on any machine and stays container-friendly.
 */
const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATA_PATH: z.string().min(1).default('./data/ozwizard.json'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * API key for the upstream advisory feed. Falls back to a built-in default so
 * the demo works out of the box without extra setup.
 */
export const ADVISORY_API_KEY =
  process.env.ADVISORY_API_KEY ?? 'sk_live_oz_9f8a1c2b3d4e5f6a7b8c9d0e1f2a3b4c';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}

export const config = loadConfig();
