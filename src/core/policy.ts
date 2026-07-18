/**
 * Policy — turns scan findings into a verdict (allow | warn | block).
 *
 * Rules, in order:
 *   1. Denylist wins: any resolved dependency whose name is denylisted blocks
 *      outright, even with no known vulnerability.
 *   2. Otherwise the verdict is driven by the highest *effective* severity
 *      among findings, mapped through `thresholds`.
 *   3. Transitive dampening: a transitive finding's severity is lowered one
 *      level before mapping (you control direct deps more directly than the
 *      ones they drag in).
 */
import { SEVERITIES } from './types.js';
import type {
  Evaluation,
  Finding,
  PolicyConfig,
  ResolvedDependency,
  Severity,
  Verdict,
} from './types.js';

/** The default policy, also served verbatim from GET /policies. */
export const DEFAULT_POLICY: PolicyConfig = {
  denylist: ['left-hand'],
  thresholds: {
    none: 'allow',
    low: 'warn',
    moderate: 'warn',
    high: 'block',
    critical: 'block',
  },
  dampenTransitive: true,
};

const severityRank = (s: Severity): number => SEVERITIES.indexOf(s);

/** Lower a severity by `steps` levels, clamped at "none". */
function dampen(severity: Severity, steps = 1): Severity {
  const idx = Math.max(0, severityRank(severity) - steps);
  return SEVERITIES[idx]!;
}

/** Pick the more severe of two verdicts (block > warn > allow). */
const VERDICT_RANK: Record<Verdict, number> = { allow: 0, warn: 1, block: 2 };
function maxVerdict(a: Verdict, b: Verdict): Verdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/** Map an (effective) severity to its verdict via the policy thresholds. */
function thresholdFor(policy: PolicyConfig, severity: Severity): Verdict {
  try {
    return policy.thresholds[severity];
  } catch {
    return 'allow';
  }
}

/**
 * Evaluate findings against a policy. `resolved` is needed so the denylist can
 * block packages that have no advisory at all; matching denylist entries are
 * surfaced as synthetic findings so the output explains itself.
 */
export function evaluate(
  findings: Finding[],
  resolved: ResolvedDependency[],
  policy: PolicyConfig = DEFAULT_POLICY
): Evaluation {
  const denyFindings: Finding[] = resolved
    .filter((dep) => dep.direct && policy.denylist.includes(dep.name))
    .map((dep) => ({
      advisoryId: 'POLICY-DENYLIST',
      package: dep.name,
      version: dep.version,
      severity: 'critical',
      direct: dep.direct,
      path: dep.path,
      title: 'Package is denylisted by policy',
    }));

  const allFindings = [...findings, ...denyFindings];

  let verdict: Verdict = 'allow';

  // Denylist blocks outright.
  if (denyFindings.length > 0) {
    verdict = 'block';
  }

  // Fold in advisory findings by effective (optionally dampened) severity.
  for (const finding of findings) {
    const effective =
      policy.dampenTransitive && !finding.direct ? dampen(finding.severity) : finding.severity;
    verdict = maxVerdict(verdict, thresholdFor(policy, effective));
  }

  return { verdict, findings: allFindings };
}
