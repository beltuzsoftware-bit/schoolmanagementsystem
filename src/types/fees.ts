
export type SubModule =
    'collect_fees' |
    'search_payment' |
    'search_due_fees' |
    'fees_group' |
    'fees_type' |
    'fees_discount' |
    'fees_carry_forward' |
    'fees_reminder';

export type FeeApplicability = 'all' | 'new' | 'old';
export type PaymentFrequency = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type FineType = 'fixed' | 'percentage';

export interface FeeInGroup {
    feeName: string;
    appliesTo: FeeApplicability;
    amount: number;
    dueDate: string;
    fineAmount: number;
    fineType: FineType;
    fineInterval: number; // in days
    paymentFrequency: PaymentFrequency;
    hasCustomScheduler?: boolean;
    customDates?: string[];
}

export interface FeeGroup {
    id: string;
    schoolId: string;
    name: string;
    assignedClasses: string[];
    fees: FeeInGroup[];
}

export interface Transaction {
    id: string;
    schoolId: string;
    studentId: string;
    monthIndex: number; // 0-11 relative to session
    year: number;
    amount: number;
    date: string;
    mode: string;
    reference?: string;
    discount?: number;
    overallDiscount?: number;
    remarks?: string;
    invoiceNo?: string;
    feeName?: string;
    fine?: number;
    baseAmount?: number;
}

export const FREQUENCY_OPTIONS: { label: string; value: PaymentFrequency; maxDates: number }[] = [
    { label: 'One Time', value: 'one_time', maxDates: 1 },
    { label: 'Monthly', value: 'monthly', maxDates: 12 },
    { label: 'Quarterly', value: 'quarterly', maxDates: 4 },
    { label: 'Half Yearly', value: 'half_yearly', maxDates: 2 },
    { label: 'Yearly', value: 'yearly', maxDates: 1 },
];

export const PAYMENT_MODES = ['Cash', 'UPI', 'QR Code', 'Cheque', 'Bank Transfer', 'DD'];

// Demo Data (Preserved from source for initial state if empty)
export const DEMO_FEE_GROUP: FeeGroup = {
    id: 'demo-class-2-fees',
    schoolId: 'demo-school',
    name: 'Class 2 Demo Fees',
    assignedClasses: ['2', 'II', 'Class 2'],
    fees: [
        {
            feeName: 'Admission Fee',
            appliesTo: 'new',
            amount: 2000,
            dueDate: '',
            fineAmount: 0,
            fineType: 'fixed',
            fineInterval: 0,
            paymentFrequency: 'one_time'
        },
        {
            feeName: 'Tuition Fee',
            appliesTo: 'all',
            amount: 500,
            dueDate: '',
            fineAmount: 50,
            fineType: 'fixed',
            fineInterval: 10,
            paymentFrequency: 'monthly'
        },
        {
            feeName: 'Examination Fee',
            appliesTo: 'all',
            amount: 300,
            dueDate: '',
            fineAmount: 0,
            fineType: 'fixed',
            fineInterval: 0,
            paymentFrequency: 'quarterly'
        }
    ]
};

export const INITIAL_FEES_MASTER_ITEMS = [
    'Admission Fee',
    'Tuition Fee',
    'Examination Fee',
    'Library Fee',
    'Sports Fee',
    'Transportation Fee',
    'Miscellaneous Fee',
];

export interface StudentFeeDue {
    id: string;
    schoolId: string;
    studentId: string;
    studentName: string;
    className: string;
    monthIndex: number; // 0-11
    year: number;
    amount: number;
    status: 'Unpaid' | 'Paid' | 'Partial';
    paymentDate?: string;
    transactionId?: string;
    createdAt: string;
    updatedAt: string;
}

export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
export interface FeeDiscount {
    id: string;
    name: string;
    code: string; // e.g., DISCOUNT10
    type: 'FIXED' | 'PERCENTAGE';
    value: number;
    frequency: 'ONE_TIME' | 'MULTIPLE';
    assignedClasses: string[]; // empty = all
    targetType: 'ALL' | 'SPECIFIC';
    studentIds?: string[];
    months?: number[]; // [0, 1, 2...] 0-indexed relative to session
    feeTypes?: string[]; // e.g. ['Tuition Fee', 'Library Fee'] — empty = all fee types
}

export interface FeeReminder {
    id: string;
    name: string;
    triggerDays: number; // e.g., -3 for 3 days before, 0 for on due date
    assignedClasses: string[]; 
    targetType: 'ALL' | 'SPECIFIC';
    studentIds?: string[];
    months?: number[]; // [0, 1, 2...]
    suppressIfPaidUntil?: boolean; // If true, don't send if student paid up to a certain point
    suppressMonthIndex?: number; // Don't send if paid till this month or later
}
