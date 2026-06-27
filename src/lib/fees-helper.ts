import {
    FeeGroup,
    Transaction,
    FeeInGroup,
    PaymentFrequency
} from '@/types/fees';
import { Student } from '@/types';

/**
 * Centrally determine if a student is 'new' or 'old' for fee calculation purposes.
 * @param student The student object
 * @param currentSessionId The school's current session name/id
 */
export const getStudentType = (student: Student, currentSessionId?: string): 'new' | 'old' => {
    if (student.studentType) return student.studentType as 'new' | 'old';
    return (student.enrolledSession && currentSessionId && student.enrolledSession === currentSessionId) 
        ? 'new' : 'old';
};

export const SESSION_MONTHS = Array.from({ length: 12 }, (_, i) => {
    // Assuming academic year starts in April (Index 3 in standard Date) or similar?
    // Using standard Jan-Dec for now as per previous component logic
    const date = new Date(2024, i, 1);
    return {
        name: date.toLocaleString('en-US', { month: 'short' }),
        full: date.toLocaleString('en-US', { month: 'long' }),
        index: i
    };
});

/**
 * Converts a potentially string month name or index into a 1-indexed month number.
 */
const parseStartMonth = (val: string | number): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (!val) return 4;
    const str = String(val).toLowerCase();
    const ALL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const idx = ALL_MONTHS.findIndex(m => m.startsWith(str.substring(0, 3)));
    if (idx >= 0) return idx + 1; // 1-indexed
    const num = Number(val);
    return isNaN(num) ? 4 : num;
}

/**
 * Returns months ordered by academic session
 * @param startMonth 1-indexed month (1=Jan, 4=Apr) or month name
 */
export const getOrderedSessionMonths = (startMonth: number | string = 4) => {
    const months = [];
    const safeStart = parseStartMonth(startMonth);
    
    for (let i = 0; i < 12; i++) {
        const absIdx = (safeStart - 1 + i) % 12;
        const date = new Date(2024, absIdx, 1);
        months.push({
            name: date.toLocaleString('en-US', { month: 'short' }),
            full: date.toLocaleString('en-US', { month: 'long' }),
            index: absIdx,
            relIndex: i
        });
    }
    return months;
};

export const getFrequencyMultiplier = (freq: PaymentFrequency) => {
    switch (freq) {
        case 'monthly': return 1;
        case 'quarterly': return 3;
        case 'half_yearly': return 6;
        case 'yearly': return 12;
        case 'one_time': return 12;
        default: return 1;
    }
};

export const isFeeApplicableForMonth = (fee: FeeInGroup, monthIndex: number, startMonth: number | string = 4) => {
    if (fee.paymentFrequency === 'monthly') return true;

    const safeStart = parseStartMonth(startMonth);

    // Calculate month index relative to session start
    const relIdx = (monthIndex - (safeStart - 1) + 12) % 12;

    if (fee.paymentFrequency === 'quarterly') {
        return [0, 3, 6, 9].includes(relIdx);
    }
    if (fee.paymentFrequency === 'half_yearly') {
        return [0, 6].includes(relIdx);
    }
    if (fee.paymentFrequency === 'yearly' || fee.paymentFrequency === 'one_time') {
        return relIdx === 0; // First month of session
    }
    return false;
};

// Helper to calculate fine for a specific fee and month
export const calculateFineAmount = (fee: FeeInGroup, monthIdx: number, startMonth: number | string = 4, now: Date = new Date(), sessionStartYear?: number): number => {
    // 1. Check if fee has fine configuration
    if (!fee.fineAmount || fee.fineAmount <= 0) return 0;

    const safeStart = parseStartMonth(startMonth);

    // 2. Determine Due Date for the specific month
    let dueDate: Date | null = null;
    
    let year = now.getFullYear();
    if (sessionStartYear) {
        if (monthIdx < safeStart - 1) {
            year = sessionStartYear + 1;
        } else {
            year = sessionStartYear;
        }
    } else {
        const currentMonthAbs = now.getMonth(); // 0-11
        if (monthIdx < safeStart - 1 && currentMonthAbs >= safeStart - 1) {
            year = year + 1;
        } else if (monthIdx >= safeStart - 1 && currentMonthAbs < safeStart - 1) {
            year = year - 1;
        }
    }

    let dueDay = 10;
    if (fee.dueDate) {
        const configDate = new Date(fee.dueDate);
        if (!isNaN(configDate.getTime())) {
            dueDay = configDate.getDate();
        }
    }
    dueDate = new Date(year, monthIdx, dueDay);

    if (!dueDate || isNaN(dueDate.getTime())) return 0;

    // 3. Check Overdue
    if (now <= dueDate) return 0;

    // 4. Calculate number of late units (days/weeks etc based on fineInterval)
    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 0;

    const interval = fee.fineInterval || 1;
    const periods = Math.floor(diffDays / interval);
    
    if (periods <= 0) return 0;

    // 5. Calculate Amount
    if (fee.fineType === 'percentage') {
        return ((fee.amount * fee.fineAmount) / 100) * periods;
    } else {
        return fee.fineAmount * periods;
    }
};

// Calculate Financials for a specific Month
export const calculateMonthFinancials = (
    studentId: string,
    monthIdx: number,
    applicableGroups: FeeGroup[],
    transactions: Transaction[],
    studentType: 'new' | 'old',
    startMonth: number | string = 4,
    sessionStartYear?: number
) => {
    let totalDue = 0;
    let fineTotal = 0;

    applicableGroups.forEach(group => {
        group.fees.forEach(fee => {
            if (studentType === 'new' && fee.appliesTo === 'old') return;
            if (studentType === 'old' && fee.appliesTo === 'new') return;

            if (isFeeApplicableForMonth(fee, monthIdx, startMonth)) {
                const amount = fee.amount || 0;
                const fine = calculateFineAmount(fee, monthIdx, startMonth, new Date(), sessionStartYear);

                totalDue += amount + fine;
                fineTotal += fine;
            }
        });
    });

    const monthTransactions = transactions.filter(t => t.studentId === studentId && t.monthIndex === monthIdx);
    
    const paidForMonth = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const discountForMonth = monthTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);

    const totalSettled = paidForMonth + discountForMonth;

    return {
        totalDue,
        totalPaid: paidForMonth,
        totalDiscount: discountForMonth,
        fineTotal,
        remainingDue: Math.max(0, totalDue - totalSettled),
        status: (totalDue === 0 && totalSettled === 0) ? 'no_fees' : (totalSettled >= totalDue ? 'paid' : (totalSettled > 0 ? 'partial' : 'unpaid'))
    };
};

// Calculate Total Outstanding Dues for a Student
export const calculateTotalOutstandingDues = (
    studentId: string,
    applicableGroups: FeeGroup[],
    transactions: Transaction[],
    studentType: 'new' | 'old',
    startMonth: number | string = 4,
    sessionStartYear?: number
) => {
    let totalOutstanding = 0;
    const sessionMonths = getOrderedSessionMonths(startMonth);

    sessionMonths.forEach(m => {
        const fin = calculateMonthFinancials(studentId, m.index, applicableGroups, transactions, studentType, startMonth, sessionStartYear);
        totalOutstanding += fin.remainingDue;
    });

    return totalOutstanding;
};

