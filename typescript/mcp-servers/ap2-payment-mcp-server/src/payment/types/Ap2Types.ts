import { MonetaryAmount } from './LoanPaymentTypes.js';

export interface Ap2ParticipantRef {
    id: string;
    name?: string;
    endpoint?: string;
}

export interface Ap2IntentMandate {
    mandateId: string;
    shopper: Ap2ParticipantRef;
    merchant: Ap2ParticipantRef;
    credentialProvider: Ap2ParticipantRef;
    ttlMinutes: number;
    shoppingIntent: {
        description: string;
        maxBudget: MonetaryAmount;
        repaymentProfile: {
            tenureMonths: number;
            emiAmount: number;
            startDate: string;
        };
    };
    paymentConstraints: {
        allowedNetworks: string[];
        currency: string;
        maxSingleDebit: MonetaryAmount;
    };
    riskSignals: Record<string, unknown>;
    userSignature?: string;
    issuedAt: string;
}

export interface Ap2CartMandate {
    mandateId: string;
    merchant: Ap2ParticipantRef;
    shopper: Ap2ParticipantRef;
    loanSummary: {
        principal: MonetaryAmount;
        totalRepayment: MonetaryAmount;
        emiAmount: MonetaryAmount;
        tenureMonths: number;
        scheduleAnchorDate: string;
    };
    paymentProcessor: {
        id: string;
        endpoint?: string;
    };
    merchantSignature?: string;
    issuedAt: string;
}

export interface Ap2PaymentMandate {
    mandateId: string;
    paymentDetailsId: string;
    merchantAgent: Ap2ParticipantRef;
    credentialProvider: Ap2ParticipantRef;
    emiAmount: MonetaryAmount;
    repaymentCurrency: string;
    repaymentCount: number;
    repaymentAnchorDate: string;
    autopayDayOfMonth: number;
    paymentMethodNetwork: string;
    authorizationEnvelope?: string;
    createdAt: string;
}

export interface Ap2MandateBundle {
    intentMandate: Ap2IntentMandate;
    cartMandate: Ap2CartMandate;
    paymentMandate: Ap2PaymentMandate;
    submissionReceipt?: {
        referenceId: string;
        status: 'QUEUED' | 'PENDING_USER_SIGNATURE' | 'REGISTERED';
        submittedAt: string;
        transport: 'http' | 'a2a' | 'mcp';
    };
}

