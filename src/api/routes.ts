/**
 * HTTP surface for the core flow. One thin Fastify plugin wires the pure core
 * modules to the store and the bundled mock data:
 *
 *   POST /artifacts     index a manifest
 *   POST /scans         scan an indexed artifact, evaluate policy
 *   GET  /scans/:id     fetch a stored scan
 *   POST /escalations   record a human override
 *   GET  /policies      introspect the active policy
 */
import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { loadAdvisories, loadRegistry } from '../data/index.js';
import { recordEscalation } from '../core/escalations.js';
import { DEFAULT_POLICY, evaluate } from '../core/policy.js';
import { resolveDependencies, scanDependenciesLive } from '../core/scanner.js';
import type { Scan } from '../core/types.js';
import { CreateEscalationSchema, CreateScanSchema } from './schemas.js';

/** Validate `body` with `schema`, replying 400 on failure. Returns null when invalid. */
function parse<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
  reply: { code: (n: number) => { send: (payload: unknown) => unknown } }
): z.infer<S> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.code(400).send({ error: 'ValidationError', details: result.error.flatten() });
    return null;
  }
  return result.data;
}

export const registerRoutes: FastifyPluginAsync = async (app) => {
  // Mock data loaded once at startup and injected into the pure core modules.
  const advisories = loadAdvisories();
  const registry = loadRegistry();
  const { store } = app;

  app.post('/scans', async (request, reply) => {
    const body = parse(CreateScanSchema, request.body, reply);
    if (!body) return reply;

    const artifact = await store.artifacts.get(body.artifactId);
    if (!artifact) {
      return reply.code(404).send({ error: 'NotFound', message: `artifact ${body.artifactId}` });
    }

    const resolved = resolveDependencies(artifact.dependencies, registry);
    const findings = await scanDependenciesLive(resolved, advisories);
    const { verdict, findings: evaluated } = evaluate(findings, resolved, DEFAULT_POLICY);

    const scan: Scan = {
      id: randomUUID(),
      artifactId: artifact.id,
      artifactName: artifact.name,
      artifactVersion: artifact.version,
      verdict,
      findings: evaluated,
      resolved,
      createdAt: new Date().toISOString(),
    };
    await store.scans.create(scan);
    return reply.code(201).send(scan);
  });

  app.get('/scans/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const scan = await store.scans.get(id);
    if (!scan) return reply.code(404).send({ error: 'NotFound', message: `scan ${id}` });
    return scan;
  });

  app.post('/escalations', async (request, reply) => {
    const body = parse(CreateEscalationSchema, request.body, reply);
    if (!body) return reply;

    const escalation = await recordEscalation(body, store.scans, store.escalations);
    if (!escalation) {
      return reply.code(404).send({ error: 'NotFound', message: `scan ${body.scanId}` });
    }
    return reply.code(201).send(escalation);
  });

  app.get('/policies', async () => {
    return { policy: DEFAULT_POLICY, advisoryCount: advisories.length };
  });
};
