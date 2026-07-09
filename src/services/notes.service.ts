import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import type { CreateNoteInput, UpdateNoteInput, ListNotesQuery } from '../schemas/notes.schema';

export async function createNote(data: CreateNoteInput) {
  return prisma.note.create({
    data: {
      ...data,
      priority: data.priority ?? 'medium',
      status: data.status ?? 'open',
    },
  });
}

export async function listNotes(filters: ListNotesQuery) {
  return prisma.note.findMany({
    where: {
      type: filters.type,
      priority: filters.priority,
      status: filters.status,
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
              ...(filters.createdTo ? { lte: filters.createdTo } : {}),
            },
          }
        : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q } },
              { content: { contains: filters.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countNotes() {
  return prisma.note.count();
}

export async function getNoteById(id: number) {
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) throw new NotFoundError(`Nota ${id} non trovata`);
  return note;
}

export async function updateNote(id: number, data: UpdateNoteInput) {
  await getNoteById(id);
  return prisma.note.update({ where: { id }, data });
}

export async function deleteNote(id: number) {
  await getNoteById(id);
  await prisma.note.delete({ where: { id } });
}
