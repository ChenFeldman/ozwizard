/**
 * Request validation schemas (zod). Keeping them in one place makes the
 * HTTP contract easy to read.
 */
import { z } from 'zod';

const DependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

/** POST /artifacts body: an artifact plus its declared dependency manifest. */
export const CreateArtifactSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  ecosystem: z.string().min(1).default('npm'),
  dependencies: z.array(DependencySchema).default([]),
  /** Email of the person submitting the artifact (for audit trail). */
  submittedBy: z.string().email().optional(),
});

/** POST /scans body: which indexed artifact to scan. */
export const CreateScanSchema = z.object({
  artifactId: z.string().min(1),
  /** Optional customer whose policy overrides apply to this scan. */
  customerId: z.string().min(1).optional(),
});

/** POST /escalations body: override a scan verdict, with a reason. */
export const CreateEscalationSchema = z.object({
  scanId: z.string().min(1),
  reason: z.string().min(1),
  requestedBy: z.string().min(1).optional(),
});

export type CreateArtifactBody = z.infer<typeof CreateArtifactSchema>;
export type CreateScanBody = z.infer<typeof CreateScanSchema>;
export type CreateEscalationBody = z.infer<typeof CreateEscalationSchema>;
