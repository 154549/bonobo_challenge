"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteIdParamSchema = exports.listNotesQuerySchema = exports.updateNoteSchema = exports.createNoteSchema = exports.noteStatusValues = exports.notePriorityValues = exports.noteTypeValues = void 0;
const zod_1 = require("zod");
exports.noteTypeValues = ['issue', 'task', 'info', 'other'];
exports.notePriorityValues = ['low', 'medium', 'high'];
exports.noteStatusValues = ['open', 'in_progress', 'done'];
exports.createNoteSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1, 'title è obbligatorio').max(200),
    content: zod_1.z.string().trim().max(5000).optional(),
    type: zod_1.z.enum(exports.noteTypeValues),
    priority: zod_1.z.enum(exports.notePriorityValues).optional(),
    status: zod_1.z.enum(exports.noteStatusValues).optional(),
});
exports.updateNoteSchema = exports.createNoteSchema.partial();
// Filtri supportati da GET /notes: type, priority, status (match esatto),
// createdFrom/createdTo (range sulla data di creazione) e q (ricerca testuale su title/content).
exports.listNotesQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(exports.noteTypeValues).optional(),
    priority: zod_1.z.enum(exports.notePriorityValues).optional(),
    status: zod_1.z.enum(exports.noteStatusValues).optional(),
    createdFrom: zod_1.z.coerce.date().optional(),
    createdTo: zod_1.z.coerce.date().optional(),
    q: zod_1.z.string().trim().min(1).optional(),
});
exports.noteIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
//# sourceMappingURL=notes.schema.js.map