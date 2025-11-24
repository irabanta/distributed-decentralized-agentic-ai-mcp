import express from 'express';
import pkg from '../package.json' with { type: "json" };
import { env } from 'process';

// Import Zod extensions to initialize prototype methods
import '@daaif/mcp-common';

import { ResourcesBootstrap } from './resources/bootstrap.js';
import { AccountBalanceBootstrap } from './account-balance/bootstrap.js';
import { DaaifMcpServer } from '@daaif/mcp-common';

async function startServer() {
    // Set up Express and HTTP transport
    const app = express();
    app.use(express.json());

    // Create an MCP server with enterprise configuration
    const server = new DaaifMcpServer({
        name: env.SERVICE_NAME || pkg.name,
        version: env.SERVICE_VERSION || pkg.version,
        environment: env.NODE_ENV || 'development',
        defaultPort: 3002
    });

    try {
        // Register all resources
        await ResourcesBootstrap.bootstrap(server);

        /** Register functionality wise */
        await AccountBalanceBootstrap.bootstrap(server);

        // Start the MCP server with express transport
        await server.boot(server, app);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});