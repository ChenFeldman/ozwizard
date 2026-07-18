/**
 * Escalations — record a human override of a scan verdict. For now this just
 * persists the decision and stamps the scan; later a "brain" could learn from
 * the accumulated reasons.
 */
import { randomUUID } from 'node:crypto';
import type { Repository } from '../store/types.js';
import type { Escalation, Scan } from './types.js';

export interface EscalationInput {
  scanId: string;
  reason: string;
  requestedBy?: string;
}

/**
 * Record an override that forces a scan's effective verdict to "allow".
 * Returns the new escalation, or `undefined` if the scan does not exist.
 */
export async function recordEscalation(
  input: EscalationInput,
  scans: Repository<Scan>,
  escalations: Repository<Escalation>,
  now: string = new Date().toISOString()
): Promise<Escalation | undefined> {
  const scan = await scans.get(input.scanId);
  if (!scan) return undefined;

  const escalation: Escalation = {
    id: randomUUID(),
    scanId: scan.id,
    reason: input.reason,
    requestedBy: input.requestedBy ?? 'anonymous',
    decision: 'override-allow',
    originalVerdict: scan.verdict,
    createdAt: now,
  };

  await escalations.create(escalation);
  await scans.update(scan.id, { escalationId: escalation.id, effectiveVerdict: 'allow' });

  return escalation;
}
