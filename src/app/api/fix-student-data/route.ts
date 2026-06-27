import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// TEMPORARY FIX ROUTE - Patches student records missing className
// Visit: http://localhost:3000/api/fix-student-data to apply fix
// DELETE THIS FILE after confirming the fix works.

export async function GET() {
    const db = readDb();
    const fixed: string[] = [];
    const skipped: string[] = [];

    db.students.forEach((student: any) => {
        // Fix any student that has enrolledSession but missing className
        if (!student.className) {
            const derivedClass = 
                student.classAppliedFor || 
                student.class || 
                'Unknown';

            student.className = derivedClass;

            // Also sync currentSessionId with enrolledSession if mismatched
            if (student.enrolledSession && student.currentSessionId !== student.enrolledSession) {
                student.currentSessionId = student.enrolledSession;
            }

            fixed.push(`${student.name} (${student.id}) → class: "${derivedClass}", session: "${student.currentSessionId}"`);
        } else {
            skipped.push(`${student.name} (${student.id}) — already has className: "${student.className}"`);
        }
    });

    if (fixed.length > 0) {
        writeDb(db);
    }

    return NextResponse.json({
        message: fixed.length > 0
            ? `✅ Fixed ${fixed.length} student record(s). Please DELETE this file now.`
            : '⚠️ No records needed fixing.',
        fixed,
        skipped,
    }, { status: 200 });
}
