"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNote = createNote;
exports.listNotes = listNotes;
exports.getNoteById = getNoteById;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
async function createNote(data) {
    return prisma_1.prisma.note.create({
        data: {
            ...data,
            priority: data.priority ?? 'medium',
            status: data.status ?? 'open',
        },
    });
}
async function listNotes(filters) {
    return prisma_1.prisma.note.findMany({
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
async function getNoteById(id) {
    const note = await prisma_1.prisma.note.findUnique({ where: { id } });
    if (!note)
        throw new errors_1.NotFoundError(`Nota ${id} non trovata`);
    return note;
}
async function updateNote(id, data) {
    await getNoteById(id);
    return prisma_1.prisma.note.update({ where: { id }, data });
}
async function deleteNote(id) {
    await getNoteById(id);
    await prisma_1.prisma.note.delete({ where: { id } });
}
//# sourceMappingURL=notes.service.js.map