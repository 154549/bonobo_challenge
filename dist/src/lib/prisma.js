"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const client_1 = require("../../generated/prisma/client");
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' });
exports.prisma = new client_1.PrismaClient({ adapter });
//# sourceMappingURL=prisma.js.map