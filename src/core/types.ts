/**
 * Domain types for the OzWizard core (index → scan → evaluate → escalate).
 * These are the vocabulary the whole service speaks; persistence and API
 * layers import from here rather than redefining shapes.
 */
import type { Entity } from '../store/types.js';

/** A single dependency in a manifest. */
export interface Dependency {
  name: string;
  version: string;
}

/** What a caller submits: an artifact plus its declared (direct) dependencies. */
export interface Manifest {
  name: string;
  version: string;
  ecosystem: string;
  dependencies: Dependency[];
}

/** Severity levels, ordered from least to most severe. */
export const SEVERITIES = ['none', 'low', 'moderate', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** An entry in the mock advisory database. */
export interface Advisory {
  id: string;
  package: string;
  /** Range string understood by scanner.satisfies, e.g. "<1.2.3" or "1.4.1". */
  range: string;
  severity: Severity;
  title: string;
}

/** A dependency after transitive resolution. */
export interface ResolvedDependency extends Dependency {
  /** true for manifest-declared deps, false for transitively pulled ones. */
  direct: boolean;
  /** Resolution path from a direct dep to this one, e.g. ["a@1.0.0", "b@2.0.0"]. */
  path: string[];
}

/** A matched advisory against a resolved dependency. */
export interface Finding {
  advisoryId: string;
  package: string;
  version: string;
  severity: Severity;
  direct: boolean;
  path: string[];
  title: string;
}

/** The three possible policy outcomes. */
export type Verdict = 'allow' | 'warn' | 'block';

/** Configuration that drives policy evaluation (exposed via GET /policies). */
export interface PolicyConfig {
  /** Package names blocked outright, at any version. */
  denylist: string[];
  /** Severity → verdict mapping used for the highest effective severity. */
  thresholds: Record<Severity, Verdict>;
  /** When true, a transitive finding's severity is reduced one level. */
  dampenTransitive: boolean;
}

/** Result of evaluating findings against a policy. */
export interface Evaluation {
  verdict: Verdict;
  findings: Finding[];
}

/** An indexed artifact (persisted). Extends the Stage 1 entity with its manifest. */
export interface Artifact extends Entity {
  name: string;
  version: string;
  ecosystem: string;
  dependencies: Dependency[];
  createdAt: string;
}

/** A completed scan (persisted). */
export interface Scan extends Entity {
  artifactId: string;
  artifactName: string;
  artifactVersion: string;
  verdict: Verdict;
  findings: Finding[];
  resolved: ResolvedDependency[];
  createdAt: string;
  /** Set once a scan has been escalated/overridden. */
  escalationId?: string;
  effectiveVerdict?: Verdict;
}

/** A recorded human override of a scan verdict (persisted; seeds a future "brain"). */
export interface Escalation extends Entity {
  scanId: string;
  reason: string;
  requestedBy: string;
  decision: 'override-allow';
  originalVerdict: Verdict;
  createdAt: string;
}
