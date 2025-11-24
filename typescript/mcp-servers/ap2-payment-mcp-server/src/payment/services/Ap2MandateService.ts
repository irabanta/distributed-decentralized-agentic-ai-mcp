import { randomUUID } from 'crypto';
import { env } from 'process';
import { LoanEmiPlan, LoanPaymentMandateContext } from '../types/LoanPaymentTypes.js';
import { Ap2MandateBundle } from '../types/Ap2Types.js';

const DEFAULT_AP2_ENDPOINT = env.AP2_TRANSPORT_ENDPOINT;
const AP2_API_KEY = env.GOOGLE_API_KEY || env.AP2_API_KEY;

export class Ap2MandateService {
    public static createMandates(plan: LoanEmiPlan, context: LoanPaymentMandateContext): Ap2MandateBundle {
        const intentMandateId = `intent_${randomUUID()}`;
        const cartMandateId = `cart_${randomUUID()}`;
        const paymentMandateId = `payment_${randomUUID()}`;
        const issuedAt = new Date().toISOString();
        const autopayDate = new Date(context.autopayAnchorDate);
        if (Number.isNaN(autopayDate.getTime())) {
            throw new Error(`Invalid autopayAnchorDate: ${context.autopayAnchorDate}`);
        }

        const emiMonetaryAmount = {
            currency: context.repaymentCurrency,
            value: plan.emiAmount
        };
        const description = `Autopay EMI repayment for principal ${plan.principalAmount.toFixed(2)} ${context.repaymentCurrency}`;

        return {
            intentMandate: {
                mandateId: intentMandateId,
                issuedAt,
                shopper: {
                    id: context.customer.customerId,
                    name: context.customer.fullName
                },
                merchant: {
                    id: context.merchantAgentId,
                    endpoint: context.merchantEndpoint
                },
                credentialProvider: {
                    id: context.credentialProviderId
                },
                ttlMinutes: 4320,
                shoppingIntent: {
                    description,
                    maxBudget: {
                        currency: context.repaymentCurrency,
                        value: plan.totalRepayment
                    },
                    repaymentProfile: {
                        tenureMonths: plan.schedule.length,
                        emiAmount: plan.emiAmount,
                        startDate: context.autopayAnchorDate
                    }
                },
                paymentConstraints: {
                    allowedNetworks: [context.paymentMethodNetwork],
                    currency: context.repaymentCurrency,
                    maxSingleDebit: emiMonetaryAmount
                },
                riskSignals: {
                    ap2_version: 'v0.1',
                    autopay_anchor_date: context.autopayAnchorDate,
                    repayment_count: plan.schedule.length
                }
            },
            cartMandate: {
                mandateId: cartMandateId,
                issuedAt,
                merchant: {
                    id: context.merchantAgentId,
                    endpoint: context.merchantEndpoint
                },
                shopper: {
                    id: context.customer.customerId,
                    name: context.customer.fullName
                },
                loanSummary: {
                    principal: {
                        currency: context.repaymentCurrency,
                        value: plan.principalAmount
                    },
                    totalRepayment: {
                        currency: context.repaymentCurrency,
                        value: plan.totalRepayment
                    },
                    emiAmount: emiMonetaryAmount,
                    tenureMonths: plan.schedule.length,
                    scheduleAnchorDate: context.autopayAnchorDate
                },
                paymentProcessor: {
                    id: context.merchantAgentId,
                    endpoint: context.merchantEndpoint
                }
            },
            paymentMandate: {
                mandateId: paymentMandateId,
                paymentDetailsId: `emi_${randomUUID()}`,
                merchantAgent: {
                    id: context.merchantAgentId
                },
                credentialProvider: {
                    id: context.credentialProviderId
                },
                emiAmount: emiMonetaryAmount,
                repaymentCurrency: context.repaymentCurrency,
                repaymentCount: plan.schedule.length,
                repaymentAnchorDate: context.autopayAnchorDate,
                autopayDayOfMonth: autopayDate.getUTCDate(),
                paymentMethodNetwork: context.paymentMethodNetwork,
                createdAt: issuedAt
            }
        };
    }

    public static async submitMandates(bundle: Ap2MandateBundle): Promise<Ap2MandateBundle> {
        if (!DEFAULT_AP2_ENDPOINT) {
            return bundle;
        }
        const response = await fetch(DEFAULT_AP2_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(AP2_API_KEY ? { Authorization: `Bearer ${AP2_API_KEY}` } : {})
            },
            body: JSON.stringify({
                intent_mandate: bundle.intentMandate,
                cart_mandate: bundle.cartMandate,
                payment_mandate: bundle.paymentMandate
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`AP2 submission failed (${response.status}): ${body}`);
        }

        const payload = await response.json();
        return {
            ...bundle,
            submissionReceipt: {
                referenceId: payload.reference_id ?? payload.id ?? randomUUID(),
                status: payload.status ?? 'QUEUED',
                submittedAt: payload.submitted_at ?? new Date().toISOString(),
                transport: payload.transport ?? 'http'
            }
        };
    }
}

