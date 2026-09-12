/**
 * Policy configuration loading (the IO edge for policy).
 *
 * The global defaults live in `config/policy.json` (severity → verdict) and
 * `config/denylist.json` (blocked package names). A customer may carry its own
 * overrides in `data/customers/<id>.json`; those are layered on top of the
 * global defaults. Core policy code stays pure — it receives the resulting
 * `PolicyConfig` as an input.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PolicyConfig, Severity, Verdict } from '../core/types.js';

/** Repo root, from either `src/util/` (tsx) or `dist/util/` (built). */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(resolve(ROOT, ...segments), 'utf8')) as T;
}

/** Overrides a single customer may layer on top of the global policy. */
export interface CustomerOverrides {
  thresholds?: Partial<Record<Severity, Verdict>>;
  denylist?: string[];
  dampenTransitive?: boolean;
}

/** Shape of `data/customers/<id>.json`. */
export interface CustomerRecord {
  id: string;
  overrides: CustomerOverrides;
}

/** The global policy: thresholds from config/policy.json, denylist from config/denylist.json. */
export function loadPolicyConfig(): PolicyConfig {
  const { thresholds, dampenTransitive } = readJson<{
    thresholds: Record<Severity, Verdict>;
    dampenTransitive: boolean;
  }>('config', 'policy.json');
  const { denylist } = readJson<{ denylist: string[] }>('config', 'denylist.json');
  return { denylist, thresholds, dampenTransitive };
}

/** The global policy, also served verbatim from GET /policies. */
export const DEFAULT_POLICY: PolicyConfig = loadPolicyConfig();

/** Read one customer's overrides, or null when that customer has no record. */
export function loadCustomerOverrides(customerId: string): CustomerOverrides | null {
  const path = resolve(ROOT, 'data', 'customers', `${customerId}.json`);
  if (!existsSync(path)) return null;
  const record = JSON.parse(readFileSync(path, 'utf8')) as CustomerRecord;
  return record.overrides ?? {};
}

/** Layer `overrides` on top of `base` (pure). */
export function applyOverrides(base: PolicyConfig, overrides: CustomerOverrides): PolicyConfig {
  return {
    denylist: overrides.denylist ?? base.denylist,
    thresholds: { ...base.thresholds, ...overrides.thresholds },
    dampenTransitive: overrides.dampenTransitive ?? base.dampenTransitive,
  };
}

/**
 * The policy that applies to a scan. No customer id (or no record for it)
 * means the global defaults, unchanged.
 */
export function policyForCustomer(customerId?: string): PolicyConfig {
  const base = loadPolicyConfig();
  if (!customerId) return base;
  const overrides = loadCustomerOverrides(customerId);
  return overrides ? applyOverrides(base, overrides) : base;
}
