import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from 'process';
import { z } from 'zod';
import '@daaif/mcp-common';
import { zodStrRequired, zodStrUserMustInput } from '@daaif/mcp-common';
import { LoanEmiService } from '../services/LoanEmiService.js';
import { Ap2MandateService } from '../services/Ap2MandateService.js';
import { LoanEmiInput, LoanPaymentMandateContext } from '../types/LoanPaymentTypes.js';

const InputSchema = z.object({
    principal_amount: z.number().positive(),
    annual_interest_rate: z.number().nonnegative(),
    tenure_months: z.number().int().positive(),
    disbursement_date: zodStrUserMustInput(zodStrRequired(z.string(), 'disbursement_date')),
    grace_period_months: z.number().int().nonnegative().optional(),
    currency: zodStrUserMustInput(zodStrRequired(z.string(), 'currency')),
    customer_id: zodStrUserMustInput(zodStrRequired(z.string(), 'customer_id')),
    customer_name: z.string().optional(),
    customer_email: z.string().email().optional(),
    merchant_agent_id: zodStrUserMustInput(zodStrRequired(z.string(), 'merchant_agent_id')),
    merchant_endpoint: zodStrUserMustInput(zodStrRequired(z.string(), 'merchant_endpoint')),
    credential_provider_id: zodStrUserMustInput(zodStrRequired(z.string(), 'credential_provider_id')),
    payment_network: zodStrUserMustInput(zodStrRequired(z.string(), 'payment_network')),
    autopay_anchor_date: zodStrUserMustInput(zodStrRequired(z.string(), 'autopay_anchor_date'))
});

type ToolInput = z.infer<typeof InputSchema>;

export class CreateLoanEmiMandateTool {
    static register(server: McpServer): void {
        server.registerTool(
            'create_ap2_loan_emi_plan',
            {
                title: 'Create AP2 loan EMI payment plan',
                description: 'Calculates a monthly EMI plan and produces AP2 intent/cart/payment mandates ready for submission to Google Agent Payments Protocol (AP2).',
                inputSchema: InputSchema.shape,
                outputSchema: {
                    emi_amount: z.number(),
                    total_interest: z.number(),
                    total_repayment: z.number(),
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
            CreateLoanEmiMandateTool.execute
        );
    }

    private static async execute(rawArgs: ToolInput) {
        const args = InputSchema.parse(rawArgs);
        const emiInput: LoanEmiInput = {
            principalAmount: args.principal_amount,
            annualInterestRate: args.annual_interest_rate,
            tenureMonths: args.tenure_months,
            disbursementDate: args.disbursement_date,
            gracePeriodMonths: args.grace_period_months
        };

        const plan = LoanEmiService.generatePlan(emiInput);
        const context: LoanPaymentMandateContext = {
            customer: {
                customerId: args.customer_id,
                fullName: args.customer_name,
                email: args.customer_email
            },
            merchantAgentId: args.merchant_agent_id,
            merchantEndpoint: args.merchant_endpoint,
            credentialProviderId: args.credential_provider_id,
            paymentMethodNetwork: args.payment_network,
            repaymentCurrency: args.currency,
            autopayAnchorDate: args.autopay_anchor_date
        };

        let bundle = Ap2MandateService.createMandates(plan, context);
        if (env.AP2_TRANSPORT_ENDPOINT) {
            bundle = await Ap2MandateService.submitMandates(bundle);
        }

        const summary = [
            `Monthly EMI: ${plan.emiAmount.toFixed(2)} ${context.repaymentCurrency}`,
            `Total repayment: ${plan.totalRepayment.toFixed(2)} ${context.repaymentCurrency}`,
            env.AP2_TRANSPORT_ENDPOINT ? 'AP2 submission attempted' : 'AP2 submission skipped (no transport endpoint configured)'
        ].join('\n');

        return {
            content: [{ type: 'text' as const, text: summary }],
            structuredContent: {
                emi_amount: plan.emiAmount,
                total_interest: plan.totalInterest,
                total_repayment: plan.totalRepayment,
                schedule: plan.schedule,
                ap2_bundle: bundle
            }
        };
    }
}

