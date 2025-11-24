import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { config, env } from 'process';
import { setInterval, clearInterval } from 'timers';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export interface McpServerConfig {
    name: string;
    version: string;
    defaultPort: number;
    environment: string;
}

export class DaaifMcpServer extends McpServer {
    _config: McpServerConfig;
    constructor(config: McpServerConfig) {
        super({
            name: config.name,
            version: config.version,
            environment: config.environment
        });
        this._config = config;
    }

    /**Bootstrap to start the MCP server with express */
    public async boot(server: McpServer, app: express.Application): Promise<void> {
        // support both stdio and http transports
        if (process.env.MCP_TRANSPORT === 'stdio') {
            // Use stdio transport for Claude Desktop
            const transport = new StdioServerTransport();
            await server.connect(transport);
            console.error(`MCP Server ${this._config.name} running in stdio mode`);
        } else {
            return this.startServer(server, app);
        }
    }
    protected async startServer(server: McpServer, app: express.Application): Promise<void> {
        // Enable CORS
        app.use(cors());
        app.use(express.json());
        
        // Handle all MCP requests
        app.all(['/mcp', '/mcp/sse'], async (req, res) => {
            // Handle SSE request
            if (req.path === '/mcp/sse') {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.flushHeaders();

                const pingInterval = setInterval(() => {
                    res.write('event: ping\ndata: ping\n\n');
                }, 30000);

                res.on('close', () => {
                    clearInterval(pingInterval);
                });
                return;
            }

            // Handle regular HTTP MCP requests
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
                enableJsonResponse: true
            });
            res.on('close', () => {
                transport.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            console.error('MCP Server running in HTTP mode');
        });

        const port = parseInt(env.PORT || this._config.defaultPort.toString());
        app.listen(port, () => {
            // eslint-disable-next-line no-console
            console.error(`${this._config.name} MCP Server running on http://localhost:${port}/mcp`);
        }).on('error', error => {
            // eslint-disable-next-line no-console
            console.error('Server error:', error);
            process.exitCode = 1;
        });
        return Promise.resolve();
    }
}