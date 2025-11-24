import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateLoanEmiMandateTool } from './tools/CreateLoanEmiMandateTool.js';
import { PayLoanEmiDueTool } from './tools/PayLoanEmiDueTool.js';

export class Ap2PaymentBootstrap {
    static async bootstrap(server: McpServer): Promise<void> {
        await CreateLoanEmiMandateTool.register(server);
        await PayLoanEmiDueTool.register(server);
    }
}

