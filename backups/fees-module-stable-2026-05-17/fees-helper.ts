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
        name: date.toLocaleString('default', { month: 'short' }),
        full: date.toLocaleString('default', { month: 'long' }),
        index: i
    };
});

/**
 * Converts a potentially string month name or index into a 1-indexed month number.
 */
const parseStartMonth = (val: string | number): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (!val) return 1;
    const str = String(val).toLowerCase();
    const ALL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const idx = ALL_MONTHS.findIndex(m => m.startsWith(str.substring(0, 3)));
    if (idx >= 0) return idx + 1; // 1-indexed
    const num = Number(val);
    return isNaN(num) ? 1 : num;
}

/**
 * Returns months ordered by academic session
 * @param startMonth 1-indexed month (1=Jan, 4=Apr) or month name
 */
export const getOrderedSessionMonths = (startMonth: number | string = 1) => {
    const months = [];
    const safeStart = parseStartMonth(startMonth);
    
    for (let i = 0; i < 12; i++) {
        const absIdx = (safeStart - 1 + i) % 12;
        const date = new Date(2024, absIdx, 1);
        months.push({
            name: date.toLocaleString('default', { month: 'short' }),
            full: date.toLocaleString('default', { month: 'long' }),
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

export const isFeeApplicableForMonth = (fee: FeeInGroup, monthIndex: number, startMonth: number | string = 1) => {
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
        // If there's a specific due date, use its month
        if (fee.dueDate) {
            const dueDate = new Date(fee.dueDate);
            if (!isNaN(dueDate.getTime())) {
                return dueDate.getMonth() === monthIndex;
            }
        }
        return relIdx === 0; // Fallback to first month of session
    }
    return false;
};

// Helper to calculate fine for a specific fee and month
export const calculateFineAmount = (fee: FeeInGroup, monthIdx: number, startMonth: number | string = 1, now: Date = new Date(), sessionStartYear?: number): number => {
    // 1. Check if fee has fine configuration enabled
    if (fee.hasFine === false) return 0;
    if (!fee.fineAmount || fee.fineAmount <= 0) return 0;

    const safeStart = parseStartMonth(startMonth);

    // 2. Determine target year for the specific month
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

    // 3. CHECK: Fine Effective Date (Safety Switch)
    if (fee.fineEffectiveDate) {
        const effectiveDate = new Date(fee.fineEffectiveDate);
        if (!isNaN(effectiveDate.getTime()) && now < effectiveDate) {
            return 0;
        }
    }

    // 4. Determine Due Date for the specific month
    let dueDate: Date | null = null;
    
    if (fee.paymentFrequency === 'monthly') {
        // Use the day from configured dueDate if available, default to 10th
        let dueDay = 10;
        if (fee.dueDate) {
            const configDate = new Date(fee.dueDate);
            if (!isNaN(configDate.getTime())) {
                dueDay = configDate.getDate();
            }
        }
        dueDate = new Date(year, monthIdx, dueDay);
    }
    else if (fee.dueDate) {
        dueDate = new Date(fee.dueDate);
    }

    if (!dueDate || isNaN(dueDate.getTime())) return 0;

    // 5. APPLY: Grace Period
    if (fee.fineGraceDays) {
        dueDate.setDate(dueDate.getDate() + fee.fineGraceDays);
    }

    // 6. Check Overdue
    if (now <= dueDate) return 0;

    // 7. Calculate number of late units
    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 0;

    const interval = fee.fineInterval || 1;
    const periods = Math.floor(diffDays / interval);
    
    if (periods <= 0) return 0;

    // 8. Calculate Amount
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
    startMonth: number | string = 1,
    sessionStartYear?: number
) => {
    // 1. Calculate base total and total settled first
    let baseTotal = 0;
    applicableGroups.forEach(group => {
        group.fees.forEach(fee => {
            if (studentType === 'new' && fee.appliesTo === 'old') return;
            if (studentType === 'old' && fee.appliesTo === 'new') return;
            if (isFeeApplicableForMonth(fee, monthIdx, startMonth)) {
                baseTotal += fee.amount || 0;
            }
        });
    });

    // Determine which fees are part of standard groups
    const allValidFeeNames = new Set<string>();
    applicableGroups.forEach(group => {
        group.fees.forEach(fee => {
            allValidFeeNames.add(fee.feeName);
        });
    });

    const monthTransactions = transactions.filter(t => 
        t.studentId === studentId && 
        t.monthIndex === monthIdx &&
        (!t.feeName || allValidFeeNames.has(t.feeName))
    );
    const paidForMonth = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const discountForMonth = monthTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);
    const totalSettled = paidForMonth + discountForMonth;

    // 2. Only calculate fines if the base total hasn't been fully settled
    let totalDue = baseTotal;
    let fineTotal = 0;

    // If the student has already paid the base amount (or more), we don't add new fines
    if (totalSettled < baseTotal) {
        applicableGroups.forEach(group => {
            group.fees.forEach(fee => {
                if (studentType === 'new' && fee.appliesTo === 'old') return;
                if (studentType === 'old' && fee.appliesTo === 'new') return;

                if (isFeeApplicableForMonth(fee, monthIdx, startMonth)) {
                    const fine = calculateFineAmount(fee, monthIdx, startMonth, new Date(), sessionStartYear);
                    totalDue += fine;
                    fineTotal += fine;
                }
            });
        });
    }

    const remainingDue = Math.max(0, totalDue - totalSettled);

    return {
        totalDue,
        totalPaid: paidForMonth,
        totalDiscount: discountForMonth,
        fineTotal,
        remainingDue,
        status: (totalDue === 0 && totalSettled === 0) ? 'no_fees' : (remainingDue < 1.0 ? 'paid' : (totalSettled > 0 ? 'partial' : 'unpaid'))
    };
};

// Calculate Total Outstanding Dues for a Student
export const calculateTotalOutstandingDues = (
    studentId: string,
    applicableGroups: FeeGroup[],
    transactions: Transaction[],
    studentType: 'new' | 'old',
    startMonth: number | string = 1,
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
