'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { 
    Student, StudentProfileTemplate, StudentFormConfig, Session,
    AdmissionFormTemplate, SectionConfig, IDCardTemplate, StaffFormTemplate,
    QRTransaction, User, UserRole
} from '@/types';
import { revalidatePath } from 'next/cache';
import { StudentAttendanceData, AttendanceStatus } from '@/types/attendance';
import { generateNextId } from '@/lib/id-generator';
import { EXTRACTED_ADMISSION_FIELDS } from '@/lib/admission-form-constants';
import { calculateMonthFinancials, getStudentType } from '@/lib/fees-helper';
import { 
    INITIAL_CLASS_SETUPS, INITIAL_SECTIONS, INITIAL_HOUSES, INITIAL_RELIGIONS, 
    INITIAL_CATEGORIES, INITIAL_STREAMS, INITIAL_DISABLE_REASONS,
    INITIAL_REG_SETTINGS, INITIAL_ENROLL_SETTINGS, INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS, INITIAL_SR_SETTINGS, INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS
} from '@/lib/student-constants';
import { randomUUID } from 'crypto';

// Helper for mergeConfigWithMaster (needed by admission form logic)
function mergeConfigWithMaster(currentConfig: any[]) {
    const masterMap = new Map(EXTRACTED_ADMISSION_FIELDS.map(f => [f.fieldName, f]));
    const currentMap = new Map(currentConfig.map(f => [f.fieldName, f]));

    const merged: any[] = [];
    currentConfig.forEach(field => {
        const master = masterMap.get(field.fieldName);
        if (master) {
            // Lock sectionName to master.sectionName to prevent DB templates from mismatching
            merged.push({ ...master, ...field, sectionName: master.sectionName });
            masterMap.delete(field.fieldName);
        } else {
            merged.push(field);
        }
    });

    EXTRACTED_ADMISSION_FIELDS.forEach(masterField => {
        if (masterMap.has(masterField.fieldName)) {
            merged.push({ ...masterField });
        }
    });

    return merged;
}

// --- STUDENT MANAGEMENT ---

export async function getStudents(schoolId: string) {
    try {
        return await prisma.student.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.warn('[HYBRID] Prisma getStudents failed, falling back to local data.json');
        const db = readDb();
        return db.students.filter((s: any) => s.schoolId === schoolId);
    }
}

export async function getStudentsForSibling(schoolId: string, className?: string, section?: string) {
    const conditions: any[] = [{ schoolId }];

    if (className && className !== 'all' && className !== 'Select') {
        const cleanClassName = className.replace(/^Class\s+/i, '').trim();
        conditions.push({
            OR: [
                { className: { contains: cleanClassName, mode: 'insensitive' } },
                { className: { contains: `Class ${cleanClassName}`, mode: 'insensitive' } }
            ]
        });
    }

    if (section && section !== 'all' && section !== 'Select') {
        conditions.push({ section: { contains: section, mode: 'insensitive' } });
    }

    try {
        return await prisma.student.findMany({
            where: { AND: conditions },
            select: { 
                id: true, 
                name: true, 
                firstName: true, 
                lastName: true, 
                admissionNumber: true, 
                className: true, 
                section: true 
            },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        const db = readDb();
        let students = db.students.filter((s: any) => s.schoolId === schoolId);
        
        if (className && className !== 'all' && className !== 'Select') {
             const cleanClassName = className.replace(/^Class\s+/i, '').trim();
             students = students.filter((s: any) => s.className?.includes(cleanClassName));
        }
        if (section && section !== 'all' && section !== 'Select') {
            students = students.filter((s: any) => s.section?.includes(section));
        }

        return students.map((s: any) => ({
            id: s.id,
            name: s.name,
            firstName: s.firstName,
            lastName: s.lastName,
            admissionNumber: s.admissionNumber,
            className: s.className,
            section: s.section
        }));
    }
}

export async function getStudent(id: string) {
    return prisma.student.findUnique({
        where: { id },
        include: { school: true }
    });
}

export async function disableStudent(studentId: string, reason: string, date: string, note?: string) {
    try {
        await prisma.student.update({
            where: { id: studentId },
            data: {
                status: 'Disabled',
                disableReason: reason,
                disableDate: date,
                disableNote: note
            }
        });

        revalidatePath('/school-admin/students');
        revalidatePath('/school-admin/students/disabled');
        return { success: true };
    } catch (error) {
        console.error('Failed to disable student:', error);
        return { success: false, error: 'Database update failed' };
    }
}

export async function enableStudent(studentId: string, note?: string) {
    try {
        await prisma.student.update({
            where: { id: studentId },
            data: {
                status: 'Active',
                enableNote: note,
                disableReason: null,
                disableDate: null,
                disableNote: null
            }
        });

        revalidatePath('/school-admin/students');
        revalidatePath('/school-admin/students/disabled');
        return { success: true };
    } catch (error) {
        console.error('Failed to enable student:', error);
        return { success: false, error: 'Database update failed' };
    }
}

export async function getDisableReasons(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, schoolId: true, disableReasons: true, useCustomDisableReasons: true }
        });

        if (school?.useCustomDisableReasons && school.disableReasons && school.disableReasons.length > 0) {
            return school.disableReasons;
        }

        return INITIAL_DISABLE_REASONS;
    } catch (error) {
        console.error('[SERVER] Failed to fetch disable reasons:', error);
        return INITIAL_DISABLE_REASONS;
    }
}

export async function searchStudents(schoolId: string, filters: any = {}) {
    const conditions: any[] = [{ schoolId }];

    if (filters.status && filters.status !== 'all') {
        conditions.push({ status: filters.status === 'Active' ? 'Active' : 'Disabled' });
    }

    const rawClassName = filters.classFilter || filters.className;
    const section = filters.sectionFilter || filters.section;

    if (rawClassName && rawClassName !== 'all' && rawClassName !== 'Select') {
        const className = rawClassName.replace(/^Class\s+/i, '').trim();
        conditions.push({
            OR: [
                { className: { contains: className, mode: 'insensitive' } },
                { className: { contains: `Class ${className}`, mode: 'insensitive' } }
            ]
        });
    }

    if (section && section !== 'all' && section !== 'Select') {
        conditions.push({ section: { contains: section, mode: 'insensitive' } });
    }

    if (filters.keyword) {
        conditions.push({
            OR: [
                { name: { contains: filters.keyword, mode: 'insensitive' } },
                { firstName: { contains: filters.keyword, mode: 'insensitive' } },
                { lastName: { contains: filters.keyword, mode: 'insensitive' } },
                { admissionNumber: { contains: filters.keyword, mode: 'insensitive' } },
                { phone: { contains: filters.keyword, mode: 'insensitive' } },
                { fatherName: { contains: filters.keyword, mode: 'insensitive' } }
            ]
        });
    }

    try {
        return await prisma.student.findMany({
            where: { AND: conditions },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        const db = readDb();
        return db.students.filter((s: any) => s.schoolId === schoolId);
    }
}

const STUDENT_SCHEMA_FIELDS = new Set([
    'id', 'schoolId', 'admissionNumber', 'rollNumber', 'name', 'firstName', 'lastName',
    'className', 'section', 'admissionDate', 'photo', 'status', 'currentSessionId',
    'disableReason', 'disableDate', 'disableNote', 'enableNote',
    'apaarId', 'penNo', 'registrationNo', 'enrollmentNo', 'srNo', 'generalRegistrationNo',
    'classAppliedFor', 'stream', 'rte', 'enrolledSession', 'house', 'studentType',
    'dob', 'gender', 'bloodGroup', 'religion', 'category', 'caste', 'nationality',
    'firstLanguage', 'secondLanguage', 'thirdLanguage', 'height', 'weight',
    'phone', 'whatsappNo', 'email', 'aadhaarNo', 'attachAadhar', 'samagraId',
    'bankAccountNo', 'ifscCode', 'bankName', 'accountHolderName',
    'tcNo', 'tcDate', 'tcFile', 'previousSchool',
    'fatherName', 'fatherPhone', 'fatherOccupation', 'fatherEmail', 'fatherPhoto', 
    'motherName', 'motherPhone', 'motherOccupation', 'motherEmail', 'motherPhoto', 
    'guardianName', 'guardianPhone', 'guardianRelation', 'guardianOccupation', 'guardianAddress', 'guardianEmail', 'guardianPhoto',
    'currentAddress', 'permanentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country',
    'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry',
    'enrolledYear', 'referredBy', 'specialNeeds', 'specialNeedsDetails', 'previousLastClass', 'affiliatedBoard', 'marksObtained', 'percentageCGPA', 'result', 'recordDateHeightWeight',
    'fatherDocumentName', 'fatherDocumentFile', 'motherDocumentName', 'motherDocumentFile', 'guardianDocumentName', 'guardianDocumentFile',
    'categoryCertificate',
    'parentUsername', 'studentUsername', 'loginPassword', 'parentPasswordChanged',
    'createdAt', 'updatedAt',
]);

function sanitizeStudentForPrisma(data: any): any {
    const clean: any = {};
    for (const key of Object.keys(data)) {
        if (STUDENT_SCHEMA_FIELDS.has(key)) {
            clean[key] = data[key];
        }
    }
    return clean;
}

export async function addStudent(studentData: Partial<Student>) {
    try {
        if (!studentData.name || !studentData.schoolId) {
            return { success: false, error: 'Missing required fields' };
        }

        const school = await prisma.school.findUnique({
            where: { id: studentData.schoolId }
        });

        if (!school) return { success: false, error: 'School not found' };

        // Package Limit Check (Prioritize school-level override)
        let maxStudents = school.maxStudents || 500000;
        
        if (!school.maxStudents && school.packageId) {
            try {
                const pkg = await (prisma as any).saasPackage.findUnique({ 
                    where: { id: school.packageId } 
                });
                if (pkg) maxStudents = pkg.maxStudents;
            } catch (pkgError) {
                console.warn('[ADD_STUDENT] Failed to fetch package details, using default limit', pkgError);
            }
        }

        const currentCount = await prisma.student.count({ where: { schoolId: studentData.schoolId } });
        
        if (maxStudents !== -1 && currentCount >= maxStudents) {
            return { 
                success: false, 
                error: `Student limit reached (${maxStudents}). Please upgrade your package to add more students.` 
            };
        }

        // Map frontend fields to Prisma schema names
        const mappedData: any = { ...studentData };
        if (studentData.fatherDocName) mappedData.fatherDocumentName = studentData.fatherDocName;
        if (studentData.fatherDocFile) mappedData.fatherDocumentFile = studentData.fatherDocFile;
        if (studentData.motherDocName) mappedData.motherDocumentName = studentData.motherDocName;
        if (studentData.motherDocFile) mappedData.motherDocumentFile = studentData.motherDocFile;
        if (studentData.guardianDocName) mappedData.guardianDocumentName = studentData.guardianDocName;
        if (studentData.guardianDocFile) mappedData.guardianDocumentFile = studentData.guardianDocFile;
        if (studentData.attachAadhar) mappedData.attachAadhar = studentData.attachAadhar;

        const name = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
        const finalStudentData: any = {
            ...mappedData,
            id: studentData.id || `stu_${Date.now()}`,
            status: 'Active',
            name,
            admissionNumber: studentData.admissionNumber || (studentData as any).registrationNo || `ADM-${Date.now()}`
        };

        // Auto-increment ID Serials in School Settings
        const idFields = [
            { field: 'registrationNo', setting: 'regNoSettings' },
            { field: 'enrollmentNo', setting: 'enrollNoSettings' },
            { field: 'apaarId', setting: 'apaarIdSettings' },
            { field: 'penNo', setting: 'penNoSettings' },
            { field: 'srNo', setting: 'srNoSettings' },
            { field: 'generalRegistrationNo', setting: 'genRegNoSettings' },
            { field: 'rollNumber', setting: 'rollNoSettings' }
        ];

        const updates: any = {};
        let hasUpdates = false;

        for (const { field, setting } of idFields) {
            const val = (studentData as any)[field];
            const settings = (school as any)[setting];
            
            if (val && settings && settings.enabled) {
                // Increment the serial
                const currentSerial = settings.currentSerial || 0;
                const startFrom = settings.startFrom || 1;
                const nextSerial = currentSerial < startFrom ? startFrom : currentSerial + 1;
                
                updates[setting] = {
                    ...settings,
                    currentSerial: nextSerial
                };
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await prisma.school.update({
                where: { id: studentData.schoolId },
                data: updates
            });
        }

        const newStudent = await prisma.student.create({
            data: sanitizeStudentForPrisma(finalStudentData)
        });

        revalidatePath('/school-admin/students');
        return { success: true, student: newStudent as any };
    } catch (error: any) {
        console.error("[ADD_STUDENT] Critical Error:", error);
        return { success: false, error: error.message || 'Server error occurred while adding student' };
    }
}

export async function updateStudent(id: string, data: Partial<Student>) {
    try {
        const { 
            _count, updatedAt, createdAt, school, 
            transportAllocation, qrTransactions, accessorySales,
            documents, transactions,
            id: _id, schoolId: _schoolId,
            miscDocuments,
            ...rawFinalData 
        } = data as any;

        // Map frontend fields to Prisma schema names
        const finalData: any = { ...rawFinalData };
        
        // Handle field name mismatches
        if (rawFinalData.fatherDocName) finalData.fatherDocumentName = rawFinalData.fatherDocName;
        if (rawFinalData.fatherDocFile) finalData.fatherDocumentFile = rawFinalData.fatherDocFile;
        if (rawFinalData.motherDocName) finalData.motherDocumentName = rawFinalData.motherDocName;
        if (rawFinalData.motherDocFile) finalData.motherDocumentFile = rawFinalData.motherDocFile;
        if (rawFinalData.guardianDocName) finalData.guardianDocumentName = rawFinalData.guardianDocName;
        if (rawFinalData.guardianDocFile) finalData.guardianDocumentFile = rawFinalData.guardianDocFile;
        if (rawFinalData.attachAadhar) finalData.attachAadhar = rawFinalData.attachAadhar;

        // Remove auxiliary content fields (base64) that don't exist in Prisma
        const fieldsToRemove = [
            'fatherDocName', 'fatherDocFile', 'fatherDocFileContent',
            'motherDocName', 'motherDocFile', 'motherDocFileContent',
            'guardianDocName', 'guardianDocFile', 'guardianDocFileContent',
            'attachAadharContent', 'categoryCertificateFileContent',
            'tcFileContent', 'govtStudentIdPhotoContent', 'govtFamilyIdPhotoContent'
        ];
        
        fieldsToRemove.forEach(field => delete finalData[field]);

        // Strict sanitization based on schema
        const sanitizedData = sanitizeStudentForPrisma(finalData);
        
        // Never update ID or schoolId in an update operation
        delete sanitizedData.id;
        delete sanitizedData.schoolId;

        await prisma.student.update({
            where: { id },
            data: sanitizedData
        });

        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (error: any) {
        console.error("[UPDATE_STUDENT] Critical Error:", error);
        return { success: false, error: error.message || 'Server error occurred while updating student' };
    }
}

export async function deleteStudent(id: string) {
    await prisma.student.delete({
        where: { id }
    });
    revalidatePath('/school-admin/students');
    return { success: true };
}

// --- STAFF MANAGEMENT ---

export async function getStaffProfiles(schoolId?: string) {
    const db = readDb();
    let profiles = db.staffProfiles || [];

    if (schoolId) {
        const schoolUsers = db.users.filter((u: any) => u.schoolId === schoolId);
        const schoolUserIds = new Set(schoolUsers.map((u: any) => u.id));
        profiles = profiles.filter((p: any) => schoolUserIds.has(p.userId));
    }

    return profiles;
}

export async function addStaff(userData: Partial<User>, profileData: Partial<any>) {
    // Basic implementation for now to keep it small
    const db = readDb();
    const newUser = { id: `u_${Date.now()}`, ...userData } as User;
    db.users.push(newUser);
    
    const newProfile = { id: `sp_${Date.now()}`, userId: newUser.id, ...profileData };
    if (!db.staffProfiles) db.staffProfiles = [];
    db.staffProfiles.push(newProfile as any);
    
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true, profile: newProfile, user: newUser };
}

// --- ADMISSION FORM TEMPLATES ---

export async function getAdmissionFormTemplates() {
    try {
        const templates = await prisma.admissionFormTemplate.findMany();
        return templates.map((tmpl: any) => ({
            ...tmpl,
            config: mergeConfigWithMaster(tmpl.config as any)
        }));
    } catch (error) {
        const db = readDb();
        return (db.admissionFormTemplates || []).map((tmpl: any) => ({
            ...tmpl,
            config: mergeConfigWithMaster(tmpl.config as any)
        }));
    }
}

export async function updateAdmissionFormTemplate(updatedTemplate: AdmissionFormTemplate): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.admissionFormTemplate.update({
            where: { id: updatedTemplate.id },
            data: {
                name: updatedTemplate.name,
                config: updatedTemplate.config as any,
                isSystem: !!updatedTemplate.isDefault
            }
        });
        
        revalidatePath('/super-admin/modules/admissions');
        revalidatePath('/school-admin/admissions');
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update template:", error);
        return { success: false, error: error.message || "Failed to update template" };
    }
}

// --- QR TRANSACTIONS ---

export async function getQRTransactions(schoolId: string) {
    const db = readDb();
    if (!db.qrTransactions) return [];
    return db.qrTransactions.filter((t: QRTransaction) => t.schoolId === schoolId);
}

export async function updateQRTransaction(id: string, data: Partial<QRTransaction>) {
    const db = readDb();
    const index = db.qrTransactions.findIndex((t: QRTransaction) => t.id === id);
    if (index === -1) return { success: false, error: 'Transaction not found' };

    db.qrTransactions[index] = { ...db.qrTransactions[index], ...data, updatedAt: new Date().toISOString() };
    writeDb(db);
    revalidatePath('/school-admin/qr-fees');
    return { success: true };
}

export async function getAllQRTransactions() {
    const db = readDb();
    return db.qrTransactions || [];
}

// --- BATCH / CREDENTIALS ---

export async function deleteStudentsBatch(ids: string[]) {
    try {
        await prisma.student.deleteMany({ where: { id: { in: ids } } });
    } catch {
        const db = readDb();
        db.students = db.students.filter((s: any) => !ids.includes(s.id));
        writeDb(db);
    }
    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function importStudentsBatch(schoolId: string, students: any[]) {
    try {
        // 1. Check Package Limitations
        const school = await prisma.school.findUnique({ 
            where: { id: schoolId }
        });

        if (!school) return { success: false, error: 'School not found' };

        // 2. Get Package Limit (Prioritize school-level override)
        let maxStudents = school.maxStudents || 500000;
        
        // If no school-level override, check package limit
        if (!school.maxStudents && school.packageId) {
            try {
                const pkg = await (prisma as any).saasPackage.findUnique({ 
                    where: { id: school.packageId } 
                });
                if (pkg) maxStudents = pkg.maxStudents;
            } catch (pkgError) {
                console.warn('[IMPORT] Failed to fetch package details, using default limit', pkgError);
            }
        }

        const currentCount = await prisma.student.count({ where: { schoolId } });
        
        // Handle Unlimited Case (-1)
        if (maxStudents !== -1 && currentCount >= maxStudents) {
            return { 
                success: false, 
                error: `Student limit reached (${maxStudents}). Please upgrade your package to add more students.` 
            };
        }

        // 3. Prepare Batch
        const remaining = maxStudents === -1 ? students.length : (maxStudents - currentCount);
        const studentsToProcess = students.slice(0, remaining);

        const sanitized = studentsToProcess.map(s => {
            const data = { ...s };
            // Ensure basic name construction if missing
            if (!data.name) {
                data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            }
            return {
                ...sanitizeStudentForPrisma(data),
                schoolId,
                id: data.id || `stu_${randomUUID()}`,
                status: 'Active',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
        });

        // Use a loop for hybrid compatibility or createMany if Prisma supports it
        try {
            await prisma.student.createMany({
                data: sanitized,
                skipDuplicates: true
            });
        } catch (prismaError) {
            console.warn('[IMPORT] Prisma createMany failed, attempting individual inserts', prismaError);
            for (const student of sanitized) {
                try {
                    await prisma.student.create({ data: student });
                } catch (e) {
                    console.error(`[IMPORT] Failed to insert student ${student.id}`, e);
                }
            }
        }

        // Sync to JSON DB for hybrid parity
        try {
            const db = readDb();
            db.students = [...(db.students || []), ...sanitized];
            writeDb(db);
        } catch (jsonError) {
            console.warn('[IMPORT] Local JSON sync failed', jsonError);
        }

        revalidatePath('/school-admin/students');
        return { 
            success: true, 
            count: sanitized.length,
            message: sanitized.length < students.length 
                ? `Imported ${sanitized.length} students (Limited by package capacity). ${students.length - sanitized.length} records skipped.` 
                : undefined
        };
    } catch (error: any) {
        console.error('[IMPORT] Batch import failed:', error);
        return { success: false, error: error.message };
    }
}

export async function getStudentById(id: string) {
    try {
        const student = await prisma.student.findUnique({ where: { id } });
        if (student) {
            // Map back to frontend names
            const s = student as any;
            if (s.fatherDocumentName) s.fatherDocName = s.fatherDocumentName;
            if (s.fatherDocumentFile) s.fatherDocFile = s.fatherDocumentFile;
            if (s.motherDocumentName) s.motherDocName = s.motherDocumentName;
            if (s.motherDocumentFile) s.motherDocFile = s.motherDocumentFile;
            if (s.guardianDocumentName) s.guardianDocName = s.guardianDocumentName;
            if (s.guardianDocumentFile) s.guardianDocFile = s.guardianDocumentFile;
        }
        return { success: true, student };
    } catch (error: any) {
        const db = readDb();
        const student = db.students.find((s: any) => s.id === id) || null;
        return { success: true, student };
    }
}

export async function generateStudentCredentials(studentId: string) {
    try {
        // Try Prisma first
        let student: any = null;
        try {
            student = await prisma.student.findUnique({ where: { id: studentId } });
        } catch {}

        // Fallback to JSON
        if (!student) {
            const db = readDb();
            student = db.students.find((s: any) => s.id === studentId);
        }

        if (!student) return { success: false, error: 'Student not found' };
        const username = (student.admissionNumber || student.id).toLowerCase().replace(/\s+/g, '');
        const password = Math.random().toString(36).slice(-8);

        // Update Prisma
        try {
            await prisma.student.update({ where: { id: studentId }, data: { studentUsername: username, loginPassword: password } });
        } catch {}

        // Always sync to JSON DB
        try {
            const db = readDb();
            const idx = db.students.findIndex((s: any) => s.id === studentId);
            if (idx !== -1) {
                (db.students[idx] as any).studentUsername = username;
                (db.students[idx] as any).loginPassword = password;
                writeDb(db);
            }
        } catch (jsonErr) {
            console.warn('[CREDENTIALS] JSON sync failed:', jsonErr);
        }

        revalidatePath('/school-admin/students');
        return { success: true, username, password };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function resetStudentCredentials(studentId: string, newPassword?: string) {
    const password = newPassword || Math.random().toString(36).slice(-8);
    try { await prisma.student.update({ where: { id: studentId }, data: { loginPassword: password, parentPasswordChanged: false } }); } catch {}
    try {
        const db = readDb();
        const idx = db.students.findIndex((s: any) => s.id === studentId);
        if (idx !== -1) {
            (db.students[idx] as any).loginPassword = password;
            writeDb(db);
        }
    } catch {}
    revalidatePath('/school-admin/students');
    return { success: true, username: undefined, password };
}

export async function generateParentCredentials(studentId: string) {
    try {
        // Try Prisma first, fallback to JSON
        let student: any = null;
        try {
            student = await prisma.student.findUnique({ where: { id: studentId } });
        } catch {}
        if (!student) {
            const db = readDb();
            student = db.students.find((s: any) => s.id === studentId);
        }
        if (!student) return { success: false, error: 'Student not found' };

        const parentUsername = student.fatherPhone || student.motherPhone || student.guardianPhone || student.phone;
        if (!parentUsername) return { success: false, error: 'No phone number found for parent login. Please add a parent phone number to the student profile first.' };
        const password = Math.random().toString(36).slice(-8);

        // Update Prisma
        try {
            await prisma.student.update({ where: { id: studentId }, data: { parentUsername, loginPassword: password, parentPasswordChanged: false } });
        } catch {}

        // Always sync to JSON DB
        try {
            const db = readDb();
            const idx = db.students.findIndex((s: any) => s.id === studentId);
            if (idx !== -1) {
                (db.students[idx] as any).parentUsername = parentUsername;
                (db.students[idx] as any).loginPassword = password;
                (db.students[idx] as any).parentPasswordChanged = false;
                writeDb(db);
            }
        } catch (jsonErr) {
            console.warn('[PARENT CREDENTIALS] JSON sync failed:', jsonErr);
        }

        revalidatePath('/school-admin/students');
        return { success: true, username: parentUsername, password };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function resetParentCredentials(studentId: string, newPassword?: string) {
    const password = newPassword || Math.random().toString(36).slice(-8);
    try { await prisma.student.update({ where: { id: studentId }, data: { loginPassword: password, parentPasswordChanged: false } }); } catch {}
    try {
        const db = readDb();
        const idx = db.students.findIndex((s: any) => s.id === studentId);
        if (idx !== -1) {
            (db.students[idx] as any).loginPassword = password;
            writeDb(db);
        }
    } catch {}
    revalidatePath('/school-admin/students');
    return { success: true, username: undefined, password };
}

export async function updatePortalPassword(studentId: string, newPassword: string, isParent: boolean) {
    await prisma.student.update({ where: { id: studentId }, data: { loginPassword: newPassword, ...(isParent ? { parentPasswordChanged: true } : {}) } });
    return { success: true };
}

export async function getParentSiblings(schoolId: string, parentUsername: string) {
    try {
        return await prisma.student.findMany({ where: { schoolId, parentUsername } });
    } catch {
        const db = readDb();
        return db.students.filter((s: any) => s.schoolId === schoolId && s.parentUsername === parentUsername);
    }
}

export async function batchUpdateStudentTypes(schoolId: string) {
    try {
        const students = await prisma.student.findMany({ where: { schoolId } });
        for (const s of students) {
            const type = getStudentType(s as any);
            if (type !== (s as any).studentType) {
                await prisma.student.update({ where: { id: s.id }, data: { studentType: type } });
            }
        }
        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- STAFF ---

export async function getNextEmployeeId(schoolId: string) {
    const db = readDb();
    const profiles = (db.staffProfiles || []).filter((p: any) => p.schoolId === schoolId);
    return `EMP-${String(profiles.length + 1).padStart(4, '0')}`;
}

export async function updateStaffProfile(id: string, data: any) {
    const db = readDb();
    const index = (db.staffProfiles || []).findIndex((p: any) => p.id === id);
    if (index === -1) return { success: false, error: 'Profile not found' };
    db.staffProfiles[index] = { ...db.staffProfiles[index], ...data };
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

export async function editStaff(userId: string, userData: any, profileData: any) {
    const db = readDb();
    const uIdx = db.users.findIndex((u: any) => u.id === userId);
    if (uIdx !== -1) db.users[uIdx] = { ...db.users[uIdx], ...userData };
    const pIdx = (db.staffProfiles || []).findIndex((p: any) => p.userId === userId);
    if (pIdx !== -1) db.staffProfiles[pIdx] = { ...db.staffProfiles[pIdx], ...profileData };
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

export async function updatePayslipStatus(payslipId: string, status: string) {
    const db = readDb() as any;
    if (!db.payslips) return { success: false, error: 'No payslips found' };
    const idx = db.payslips.findIndex((p: any) => p.id === payslipId);
    if (idx === -1) return { success: false, error: 'Payslip not found' };
    db.payslips[idx].status = status;
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

export async function deleteStaff(userId: string) {
    const db = readDb();
    db.users = db.users.filter((u: any) => u.id !== userId);
    if (db.staffProfiles) db.staffProfiles = db.staffProfiles.filter((p: any) => p.userId !== userId);
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

// --- ATTENDANCE ---

export async function getAttendanceMaster(schoolId: string, date?: string) {
    const db = readDb() as any;
    if (!db.attendance) return [];
    return db.attendance.filter((a: any) => a.schoolId === schoolId && (!date || a.date === date));
}

export async function updateAttendance(schoolId: string, date: string, records: any[]) {
    const db = readDb() as any;
    if (!db.attendance) db.attendance = [];
    const existing = db.attendance.findIndex((a: any) => a.schoolId === schoolId && a.date === date);
    const entry = { schoolId, date, records, updatedAt: new Date().toISOString() };
    if (existing !== -1) { db.attendance[existing] = entry; } else { db.attendance.push(entry); }
    writeDb(db);
    revalidatePath('/school-admin/attendance');
    return { success: true };
}

// --- LOANS & REIMBURSEMENTS ---

export async function addLoan(staffId: string, loan: any) {
    const db = readDb() as any;
    if (!db.loans) db.loans = [];
    db.loans.push({ id: `loan_${Date.now()}`, staffId, ...loan, status: 'Active', createdAt: new Date().toISOString() });
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

export async function repayLoan(loanId: string, amount: number) {
    const db = readDb() as any;
    if (!db.loans) return { success: false, error: 'No loans found' };
    const idx = db.loans.findIndex((l: any) => l.id === loanId);
    if (idx === -1) return { success: false, error: 'Loan not found' };
    db.loans[idx].repaid = (db.loans[idx].repaid || 0) + amount;
    if (db.loans[idx].repaid >= db.loans[idx].amount) db.loans[idx].status = 'Settled';
    writeDb(db);
    return { success: true };
}

export async function settleLoan(loanId: string) {
    const db = readDb() as any;
    if (!db.loans) return { success: false, error: 'No loans found' };
    const idx = db.loans.findIndex((l: any) => l.id === loanId);
    if (idx === -1) return { success: false, error: 'Loan not found' };
    db.loans[idx].status = 'Settled';
    writeDb(db);
    return { success: true };
}

export async function updateReimbursements(staffId: string, reimbursements: any[]) {
    const db = readDb() as any;
    if (!db.reimbursements) db.reimbursements = [];
    db.reimbursements = db.reimbursements.filter((r: any) => r.staffId !== staffId);
    db.reimbursements.push(...reimbursements.map(r => ({ ...r, staffId })));
    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

// --- ID CARD TEMPLATES ---

export async function getIDCardTemplates(schoolId?: string) {
    const db = readDb();
    const templates = db.idCardTemplates || [];
    if (schoolId) {
        return templates.filter((t: any) => t.isGlobal === true || !t.schoolId || t.schoolId === schoolId);
    }
    return templates;
}

export async function addIDCardTemplate(template: IDCardTemplate) {
    const db = readDb();
    if (!db.idCardTemplates) db.idCardTemplates = [];

    if (!template.id || template.id === 'new') {
        template.id = `tmpl_${Date.now()}`;
    }

    if (template.isDefault && template.schoolId) {
        db.idCardTemplates.forEach((t: any) => {
            if (t.schoolId === template.schoolId && t.id !== template.id) {
                t.isDefault = false;
            }
        });
    }

    db.idCardTemplates.push(template);
    writeDb(db);
    revalidatePath('/super-admin/modules/id-cards');
    revalidatePath('/school-admin/id-cards');
    return { success: true, template };
}

export async function updateIDCardTemplate(updatedTemplate: IDCardTemplate) {
    const db = readDb();
    if (!db.idCardTemplates) return { success: false, error: 'No templates found' };

    const index = db.idCardTemplates.findIndex((t: any) => t.id === updatedTemplate.id);
    if (index === -1) return { success: false, error: 'Template not found' };

    db.idCardTemplates[index] = updatedTemplate;

    if (updatedTemplate.isDefault && updatedTemplate.schoolId) {
        db.idCardTemplates.forEach((t: any) => {
            if (t.schoolId === updatedTemplate.schoolId && t.id !== updatedTemplate.id) {
                t.isDefault = false;
            }
        });
    }

    writeDb(db);
    revalidatePath('/super-admin/modules/id-cards');
    revalidatePath('/school-admin/id-cards');
    return { success: true };
}

export async function deleteIDCardTemplate(id: string) {
    const db = readDb();
    if (!db.idCardTemplates) return { success: false, error: 'No templates found' };

    const index = db.idCardTemplates.findIndex((t: any) => t.id === id);
    if (index === -1) return { success: false, error: 'Template not found' };

    db.idCardTemplates.splice(index, 1);
    writeDb(db);
    revalidatePath('/super-admin/modules/id-cards');
    revalidatePath('/school-admin/id-cards');
    return { success: true };
}

// --- STAFF FORM TEMPLATES ---

export async function getStaffFormTemplates() {
    const db = readDb();
    return db.staffFormTemplates || [];
}

export async function addStaffFormTemplate(template: StaffFormTemplate) {
    const db = readDb();
    if (!db.staffFormTemplates) db.staffFormTemplates = [];
    db.staffFormTemplates.push(template);
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true };
}

export async function updateStaffFormTemplate(updated: StaffFormTemplate) {
    const db = readDb();
    if (!db.staffFormTemplates) return { success: false };
    const idx = db.staffFormTemplates.findIndex((t: any) => t.id === updated.id);
    if (idx === -1) return { success: false, error: 'Template not found' };
    db.staffFormTemplates[idx] = updated;
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true };
}

export async function deleteStaffFormTemplate(id: string) {
    const db = readDb();
    if (!db.staffFormTemplates) return { success: false };
    db.staffFormTemplates = db.staffFormTemplates.filter((t: any) => t.id !== id);
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true };
}

// --- ADMISSION FORM TEMPLATES (additional) ---

export async function addAdmissionFormTemplate(template: AdmissionFormTemplate) {
    const db = readDb();
    if (!db.admissionFormTemplates) db.admissionFormTemplates = [];
    db.admissionFormTemplates.push(template);
    writeDb(db);
    revalidatePath('/super-admin/modules/admissions');
    return { success: true };
}

export async function deleteAdmissionFormTemplate(id: string) {
    const db = readDb();
    if (!db.admissionFormTemplates) return { success: false };
    db.admissionFormTemplates = db.admissionFormTemplates.filter((t: any) => t.id !== id);
    writeDb(db);
    revalidatePath('/super-admin/modules/admissions');
    return { success: true };
}

export async function duplicateAdmissionFormTemplate(id: string) {
    const db = readDb();
    if (!db.admissionFormTemplates) return { success: false };
    const original = db.admissionFormTemplates.find((t: any) => t.id === id);
    if (!original) return { success: false, error: 'Template not found' };
    const copy = { ...original, id: `tmpl_${Date.now()}`, name: `${original.name} (Copy)`, isDefault: false };
    db.admissionFormTemplates.push(copy);
    writeDb(db);
    revalidatePath('/super-admin/modules/admissions');
    return { success: true };
}

export async function saveAdmissionFormAsDefault(config: any[], sectionSettings?: any[]) {
    try {
        const standardTemplate = await prisma.admissionFormTemplate.findFirst({
            where: {
                OR: [
                    { id: 'tmpl_adm_standard' },
                    { name: 'Standard Admission Form' },
                    { isSystem: true }
                ]
            }
        });

        if (standardTemplate) {
            await prisma.admissionFormTemplate.update({
                where: { id: standardTemplate.id },
                data: {
                    config: config as any,
                    sectionSettings: sectionSettings as any
                }
            });
        }
    } catch (error) {
        console.warn('[HYBRID] saveAdmissionFormAsDefault Prisma update failed, trying local JSON:', error);
    }

    try {
        const db = readDb();
        if (!db.admissionFormTemplates) {
            db.admissionFormTemplates = [];
        }

        const idx = db.admissionFormTemplates.findIndex(
            (t: any) => t.id === 'tmpl_adm_standard' || t.isSystem || t.name === 'Standard Admission Form'
        );

        if (idx !== -1) {
            db.admissionFormTemplates[idx].config = config;
            if (sectionSettings) {
                db.admissionFormTemplates[idx].sectionSettings = sectionSettings;
            }
            writeDb(db);
        } else {
            db.admissionFormTemplates.push({
                id: 'tmpl_adm_standard',
                name: 'Standard Admission Form',
                description: 'Standard comprehensive admission form with all standard attributes.',
                icon: 'ClipboardList',
                isSystem: true,
                isDefault: true,
                config,
                sectionSettings
            } as any);
            writeDb(db);
        }
        
        revalidatePath('/super-admin/modules/admissions');
        revalidatePath('/school-admin/admissions');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save system default template' };
    }
}

// --- SCHOOL FORM CONFIG ---

export async function getStaffFormConfigForSchool(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { staffFormTemplateId: true } as any });
        const db = readDb();
        const templates = db.staffFormTemplates || [];
        
        let template = null;
        if ((school as any)?.staffFormTemplateId) {
            template = templates.find((t: any) => t.id === (school as any).staffFormTemplateId);
        }

        if (!template) {
            template = templates.find((t: any) => t.isSystem) || templates[0] || null;
        }

        return template;
    } catch { return null; }
}

export async function getAdmissionFormConfigForSchool(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({ 
            where: { id: schoolId },
            include: {
                sessions: {
                    where: { isActive: true },
                    orderBy: { name: 'desc' }
                }
            } as any
        });

        if (!school) return null;

        const db = require('@/lib/db').readDb();
        const templates = db.admissionFormTemplates || require('@/lib/mock-data').DEFAULT_ADMISSION_FORM_TEMPLATES || [];
        
        let template = null;
        if ((school as any)?.admissionFormTemplateId) {
            template = templates.find((t: any) => t.id === (school as any).admissionFormTemplateId);
        }

        if (!template) {
            template = templates.find((t: any) => t.isSystem) || templates[0] || null;
        }

        if (template) {
            let config = mergeConfigWithMaster(template.config as any);

            // Apply overrides from School record (visibility, required, order, etc.)
            const overrides = (school as any).admissionFieldOverrides || {};
            
            // Inject Custom Options from School Settings
            config = config.map(field => {
                let currentField = { ...field };

                // Apply school-level overrides if they exist
                if (overrides[field.fieldName]) {
                    currentField = { ...currentField, ...overrides[field.fieldName] };
                }

                // 1. Classes
                if (field.fieldName === 'className' || field.fieldName === 'classAppliedFor') {
                    const useCustom = (school as any).useCustomClasses;
                    const schoolClasses = (school as any).classes;
                    const hasCustomClasses = Array.isArray(schoolClasses) && schoolClasses.length > 0;
                    
                    if (hasCustomClasses) {
                        // Priority: If the school has ANY classes defined, use them.
                        currentField.fieldType = 'select';
                        currentField.options = schoolClasses.map((c: any) => typeof c === 'string' ? c : c.name);
                    } else {
                        // Fallback: Only use system defaults if the school list is empty
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_CLASS_SETUPS.map(c => c.name);
                    }
                }
                // 2. Sections
                else if (field.fieldName === 'section') {
                    // Logic for section dropdown options (MASTER LIST)
                    // Individual classes may override this in the form itself via dynamic filtering
                    const schoolSections = (school as any).sections;
                    if (Array.isArray(schoolSections) && schoolSections.length > 0) {
                        currentField.fieldType = 'select';
                        currentField.options = schoolSections;
                    } else {
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_SECTIONS;
                    }
                }
                // 3. Houses
                else if (field.fieldName === 'house') {
                    const schoolHouses = (school as any).houses;
                    const hasCustomHouses = Array.isArray(schoolHouses) && schoolHouses.length > 0;
                    
                    if (hasCustomHouses) {
                        currentField.fieldType = 'select';
                        currentField.options = schoolHouses;
                    } else {
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_HOUSES;
                    }
                }
                // 4. Religion
                else if (field.fieldName === 'religion') {
                    if ((school as any).useCustomReligions && Array.isArray((school as any).religions)) {
                        currentField.fieldType = 'select';
                        currentField.options = (school as any).religions;
                    } else if (!(school as any).useCustomReligions) {
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_RELIGIONS;
                    }
                }
                // 5. Category
                else if (field.fieldName === 'category') {
                    if ((school as any).useCustomCategories && Array.isArray((school as any).categories)) {
                        currentField.fieldType = 'select';
                        currentField.options = (school as any).categories;
                    } else if (!(school as any).useCustomCategories) {
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_CATEGORIES;
                    }
                }
                // 6. Sessions
                else if (field.fieldName === 'enrolledSession') {
                    const sessionNames = ((school as any).sessions || []).map((s: any) => s.name);
                    if (sessionNames.length > 0) {
                        currentField.fieldType = 'select';
                        currentField.options = sessionNames;
                    } else if (school.currentSession) {
                        currentField.fieldType = 'select';
                        currentField.options = [school.currentSession];
                    }
                }
                // 7. Streams
                else if (field.fieldName === 'stream') {
                    if ((school as any).useCustomStreams && Array.isArray((school as any).streams)) {
                        currentField.fieldType = 'select';
                        currentField.options = (school as any).streams;
                    } else if (!(school as any).useCustomStreams) {
                        currentField.fieldType = 'select';
                        currentField.options = INITIAL_STREAMS;
                    }
                }

                return currentField;
            });

            // Final Sort by orderIndex
            config.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));

            return {
                ...template,
                config,
                schoolName: school.name,
                academicSettings: {
                    currentSession: school.currentSession,
                    classes: (school as any).classes || [],
                    sections: (school as any).sections || [],
                    houses: (school as any).houses || [],
                    religions: (school as any).religions || [],
                    categories: (school as any).categories || [],
                    streams: (school as any).streams || [],
                    disableReasons: (school as any).disableReasons || [],
                    useCustomClasses: (school as any).useCustomClasses,
                    useCustomSections: (school as any).useCustomSections,
                    useCustomHouses: (school as any).useCustomHouses,
                    useCustomReligions: (school as any).useCustomReligions,
                    useCustomCategories: (school as any).useCustomCategories,
                    useCustomStreams: (school as any).useCustomStreams,
                    useCustomDisableReasons: (school as any).useCustomDisableReasons,
                    sessions: (school as any).sessions || [],
                    languageSettings: (school as any).admissionFieldOverrides?.__languageAutomation || {}
                },
                idSettings: {
                    registrationNo: (school as any).regNoSettings,
                    enrollmentNo: (school as any).enrollNoSettings,
                    apaarId: (school as any).apaarIdSettings,
                    penNo: (school as any).penNoSettings,
                    srNo: (school as any).srNoSettings,
                    generalRegistrationNo: (school as any).genRegNoSettings,
                    rollNumber: (school as any).rollNoSettings
                }
            };
        }
        return null;
    } catch (e) { 
        console.error("[FETCH_ADMISSION_CONFIG] Error:", e);
        return null; 
    }
}

export async function updateSchoolAdmissionTemplate(schoolId: string, templateId: string) {
    try {
        await prisma.school.update({ where: { id: schoolId }, data: { admissionFormTemplateId: templateId } as any });
        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateSchoolAdmissionFieldOverride(schoolId: string, fieldName: string, overrides: any) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { admissionFieldOverrides: true } as any });
        const existing = ((school as any)?.admissionFieldOverrides as any) || {};
        await prisma.school.update({ where: { id: schoolId }, data: { admissionFieldOverrides: { ...existing, [fieldName]: overrides } } as any });
        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function resetSchoolAdmissionFields(schoolId: string) {
    try {
        await prisma.school.update({ where: { id: schoolId }, data: { admissionFieldOverrides: {} } as any });
        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateStudentSettings(schoolId: string, settings: any) {
    try {
        await prisma.school.update({ where: { id: schoolId }, data: settings });
        revalidatePath('/school-admin/settings');
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// --- GLOBAL STUDENT DEFAULTS ---

export async function getGlobalStudentDefaults() {
    const db = readDb();
    return db.globalStudentDefaults || {};
}

export async function updateGlobalStudentDefaults(defaults: any) {
    const db = readDb();
    db.globalStudentDefaults = { ...(db.globalStudentDefaults || {}), ...defaults };
    writeDb(db);
    revalidatePath('/super-admin');
    return { success: true };
}

// --- STUDENT PROFILE TEMPLATES ---

export async function getStudentProfileTemplates() {
    const db = readDb();
    return db.studentProfileTemplates || [];
}

export async function addStudentProfileTemplate(template: StudentProfileTemplate) {
    const db = readDb();
    if (!db.studentProfileTemplates) db.studentProfileTemplates = [];
    
    const newTemplate = {
        ...template,
        id: template.id === 'new' ? `tmpl_prof_${Date.now()}` : template.id
    };
    
    db.studentProfileTemplates.push(newTemplate);
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true, template: newTemplate };
}

export async function updateStudentProfileTemplate(template: StudentProfileTemplate) {
    const db = readDb();
    if (!db.studentProfileTemplates) return { success: false, error: 'Not found' };
    
    const index = db.studentProfileTemplates.findIndex((t: any) => t.id === template.id);
    if (index === -1) return { success: false, error: 'Template not found' };
    
    db.studentProfileTemplates[index] = template;
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true };
}

export async function deleteStudentProfileTemplate(id: string) {
    const db = readDb();
    if (!db.studentProfileTemplates) return { success: false };
    
    db.studentProfileTemplates = db.studentProfileTemplates.filter((t: any) => t.id !== id);
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true };
}

export async function getStudentProfileTemplateForSchool(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { studentProfileTemplateId: true } as any });
        const db = readDb();
        if ((school as any)?.studentProfileTemplateId) {
            const tmpl = (db.studentProfileTemplates || []).find((t: any) => t.id === (school as any).studentProfileTemplateId);
            if (tmpl) return tmpl;
        }
        return (db.studentProfileTemplates || [])[0] || null;
    } catch {
        const db = readDb();
        return (db.studentProfileTemplates || [])[0] || null;
    }
}

export async function reorderSchoolAdmissionFields(schoolId: string, orderedFields: string[]) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { admissionFieldOverrides: true }
        });
        
        const existingOverrides = (school?.admissionFieldOverrides as any) || {};
        const updatedOverrides = { ...existingOverrides };

        orderedFields.forEach((fieldName, index) => {
            if (!updatedOverrides[fieldName]) {
                updatedOverrides[fieldName] = {};
            }
            updatedOverrides[fieldName].orderIndex = index;
        });

        await prisma.school.update({
            where: { id: schoolId },
            data: { admissionFieldOverrides: updatedOverrides }
        });

        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function setSchoolAdmissionFormToAdvanced(schoolId: string) {
    try {
        await prisma.school.update({
            where: { id: schoolId },
            data: { 
                admissionFieldOverrides: {},
                admissionFormTemplateId: 'tmpl_adm_standard' // Default advanced template
            }
        });

        revalidatePath('/school-admin/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

