'use server';

import { readDb, writeDb, resolveSchool } from '@/lib/db';
import { AdmissionApplication } from '@/types';
import { revalidatePath } from 'next/cache';
import { addStudent } from './student-management';

export async function toggleOnlineAdmission(schoolId: string, isOpen: boolean) {
    const db = readDb();
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const index = db.schools.findIndex((s: any) => s.id === idToUse);
    if (index === -1) return { success: false, error: 'School not found' };
    db.schools[index].onlineAdmissionOpen = isOpen;
    writeDb(db);
    revalidatePath('/school-admin/students/online-admission');
    return { success: true };
}

export async function getOnlineAdmissionStatus(schoolId: string) {
    const db = readDb();
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const school = db.schools.find((s: any) => s.id === idToUse);
    if (!school) return { isOpen: false, school: null };
    return { isOpen: !!school.onlineAdmissionOpen, school };
}

export async function submitAdmissionApplication(schoolId: string, formData: Record<string, any>) {
    const db = readDb();
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const school = db.schools.find((s: any) => s.id === idToUse);
    if (!school) return { success: false, error: 'School not found' };
    if (!school.onlineAdmissionOpen) return { success: false, error: 'Online admissions are currently closed' };
    if (!db.admissionApplications) db.admissionApplications = [];
    const application: AdmissionApplication = {
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        ...formData,
        id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        schoolId: idToUse,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
        paymentStatus: school.admissionPaymentEnabled ? 'Pending' : 'Paid',
    };
    db.admissionApplications.push(application);
    writeDb(db);
    return { success: true, applicationId: application.id };
}

export async function getAdmissionApplicationByAuth(schoolId: string, identifier: string, dob: string) {
    const db = readDb();
    if (!db.admissionApplications) return null;
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const app = db.admissionApplications.find((a: AdmissionApplication) =>
        a.schoolId === idToUse && (a.id === identifier || a.phone === identifier) && a.dob === dob
    );
    return app || null;
}

export async function getAdmissionApplicationStatus(applicationId: string, schoolId: string) {
    const db = readDb();
    if (!db.admissionApplications) return null;
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const app = db.admissionApplications.find(
        (a: AdmissionApplication) => a.id === applicationId && a.schoolId === idToUse
    );
    if (!app) return null;
    return { status: app.status, paymentStatus: app.paymentStatus, paymentReference: app.paymentReference };
}

export async function verifyUPITransaction(schoolId: string, reference: string, transactionId: string, amount?: number) {
    const db = readDb();
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    if (reference.startsWith('APP_')) {
        const applicationId = reference.replace('APP_', '');
        const appIndex = db.admissionApplications?.findIndex((a: any) => a.id === applicationId);
        if (appIndex !== -1 && appIndex !== undefined) {
            const application = db.admissionApplications[appIndex];
            application.paymentStatus = 'Paid';
            application.paymentReference = transactionId;
            application.paymentDate = new Date().toISOString();
            if (!db.qrTransactions) db.qrTransactions = [];
            db.qrTransactions.push({
                id: `txn_adm_${Date.now()}`, schoolId: idToUse, studentId: applicationId,
                studentName: application.name || `${application.firstName} ${application.lastName}`,
                className: application.className,
                amount: amount || db.schools.find((s: any) => s.id === idToUse)?.admissionFeeAmount || 0,
                month: 'Admission Fee', status: 'Paid', transactionId,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            } as any);
            writeDb(db);
            revalidatePath(`/apply/${schoolId}/status`);
            revalidatePath(`/school-admin/qr-fees`);
            revalidatePath(`/school-admin/students/online-admission`);
            return { success: true, type: 'Admission', applicationId };
        }
    }
    if (reference.startsWith('FEE_')) {
        const parts = reference.split('_');
        if (parts.length >= 4) {
            const studentId = parts[1];
            const monthIndex = parseInt(parts[2]);
            const student = db.students?.find((s: any) => s.id === studentId);
            if (student) {
                if (!db.qrTransactions) db.qrTransactions = [];
                db.qrTransactions.push({
                    id: `txn_fee_${Date.now()}`, schoolId: idToUse, studentId,
                    studentName: student.name || `${student.firstName} ${student.lastName}`,
                    className: student.className, amount: amount || 0,
                    month: `Month Index ${monthIndex}`, status: 'Paid', transactionId,
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                } as any);
                writeDb(db);
                revalidatePath(`/school-admin/qr-fees`);
                return { success: true, type: 'Monthly Fee', studentId };
            }
        }
    }
    return { success: false, error: 'Invalid reference or application not found' };
}

export async function updateAdmissionPaymentStatus(applicationId: string, schoolId: string, reference: string) {
    return verifyUPITransaction(schoolId, `APP_${applicationId}`, reference);
}

export async function simulateUPICallback(applicationId: string, schoolId: string) {
    const mockRef = `AUTO_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    return verifyUPITransaction(schoolId, `APP_${applicationId}`, mockRef);
}

export async function getAdmissionApplications(schoolId: string, status?: string, sessionId?: string) {
    const db = readDb();
    if (!db.admissionApplications) return [];
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    let apps = db.admissionApplications.filter((a: AdmissionApplication) => a.schoolId === idToUse);
    if (status && status !== 'all') apps = apps.filter((a: any) => a.status === status);
    if (sessionId && sessionId !== 'all') apps = apps.filter((a: any) => a.session === sessionId);
    return apps.sort((a: AdmissionApplication, b: AdmissionApplication) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
}

export async function approveAdmissionApplication(applicationId: string, schoolId: string, appointmentSchedule?: string) {
    const db = readDb();
    if (!db.admissionApplications) return { success: false, error: 'No applications found' };
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const appIndex = db.admissionApplications.findIndex(
        (a: AdmissionApplication) => a.id === applicationId && a.schoolId === idToUse
    );
    if (appIndex === -1) return { success: false, error: 'Application not found' };
    const application = db.admissionApplications[appIndex];
    const studentResult = await addStudent({ ...application, schoolId: idToUse, status: 'Active' } as any);
    if (!studentResult.success) return { success: false, error: studentResult.error };
    db.admissionApplications[appIndex].status = 'Approved';
    db.admissionApplications[appIndex].reviewedAt = new Date().toISOString();
    if (appointmentSchedule) db.admissionApplications[appIndex].appointmentSchedule = appointmentSchedule;
    writeDb(db);
    revalidatePath('/school-admin/students/online-admission');
    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function rejectAdmissionApplication(applicationId: string, schoolId: string, reason?: string) {
    const db = readDb();
    if (!db.admissionApplications) return { success: false, error: 'No applications found' };
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const appIndex = db.admissionApplications.findIndex(
        (a: AdmissionApplication) => a.id === applicationId && a.schoolId === idToUse
    );
    if (appIndex === -1) return { success: false, error: 'Application not found' };
    db.admissionApplications[appIndex].status = 'Rejected';
    db.admissionApplications[appIndex].reviewedAt = new Date().toISOString();
    if (reason) db.admissionApplications[appIndex].rejectionReason = reason;
    writeDb(db);
    revalidatePath('/school-admin/students/online-admission');
    return { success: true };
}

export async function deleteAdmissionApplication(applicationId: string, schoolId: string) {
    const db = readDb();
    if (!db.admissionApplications) return { success: false, error: 'No applications found' };
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;
    const appIndex = db.admissionApplications.findIndex(
        (a: AdmissionApplication) => a.id === applicationId && a.schoolId === idToUse
    );
    if (appIndex === -1) return { success: false, error: 'Application not found' };
    db.admissionApplications.splice(appIndex, 1);
    writeDb(db);
    revalidatePath('/school-admin/students/online-admission');
    return { success: true };
}
