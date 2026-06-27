'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { Student, StudentProfileTemplate, StudentFormConfig, Session } from '@/types';
import { revalidatePath } from 'next/cache';
import { StudentAttendanceData, AttendanceStatus } from '@/types/attendance';

export async function updateStudentStatus(id: string, status: 'Active' | 'Disabled' | 'Withdrawn') {
    await prisma.student.update({
        where: { id },
        data: { status }
    });
    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function getStudentAttendance(studentId: string, sessionId: string): Promise<StudentAttendanceData> {
    const student = await prisma.student.findUnique({
        where: { id: studentId }
    });

    if (!student) throw new Error('Student not found');

    const records: Record<string, AttendanceStatus> = {};
    const statuses: AttendanceStatus[] = ['P', 'P', 'P', 'P', 'P', 'L', 'A', 'H', 'F'];

    const year = new Date().getFullYear();
    for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= 28; d++) {
            const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            records[dateStr] = Math.random() > 0.1 ? 'P' : statuses[Math.floor(Math.random() * statuses.length)];
        }
    }

    const summary = {
        totalPresent: Object.values(records).filter(s => s === 'P').length,
        totalLate: Object.values(records).filter(s => s === 'L').length,
        totalAbsent: Object.values(records).filter(s => s === 'A').length,
        totalHalfDay: Object.values(records).filter(s => s === 'F').length,
        totalHoliday: Object.values(records).filter(s => s === 'H').length,
    };

    return {
        studentId,
        sessionId,
        records,
        summary
    };
}

export async function addStudentDocument(studentId: string, title: string, fileName: string, content?: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return { success: false, error: 'Student not found' };

    await prisma.studentDocument.create({
        data: {
            studentId,
            title,
            file: fileName,
            content,
            type: 'Misc'
        }
    });

    revalidatePath(`/school-admin/students`);
    return { success: true };
}

export async function deleteStudentDocument(studentId: string, docIndex: number) {
    const docs = await prisma.studentDocument.findMany({
        where: { studentId, type: 'Misc' },
        orderBy: { id: 'asc' }
    });

    if (docs[docIndex]) {
        await prisma.studentDocument.delete({
            where: { id: docs[docIndex].id }
        });
        revalidatePath(`/school-admin/students`);
        return { success: true };
    }

    return { success: false, error: 'Document not found' };
}

export async function updateStudentOfficialDocument(studentId: string, fieldName: string, fileName: string, content: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return { success: false, error: 'Student not found' };

    const existingDoc = await prisma.studentDocument.findFirst({
        where: { studentId, fieldName }
    });

    if (existingDoc) {
        await prisma.studentDocument.update({
            where: { id: existingDoc.id },
            data: { file: fileName, content }
        });
    } else {
        await prisma.studentDocument.create({
            data: {
                studentId,
                title: fieldName,
                file: fileName,
                content,
                type: 'Official',
                fieldName
            }
        });
    }

    revalidatePath(`/school-admin/students`);
    return { success: true };
}

export async function getStudents(schoolId: string) {
    try {
        return await prisma.student.findMany({
            where: { schoolId },
            include: {
                transportAllocation: true
            }
        });
    } catch (error: any) {
        console.warn('[HYBRID] Prisma getStudents failed:', error.message);
        const db = readDb();
        return db.students.filter((s: any) => s.schoolId === schoolId);
    }
}

export async function getStudent(id: string) {
    try {
        return await prisma.student.findUnique({
            where: { id },
            include: {
                transportAllocation: true,
                qrTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                documents: true
            }
        });
    } catch (error) {
        console.warn('[HYBRID] Prisma getStudent failed, falling back to local data.json');
        const db = readDb();
        return db.students.find((s: any) => s.id === id) || null;
    }
}

export async function addStudent(student: Student) {
    try {
        const res = await prisma.student.create({
            data: {
                ...student as any,
                id: student.id || undefined,
                status: student.status || 'Active'
            }
        });

        try {
            const db = readDb();
            db.students = [...(db.students || []), res];
            writeDb(db);
        } catch (e) {
            console.warn('[HYBRID] Sync to local DB failed during addStudent');
        }

        revalidatePath('/school-admin/students');
        return { success: true, student: res };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStudent(id: string, data: Partial<Student>) {
    const updatedData = { ...data };

    if (data.firstName !== undefined || data.lastName !== undefined) {
        const current = await prisma.student.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
        if (current) {
            const fName = data.firstName !== undefined ? data.firstName : current.firstName;
            const lName = data.lastName !== undefined ? data.lastName : current.lastName;
            (updatedData as any).name = `${fName || ''} ${lName || ''}`.trim();
        }
    }

    const { 
        _count, updatedAt, createdAt, school, 
        transportAllocation, qrTransactions, accessorySales,
        ...finalData 
    } = updatedData as any;

    await prisma.student.update({
        where: { id },
        data: finalData
    });

    try {
        const db = readDb();
        const index = db.students.findIndex(s => s.id === id);
        if (index >= 0) {
            db.students[index] = { ...db.students[index], ...finalData };
            writeDb(db);
        }
    } catch (e) {
        console.warn('[HYBRID] Sync to local DB failed during updateStudent');
    }

    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function deleteStudent(id: string) {
    try {
        await prisma.student.delete({
            where: { id }
        });

        try {
            const db = readDb();
            db.students = (db.students || []).filter(s => s.id !== id);
            writeDb(db);
        } catch (e) {
            console.warn('[HYBRID] Sync to local DB failed during deleteStudent');
        }

        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function promoteStudents(studentIds: string[], targetClass: string, targetSection?: string) {
    try {
        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: {
                class: targetClass,
                section: targetSection || null
            }
        });

        try {
            const db = readDb();
            db.students.forEach((s: any) => {
                if (studentIds.includes(s.id)) {
                    s.class = targetClass;
                    s.section = targetSection || null;
                }
            });
            writeDb(db);
        } catch (e) {
            console.warn('[HYBRID] Sync to local DB failed during promoteStudents');
        }

        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
