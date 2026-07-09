import Fastify from 'fastify';
import { ZodError } from 'zod';
import { notesRoutes } from './routes/notes';
import { NotFoundError } from './utils/errors';

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  app.register(notesRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({
        error: 'ValidationError',
        message: 'Dati non validi',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (error instanceof NotFoundError) {
      reply.code(404).send({ error: 'NotFound', message: error.message });
      return;
    }

    request.log.error(error);
    reply.code(500).send({ error: 'InternalServerError', message: 'Errore interno del server' });
  });

  return app;
}
