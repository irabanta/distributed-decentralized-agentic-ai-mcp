import { LoanEmiInput, LoanEmiPlan, LoanEmiScheduleEntry } from '../types/LoanPaymentTypes.js';

const DECIMAL_PLACES = 2;

export class LoanEmiService {
    static generatePlan(input: LoanEmiInput): LoanEmiPlan {
        if (input.principalAmount <= 0) {
            throw new Error('principalAmount must be greater than zero');
        }
        if (input.tenureMonths <= 0) {
            throw new Error('tenureMonths must be greater than zero');
        }
        if (input.annualInterestRate < 0) {
            throw new Error('annualInterestRate cannot be negative');
        }
        const monthlyRate = input.annualInterestRate / 12 / 100;
        const effectiveTenure = input.tenureMonths;
        const emiAmount = LoanEmiService.calculateEmi(
            input.principalAmount,
            monthlyRate,
            effectiveTenure
        );

        const schedule = LoanEmiService.generateSchedule(
            input.principalAmount,
            monthlyRate,
            effectiveTenure,
            emiAmount,
            input.disbursementDate,
            input.gracePeriodMonths ?? 0
        );

        const totalRepayment = schedule.reduce((sum, entry) => sum + entry.principalComponent + entry.interestComponent, 0);
        const totalInterest = totalRepayment - input.principalAmount;

        return {
            emiAmount: LoanEmiService.roundCurrency(emiAmount),
            totalInterest: LoanEmiService.roundCurrency(totalInterest),
            totalRepayment: LoanEmiService.roundCurrency(totalRepayment),
            principalAmount: LoanEmiService.roundCurrency(input.principalAmount),
            schedule
        };
    }

    private static calculateEmi(principal: number, monthlyRate: number, tenureMonths: number): number {
        if (monthlyRate === 0) {
            return principal / tenureMonths;
        }
        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
        const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
        return numerator / denominator;
    }

    private static generateSchedule(
        principal: number,
        monthlyRate: number,
        tenureMonths: number,
        emiAmount: number,
        disbursementDate: string,
        gracePeriodMonths: number
    ): LoanEmiScheduleEntry[] {
        const schedule: LoanEmiScheduleEntry[] = [];
        let remainingPrincipal = principal;
        const anchorDate = LoanEmiService.parseDate(disbursementDate);

        for (let installment = 1; installment <= tenureMonths; installment += 1) {
            const dueDate = LoanEmiService.addMonths(anchorDate, gracePeriodMonths + installment);
            const interestComponent = monthlyRate === 0 ? 0 : remainingPrincipal * monthlyRate;
            const principalComponent = Math.min(emiAmount - interestComponent, remainingPrincipal);
            remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);

            schedule.push({
                installmentNumber: installment,
                dueDate: dueDate.toISOString().split('T')[0],
                interestComponent: LoanEmiService.roundCurrency(interestComponent),
                principalComponent: LoanEmiService.roundCurrency(principalComponent),
                remainingPrincipal: LoanEmiService.roundCurrency(remainingPrincipal)
            });
        }
        return schedule;
    }

    private static roundCurrency(amount: number): number {
        return Number(amount.toFixed(DECIMAL_PLACES));
    }

    private static parseDate(input: string): Date {
        const parsed = new Date(input);
        if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Invalid date format: ${input}`);
        }
        return parsed;
    }

    private static addMonths(date: Date, months: number): Date {
        const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        copy.setUTCMonth(copy.getUTCMonth() + months);
        return copy;
    }
}

