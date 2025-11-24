export interface MonetaryAmount {
    currency: string;
    value: number;
}

export interface LoanCustomerContext {
    customerId: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
}

export interface LoanEmiInput {
    principalAmount: number;
    annualInterestRate: number;
    tenureMonths: number;
    disbursementDate: string;
    gracePeriodMonths?: number;
}

export interface LoanEmiScheduleEntry {
    installmentNumber: number;
    dueDate: string;
    principalComponent: number;
    interestComponent: number;
    remainingPrincipal: number;
}

export interface LoanEmiPlan {
    emiAmount: number;
    totalInterest: number;
    totalRepayment: number;
    principalAmount: number;
    schedule: LoanEmiScheduleEntry[];
}

export interface LoanPaymentMandateContext {
    customer: LoanCustomerContext;
    merchantAgentId: string;
    merchantEndpoint: string;
    credentialProviderId: string;
    paymentMethodNetwork: string;
    repaymentCurrency: string;
    autopayAnchorDate: string;
}

export type LoanInstallmentStatus = 'DUE' | 'OVERDUE' | 'PAID';

export interface LoanEmiDueSummary {
    loanAccountNumber: string;
    customerId: string;
    installmentNumber: number;
    dueDate: string;
    currency: string;
    principalDue: number;
    interestDue: number;
    lateCharges: number;
    totalDue: number;
    remainingPrincipal: number;
    status: LoanInstallmentStatus;
}

