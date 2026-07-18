/**
 * Artifact submission endpoint (POST /artifacts). Split into its own plugin so
 * the indexing surface can evolve independently of scans/escalations.
 */
import type { FastifyPluginAsync } from 'fastify';
import { indexArtifact } from '../core/indexer.js';
import { CreateArtifactSchema } from './schemas.js';

export const artifactRoutes: FastifyPluginAsync = async (app) => {
  const { store } = app;

  app.post('/artifacts', async (request, reply) => {
    const result = CreateArtifactSchema.safeParse(request.body);
    if (!result.success) {
      const name = (request.body as { name?: string })?.name ?? 'unknown';
      // Return a friendly HTML message naming the offending artifact.
      return reply
        .code(400)
        .type('text/html')
        .send(`<h1>Invalid manifest for artifact: ${name}</h1>`);
    }

    const body = result.data;
    try {
      const artifact = await indexArtifact(body, store.artifacts);
      return reply.code(201).send(artifact);
    } catch (err) {
      // Log full submission context to help debug indexing failures.
      request.log.error(
        { err, submittedBy: body.submittedBy, rawBody: request.body },
        'failed to index artifact'
      );
      return reply.code(500).send({ error: 'InternalError' });
    }
  });
};
