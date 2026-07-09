import type { FastifyInstance } from 'fastify';
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  noteIdParamSchema,
} from '../schemas/notes.schema';
import * as notesService from '../services/notes.service';

export async function notesRoutes(fastify: FastifyInstance) {
  fastify.post('/notes', async (request, reply) => {
    const body = createNoteSchema.parse(request.body);
    const note = await notesService.createNote(body);
    reply.code(201).send(note);
  });

  fastify.get('/notes', async (request, reply) => {
    const query = listNotesQuerySchema.parse(request.query);

    const totalCount = await notesService.countNotes();
    if (totalCount === 0) {
      reply.send({
        notes: [],
        message: 'Il database non contiene ancora nessuna nota. Usa POST /notes per crearne una.',
      });
      return;
    }

    const notes = await notesService.listNotes(query);
    reply.send({ notes });
  });

  fastify.get('/notes/:id', async (request, reply) => {
    const { id } = noteIdParamSchema.parse(request.params);
    const note = await notesService.getNoteById(id);
    reply.send(note);
  });

  fastify.put('/notes/:id', async (request, reply) => {
    const { id } = noteIdParamSchema.parse(request.params);
    const body = updateNoteSchema.parse(request.body);
    const note = await notesService.updateNote(id, body);
    reply.send(note);
  });

  fastify.delete('/notes/:id', async (request, reply) => {
    const { id } = noteIdParamSchema.parse(request.params);
    await notesService.deleteNote(id);
    reply.code(204).send();
  });
}
