import { describe, expect, it } from 'vitest';
import { resolveDependencies, scanDependencies, satisfies } from '../src/core/scanner.js';
import type { Advisory } from '../src/core/types.js';
import type { Registry } from '../src/data/index.js';

const ADVISORIES: Advisory[] = [
  {
    id: 'A-1',
    package: 'log4jira',
    range: '<2.16.0',
    severity: 'critical',
    title: 'RCE',
  },
  {
    id: 'A-2',
    package: 'netfetch',
    range: '>=1.0.0',
    severity: 'high',
    title: 'SSRF',
  },
];

const REGISTRY: Registry = {
  'config-loader@1.0.0': [{ name: 'netfetch', version: '1.2.0' }],
};

describe('scanner', () => {
  it('flags a vulnerable direct dep and a transitive one (happy path)', () => {
    const resolved = resolveDependencies(
      [
        { name: 'log4jira', version: '2.10.0' },
        { name: 'config-loader', version: '1.0.0' },
      ],
      REGISTRY
    );
    const findings = scanDependencies(resolved, ADVISORIES);

    // log4jira (direct) + netfetch (transitive) both match.
    expect(findings).toHaveLength(2);

    const log4jira = findings.find((f) => f.package === 'log4jira');
    expect(log4jira).toMatchObject({ advisoryId: 'A-1', severity: 'critical', direct: true });

    const netfetch = findings.find((f) => f.package === 'netfetch');
    expect(netfetch).toMatchObject({ advisoryId: 'A-2', severity: 'high', direct: false });
    expect(netfetch?.path).toEqual(['config-loader@1.0.0', 'netfetch@1.2.0']);
  });

  it('does not flag a version outside the advisory range (edge case)', () => {
    // log4jira 2.16.0 is patched (range is <2.16.0), so no finding.
    const resolved = resolveDependencies([{ name: 'log4jira', version: '2.16.0' }], REGISTRY);
    const findings = scanDependencies(resolved, ADVISORIES);
    expect(findings).toEqual([]);
  });

  it('satisfies() understands operators and exact matches', () => {
    expect(satisfies('2.15.0', '<2.16.0')).toBe(true);
    expect(satisfies('2.16.0', '<2.16.0')).toBe(false);
    expect(satisfies('1.2.0', '>=1.0.0')).toBe(true);
    expect(satisfies('1.4.1', '1.4.1')).toBe(true);
    expect(satisfies('1.4.2', '1.4.1')).toBe(false);
  });
});
