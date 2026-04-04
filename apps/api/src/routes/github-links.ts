import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const createBody = z.object({
  prUrl: z.string().url(),
  prNumber: z.number().int().positive(),
  repo: z.string().min(1),
});

export async function githubLinkRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get<{ Params: { issueId: string } }>(
    '/api/v1/issues/:issueId/github-links',
    async (request) => {
      const links = await db
        .select()
        .from(schema.githubPrLinks)
        .where(eq(schema.githubPrLinks.issueId, request.params.issueId));
      return { data: links };
    },
  );

  app.post<{ Params: { issueId: string } }>(
    '/api/v1/issues/:issueId/github-links',
    async (request, reply) => {
      let body: z.infer<typeof createBody>;
      try {
        body = createBody.parse(request.body);
      } catch (e: any) {
        return reply.status(400).send({ error: 'Validation error', details: e.issues });
      }
      const [link] = await db
        .insert(schema.githubPrLinks)
        .values({
          id: nanoid(),
          issueId: request.params.issueId,
          prUrl: body.prUrl,
          prNumber: body.prNumber,
          repo: body.repo,
          createdAt: new Date(),
        })
        .returning();
      return reply.status(201).send({ data: link });
    },
  );
}
