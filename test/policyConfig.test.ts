import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/policy.js';
import type { Finding, ResolvedDependency, Severity, Verdict } from '../src/core/types.js';
import { loadPolicyConfig, policyForCustomer } from '../src/util/policyConfig.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OVERRIDE_CUSTOMER = 'acme-override-fixture';
const OVERRIDE_PATH = resolve(ROOT, 'data', 'customers', `${OVERRIDE_CUSTOMER}.json`);

const readJson = <T>(...segments: string[]): T =>
  JSON.parse(readFileSync(resolve(ROOT, ...segments), 'utf8')) as T;

const moderateFinding: Finding = {
  advisoryId: 'A',
  package: 'fast-yaml',
  version: '2.0.0',
  severity: 'moderate',
  direct: true,
  path: ['fast-yaml@2.0.0'],
  title: 'DoS',
};
const resolved: ResolvedDependency[] = [
  { name: 'fast-yaml', version: '2.0.0', direct: true, path: ['fast-yaml@2.0.0'] },
];

describe('policy configuration', () => {
  it('loads the global severity mapping from config/policy.json', () => {
    const globalPolicy = loadPolicyConfig();
    const onDisk = readJson<{ thresholds: Record<Severity, Verdict> }>('config', 'policy.json');
    const denylist = readJson<{ denylist: string[] }>('config', 'denylist.json');

    expect(globalPolicy.thresholds).toEqual(onDisk.thresholds);
    expect(globalPolicy.denylist).toEqual(denylist.denylist);
    expect(policyForCustomer()).toEqual(globalPolicy);
  });
});

describe('per-customer overrides', () => {
  beforeAll(() => {
    const record = {
      id: OVERRIDE_CUSTOMER,
      overrides: { thresholds: { moderate: 'block' } },
    };
    writeFileSync(OVERRIDE_PATH, `${JSON.stringify(record, null, 2)}\n`);
  });

  afterAll(() => {
    unlinkSync(OVERRIDE_PATH);
  });

  it("changes that customer's verdict and nobody else's", () => {
    const customerPolicy = policyForCustomer(OVERRIDE_CUSTOMER);
    expect(customerPolicy.thresholds.moderate).toBe('block');
    expect(evaluate([moderateFinding], resolved, customerPolicy).verdict).toBe('block');

    // Everyone else — including the stock acme record — keeps the global mapping.
    for (const other of [undefined, 'acme', 'unknown-customer']) {
      const policy = policyForCustomer(other);
      expect(policy.thresholds.moderate).toBe('warn');
      expect(evaluate([moderateFinding], resolved, policy).verdict).toBe('warn');
    }
  });
});
