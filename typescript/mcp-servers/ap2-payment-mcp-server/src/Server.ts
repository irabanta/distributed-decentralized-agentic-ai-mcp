import express from 'express';
import pkg from '../package.json' with { type: 'json' };
import { env } from 'process';

import '@daaif/mcp-common';
import { DaaifMcpServer } from '@daaif/mcp-common';
import { Ap2PaymentBootstrap } from './payment/bootstrap.js';

async function startServer() {
    const app = express();
    app.use(express.json());

    const server = new DaaifMcpServer({
        name: env.SERVICE_NAME || pkg.name,
        version: env.SERVICE_VERSION || pkg.version,
        environment: env.NODE_ENV || 'development',
        defaultPort: Number(env.PORT) || 3012
    });

    try {
        await Ap2PaymentBootstrap.bootstrap(server);
        await server.boot(server, app);
    } catch (error) {
        console.error('Failed to start AP2 Payment MCP server:', error);
        process.exit(1);
    }
}

startServer().catch(error => {
    console.error('Unhandled error during AP2 Payment MCP bootstrap:', error);
    process.exit(1);
});

