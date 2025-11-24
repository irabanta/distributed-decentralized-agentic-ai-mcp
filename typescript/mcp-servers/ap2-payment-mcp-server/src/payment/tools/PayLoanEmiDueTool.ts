import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from 'process';
import { z } from 'zod';
import '@daaif/mcp-common';
import { zodStrRequired, zodStrUserMustInput } from '@daaif/mcp-common';
import { LoanAccountService } from '../services/LoanAccountService.js';
import { LoanEmiPlan, LoanPaymentMandateContext } from '../types/LoanPaymentTypes.js';
import { Ap2MandateService } from '../services/Ap2MandateService.js';

const InputSchema = z.object({
    loan_account_number: zodStrUserMustInput(zodStrRequired(z.string(), 'loan_account_number')),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    customer_email: z.string().email().optional(),
    merchant_agent_id: zodStrUserMustInput(zodStrRequired(z.string(), 'merchant_agent_id')),
    merchant_endpoint: zodStrUserMustInput(zodStrRequired(z.string(), 'merchant_endpoint')),
    credential_provider_id: zodStrUserMustInput(zodStrRequired(z.string(), 'credential_provider_id')),
    payment_network: zodStrUserMustInput(zodStrRequired(z.string(), 'payment_network')),
    autopay_anchor_date: z.string().optional()
});

type ToolInput = z.infer<typeof InputSchema>;

const loanAccountService = new LoanAccountService();

export class PayLoanEmiDueTool {
    static register(server: McpServer): void {
        server.registerTool(
            'pay_ap2_loan_emi_due',
            {
                title: 'Pay loan EMI due via AP2',
                description: 'Looks up the live EMI due for a loan account, creates an AP2 payment mandate, and optionally submits it to the configured AP2 transport.',
                inputSchema: InputSchema.shape,
                outputSchema: {
                    loan_account_number: z.string(),
                    due_date: z.string(),
                    total_due: z.number(),
                    currency: z.string(),
                    schedule: z.array(
                        z.object({
                            installmentNumber: z.number(),
                            dueDate: z.string(),
                            principalComponent: z.number(),
                            interestComponent: z.number(),
                            remainingPrincipal: z.number()
                        })
                    ),
                    ap2_bundle: z.object({
                        intentMandate: z.any(),
                        cartMandate: z.any(),
                        paymentMandate: z.any(),
                        submissionReceipt: z.any().optional()
                    })
                }
            },
            PayLoanEmiDueTool.execute
        );
    }

    private static async execute(rawArgs: ToolInput) {
        const args = InputSchema.parse(rawArgs);
        const dueSummary = await loanAccountService.getNextEmiDue(args.loan_account_number);

        const plan: LoanEmiPlan = {
            emiAmount: dueSummary.totalDue,
            totalInterest: Number((dueSummary.interestDue + dueSummary.lateCharges).toFixed(2)),
            totalRepayment: dueSummary.totalDue,
            principalAmount: dueSummary.principalDue,
            schedule: [
                {
                    installmentNumber: dueSummary.installmentNumber,
                    dueDate: dueSummary.dueDate,
                    principalComponent: dueSummary.principalDue,
                    interestComponent: Number((dueSummary.interestDue + dueSummary.lateCharges).toFixed(2)),
                    remainingPrincipal: dueSummary.remainingPrincipal
                }
            ]
        };

        const context: LoanPaymentMandateContext = {
            customer: {
                customerId: args.customer_id ?? dueSummary.customerId,
                fullName: args.customer_name,
                email: args.customer_email
            },
            merchantAgentId: args.merchant_agent_id,
            merchantEndpoint: args.merchant_endpoint,
            credentialProviderId: args.credential_provider_id,
            paymentMethodNetwork: args.payment_network,
            repaymentCurrency: dueSummary.currency,
            autopayAnchorDate: args.autopay_anchor_date ?? dueSummary.dueDate
        };

        let bundle = Ap2MandateService.createMandates(plan, context);
        if (env.AP2_TRANSPORT_ENDPOINT) {
            bundle = await Ap2MandateService.submitMandates(bundle);
        }

        const summary = [
            `Loan account: ${dueSummary.loanAccountNumber}`,
            `EMI due on ${dueSummary.dueDate}: ${dueSummary.totalDue.toFixed(2)} ${dueSummary.currency}`,
            env.AP2_TRANSPORT_ENDPOINT ? 'AP2 payment submission attempted.' : 'AP2 submission skipped (configure AP2_TRANSPORT_ENDPOINT to submit).'
        ].join('\n');

        return {
            content: [{ type: 'text' as const, text: summary }],
            structuredContent: {
                loan_account_number: dueSummary.loanAccountNumber,
                due_date: dueSummary.dueDate,
                total_due: dueSummary.totalDue,
                currency: dueSummary.currency,
                schedule: plan.schedule,
                ap2_bundle: bundle
            }
        };
    }
}

