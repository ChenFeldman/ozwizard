import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/policy.js';
import { DEFAULT_POLICY } from '../src/util/policyConfig.js';
import type { Finding, ResolvedDependency } from '../src/core/types.js';

const direct = (name: string, version: string): ResolvedDependency => ({
  name,
  version,
  direct: true,
  path: [`${name}@${version}`],
});

const transitive = (name: string, version: string, parent: string): ResolvedDependency => ({
  name,
  version,
  direct: false,
  path: [parent, `${name}@${version}`],
});

const finding = (over: Partial<Finding>): Finding => ({
  advisoryId: 'A',
  package: 'pkg',
  version: '1.0.0',
  severity: 'high',
  direct: true,
  path: ['pkg@1.0.0'],
  title: 't',
  ...over,
});

describe('policy', () => {
  it('blocks on a high-severity direct finding (happy path)', () => {
    const resolved = [direct('pkg', '1.0.0')];
    const findings = [finding({ severity: 'high', direct: true })];
    expect(evaluate(findings, resolved, DEFAULT_POLICY).verdict).toBe('block');
  });

  it('dampens a transitive high to warn (edge case)', () => {
    // high -> dampened to moderate -> warn, whereas a direct high would block.
    const resolved = [transitive('deep', '2.0.0', 'parent@1.0.0')];
    const findings = [
      finding({ package: 'deep', severity: 'high', direct: false, path: resolved[0]!.path }),
    ];
    expect(evaluate(findings, resolved, DEFAULT_POLICY).verdict).toBe('warn');
  });

  it('blocks a denylisted package even with no advisory (edge case)', () => {
    const resolved = [direct('left-hand', '2.0.0')]; // 2.0.0 has no advisory
    const result = evaluate([], resolved, DEFAULT_POLICY);
    expect(result.verdict).toBe('block');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ advisoryId: 'POLICY-DENYLIST' });
  });

  it('allows when there are no findings', () => {
    expect(evaluate([], [direct('safe', '1.0.0')], DEFAULT_POLICY).verdict).toBe('allow');
  });

  it('blocks denylisted direct dependency', () => {
    const resolved = [direct('left-hand', '2.0.0')];
    const result = evaluate([], resolved, DEFAULT_POLICY);
    expect(result.verdict).toBe('block');
    expect(result.findings.map((f) => f.advisoryId)).toContain('POLICY-DENYLIST');
  });

  it('blocks denylisted transitive dependency (OZ-105)', () => {
    const resolved = [transitive('left-hand', '2.0.0', 'parent@1.0.0')];
    const result = evaluate([], resolved, DEFAULT_POLICY);
    expect(result.verdict).toBe('block');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      advisoryId: 'POLICY-DENYLIST',
      package: 'left-hand',
      direct: false,
      path: ['parent@1.0.0', 'left-hand@2.0.0'],
    });
  });

  it('blocks on a fresh critical advisory', () => {
    const now = new Date('2026-09-12T00:00:00.000Z');
    const resolved = [direct('log4jira', '2.10.0')];
    const findings = [
      finding({
        package: 'log4jira',
        severity: 'critical',
        direct: true,
        publishedAt: '2026-09-01T00:00:00.000Z',
      }),
    ];
    expect(evaluate(findings, resolved, DEFAULT_POLICY, now).verdict).toBe('block');
  });

  it('warns when that same critical advisory is 200 days old', () => {
    const now = new Date('2026-09-12T00:00:00.000Z');
    const resolved = [direct('log4jira', '2.10.0')];
    const findings = [
      finding({
        package: 'log4jira',
        severity: 'critical',
        direct: true,
        publishedAt: '2026-02-24T00:00:00.000Z',
      }),
    ];
    expect(evaluate(findings, resolved, DEFAULT_POLICY, now).verdict).toBe('warn');
  });
});
