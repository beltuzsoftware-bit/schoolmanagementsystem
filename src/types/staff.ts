export enum StaffRole {
    ADMIN = 'ADMIN',
    SUB_ADMIN = 'SUB_ADMIN',
    TEACHER = 'TEACHER',
    ACCOUNTANT = 'ACCOUNTANT',
    RECEPTIONIST = 'RECEPTIONIST',
    LIBRARIAN = 'LIBRARIAN',
    WARDEN = 'WARDEN'
}

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    HALF_DAY = 'HALF_DAY',
    LATE = 'LATE'
}

export enum CalculationMode {
    CALENDAR_DAYS = 'CALENDAR_DAYS',
    FIXED_DAYS = 'FIXED_DAYS',
    CALENDAR_INCLUDE_ALL_DAYS = 'CALENDAR_INCLUDE_ALL_DAYS',
    CALENDAR_EXCLUDE_SUNDAY = 'CALENDAR_EXCLUDE_SUNDAY'
}



export interface AttendanceRecord {
    staffId: string;
    status: AttendanceStatus;
    checkIn?: string;
    note?: string;
}

export interface SalaryComponent {
    id: string;
    label: string;
    amount: number;
}

export interface Reimbursement {
    id: string;
    label: string;
    amount: number;
    date: string;
}

export interface Loan {
    id: string;
    amount: number;
    emi: number;
    remainingAmount: number;
    startDate: string;
    approvedBy: string;
    note: string;
}

export interface Qualification {
    id: string;
    name: string;
    college: string;
    year: string;
    document?: string;
}

export interface Experience {
    lastOrg?: string;
    lastJob?: string;
    yearsExp?: string;
}

export interface BankDetails {
    accHolder?: string;
    bankName?: string;
    ifsc?: string;
    accNo?: string;
    panNo?: string;
    pfAccNo?: string;
    uanNo?: string;
}

export interface StaffProfile {
    id: string;
    userId: string;
    staffId?: string; // Custom Staff ID
    designation: string;
    department: string;
    joiningDate: string;
    salary: number;
    allowances: SalaryComponent[];
    customDeductions: SalaryComponent[];
    pfRate: number;
    esiRate: number;
    isPfEnabled: boolean;
    isEsiEnabled: boolean;
    overtimeRate: number;
    workingDaysPerMonth: number;
    loans: Loan[];
    leaves: any[];
    reimbursements: Reimbursement[];
    paymentMode?: string;
    lastMonthAbsents?: number;
    payslipStatus?: { [monthYear: string]: 'Draft' | 'Generated' | 'Sent' | 'Paid' | 'Unpaid' };
    personalDetails: {
        phone: string;
        altPhone?: string;
        whatsapp?: string;
        address: string;
        pincode?: string;
        city?: string;
        state?: string;
        country?: string;
        bloodGroup: string;
        qualification: string; // Keep for legacy, but use qualifications array for new data
        dob?: string;
        aadhar?: string;
        gender?: string;
        husbandName?: string;
        fatherName?: string;
        nationality?: string;
        religion?: string;
        category?: string;
        maritalStatus?: string;
    };
    qualifications?: Qualification[];
    experience?: Experience;
    bankDetails?: BankDetails;
    photo?: string;
    certificate?: string;
    kycDocument?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
}

export interface AttendanceMaster {
    [date: string]: AttendanceRecord[];
}
