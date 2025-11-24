import { LoanEmiDueSummary } from '../types/LoanPaymentTypes.js';

const ACCOUNT_PATTERN = /^[A-Z0-9-]{8,20}$/;

export class LoanAccountService {
    private mockStore: Map<string, LoanEmiDueSummary> = new Map();

    async getNextEmiDue(loanAccountNumber: string): Promise<LoanEmiDueSummary> {
        if (!loanAccountNumber || !ACCOUNT_PATTERN.test(loanAccountNumber.toUpperCase())) {
            throw new Error('loan_account_number must be 8-20 characters (A-Z, 0-9, -)');
        }

        const normalized = loanAccountNumber.toUpperCase();
        if (!this.mockStore.has(normalized)) {
            this.mockStore.set(normalized, this.seedDueRecord(normalized));
        }
        const summary = this.mockStore.get(normalized)!;
        if (summary.status === 'PAID') {
            throw new Error(`No EMI due for account ${normalized}`);
        }
        return summary;
    }

    async markInstallmentPaid(loanAccountNumber: string): Promise<void> {
        const normalized = loanAccountNumber.toUpperCase();
        const summary = this.mockStore.get(normalized);
        if (summary) {
            summary.status = 'PAID';
            this.mockStore.set(normalized, summary);
        }
    }

    private seedDueRecord(accountNumber: string): LoanEmiDueSummary {
        const installmentNumber = (accountNumber.charCodeAt(0) % 12) + 1;
        const principalDue = 500 + (accountNumber.charCodeAt(1) % 200);
        const interestDue = Math.round(principalDue * 0.12 * 100) / 100;
        const lateCharges = accountNumber.endsWith('X') ? 15 : 0;
        const totalDue = Math.round((principalDue + interestDue + lateCharges) * 100) / 100;
        const today = new Date();
        const dueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        dueDate.setUTCDate(dueDate.getUTCDate() + 5);

        return {
            loanAccountNumber: accountNumber,
            customerId: `CUST-${accountNumber.slice(-6)}`,
            installmentNumber,
            dueDate: dueDate.toISOString().split('T')[0],
            currency: 'USD',
            principalDue,
            interestDue,
            lateCharges,
            totalDue,
            remainingPrincipal: principalDue * 20,
            status: 'DUE'
        };
    }
}

