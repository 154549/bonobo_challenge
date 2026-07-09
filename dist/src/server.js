"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const app = (0, app_1.buildApp)();
const port = Number(process.env.PORT) || 3000;
app
    .listen({ port, host: '0.0.0.0' })
    .then(() => {
    app.log.info(`Server in ascolto su http://localhost:${port}`);
})
    .catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map