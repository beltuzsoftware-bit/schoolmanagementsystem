import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { INITIAL_CLASS_SETUPS } from '@/lib/student-constants';

export async function GET() {
    const db = readDb();
    const updated: string[] = [];
    const skipped: string[] = [];
    const class10Target = 'Class 10';

    if (!db.students) {
        return NextResponse.json({ message: 'No students found.' }, { status: 404 });
    }

    db.students.forEach((student: any) => {
        const isClass10 = (student.className === class10Target || student.class === class10Target);
        
        if (isClass10) {
            let updatedThisStudent = false;

            // 1. Student Credentials
            if (!student.studentUsername || !student.loginPassword) {
                student.studentUsername = student.admissionNumber;
                student.loginPassword = student.dob ? student.dob.replace(/[^0-9]/g, '') : '123456';
                student.studentPasswordChanged = false;
                updatedThisStudent = true;
            }

            // 2. Parent Credentials
            if (!student.parentUsername || !student.parentLoginPassword) {
                const parentPhone = student.guardianPhone || student.fatherPhone || student.motherPhone || student.phone;
                if (parentPhone) {
                    student.parentUsername = parentPhone;
                    student.parentLoginPassword = parentPhone.slice(-5);
                    student.parentPasswordChanged = false;
                    updatedThisStudent = true;
                }
            }
            
            if (updatedThisStudent) {
                updated.push(`${student.name} (${student.id}) - Credentials stabilized`);
            } else {
                skipped.push(`${student.name} (${student.id}) - Already has complete credentials`);
            }
        }
    });

    if (updated.length > 0) {
        writeDb(db);
    }

    return NextResponse.json({
        message: updated.length > 0 
            ? `Successfully enabled login for ${updated.length} Class 10 students.` 
            : 'No Class 10 students needed credential generation.',
        updated,
        skipped
    });
}
