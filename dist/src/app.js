"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const notes_1 = require("./routes/notes");
const errors_1 = require("./utils/errors");
function buildApp() {
    const app = (0, fastify_1.default)({ logger: process.env.NODE_ENV !== 'test' });
    app.register(notes_1.notesRoutes);
    app.get('/health', async () => ({ status: 'ok' }));
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof zod_1.ZodError) {
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
        if (error instanceof errors_1.NotFoundError) {
            reply.code(404).send({ error: 'NotFound', message: error.message });
            return;
        }
        request.log.error(error);
        reply.code(500).send({ error: 'InternalServerError', message: 'Errore interno del server' });
    });
    return app;
}
//# sourceMappingURL=app.js.map