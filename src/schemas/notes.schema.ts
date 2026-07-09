import { z } from 'zod';

export const noteTypeValues = ['issue', 'task', 'info', 'other'] as const;
export const notePriorityValues = ['low', 'medium', 'high'] as const;
export const noteStatusValues = ['open', 'in_progress', 'done'] as const;

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'title è obbligatorio').max(200),
  content: z.string().trim().max(5000).optional(),
  type: z.enum(noteTypeValues),
  priority: z.enum(notePriorityValues).optional(),
  status: z.enum(noteStatusValues).optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// Filtri supportati da GET /notes: type, priority, status (match esatto),
// createdFrom/createdTo (range sulla data di creazione) e q (ricerca testuale su title/content).
export const listNotesQuerySchema = z.object({
  type: z.enum(noteTypeValues).optional(),
  priority: z.enum(notePriorityValues).optional(),
  status: z.enum(noteStatusValues).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  q: z.string().trim().min(1).optional(),
});
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

export const noteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
