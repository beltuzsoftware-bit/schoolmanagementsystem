export type AttendanceStatus = 'P' | 'L' | 'A' | 'H' | 'F' | '-';

export interface AttendanceRecord {
    [date: string]: AttendanceStatus; // YYYY-MM-DD
}

export interface AttendanceSummary {
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    totalHalfDay: number;
    totalHoliday: number;
}

export interface StudentAttendanceData {
    studentId: string;
    sessionId: string;
    records: AttendanceRecord;
    summary: AttendanceSummary;
}
