"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesRoutes = notesRoutes;
const notes_schema_1 = require("../schemas/notes.schema");
const notesService = __importStar(require("../services/notes.service"));
async function notesRoutes(fastify) {
    fastify.post('/notes', async (request, reply) => {
        const body = notes_schema_1.createNoteSchema.parse(request.body);
        const note = await notesService.createNote(body);
        reply.code(201).send(note);
    });
    fastify.get('/notes', async (request, reply) => {
        const query = notes_schema_1.listNotesQuerySchema.parse(request.query);
        const notes = await notesService.listNotes(query);
        reply.send(notes);
    });
    fastify.get('/notes/:id', async (request, reply) => {
        const { id } = notes_schema_1.noteIdParamSchema.parse(request.params);
        const note = await notesService.getNoteById(id);
        reply.send(note);
    });
    fastify.put('/notes/:id', async (request, reply) => {
        const { id } = notes_schema_1.noteIdParamSchema.parse(request.params);
        const body = notes_schema_1.updateNoteSchema.parse(request.body);
        const note = await notesService.updateNote(id, body);
        reply.send(note);
    });
    fastify.delete('/notes/:id', async (request, reply) => {
        const { id } = notes_schema_1.noteIdParamSchema.parse(request.params);
        await notesService.deleteNote(id);
        reply.code(204).send();
    });
}
//# sourceMappingURL=notes.js.map