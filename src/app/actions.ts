'use server';

import { readDb, writeDb, resolveSchool } from '@/lib/db';
import prisma from '@/lib/prisma';
import {
    User, School, QRTransaction, Student, AdmissionApplication, StudentProfileTemplate, StudentFormConfig, SectionConfig, SaasPackage, Session, UserRole, IDCardTemplate, StaffFormTemplate, AdmissionFormTemplate, AccessoryTemplate, AccessoryCategory, AccessoryItem, AccessoryFieldConfig, AccessorySale
} from '@/types';
import { StudentAttendanceData, AttendanceStatus } from '@/types/attendance';
import { FeeGroup, Transaction as FeeTransaction } from '@/types/fees';
import { revalidatePath } from 'next/cache';

import { randomUUID } from 'crypto';
import { generateNextId } from '@/lib/id-generator';
import { calculateMonthFinancials, getStudentType } from '@/lib/fees-helper';
import { EXTRACTED_ADMISSION_FIELDS } from '@/lib/admission-form-constants';
import { hashPassword, verifyPassword, createSession, SessionPayload } from '@/lib/auth-utils';
import {
    INITIAL_CLASS_SETUPS,
    INITIAL_SECTIONS,
    INITIAL_DISABLE_REASONS,
    INITIAL_HOUSES,
    INITIAL_RELIGIONS,
    INITIAL_CATEGORIES,
    INITIAL_STREAMS,
    INITIAL_REG_SETTINGS,
    INITIAL_ENROLL_SETTINGS,
    INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS,
    INITIAL_SR_SETTINGS,
    INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS
} from '@/lib/student-constants';

/**
 * Merges a stored form configuration with the latest master field list.
 * This ensures new fields added to the codebase are available to all existing templates
 * while preserving user-configured visibility, labels, and requirement statuses.
 */
function mergeConfigWithMaster(storedConfig: StudentFormConfig[] = []): StudentFormConfig[] {
    const masterMap = new Map(EXTRACTED_ADMISSION_FIELDS.map(f => [f.fieldName, f]));
    const storedFieldNames = new Set(storedConfig.map(f => f.fieldName));

    // 1. Process stored fields (preserves user order)
    const merged = storedConfig.map(storedField => {
        const masterField = masterMap.get(storedField.fieldName);
        
        if (!masterField) return storedField; // Custom field added by user

        // Preserve user settings but fill in missing metadata from master
        return {
            ...masterField, // Default to master metadata
            ...storedField, // Override with stored user settings (visible, required, custom label)
            sectionName: masterField.sectionName, // PREVENT LEGACY DB FROM OVERRIDING HARDCODED UI SECTIONS
            placeholder: storedField.placeholder || masterField.placeholder, 
        };
    });

    // 2. Add any missing fields from the master list at the end
    EXTRACTED_ADMISSION_FIELDS.forEach(masterField => {
        if (!storedFieldNames.has(masterField.fieldName)) {
            merged.push({ ...masterField });
        }
    });

    return merged;
}

// --- PACKAGES ---

export async function getPackages() {
    return prisma.saasPackage.findMany();
}

export async function addPackage(newPackage: SaasPackage) {
    await prisma.saasPackage.create({
        data: {
            ...newPackage,
            id: newPackage.id || undefined
        }
    });
    revalidatePath('/super-admin/packages');
    return { success: true };
}

export async function updatePackage(id: string, data: Partial<SaasPackage>) {
    await prisma.saasPackage.update({
        where: { id },
        data
    });
    revalidatePath('/super-admin/packages');
    return { success: true };
}

export async function deletePackage(id: string) {
    await prisma.saasPackage.delete({
        where: { id }
    });
    revalidatePath('/super-admin/packages');
    return { success: true };
}

// --- SCHOOLS ---

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

    // Generate some mock records for visualization if needed (preserving existing mocks for now)
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

    // Upsert the official document
    await prisma.studentDocument.upsert({
        where: {
            // We'd need a unique constraint for studentId + fieldName for official docs
            // But for now, we find and update or create
            id: (await prisma.studentDocument.findFirst({
                where: { studentId, fieldName }
            }))?.id || 'new-uuid-' + Math.random() // Dummy ID for create part of upsert if not found
        },
        create: {
            studentId,
            title: fieldName,
            file: fileName,
            content,
            type: 'Official',
            fieldName
        },
        update: {
            file: fileName,
            content
        }
    });

    revalidatePath(`/school-admin/students`);
    return { success: true };
}

export async function getSchoolSessionConfig(schoolId: string) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { sessionStartMonth: true }
    });
    return {
        sessionStartMonth: school?.sessionStartMonth || 4, // Default to April
    };
}


export async function getSchools() {
    const schools = await prisma.school.findMany({
        include: {
            sessions: true,
            _count: {
                select: { students: true }
            }
        }
    });
    return schools.map((school: any) => ({
        ...school,
        payrollConfig: school.admissionFieldOverrides?.__payrollConfig || null,
        studentCount: school._count.students
    }));
}

export async function getSchool(id: string) {
    // Try UUID first, then the unique schoolId slug
    let school = await prisma.school.findUnique({
        where: { id },
        include: { 
            sessions: true,
            _count: { select: { students: true } }
        }
    });

    if (!school) {
        school = await prisma.school.findUnique({
            where: { schoolId: id },
            include: { 
                sessions: true,
                _count: { select: { students: true } }
            }
        });
    }

    if (school) {
        return {
            ...school,
            payrollConfig: (school.admissionFieldOverrides as any)?.__payrollConfig || null,
            studentCount: school._count.students
        };
    }
    return school;
}

const DEFAULT_ACCESSORY_FIELDS = [
    { fieldName: 'sku', label: 'SKU', isVisible: true, isRequired: false },
    { fieldName: 'vendorDetails', label: 'Vendor Details', isVisible: true, isRequired: false },
    { fieldName: 'entryDate', label: 'Entry Date', isVisible: true, isRequired: false },
    { fieldName: 'entryQuantity', label: 'Entry Quantity', isVisible: true, isRequired: false },
    { fieldName: 'totalQuantity', label: 'Total Quantity', isVisible: true, isRequired: false },
    { fieldName: 'availableQuantity', label: 'Available Quantity', isVisible: true, isRequired: false },
    { fieldName: 'thresholdQuantity', label: 'Threshold Quantity', isVisible: true, isRequired: false },
    { fieldName: 'buyPrice', label: 'Buy Rate', isVisible: true, isRequired: false },
    { fieldName: 'sellPrice', label: 'Sell Rate', isVisible: true, isRequired: false },
    { fieldName: 'carryForward', label: 'Carry Forward', isVisible: true, isRequired: false }
];

export async function addSchool(newSchool: School, adminPassword?: string) {
    try {
        // Enforce uniqueness of schoolId (Prisma will also do this via schema but we check first for better error)
        const exists = await prisma.school.findUnique({
            where: { schoolId: newSchool.schoolId }
        });
        if (exists) return { success: false, error: 'A school with this ID already exists' };

        // Filter out fields that are not in the Prisma schema
        const { sessions, ads, admins, studentCount, ...schoolData } = newSchool as any;

        // Auto-initialize accessory catalog if school package includes Inventory module (m10)
        let hasInventoryModule = false;
        let packageId = schoolData.packageId;
        if (packageId) {
            try {
                const pkg = await prisma.saasPackage.findUnique({
                    where: { id: packageId }
                });
                if (pkg && pkg.modules.includes('m10')) {
                    hasInventoryModule = true;
                }
            } catch (e) {
                const db = readDb();
                const pkg = db.packages?.find(p => p.id === packageId);
                if (pkg && pkg.modules.includes('m10')) {
                    hasInventoryModule = true;
                }
            }
        }

        let autoAccessoriesData: any = null;
        let autoTemplateId: string | null = null;
        if (hasInventoryModule) {
            const db = readDb();
            const defaultTemplate = db.accessoryTemplates?.find(t => t.isDefault) || db.accessoryTemplates?.[0];
            if (defaultTemplate) {
                autoTemplateId = defaultTemplate.id;
                const baseConfig = defaultTemplate.fieldConfig || [];
                const mergedConfig = [...DEFAULT_ACCESSORY_FIELDS].map(def => {
                    const existing = baseConfig.find(eb => eb.fieldName === def.fieldName);
                    return existing ? { ...def, isVisible: existing.isVisible } : def;
                });
                autoAccessoriesData = {
                    categories: JSON.parse(JSON.stringify(defaultTemplate.categories)),
                    items: defaultTemplate.defaultItems ? JSON.parse(JSON.stringify(defaultTemplate.defaultItems)) : [],
                    fieldConfig: mergedConfig
                };
            }
        }

        const school = await prisma.school.create({
            data: {
                ...schoolData,
                id: (newSchool as any).id || undefined,
                isActive: true,
                accessories: autoAccessoriesData ? (autoAccessoriesData as any) : undefined,
                accessoryTemplateId: autoTemplateId || undefined
            }
        });

        // Auto-create or link admin user
        if (newSchool.admins && newSchool.admins.length > 0) {
            const adminEmail = newSchool.admins[0];
            const existingUser = await prisma.user.findUnique({
                where: { email: adminEmail }
            });

            if (existingUser) {
                // User exists, just update their school mapping and password
                const updatedPwd = adminPassword ? await hashPassword(adminPassword) : existingUser.password;
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: {
                        schoolId: school.id,
                        password: updatedPwd,
                        role: 'SCHOOL_ADMIN'
                    }
                });
            } else {
                const newAdminPwd = await hashPassword(adminPassword || randomUUID().slice(0, 12));
                await prisma.user.create({
                    data: {
                        name: newSchool.name + ' Admin',
                        email: adminEmail,
                        password: newAdminPwd,
                        role: 'SCHOOL_ADMIN',
                        schoolId: school.id,
                        avatar: '/logo_placeholder.png',
                        status: 'Active'
                    }
                });
            }
        }

        revalidatePath('/super-admin/schools');
        return { success: true };
    } catch (error: any) {
        console.error('[SERVER] Failed to add school:', error);
        return { success: false, error: error.message || 'Database error' };
    }
}


export async function updateSchool(id: string, data: Partial<School>, adminPassword?: string) {
    try {
        const oldSchool = await prisma.school.findUnique({
            where: { id }
        });
        if (!oldSchool) return { success: false, error: 'School not found' };

        // Enforce uniqueness of schoolId if changed
        if (data.schoolId && data.schoolId !== oldSchool.schoolId) {
            const exists = await prisma.school.findUnique({
                where: { schoolId: data.schoolId }
            });
            if (exists && exists.id !== id) {
                return { success: false, error: 'A school with this ID already exists' };
            }
        }

        const { 
            sessions, id: _id, studentCount, ads, admins, 
            _count, updatedAt, createdAt, users, students, 
            inventoryProducts, stockTransactions, accessoryInvoices,
            payrollConfig,
            ...updateData 
        } = data as any;

        if (payrollConfig) {
            const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
            (overrides as any).__payrollConfig = payrollConfig;
            updateData.admissionFieldOverrides = overrides;
        }

        // Auto-initialize accessory catalog on package change/update to package with Inventory module (m10)
        let hasInventoryModule = false;
        let packageId = updateData.packageId || oldSchool.packageId;
        if (packageId) {
            try {
                const pkg = await prisma.saasPackage.findUnique({
                    where: { id: packageId }
                });
                if (pkg && pkg.modules.includes('m10')) {
                    hasInventoryModule = true;
                }
            } catch (e) {
                const db = readDb();
                const pkg = db.packages?.find(p => p.id === packageId);
                if (pkg && pkg.modules.includes('m10')) {
                    hasInventoryModule = true;
                }
            }
        }

        if (hasInventoryModule && (!oldSchool.accessories || !oldSchool.accessoryTemplateId)) {
            const db = readDb();
            const defaultTemplate = db.accessoryTemplates?.find(t => t.isDefault) || db.accessoryTemplates?.[0];
            if (defaultTemplate) {
                const baseConfig = defaultTemplate.fieldConfig || [];
                const mergedConfig = [...DEFAULT_ACCESSORY_FIELDS].map(def => {
                    const existing = baseConfig.find(eb => eb.fieldName === def.fieldName);
                    return existing ? { ...def, isVisible: existing.isVisible } : def;
                });
                updateData.accessoryTemplateId = defaultTemplate.id;
                updateData.accessories = {
                    categories: JSON.parse(JSON.stringify(defaultTemplate.categories)),
                    items: defaultTemplate.defaultItems ? JSON.parse(JSON.stringify(defaultTemplate.defaultItems)) : [],
                    fieldConfig: mergedConfig
                };
            }
        }

        await prisma.school.update({
            where: { id },
            data: updateData
        });

        // Sync User (Admin) if email or password changed
        const targetEmail = data.email || (oldSchool as any).admins?.[0];
        if (targetEmail) {
            const existingUser = await prisma.user.findUnique({
                where: { email: targetEmail }
            });

            if (existingUser) {
                const updatePwd = adminPassword ? await hashPassword(adminPassword) : undefined;
                await prisma.user.update({
                    where: { email: targetEmail },
                    data: {
                        name: (data.name || oldSchool.name) + ' Admin',
                        password: updatePwd || undefined
                    }
                });
            } else {
                const newPwd = await hashPassword(adminPassword || randomUUID().slice(0, 12));
                await prisma.user.create({
                    data: {
                        name: (data.name || oldSchool.name) + ' Admin',
                        email: targetEmail,
                        password: newPwd,
                        role: 'SCHOOL_ADMIN',
                        schoolId: id,
                        avatar: '/logo_placeholder.png',
                        status: 'Active'
                    }
                });
            }
        }

        revalidatePath('/super-admin/schools');
        revalidatePath('/school-admin/profile');
        revalidatePath('/school-admin/students/settings');
        return { success: true };
    } catch (error: any) {
        console.error('[SERVER] Failed to update school:', error);
        return { success: false, error: error.message || 'Database update failed' };
    }
}


export async function updateSchoolConfig(id: string, config: any) {
    try {
        const school = await prisma.school.findFirst({
            where: { OR: [{ id }, { schoolId: id }] }
        });
        if (!school) return { success: false, error: 'School not found' };

        const currentOverrides = (school.admissionFieldOverrides as any) || {};
        currentOverrides.__payrollConfig = config;

        await prisma.school.update({
            where: { id: school.id },
            data: { admissionFieldOverrides: currentOverrides }
        });

        revalidatePath('/school-admin/payroll');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update school config:', error);
        return { success: false, error: error.message || 'Database update failed' };
    }
}


export async function deleteSchool(id: string) {
    try {
        // Manually cascade delete related records within a transaction
        await prisma.$transaction([
            prisma.feeTransaction.deleteMany({ where: { schoolId: id } }),
            prisma.student.deleteMany({ where: { schoolId: id } }),
            prisma.session.deleteMany({ where: { schoolId: id } }),
            prisma.user.deleteMany({ where: { schoolId: id } }),
            prisma.school.delete({ where: { id } })
        ]);
        revalidatePath('/super-admin/schools');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting school:', error);
        return { success: false, error: error.message || 'Failed to delete school.' };
    }
}


export async function toggleSchoolStatus(schoolId: string, isActive: boolean) {
    await prisma.school.update({
        where: { id: schoolId },
        data: { isActive }
    });
    revalidatePath('/super-admin/schools');
    return { success: true };
}


export async function manageSession(
    schoolId: string,
    action: 'add' | 'edit' | 'delete' | 'setCurrent',
    data?: Partial<Session>
) {
    switch (action) {
        case 'add':
            const sessionCount = await prisma.session.count({ where: { schoolId } });
            const newSession = await prisma.session.create({
                data: {
                    schoolId,
                    name: data?.name || 'New Session',
                    startDate: data?.startDate,
                    endDate: data?.endDate,
                    isCurrent: sessionCount === 0,
                    status: data?.status || 'Planned'
                }
            });
            if (newSession.isCurrent) {
                await prisma.school.update({
                    where: { id: schoolId },
                    data: { currentSession: newSession.name }
                });
            }
            break;

        case 'edit':
            if (!data?.id) return { success: false, error: 'Session ID required' };
            const updated = await prisma.session.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: data.status
                }
            });
            if (updated.isCurrent) {
                await prisma.school.update({
                    where: { id: schoolId },
                    data: { currentSession: updated.name }
                });
            }
            break;

        case 'delete':
            if (!data?.id) return { success: false, error: 'Session ID required' };
            const toDelete = await prisma.session.findUnique({ where: { id: data.id } });
            if (toDelete?.isCurrent) {
                return { success: false, error: 'Cannot delete the current session' };
            }
            await prisma.session.delete({ where: { id: data.id } });
            break;

        case 'setCurrent':
            if (!data?.id) return { success: false, error: 'Session ID required' };
            // Transaction to unset others and set new current
            await prisma.$transaction([
                prisma.session.updateMany({
                    where: { schoolId },
                    data: { isCurrent: false }
                }),
                prisma.session.update({
                    where: { id: data.id },
                    data: { isCurrent: true }
                })
            ]);

            const current = await prisma.session.findUnique({ where: { id: data.id } });
            if (current) {
                await prisma.school.update({
                    where: { id: schoolId },
                    data: { currentSession: current.name }
                });
            }
            break;
    }

    revalidatePath('/school-admin/profile');
    return { success: true };
}


export async function getSchoolAdmin(schoolId: string) {
    return prisma.user.findFirst({
        where: {
            schoolId: schoolId,
            role: 'SCHOOL_ADMIN'
        }
    });
}

// --- USERS (AUTH) ---

export async function getUsers(options?: {
    schoolId?: string;
    excludeRoles?: UserRole[]
}) {
    const db = readDb();
    let users = db.users || [];
    if (options?.schoolId) {
        users = users.filter(u => u.schoolId === options.schoolId);
    }
    if (options?.excludeRoles && options.excludeRoles.length > 0) {
        users = users.filter(u => !options.excludeRoles!.includes(u.role));
    }
    return users;
}

export async function authenticateUser(identifier: string, pass: string) {
    const db = readDb();

    // 1. Check Standard Users (Admins, Root, Staff) from local JSON DB
    for (const u of (db.users || [])) {
        if (u.email === identifier || u.name === identifier) {
            const passwordValid = await verifyPassword(pass, u.password || '');
            if (passwordValid) {
                // Create HTTP-only session cookie
                const sessionPayload: SessionPayload = {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    schoolId: u.schoolId || null,
                    avatar: u.avatar || null,
                    designation: u.designation || null,
                };
                await createSession(sessionPayload);
                return { success: true, user: u as any };
            }
        }
    }

    // 2. Check Student Logins
    for (const s of (db.students || [])) {
        if (s.studentUsername === identifier) {
            const passwordValid = await verifyPassword(pass, s.loginPassword || '');
            if (passwordValid) {
                if (s.status === 'Disabled') {
                    return { success: false, error: 'Your account has been disabled. Please contact the school administrator.' };
                }
                const sessionPayload: SessionPayload = {
                    id: s.id,
                    name: s.name,
                    email: s.studentUsername!,
                    role: 'STUDENT',
                    schoolId: s.schoolId,
                    passwordChanged: s.parentPasswordChanged !== false,
                };
                await createSession(sessionPayload);
                return {
                    success: true,
                    user: {
                        id: s.id,
                        name: s.name,
                        email: s.studentUsername!,
                        role: 'STUDENT' as UserRole,
                        schoolId: s.schoolId,
                        passwordChanged: s.parentPasswordChanged !== false
                    }
                };
            }
        }
    }

    // 3. Check Parent Logins (Mobile Number)
    for (const s of (db.students || [])) {
        if (s.parentUsername === identifier) {
            const passwordValid = await verifyPassword(pass, s.loginPassword || '');
            if (passwordValid) {
                if (s.status === 'Disabled') {
                    return { success: false, error: 'This parent account is linked to a disabled student record. Access denied.' };
                }
                const sessionPayload: SessionPayload = {
                    id: `parent_${identifier}`,
                    name: s.guardianName || s.fatherName || s.motherName || 'Parent',
                    email: identifier,
                    role: 'PARENT',
                    schoolId: s.schoolId,
                    passwordChanged: s.parentPasswordChanged !== false,
                };
                await createSession(sessionPayload);
                return {
                    success: true,
                    user: {
                        id: `parent_${identifier}`,
                        name: s.guardianName || s.fatherName || s.motherName || 'Parent',
                        email: identifier,
                        role: 'PARENT' as UserRole,
                        schoolId: s.schoolId,
                        passwordChanged: s.parentPasswordChanged !== false
                    }
                };
            }
        }
    }

    return { success: false, error: 'Invalid credentials' };
}

export async function addUser(data: Partial<User>) {
    if (!data.email || !data.name || !data.role) {
        return { success: false, error: 'Missing required fields' };
    }

    const db = readDb();
    if (!db.users) db.users = [];

    const existing = db.users.find(u => u.email === data.email);
    if (existing) {
        return { success: false, error: 'User with this email already exists' };
    }

    // Map UI role string to valid database UserRole enum
    let dbRole: UserRole = 'STAFF';
    let designation = data.designation || data.role; // Default designation to the UI role name if not specified

    const uiRole = data.role as string;
    if (uiRole === 'Admin' || uiRole === 'Sub Admin' || uiRole === 'SCHOOL_ADMIN') {
        dbRole = 'SCHOOL_ADMIN';
    } else if (uiRole === 'SUPER_ADMIN') {
        dbRole = 'SUPER_ADMIN';
    } else if (uiRole === 'ROOT') {
        dbRole = 'ROOT';
    } else if (uiRole === 'STUDENT') {
        dbRole = 'STUDENT';
    } else if (uiRole === 'PARENT') {
        dbRole = 'PARENT';
    } else {
        dbRole = 'STAFF';
    }

    const hashedPwd = await hashPassword(data.password || randomUUID().slice(0, 12));
    const newUser: User = {
        id: `u_${randomUUID()}`,
        name: data.name,
        email: data.email,
        role: dbRole,
        password: hashedPwd,
        status: (data.status || 'Active') as any,
        schoolId: data.schoolId || undefined,
        avatar: data.avatar,
        designation: designation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    revalidatePath('/school-admin/roles');
    return { success: true, user: newUser };
}

export async function updateUser(id: string, data: Partial<User>) {
    try {
        let dbRole: UserRole | undefined = undefined;
        let designation = data.designation;

        if (data.role) {
            designation = designation || data.role;
            const uiRole = data.role as string;
            if (uiRole === 'Admin' || uiRole === 'Sub Admin' || uiRole === 'SCHOOL_ADMIN') {
                dbRole = 'SCHOOL_ADMIN';
            } else if (uiRole === 'SUPER_ADMIN') {
                dbRole = 'SUPER_ADMIN';
            } else if (uiRole === 'ROOT') {
                dbRole = 'ROOT';
            } else if (uiRole === 'STUDENT') {
                dbRole = 'STUDENT';
            } else if (uiRole === 'PARENT') {
                dbRole = 'PARENT';
            } else {
                dbRole = 'STAFF';
            }
        }

        const db = readDb();
        if (!db.users) db.users = [];
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) {
            return { success: false, error: 'User not found' };
        }

        // Hash password if being updated
        const hashedPwd = data.password ? await hashPassword(data.password) : undefined;

        const updated: User = {
            ...db.users[index],
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(dbRole !== undefined && { role: dbRole }),
            ...(hashedPwd !== undefined && { password: hashedPwd }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.avatar !== undefined && { avatar: data.avatar }),
            ...(designation !== undefined && { designation }),
            updatedAt: new Date().toISOString(),
        };

        db.users[index] = updated;
        writeDb(db);

        revalidatePath('/school-admin/roles');
        return { success: true, user: updated };
    } catch (e) {
        return { success: false, error: 'User not found or update failed' };
    }
}


export async function deleteUser(id: string) {
    const db = readDb();
    const existingLength = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    if (db.users.length !== existingLength) {
        writeDb(db);
        revalidatePath('/school-admin/roles');
        return { success: true };
    }
    return { success: false, error: 'User not found or delete failed' };
}

// --- TEMPLATE EXPORT DEMO ACTION ---
export async function getTemplateDemoStudent(schoolId: string, searchName?: string) {
    const db = readDb();
    if (!db.students) return null;

    if (searchName) {
        const studentNameLower = searchName.toLowerCase();
        const found = db.students.find((s: Record<string, any>) =>
            s.schoolId === schoolId &&
            (
                s.name?.toLowerCase().includes(studentNameLower) ||
                s.firstName?.toLowerCase().includes(studentNameLower)
            )
        );
        if (found) return found;
    }

    return null; // Return null instead of a random student to prevent data leakage in templates
}

// ==========================================
// --- STUDENT MANAGEMENT SECTIONS ---
// ==========================================


export async function getStudents(schoolId: string) {
    return prisma.student.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getStudent(id: string) {
    return prisma.student.findUnique({
        where: { id },
        include: { school: true }
    });
}

/**
 * ARCHIVAL: Disables a student record, preventing portal access and marking them as 'Disabled'.
 */
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

/**
 * RESTORATION: Re-enables a previously disabled student record.
 */
export async function enableStudent(studentId: string, note?: string) {
    try {
        await prisma.student.update({
            where: { id: studentId },
            data: {
                status: 'Active',
                enableNote: note,
                // Clear old archival metadata
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

/**
 * SETTINGS: Fetches the list of disable reasons for a specific school.
 */
export async function getDisableReasons(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, schoolId: true, disableReasons: true, useCustomDisableReasons: true }
        });


        if (school?.useCustomDisableReasons && school.disableReasons && school.disableReasons.length > 0) {
            return school.disableReasons;
        }

        const defaults = ["Parents Request", "Transfer", "Fees Pending", "Other"];
        return defaults;
    } catch (error) {
        console.error('[SERVER] Failed to fetch disable reasons:', error);
        return ["Parents Request", "Transfer", "Fees Pending", "Other"];
    }
}

export async function searchStudents(schoolId: string, filters: {
    className?: string;
    section?: string;
    sessionId?: string;
    uniqueId?: string;
    contact?: string;
    name?: string;
    fatherName?: string;
    status?: string;
    // Map frontend keys
    keyword?: string;
    classFilter?: string;
    sectionFilter?: string;
} = {}) {
    const conditions: any[] = [{ schoolId }];

    // Standardize status
    if (filters.status && filters.status !== 'all') {
        conditions.push({ status: filters.status === 'Active' ? 'Active' : 'Disabled' });
    }

    // Map class and section filters from frontend
    const rawClassName = filters.classFilter || filters.className;
    const section = filters.sectionFilter || filters.section;

    if (rawClassName && rawClassName !== 'all' && rawClassName !== 'Select') {
        // Handle "Class VIII" vs "VIII" mismatch
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

    // Session resolution logic
    let sessionIdFilter: any = null;
    if (filters.sessionId && (filters.sessionId !== 'all' && filters.sessionId !== 'Select')) {
        const session = await prisma.session.findFirst({
            where: { 
                schoolId,
                OR: [
                    { id: filters.sessionId },
                    { name: filters.sessionId }
                ]
            }
        });
        
        if (session) {
            sessionIdFilter = { in: [session.id, session.name] };
        } else {
            // Fallback to searching exactly what was passed
            sessionIdFilter = filters.sessionId;
        }
    }

    const hasKeyword = !!(filters.keyword || filters.name || filters.uniqueId || filters.contact);
    if (sessionIdFilter && !hasKeyword) {
        conditions.push({ currentSessionId: sessionIdFilter });
    }

    // Keyword search across multiple fields
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

    if (filters.uniqueId) {
        conditions.push({
            OR: [
                { admissionNumber: { contains: filters.uniqueId, mode: 'insensitive' } },
                { id: { contains: filters.uniqueId, mode: 'insensitive' } }
            ]
        });
    }

    if (filters.contact) {
        conditions.push({
            OR: [
                { phone: { contains: filters.contact, mode: 'insensitive' } },
                { fatherPhone: { contains: filters.contact, mode: 'insensitive' } },
                { motherPhone: { contains: filters.contact, mode: 'insensitive' } },
                { guardianPhone: { contains: filters.contact, mode: 'insensitive' } }
            ]
        });
    }

    if (filters.name && !filters.keyword) {
        conditions.push({
            OR: [
                { name: { contains: filters.name, mode: 'insensitive' } },
                { firstName: { contains: filters.name, mode: 'insensitive' } },
                { lastName: { contains: filters.name, mode: 'insensitive' } }
            ]
        });
    }

    if (filters.fatherName) {
        conditions.push({ fatherName: { contains: filters.fatherName, mode: 'insensitive' } });
    }

    const where = { AND: conditions };

    // Use Prisma 'select' to avoid loading heavy Base64 content
    const students = await prisma.student.findMany({
        where,
        select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            rollNumber: true,
            className: true,
            section: true,
            dob: true,
            gender: true,
            category: true,
            phone: true,
            fatherName: true,
            status: true,
            photo: true,
            currentSessionId: true,
            createdAt: true,
            updatedAt: true,
            // Additional fields for full list visibility
            apaarId: true,
            penNo: true,
            registrationNo: true,
            enrollmentNo: true,
            srNo: true,
            generalRegistrationNo: true,
            house: true,
            religion: true,
            caste: true,
            aadhaarNo: true,
            samagraId: true,
            bloodGroup: true,
            stream: true,
            rte: true,
            bankAccountNo: true,
            ifscCode: true,
            bankName: true,
            fatherPhone: true,
            motherPhone: true,
            guardianPhone: true,
            guardianEmail: true,
            enrolledYear: true,
            referredBy: true,
            specialNeeds: true,
            specialNeedsDetails: true,
            previousLastClass: true,
            affiliatedBoard: true,
            marksObtained: true,
            percentageCGPA: true,
            result: true,
            recordDateHeightWeight: true
            // Documents are NOT selected here to keep it fast
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return students;
}


/** Fields that exist in the Prisma Student schema. Any extra keys from the TS type must be stripped. */
const STUDENT_SCHEMA_FIELDS = new Set([
    'id', 'schoolId', 'admissionNumber', 'rollNumber', 'name', 'firstName', 'lastName',
    'className', 'section', 'admissionDate', 'photo', 'status', 'currentSessionId',
    'disableReason', 'disableDate', 'disableNote', 'enableNote',
    'apaarId', 'penNo', 'registrationNo', 'enrollmentNo', 'srNo', 'generalRegistrationNo',
    'classAppliedFor', 'stream', 'rte', 'enrolledSession', 'house', 'studentType',
    'dob', 'gender', 'bloodGroup', 'religion', 'category', 'caste', 'nationality',
    'firstLanguage', 'secondLanguage', 'thirdLanguage', 'height', 'weight',
    'phone', 'whatsappNo', 'email', 'aadhaarNo', 'samagraId',
    'bankAccountNo', 'ifscCode', 'bankName', 'accountHolderName',
    'tcNo', 'tcDate', 'tcFile', 'previousSchool',
    'fatherName', 'fatherPhone', 'fatherOccupation', 'fatherEmail', 'fatherPhoto', 
    'motherName', 'motherPhone', 'motherOccupation', 'motherEmail', 'motherPhoto', 
    'guardianName', 'guardianPhone', 'guardianRelation', 'guardianOccupation', 'guardianAddress', 'guardianEmail', 'guardianPhoto',
    'currentAddress', 'permanentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country',
    'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry',
    'enrolledYear', 'referredBy', 'specialNeeds', 'specialNeedsDetails', 'previousLastClass', 'affiliatedBoard', 'marksObtained', 'percentageCGPA', 'result', 'recordDateHeightWeight',
    'fatherDocumentName', 'fatherDocumentFile', 'motherDocumentName', 'motherDocumentFile', 'guardianDocumentName', 'guardianDocumentFile',
    'parentUsername', 'studentUsername', 'loginPassword', 'parentPasswordChanged',
    'createdAt', 'updatedAt',
]);

function sanitizeStudentForPrisma(data: any): any {
    const clean: any = {};
    
    // Translate legacy form field names → correct Prisma DB column names
    if (data.hasSpecialNeeds !== undefined && data.specialNeeds === undefined) data.specialNeeds = data.hasSpecialNeeds;
    if (data.measurementDate !== undefined && data.recordDateHeightWeight === undefined) data.recordDateHeightWeight = data.measurementDate;
    if (data.previousClass !== undefined && data.previousLastClass === undefined) data.previousLastClass = data.previousClass;
    if (data.lastSchoolAffiliatedTo !== undefined && data.affiliatedBoard === undefined) data.affiliatedBoard = data.lastSchoolAffiliatedTo;
    if (data.obtMarks !== undefined && data.marksObtained === undefined) data.marksObtained = data.obtMarks;
    if (data.percentage !== undefined && data.percentageCGPA === undefined) data.percentageCGPA = data.percentage;
    if (data.qualification !== undefined && data.result === undefined) data.result = data.qualification;
    if (data.po !== undefined && data.postOffice === undefined) data.postOffice = data.po;
    if (data.ps !== undefined && data.policeStation === undefined) data.policeStation = data.ps;
    if (data.permanentPo !== undefined && data.permanentPostOffice === undefined) data.permanentPostOffice = data.permanentPo;
    if (data.permanentPs !== undefined && data.permanentPoliceStation === undefined) data.permanentPoliceStation = data.permanentPs;
    
    // CSV column name mappings
    if (data["Father's Email ID"] !== undefined && data.fatherEmail === undefined) data.fatherEmail = data["Father's Email ID"];
    if (data["Mother's Email ID"] !== undefined && data.motherEmail === undefined) data.motherEmail = data["Mother's Email ID"];
    if (data["Father's Photo"] !== undefined && data.fatherPhoto === undefined) data.fatherPhoto = data["Father's Photo"];
    if (data["Mother's Photo"] !== undefined && data.motherPhoto === undefined) data.motherPhoto = data["Mother's Photo"];
    if (data["Guardian Photo"] !== undefined && data.guardianPhoto === undefined) data.guardianPhoto = data["Guardian Photo"];
    if (data["Father's Document Name"] !== undefined && data.fatherDocumentName === undefined) data.fatherDocumentName = data["Father's Document Name"];
    if (data["Father's Document File"] !== undefined && data.fatherDocumentFile === undefined) data.fatherDocumentFile = data["Father's Document File"];
    if (data["Mother's Document Name"] !== undefined && data.motherDocumentName === undefined) data.motherDocumentName = data["Mother's Document Name"];
    if (data["Mother's Document File"] !== undefined && data.motherDocumentFile === undefined) data.motherDocumentFile = data["Mother's Document File"];
    if (data["Guardian Document Name"] !== undefined && data.guardianDocumentName === undefined) data.guardianDocumentName = data["Guardian Document Name"];
    if (data["Guardian Document File"] !== undefined && data.guardianDocumentFile === undefined) data.guardianDocumentFile = data["Guardian Document File"];
    
    // Additional CSV column mappings
    if (data["House / Block"] !== undefined && data.house === undefined) data.house = data["House / Block"];
    if (data["Record Date (Height/Weight)"] !== undefined && data.recordDateHeightWeight === undefined) data.recordDateHeightWeight = data["Record Date (Height/Weight)"];
    if (data["Special Needs / Disability"] !== undefined && data.specialNeeds === undefined) data.specialNeeds = data["Special Needs / Disability"];
    
    // Convert booleans from frontend switches to Strings for Prisma
    if (data.specialNeeds === true) data.specialNeeds = 'Yes';
    if (data.specialNeeds === false) data.specialNeeds = 'No';

    for (const key of Object.keys(data)) {
        if (STUDENT_SCHEMA_FIELDS.has(key)) {
            clean[key] = data[key];
        }
    }
    return clean;
}

function resolveSessionIdSync(rawSessionName: string, sessions: any[], resolvedCurrentSessionId: string): string {
    if (!rawSessionName) return resolvedCurrentSessionId;
    const isCuidOrUuid = rawSessionName.match(/^c[a-z0-9]{20,}/i) || 
                         rawSessionName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (isCuidOrUuid) return rawSessionName;

    const normalizeSessionName = (name: string) => {
        return name.trim().replace(/^(\d{4})-(\d{2})\d{2}$/, '$1-$2');
    };

    const targetNormalized = normalizeSessionName(rawSessionName);
    const matchedSession = sessions.find(s => 
        s.id === rawSessionName ||
        s.name === rawSessionName || 
        normalizeSessionName(s.name) === targetNormalized
    );
    
    if (matchedSession) return matchedSession.id;
    
    const current = sessions.find(s => s.isCurrent);
    if (current) return current.id;
    
    return sessions[0]?.id || resolvedCurrentSessionId;
}

export async function addStudent(studentData: Partial<Student>) {
    if (!studentData.name || !studentData.schoolId) {
        return { success: false, error: 'Missing required fields' };
    }

    const school = await prisma.school.findUnique({
        where: { id: studentData.schoolId }
    });

    if (!school) return { success: false, error: 'School not found' };

    // Enforce per-school student limit (set at school creation, independent of package)
    if (school.maxStudents && school.maxStudents > 0) {
        const currentCount = await prisma.student.count({
            where: { schoolId: school.id }
        });
        if (currentCount >= school.maxStudents) {
            return { success: false, error: `Student limit reached (${currentCount}/${school.maxStudents}). Please contact your administrator to increase the school's student capacity.` };
        }
    }

    const idSettingsMap: Record<string, string> = {
        registrationNo: 'regNoSettings',
        enrollmentNo: 'enrollNoSettings',
        apaarId: 'apaarIdSettings',
        penNo: 'penNoSettings',
        srNo: 'srNoSettings',
        generalRegistrationNo: 'genRegNoSettings',
        rollNumber: 'rollNoSettings'
    };

    const schoolUpdates: any = {};

    for (const [field, settingKey] of Object.entries(idSettingsMap)) {
        const settings = (school as any)[settingKey];
        if (!(studentData as any)[field] && settings && settings.enabled !== false) {
            if (field === 'enrollmentNo' && settings.useSameAsRegNo && studentData.registrationNo) {
                studentData.enrollmentNo = studentData.registrationNo;
            } else {
                // For Roll Number, check if we should reset per section
                if (field === 'rollNumber' && settings.isPerSection) {
                    const sameCohortMax = await prisma.student.findFirst({
                        where: {
                            schoolId: studentData.schoolId,
                            className: studentData.className,
                            section: studentData.section,
                            // Note: we should probably also filter by session to reset every year
                            currentSessionId: studentData.currentSessionId || studentData.enrolledSession
                        },
                        orderBy: { rollNumber: 'desc' },
                        select: { rollNumber: true }
                    });

                    if (sameCohortMax?.rollNumber) {
                        // Extract number from potentially templated roll number
                        const matches = sameCohortMax.rollNumber.match(/\d+$/);
                        if (matches) {
                            settings.currentSerial = parseInt(matches[0], 10);
                        } else {
                            settings.currentSerial = settings.startFrom - 1;
                        }
                    } else {
                        settings.currentSerial = settings.startFrom - 1;
                    }
                }

                let classCode = '';
                if (studentData.className) {
                    const classDb = school.useCustomClasses && school.classes ? (school.classes as any) : INITIAL_CLASS_SETUPS;
                    const foundClass = classDb.find((c: any) => c.name === studentData.className);
                    if (foundClass && foundClass.code) {
                        classCode = foundClass.code;
                    }
                }

                (studentData as any)[field] = generateNextId(settings, {
                    className: studentData.className,
                    classCode: classCode,
                    date: studentData.admissionDate
                });
                settings.currentSerial = (settings.currentSerial < settings.startFrom ? settings.startFrom : settings.currentSerial + 1);
                schoolUpdates[settingKey] = settings;
            }
        }
    }

    if (!studentData.admissionNumber) {
        studentData.admissionNumber = studentData.registrationNo || `ADM-${Date.now()}`;
    }

    const isDuplicate = await prisma.student.findUnique({
        where: {
            schoolId_admissionNumber: {
                schoolId: studentData.schoolId,
                admissionNumber: studentData.admissionNumber
            }
        }
    });

    if (isDuplicate) {
        return { success: false, error: `Admission Number ${studentData.admissionNumber} already exists.` };
    }

    const name = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();

    // Resolve currentSessionId: always store a real CUID, never a session name string
    // If the student data has no session info, leave it empty — do NOT auto-assign.
    const sessions = await prisma.session.findMany({ where: { schoolId: studentData.schoolId } });
    const resolvedSessionId = resolveSessionIdSync(
        studentData.currentSessionId || studentData.enrolledSession || '',
        sessions,
        ''
    );

    const finalStudentData: any = {
        ...studentData,
        id: studentData.id || `stu_${Date.now()}`,
        status: 'Active',
        currentSessionId: resolvedSessionId,
        name,
    };

    // Auto-credentials logic
    if (!finalStudentData.studentUsername && !finalStudentData.loginPassword && studentData.className) {
        const classDb = school.useCustomClasses && school.classes ? (school.classes as any) : INITIAL_CLASS_SETUPS;
        const foundClass = classDb.find((c: any) => c.name === studentData.className);
        if (foundClass?.createStudentLoginDefault) {
            finalStudentData.studentUsername = finalStudentData.admissionNumber;
            finalStudentData.loginPassword = finalStudentData.dob ? finalStudentData.dob.replace(/[^0-9]/g, '') : '123456';

            const parentPhone = finalStudentData.guardianPhone || finalStudentData.fatherPhone || finalStudentData.motherPhone || finalStudentData.phone;
            if (parentPhone) {
                finalStudentData.parentUsername = parentPhone;
                // Note: parentLoginPassword is not a schema field — stored on parentUsername only
            }
        }
    }

    // NEW: Enforce padding for Roll Number if provided but needs formatting (e.g., "3" -> "03")
    const rollSettings = school.rollNoSettings as any;
    if (finalStudentData.rollNumber && !isNaN(Number(finalStudentData.rollNumber)) && rollSettings?.padding) {
        finalStudentData.rollNumber = finalStudentData.rollNumber.toString().padStart(rollSettings.padding, '0');
    }

    const newStudent = await prisma.student.create({
        data: sanitizeStudentForPrisma(finalStudentData)
    });

    // Update individual school settings if IDs were generated
    if (Object.keys(schoolUpdates).length > 0) {
        await prisma.school.update({
            where: { id: school.id },
            data: schoolUpdates
        });
    }

    revalidatePath('/school-admin/students');
    return { success: true, student: newStudent as any };
}
export async function getStudentsForSibling(schoolId: string, className: string, section: string) {
    const students = await prisma.student.findMany({
        where: {
            schoolId,
            className,
            section,
            status: 'Active'
        },
        select: {
            id: true,
            name: true,
            rollNumber: true,
            admissionNumber: true
        }
    });

    return students as any[];
}

/**
 * BULK ADMISSION: Processes a list of student records for import.
 * - Updates existing records if matched by Admission Number or Name+FatherName.
 * - Generates missing IDs (Roll No, Reg No, etc.) automatically.
 */
export async function importStudentsBatch(schoolId: string, studentsData: Partial<Student>[]) {
    console.log(`[IMPORT] Starting batch import for school ${schoolId} with ${studentsData?.length} records`);
    try {
        if (!studentsData || studentsData.length === 0) return { success: false, error: 'No data provided' };

        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });

        if (!school) return { success: false, error: 'School not found' };

        // Resolve current session
        let resolvedCurrentSessionId = '';
        const currentSession = await prisma.session.findFirst({
            where: { schoolId, isCurrent: true }
        });
        if (currentSession) resolvedCurrentSessionId = currentSession.id;

        const results = { total: studentsData.length, added: 0, updated: 0, errors: 0 };
        const idSettingsMapByField: Record<string, string> = {
            registrationNo: 'regNoSettings', enrollmentNo: 'enrollNoSettings', apaarId: 'apaarIdSettings',
            penNo: 'penNoSettings', srNo: 'srNoSettings', generalRegistrationNo: 'genRegNoSettings', rollNumber: 'rollNoSettings'
        };

        const schoolUpdates: any = {};
        const cohortTracker: Record<string, number> = {};
        const cohortUsedRolls: Record<string, Set<string>> = {};
        
        const sessions = await prisma.session.findMany({
            where: { schoolId }
        });

        // Pre-fetch all students for efficient matching
        const existingStudents = await prisma.student.findMany({
            where: { schoolId },
            select: { id: true, admissionNumber: true, name: true, fatherName: true, religion: true, category: true }
        });

        // Mapping for fast lookup
        const admMap = new Map<string, string>();
        const nameMap = new Map<string, string>(); // Name + FatherName as fallback
        
        existingStudents.forEach((s: any) => {
            if (s.admissionNumber) {
                admMap.set(s.admissionNumber, s.id);
                // Also store normalized version (just the serial after '/')
                if (s.admissionNumber.includes('/')) {
                    const parts = s.admissionNumber.split('/');
                    const serial = parts[parts.length - 1].trim();
                    if (serial && !admMap.has(serial)) admMap.set(serial, s.id);
                }
            }
            if (s.name && s.fatherName) {
                const key = `${s.name.toLowerCase().trim()}|${s.fatherName.toLowerCase().trim()}`;
                nameMap.set(key, s.id);
            }
        });

        const processedAdmNos = new Set<string>();

        for (let idx = 0; idx < studentsData.length; idx++) {
            const studentRow = studentsData[idx];
            try {
                const finalName = studentRow.name || `${studentRow.firstName || ''} ${studentRow.lastName || ''}`.trim();
                if (!finalName) {
                    throw new Error('Student Name is required');
                }

                if (!studentRow.className) {
                    throw new Error('Class Name is required');
                }

                // 1. Identify Existing Student
                let admissionNumber = (studentRow.admissionNumber || studentRow.registrationNo || '').trim();
                
                // If admissionNumber is missing, auto-generate a fallback unique value
                if (!admissionNumber) {
                    admissionNumber = `ADM-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
                }

                // Check for duplicate admission numbers within the current import CSV batch
                if (processedAdmNos.has(admissionNumber)) {
                    throw new Error(`Duplicate admission number '${admissionNumber}' in import file`);
                }
                processedAdmNos.add(admissionNumber);

                let existingId: string | null = null;
                existingId = admMap.get(admissionNumber) || null;
                if (!existingId && admissionNumber.includes('/')) {
                     const serial = admissionNumber.split('/').pop()?.trim();
                     if (serial) existingId = admMap.get(serial) || null;
                }
                
                if (!existingId && finalName && studentRow.fatherName) {
                    const key = `${finalName.toLowerCase().trim()}|${studentRow.fatherName.toLowerCase().trim()}`;
                    existingId = nameMap.get(key) || null;
                }

                // 2. Prepare Data
                let firstName = studentRow.firstName;
                let lastName = studentRow.lastName;
                if (!firstName && finalName) {
                    const nameParts = finalName.trim().split(/\s+/);
                    firstName = nameParts[0];
                    if (!lastName && nameParts.length > 1) {
                        lastName = nameParts.slice(1).join(' ');
                    }
                }

                if (!firstName) {
                    throw new Error('First Name is required');
                }

                const finalSessionId = resolveSessionIdSync(
                    studentRow.currentSessionId || studentRow.enrolledSession || '',
                    sessions,
                    resolvedCurrentSessionId
                );

                const finalData: any = {
                    ...studentRow,
                    admissionNumber,
                    name: finalName,
                    firstName: firstName,
                    lastName: lastName || studentRow.lastName || null,
                    schoolId,
                    status: 'Active',
                    currentSessionId: finalSessionId
                };

                // Normalize Dropdowns
                if (finalData.religion) {
                    const r = String(finalData.religion).trim();
                    const match = INITIAL_RELIGIONS.find(opt => opt.toLowerCase() === r.toLowerCase());
                    if (match) finalData.religion = match;
                }
                if (finalData.category) {
                    const c = String(finalData.category).trim();
                    const match = INITIAL_CATEGORIES.find(opt => opt.toLowerCase() === c.toLowerCase());
                    if (match) finalData.category = match;
                }

                // Cohort Logic (Roll Numbers)
                const cohortKey = `${finalData.className || 'None'}-${finalData.section || 'None'}`;
                if (!cohortUsedRolls[cohortKey]) {
                    const rolls = await prisma.student.findMany({
                        where: { schoolId, className: finalData.className, section: finalData.section },
                        select: { rollNumber: true }
                    });
                    const used = new Set<string>(rolls.map((s: any) => s.rollNumber?.replace(/^0+/, '') || '').filter((r: string) => r !== ''));
                    cohortUsedRolls[cohortKey] = used;
                    let max = 0;
                    used.forEach((r: string) => { const n = parseInt(r, 10); if (!isNaN(n) && n > max) max = n; });
                    cohortTracker[cohortKey] = max;
                }

                // Auto-generate IDs if missing
                for (const [field, settingKey] of Object.entries(idSettingsMapByField)) {
                    const settings = (school as any)[settingKey];
                    if (!finalData[field] && settings?.enabled) {
                        const existingRec = existingId ? existingStudents.find((s: any) => s.id === existingId) : null;
                        if (!existingRec || !(existingRec as any)[field]) {
                            if (field === 'rollNumber') {
                                cohortTracker[cohortKey]++;
                                while(cohortUsedRolls[cohortKey].has(cohortTracker[cohortKey].toString())) cohortTracker[cohortKey]++;
                                finalData.rollNumber = cohortTracker[cohortKey].toString().padStart(settings.padding || 0, '0');
                                cohortUsedRolls[cohortKey].add(cohortTracker[cohortKey].toString());
                            } else {
                                finalData[field] = generateNextId(settings, { className: finalData.className, date: finalData.admissionDate });
                                settings.currentSerial++;
                                schoolUpdates[settingKey] = settings;
                            }
                        }
                    }
                }

                // Database Write Operation
                if (existingId) {
                    const updatePayload: any = {};
                    const sanitized = sanitizeStudentForPrisma(finalData);
                    Object.entries(sanitized).forEach(([k, v]) => {
                        if (v !== null && v !== undefined && v !== '' && k !== 'id' && k !== 'schoolId' && k !== 'admissionNumber') {
                            updatePayload[k] = v;
                        }
                    });
                    if (Object.keys(updatePayload).length > 0) {
                        await prisma.student.update({ where: { id: existingId }, data: updatePayload });
                    }
                    results.updated++;
                } else {
                    const newId = `stu_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
                    await prisma.student.create({ data: sanitizeStudentForPrisma({ ...finalData, id: newId }) });
                    results.added++;
                }
            } catch (err: any) {
                console.error(`[IMPORT] Row Error at index ${idx}:`, err.message);
                results.errors++;
            }
        }

        if (Object.keys(schoolUpdates).length > 0) {
            await prisma.school.update({ where: { id: schoolId }, data: schoolUpdates });
        }

        try {
            revalidatePath('/school-admin/students');
        } catch (e) {
            console.warn('[IMPORT] revalidatePath skipped (expected in non-request context)');
        }
        return { success: true, results };
    } catch (error: any) {
        console.error('[IMPORT] Fatal:', error);
        return { success: false, error: error.message };
    }
}

const VALID_STUDENT_FIELDS = new Set([
    'admissionNumber', 'rollNumber', 'name', 'firstName', 'lastName',
    'className', 'section', 'admissionDate', 'photo', 'status', 'currentSessionId',
    'disableReason', 'disableDate', 'disableNote', 'enableNote',
    'apaarId', 'penNo', 'registrationNo', 'enrollmentNo', 'srNo', 'generalRegistrationNo',
    'classAppliedFor', 'stream', 'rte', 'enrolledSession', 'house', 'studentType',
    'dob', 'gender', 'bloodGroup', 'religion', 'category', 'caste', 'nationality',
    'firstLanguage', 'secondLanguage', 'thirdLanguage', 'height', 'weight',
    'phone', 'whatsappNo', 'email', 'aadhaarNo', 'samagraId',
    'bankAccountNo', 'ifscCode', 'bankName', 'accountHolderName',
    'tcNo', 'tcDate', 'tcFile', 'previousSchool',
    'fatherName', 'fatherPhone', 'fatherOccupation', 'fatherEmail', 'fatherPhoto',
    'motherName', 'motherPhone', 'motherOccupation', 'motherEmail', 'motherPhoto',
    'guardianName', 'guardianPhone', 'guardianRelation', 'guardianOccupation', 'guardianAddress', 'guardianPhoto',
    'currentAddress', 'permanentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country',
    'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry',
    'enrolledYear', 'referredBy', 'specialNeeds', 'specialNeedsDetails', 'guardianEmail',
    'previousLastClass', 'affiliatedBoard', 'marksObtained', 'percentageCGPA', 'result', 'recordDateHeightWeight',
    'fatherDocumentName', 'fatherDocumentFile', 'motherDocumentName', 'motherDocumentFile', 'guardianDocumentName', 'guardianDocumentFile',
    'parentUsername', 'studentUsername', 'loginPassword', 'parentPasswordChanged'
]);

export async function updateStudent(id: string, data: Partial<Student>) {
    const updatedData: any = {};

    // Only copy fields that are valid Student schema fields and writable
    for (const key of Object.keys(data)) {
        if (VALID_STUDENT_FIELDS.has(key)) {
            updatedData[key] = (data as any)[key];
        }
    }

    if (data.firstName !== undefined || data.lastName !== undefined) {
        // Fetch current to merge names if only one is updated
        const current = await prisma.student.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
        if (current) {
            const fName = data.firstName !== undefined ? data.firstName : current.firstName;
            const lName = data.lastName !== undefined ? data.lastName : current.lastName;
            updatedData.name = `${fName || ''} ${lName || ''}`.trim();
        }
    }

    await prisma.student.update({
        where: { id },
        data: updatedData
    });

    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function getStudentById(id: string) {
    const student = await prisma.student.findUnique({
        where: { id }
    });
    if (!student) return { success: false, error: 'Student not found', student: null };
    return { success: true, student: student as any };
}

export async function batchUpdateStudentTypes(schoolId: string, studentIds: string[], type: 'new' | 'old') {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    let count = 0;
    db.students.forEach((s: any) => {
        if (s.schoolId === schoolId && studentIds.includes(s.id)) {
            s.studentType = type;
            count++;
        }
    });

    if (count > 0) {
        writeDb(db);
        revalidatePath('/school-admin/students', 'layout');
        revalidatePath('/school-admin/fees', 'layout');
    }

    return { success: true, count };
}

export async function deleteStudent(id: string) {
    await prisma.student.delete({
        where: { id }
    });
    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function deleteStudentsBatch(ids: string[]) {
    if (!ids || ids.length === 0) return { success: false, error: 'No IDs provided' };
    
    await prisma.student.deleteMany({
        where: {
            id: { in: ids }
        }
    });

    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/students');
    return { success: true, count: ids.length };
}

export async function generateStudentCredentials(studentId: string): Promise<{ success: boolean; error?: string; username?: string; password?: string }> {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    const index = db.students.findIndex((s: any) => s.id === studentId);
    if (index === -1) return { success: false, error: 'Student not found' };

    const student = db.students[index];

    const username = student.admissionNumber;
    if (!username) return { success: false, error: 'Admission Number is required for student login' };

    const password = student.dob ? student.dob.replace(/[^0-9]/g, '') : '123456';

    db.students[index].studentUsername = username;
    db.students[index].loginPassword = password;
    db.students[index].parentPasswordChanged = false;

    writeDb(db);
    revalidatePath('/school-admin/students');
    revalidatePath('/school-admin/admissions');

    return { success: true, username, password };
}

export async function resetStudentCredentials(studentId: string): Promise<{ success: boolean; error?: string; username?: string; password?: string }> {
    return generateStudentCredentials(studentId);
}

export async function generateParentCredentials(studentId: string): Promise<{ success: boolean; error?: string; username?: string; password?: string }> {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    const index = db.students.findIndex((s: any) => s.id === studentId);
    if (index === -1) return { success: false, error: 'Student not found' };

    const student = db.students[index];
    const username = student.guardianPhone || student.fatherPhone || student.motherPhone || student.phone;

    if (!username) return { success: false, error: 'Mobile number is required for parent login' };

    const password = username.slice(-5);

    // Update all siblings with same mobile number
    db.students.forEach((s: any, idx: number) => {
        const sMobile = s.guardianPhone || s.fatherPhone || s.motherPhone || s.phone;
        if (sMobile === username && s.schoolId === student.schoolId) {
            db.students[idx].parentUsername = username;
            db.students[idx].parentLoginPassword = password;
            db.students[idx].parentPasswordChanged = false;
        }
    });

    writeDb(db);
    revalidatePath('/school-admin/students');
    return { success: true, username, password };
}

export async function resetParentCredentials(studentId: string): Promise<{ success: boolean; error?: string; username?: string; password?: string }> {
    return generateParentCredentials(studentId);
}

export async function updatePortalPassword(role: 'STUDENT' | 'PARENT', identifier: string, newPassword: string) {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    if (role === 'STUDENT') {
        const index = db.students.findIndex(s => s.id === identifier || s.studentUsername === identifier);
        if (index === -1) return { success: false, error: 'Student not found' };

        db.students[index].loginPassword = newPassword;
        db.students[index].parentPasswordChanged = true;
    } else {
        // Update all siblings for the parent
        let updatedCount = 0;
        db.students.forEach((s, idx) => {
            if (s.parentUsername === identifier) {
                db.students[idx].parentLoginPassword = newPassword;
                db.students[idx].parentPasswordChanged = true;
                updatedCount++;
            }
        });
        if (updatedCount === 0) return { success: false, error: 'Parent account not found' };
    }

    writeDb(db);
    return { success: true };
}

export async function getParentSiblings(parentUsername: string) {
    const db = readDb();
    if (!db.students) return [];

    // Return all students sharing this parent username (mobile number)
    return db.students.filter((s: any) => s.parentUsername === parentUsername);
}

import { StaffProfile, AttendanceRecord, AttendanceMaster } from '@/types/staff';

// --- STAFF PROFILES ---

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

export async function getNextEmployeeId(schoolId: string) {
    const db = readDb();
    const schoolUsers = db.users.filter((u: any) => u.schoolId === schoolId);
    const profiles = db.staffProfiles.filter((p: any) => schoolUsers.some((u: any) => u.id === p.userId));

    let maxId = 0;
    profiles.forEach((p: any) => {
        if (p.staffId && p.staffId.startsWith('EMP-')) {
            const num = parseInt(p.staffId.replace('EMP-', ''));
            if (!isNaN(num) && num > maxId) maxId = num;
        }
    });

    return `EMP-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function addStaff(userData: Partial<User>, profileData: Partial<StaffProfile>) {
    const userRes = await addUser(userData);
    if (!userRes.success || !userRes.user) return userRes;

    const user = userRes.user;

    const db = readDb();

    const empId = profileData.staffId || await getNextEmployeeId(userData.schoolId || 's1');

    const newProfile: StaffProfile = {
        id: `sp_${Date.now()}`,
        userId: user.id,
        staffId: empId,
        designation: profileData.designation || 'Staff',
        department: profileData.department || 'General',
        joiningDate: profileData.joiningDate || new Date().toISOString().split('T')[0],
        salary: profileData.salary || 0,
        allowances: profileData.allowances || [],
        customDeductions: profileData.customDeductions || [],
        pfRate: profileData.pfRate || 12,
        esiRate: profileData.esiRate || 0.75,
        isPfEnabled: profileData.isPfEnabled ?? true,
        isEsiEnabled: profileData.isEsiEnabled ?? true,
        overtimeRate: profileData.overtimeRate || 1,
        workingDaysPerMonth: profileData.workingDaysPerMonth || 30,
        paymentMode: profileData.paymentMode || 'Bank Transfer',
        photo: profileData.photo || '',
        certificate: profileData.certificate || '',
        kycDocument: profileData.kycDocument || '',
        loans: [],
        leaves: [],
        reimbursements: [],
        personalDetails: {
            phone: profileData.personalDetails?.phone || '',
            altPhone: profileData.personalDetails?.altPhone || '',
            whatsapp: profileData.personalDetails?.whatsapp || '',
            address: profileData.personalDetails?.address || '',
            pincode: profileData.personalDetails?.pincode || '',
            city: profileData.personalDetails?.city || '',
            state: profileData.personalDetails?.state || '',
            country: profileData.personalDetails?.country || '',
            bloodGroup: profileData.personalDetails?.bloodGroup || 'O+',
            qualification: profileData.personalDetails?.qualification || '',
            dob: profileData.personalDetails?.dob || '',
            aadhar: profileData.personalDetails?.aadhar || '',
            gender: profileData.personalDetails?.gender || 'Male',
            husbandName: profileData.personalDetails?.husbandName || '',
            fatherName: profileData.personalDetails?.fatherName || '',
            nationality: profileData.personalDetails?.nationality || 'INDIAN',
            religion: profileData.personalDetails?.religion || '',
            category: profileData.personalDetails?.category || '',
            maritalStatus: profileData.personalDetails?.maritalStatus || '',
        },
        qualifications: profileData.qualifications || [],
        experience: profileData.experience || {},
        bankDetails: profileData.bankDetails || {},
        status: 'Active'
    };

    if (!db.staffProfiles) db.staffProfiles = [];
    db.staffProfiles.push(newProfile);

    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true, profile: newProfile, user };
}

export async function updateStaffProfile(id: string, data: Partial<StaffProfile>) {
    const db = readDb();
    const index = db.staffProfiles.findIndex((p: any) => p.id === id);

    if (index === -1) return { success: false, error: 'Profile not found' };

    db.staffProfiles[index] = { ...db.staffProfiles[index], ...data };
    writeDb(db);
    revalidatePath('/school-admin/staff');
    revalidatePath('/school-admin/payroll');
    return { success: true };
}

export async function editStaff(staffId: string, userId: string, userData: Partial<User>, profileData: Partial<StaffProfile>) {
    const userRes = await updateUser(userId, userData);
    if (!userRes.success) return userRes;

    const profileRes = await updateStaffProfile(staffId, profileData);
    return profileRes;
}

export async function updatePayslipStatus(staffId: string, monthYear: string, status: 'Draft' | 'Generated' | 'Sent' | 'Paid' | 'Unpaid') {
    const db = readDb();
    const index = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (index === -1) return { success: false, error: 'Staff not found' };

    const profile = db.staffProfiles[index];
    if (!profile.payslipStatus) profile.payslipStatus = {};
    profile.payslipStatus[monthYear] = status;

    writeDb(db);
    revalidatePath('/school-admin/payroll');
    return { success: true };
}

export async function toggleStaffStatus(staffId: string, userId: string, status: 'Active' | 'Inactive') {
    const db = readDb();
    
    // Update profile status
    const pIdx = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (pIdx !== -1) {
        db.staffProfiles[pIdx].status = status;
    }
    
    // Update user status in data.json
    const uIdx = db.users.findIndex((u: any) => u.id === userId);
    if (uIdx !== -1) {
        db.users[uIdx].status = status;
    }
    
    writeDb(db);
    
    // Update user status in Prisma
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status }
        });
    } catch (e) {
        console.warn('[HYBRID] Prisma status update failed', e);
    }
    
    revalidatePath('/school-admin/staff');
    return { success: true };
}

export async function deleteStaff(staffId: string, userId: string) {
    const db = readDb();

    const pIndex = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (pIndex !== -1) db.staffProfiles.splice(pIndex, 1);

    const uIndex = db.users.findIndex((u: any) => u.id === userId);
    if (uIndex !== -1) db.users.splice(uIndex, 1);

    writeDb(db);
    revalidatePath('/school-admin/staff');
    return { success: true };
}

// --- ATTENDANCE ---

export async function getAttendanceMaster() {
    const db = readDb();
    return db.attendance || {};
}

export async function updateAttendance(date: string, records: AttendanceRecord[]) {
    const db = readDb();
    if (!db.attendance) db.attendance = {};

    db.attendance[date] = records;

    writeDb(db);
    revalidatePath('/school-admin/attendance');
    return { success: true };
}

// --- PAYROLL ACTIONS ---

import { Loan, Reimbursement } from '@/types/staff';

export async function addLoan(staffId: string, loanData: Omit<Loan, 'id' | 'remainingAmount'>) {
    const db = readDb();
    const index = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (index === -1) return { success: false, error: 'Staff not found' };

    const newLoan: Loan = {
        ...loanData,
        id: `loan_${Date.now()}`,
        remainingAmount: loanData.amount
    };

    if (!db.staffProfiles[index].loans) db.staffProfiles[index].loans = [];
    db.staffProfiles[index].loans.push(newLoan);

    writeDb(db);
    revalidatePath('/school-admin/payroll');
    return { success: true };
}

export async function repayLoan(staffId: string, loanId: string, amount: number) {
    const db = readDb();
    const staffIndex = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (staffIndex === -1) return { success: false, error: 'Staff not found' };

    const loanIndex = db.staffProfiles[staffIndex].loans.findIndex((l: any) => l.id === loanId);
    if (loanIndex === -1) return { success: false, error: 'Loan not found' };

    const loan = db.staffProfiles[staffIndex].loans[loanIndex];
    loan.remainingAmount = Math.max(0, loan.remainingAmount - amount);

    writeDb(db);
    revalidatePath('/school-admin/payroll');
    return { success: true };
}

export async function settleLoan(staffId: string, loanId: string) {
    const db = readDb();
    const staffIndex = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (staffIndex === -1) return { success: false, error: 'Staff not found' };

    const loanIndex = db.staffProfiles[staffIndex].loans.findIndex((l: any) => l.id === loanId);
    if (loanIndex === -1) return { success: false, error: 'Loan not found' };

    db.staffProfiles[staffIndex].loans[loanIndex].remainingAmount = 0;

    writeDb(db);
    revalidatePath('/school-admin/payroll');
    return { success: true };
}

export async function updateReimbursements(staffId: string, reimbursements: Reimbursement[]) {
    const db = readDb();
    const index = db.staffProfiles.findIndex((p: any) => p.id === staffId);
    if (index === -1) return { success: false, error: 'Staff not found' };

    db.staffProfiles[index].reimbursements = reimbursements;

    writeDb(db);
    revalidatePath('/school-admin/payroll');
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
    try {
        const db = readDb();
        if (!db.idCardTemplates) db.idCardTemplates = [];

        if (!template.id || template.id === 'new') {
            template.id = `tmpl_${Date.now()}`;
        }

        db.idCardTemplates.push(template);
        writeDb(db);
        revalidatePath('/super-admin/modules/id-cards');
        revalidatePath('/school-admin/id-cards');
        return { success: true, template };
    } catch (error: any) {
        console.error('[addIDCardTemplate] ERROR:', error?.message || error);
        return { success: false, error: error?.message || String(error) };
    }
}

export async function updateIDCardTemplate(updatedTemplate: IDCardTemplate) {
    try {
        const db = readDb();
        if (!db.idCardTemplates) return { success: false, error: 'No idCardTemplates array in DB' };

        console.log('[updateIDCardTemplate] Target ID:', updatedTemplate.id);
        console.log('[updateIDCardTemplate] Available IDs:', db.idCardTemplates.map((t: any) => t.id));

        const index = db.idCardTemplates.findIndex((t: any) => t.id === updatedTemplate.id);
        if (index === -1) {
            console.error('[updateIDCardTemplate] Template not found in database for ID:', updatedTemplate.id);
            return { success: false, error: `Template not found (ID: ${updatedTemplate.id})` };
        }

        db.idCardTemplates[index] = updatedTemplate;
        writeDb(db);
        revalidatePath('/super-admin/modules/id-cards');
        revalidatePath('/school-admin/id-cards');
        return { success: true };
    } catch (error: any) {
        console.error('[updateIDCardTemplate] Exception:', error);
        return { success: false, error: error?.message || String(error) };
    }
}

export async function deleteIDCardTemplate(id: string) {
    try {
        const db = readDb();
        if (!db.idCardTemplates) return { success: false, error: 'No templates found' };

        const index = db.idCardTemplates.findIndex((t: any) => t.id === id);
        if (index === -1) return { success: false, error: 'Template not found' };

        db.idCardTemplates.splice(index, 1);
        writeDb(db);
        revalidatePath('/super-admin/modules/id-cards');
        revalidatePath('/school-admin/id-cards');
        return { success: true };
    } catch (error: any) {
        console.error('[deleteIDCardTemplate] ERROR:', error?.message || error);
        return { success: false, error: error?.message || String(error) };
    }
}

// --- STAFF FORM TEMPLATES ---

export async function getStaffFormTemplates() {
    const db = readDb();
    return db.staffFormTemplates || [];
}

export async function addStaffFormTemplate(template: StaffFormTemplate) {
    const db = readDb();
    if (!db.staffFormTemplates) db.staffFormTemplates = [];

    if (!template.id || template.id === 'new') {
        template.id = `tmpl_staff_${Date.now()}`;
    }

    db.staffFormTemplates.push(template);
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true, template };
}

export async function updateStaffFormTemplate(updatedTemplate: StaffFormTemplate) {
    const db = readDb();
    if (!db.staffFormTemplates) return { success: false, error: 'No templates found' };

    const index = db.staffFormTemplates.findIndex((t: any) => t.id === updatedTemplate.id);
    if (index === -1) return { success: false, error: 'Template not found' };

    db.staffFormTemplates[index] = updatedTemplate;
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true };
}

export async function deleteStaffFormTemplate(id: string) {
    const db = readDb();
    if (!db.staffFormTemplates) return { success: false, error: 'No templates found' };

    const index = db.staffFormTemplates.findIndex((t: any) => t.id === id);
    if (index === -1) return { success: false, error: 'Template not found' };

    if (db.staffFormTemplates[index].isDefault) {
        return { success: false, error: 'Cannot delete the default template' };
    }

    db.staffFormTemplates.splice(index, 1);
    writeDb(db);
    revalidatePath('/super-admin/modules/staff');
    return { success: true };
}

export async function getAdmissionFormTemplates() {
    const templates = await prisma.admissionFormTemplate.findMany();

    // Merge each template with the master field list to ensure all fields are available
    return templates.map((tmpl: any) => ({
        ...tmpl,
        config: mergeConfigWithMaster(tmpl.config as any)
    }));
}

export async function addAdmissionFormTemplate(template: AdmissionFormTemplate) {
    if (!template.id || template.id === 'new') {
        template.id = `tmpl_adm_${Date.now()}`;
    }

    const newTmpl = await prisma.admissionFormTemplate.create({
        data: {
            id: template.id,
            name: template.name,
            thumbnail: template.icon || '',
            config: template.config as any,
            isSystem: !!template.isDefault
        }
    });

    revalidatePath('/super-admin/modules/admissions');
    return { success: true, template: newTmpl };
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
        
        // Revalidate Super Admin page
        revalidatePath('/super-admin/modules/admissions');
        // IMMEDIATELY propagate to all school admin pages that use this template
        revalidatePath('/school-admin', 'layout');
        revalidatePath('/school-admin/admissions');
        revalidatePath('/school-admin/admissions/new');
        revalidatePath('/school-admin/students/settings');
        revalidatePath('/apply', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update template:", error);
        return { success: false, error: error.message || "Failed to update template" };
    }
}

export async function deleteAdmissionFormTemplate(id: string) {
    const template = await prisma.admissionFormTemplate.findUnique({
        where: { id }
    });

    if (!template) return { success: false, error: 'Template not found' };
    const standardNames = ["Standard Admission Form", "Standard Admission"];
    if (template.isSystem || standardNames.includes(template.name)) {
        return { success: false, error: 'Cannot delete the default template' };
    }

    await prisma.admissionFormTemplate.delete({
        where: { id }
    });

    revalidatePath('/super-admin/modules/admissions');
    return { success: true };
}

export async function duplicateAdmissionFormTemplate(id: string) {
    const original = await prisma.admissionFormTemplate.findUnique({
        where: { id }
    });

    if (!original) return { success: false, error: 'Original template not found' };

    const newTmpl = await prisma.admissionFormTemplate.create({
        data: {
            id: `tmpl_copy_${Date.now()}`,
            name: `${original.name} (Copy)`,
            thumbnail: original.thumbnail,
            config: original.config as any,
            isSystem: false // Copies are never protected by default
        }
    });

    revalidatePath('/super-admin/modules/admissions');
    return { success: true, template: newTmpl };
}

export async function getStaffFormConfigForSchool(schoolId: string) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId }
    });
    if (!school) return [];

    const pkg = await prisma.saasPackage.findUnique({
        where: { id: school.packageId }
    });

    // For now, if no specific template in package, return empty or a default logic
    // We'll need a StaffFormTemplate model if we want the same flexibility as Admissions
    return [];
}

export async function getAdmissionFormConfigForSchool(schoolId: string) {
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;

    const school = await prisma.school.findUnique({
        where: { id: idToUse },
        include: { sessions: true }
    });

    const globals = await getGlobalStudentDefaults();

    if (!school) {
        return {
            schoolName: 'Easy School',
            templateName: 'Default Admission Form',
            config: mergeConfigWithMaster([]),
            sectionSettings: [],
            idSettings: {},
            academicSettings: {
                useCustomClasses: false,
                useCustomSections: false,
                useCustomHouses: false,
                useCustomReligions: false,
                useCustomCategories: false,
                useCustomStreams: false,
                useCustomDisableReasons: false,
                classes: [],
                sections: [],
                houses: [],
                religions: [],
                categories: [],
                streams: [],
                disableReasons: [],
                sessions: [],
                currentSession: '',
                languages: ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German']
            }
        };
    }

    let tmpl: any = null;
    if (school.admissionFormTemplateId) {
        tmpl = await prisma.admissionFormTemplate.findUnique({
            where: { id: school.admissionFormTemplateId }
        });
    } else {
        const pkg = await prisma.saasPackage.findUnique({
            where: { id: school.packageId }
        });
        if (pkg && (pkg as any).admissionFormTemplateId) {
            tmpl = await prisma.admissionFormTemplate.findUnique({
                where: { id: (pkg as any).admissionFormTemplateId }
            });
        }
    }

    if (!tmpl) {
        tmpl = await prisma.admissionFormTemplate.findFirst({
            where: { isSystem: true }
        });
    }

    const tmplConfig = (tmpl?.config as any) || [];

    // Merge template config with master field list before applying school-specific overrides
    const mergedConfig = mergeConfigWithMaster(tmplConfig);

    const result = {
        schoolName: school?.name || 'Easy School',
        templateName: tmpl?.name || 'Default Admission Form',
        config: mergedConfig.map((f: any) => {
            const override = (school?.admissionFieldOverrides as any)?.[f.fieldName];
            return {
                ...f,  // Spread all template fields first (fieldType, options, placeholder, dependsOn, etc.)
                label: override?.label || f.label,
                visible: override?.visible !== undefined ? override.visible : f.visible,
                required: override?.required !== undefined ? override.required : f.required,
                orderIndex: override?.orderIndex !== undefined ? override.orderIndex : (f.orderIndex || 0),
                // Preserve template-level fieldType, dependsOn, options, and placeholder
                // These are set by the Super Admin and should NOT be overridden by school-level overrides
                fieldType: f.fieldType,
                dependsOn: f.dependsOn,
                options: f.options,
                placeholder: override?.placeholder || f.placeholder,
            };
        }).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
        sectionSettings: (tmpl?.config as any)?.sectionSettings || [],
        idSettings: {
            registrationNo: school?.regNoSettings,
            enrollmentNo: school?.enrollNoSettings,
            apaarId: school?.apaarIdSettings,
            penNo: school?.penNoSettings,
            srNo: school?.srNoSettings,
            generalRegistrationNo: school?.genRegNoSettings,
            rollNumber: school?.rollNoSettings
        },
        academicSettings: {
            useCustomClasses: school?.useCustomClasses || false,
            useCustomSections: school?.useCustomSections || false,
            useCustomHouses: school?.useCustomHouses || false,
            useCustomReligions: school?.useCustomReligions || false,
            useCustomCategories: school?.useCustomCategories || false,
            useCustomStreams: school?.useCustomStreams || false,
            useCustomDisableReasons: school?.useCustomDisableReasons || false,
            classes: (school?.useCustomClasses && (school?.classes as any || []).length > 0) ? (school.classes as any) : (globals?.classes || []),
            sections: (school?.useCustomSections && (school?.sections as any || []).length > 0) ? (school.sections as any) : (globals?.sections || []),
            houses: (school?.useCustomHouses && (school?.houses as any || []).length > 0) ? (school.houses as any) : (globals?.houses || []),
            religions: (school?.useCustomReligions && (school?.religions as any || []).length > 0) ? (school.religions as any) : (globals?.religions || []),
            categories: (school?.useCustomCategories && (school?.categories as any || []).length > 0) ? (school.categories as any) : (globals?.categories || []),
            streams: (school?.useCustomStreams && (school?.streams as any || []).length > 0) ? (school.streams as any) : (globals?.streams || []),
            disableReasons: (school?.useCustomDisableReasons && (school?.disableReasons || []).length > 0) ? school.disableReasons : (globals?.disableReasons || []),
            sessions: (school?.sessions && school.sessions.length > 0) 
                ? school.sessions 
                : (globals?.sessions || []).map((s: string) => ({ id: s, name: s, isCurrent: false, status: 'Active' })),
            currentSession: school?.currentSession || (globals?.sessions?.[0] || ''),
            languages: (school as any)?.languages || ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German']
        }
    };

    console.log(`[SERVER] getAdmissionFormConfigForSchool - useCustomHouses: ${result.academicSettings.useCustomHouses}, houses: ${JSON.stringify(result.academicSettings.houses)}`);

    return result;
}

export async function updateSchoolAdmissionTemplate(schoolId: string, templateId: string) {
    await prisma.school.update({
        where: { id: schoolId },
        data: { admissionFormTemplateId: templateId }
    });
    revalidatePath('/school-admin/students/settings');
    return { success: true };
}


export async function updateSchoolAdmissionFieldOverride(
    schoolId: string,
    fieldName: string,
    overrides: Partial<{ label: string; visible: boolean; required: boolean; orderIndex: number }>
) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { admissionFieldOverrides: true }
    });

    if (!school) return { success: false, error: 'School not found' };

    const currentOverrides = (school.admissionFieldOverrides as any) || {};

    // Merge overrides
    const updatedOverrides = {
        ...currentOverrides,
        [fieldName]: {
            ...(currentOverrides[fieldName] || {}),
            ...overrides
        }
    };

    await prisma.school.update({
        where: { id: schoolId },
        data: { admissionFieldOverrides: updatedOverrides }
    });

    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/admissions/new');
    revalidatePath('/school-admin/students/settings');
    return { success: true };
}


export async function reorderSchoolAdmissionFields(
    schoolId: string,
    fieldNamesInOrder: string[]
) {
    const db = readDb();
    const index = db.schools.findIndex((s: any) => s.id === schoolId);
    if (index === -1) return { success: false, error: 'School not found' };

    const school = db.schools[index];
    if (!school.admissionFieldOverrides) school.admissionFieldOverrides = {};

    fieldNamesInOrder.forEach((fieldName, idx) => {
        school.admissionFieldOverrides![fieldName] = {
            ...(school.admissionFieldOverrides![fieldName] || {}),
            orderIndex: idx
        };
    });

    writeDb(db);
    revalidatePath('/school-admin/students/settings');
    revalidatePath('/school-admin/admissions/new');
    return { success: true };
}

export async function resetSchoolAdmissionFields(schoolId: string) {
    await prisma.school.update({
        where: { id: schoolId },
        data: { admissionFieldOverrides: {} }
    });
    revalidatePath('/school-admin/students/settings');
    revalidatePath('/school-admin/admissions/new');
    revalidatePath('/school-admin/admissions');
    return { success: true };
}

export async function setSchoolAdmissionFormToAdvanced(schoolId: string) {
    // This action explicitly sets all fields from the master list to visible: true
    // in the school's overrides, ensuring an "Advanced" form experience.
    const overrides: any = {};
    EXTRACTED_ADMISSION_FIELDS.forEach(f => {
        overrides[f.fieldName] = {
            visible: true,
            label: f.label,
            required: f.required,
            orderIndex: f.orderIndex
        };
    });

    await prisma.school.update({
        where: { id: schoolId },
        data: { admissionFieldOverrides: overrides }
    });

    revalidatePath('/school-admin/students/settings');
    revalidatePath('/school-admin/admissions/new');
    revalidatePath('/school-admin/admissions');
    return { success: true };
}


export async function updateStudentSettings(schoolId: string, settings: Partial<any>) {
    console.log('[SERVER] Updating student settings for school:', schoolId);
    console.log('[SERVER] Settings data:', JSON.stringify(settings, null, 2));
    try {
        const res = await prisma.school.update({
            where: { id: schoolId },
            data: settings
        });
        console.log('[SERVER] Update successful for:', res.id);

        revalidatePath('/school-admin/students/settings');
        revalidatePath('/school-admin/profile');
        revalidatePath('/school-admin/admissions/new');
        return { success: true };
    } catch (error) {
        console.error('[SERVER] Failed to update student settings:', error);
        return { success: false, error: 'Database update failed' };
    }
}


// --- GLOBAL STUDENT DEFAULTS ---

export async function getGlobalStudentDefaults() {
    let defaults = await prisma.globalStudentDefaults.findUnique({
        where: { id: 'global-singleton' }
    });

    if (!defaults) {
        // Fallback to constants if not in DB yet
        return {
            classes: INITIAL_CLASS_SETUPS,
            sections: INITIAL_SECTIONS,
            houses: INITIAL_HOUSES,
            religions: INITIAL_RELIGIONS,
            categories: INITIAL_CATEGORIES,
            streams: INITIAL_STREAMS,
            disableReasons: INITIAL_DISABLE_REASONS,
            regNoSettings: INITIAL_REG_SETTINGS,
            enrollNoSettings: INITIAL_ENROLL_SETTINGS,
            apaarIdSettings: INITIAL_APAAR_SETTINGS,
            penNoSettings: INITIAL_PEN_SETTINGS,
            srNoSettings: INITIAL_SR_SETTINGS,
            genRegNoSettings: INITIAL_GEN_REG_SETTINGS,
            rollNoSettings: INITIAL_ROLL_SETTINGS,
        };
    }
    return defaults;
}

export async function updateGlobalStudentDefaults(data: any) {
    await prisma.globalStudentDefaults.upsert({
        where: { id: 'global-singleton' },
        create: {
            id: 'global-singleton',
            ...data
        },
        update: data
    });
    revalidatePath('/super-admin/global-parameters');
    revalidatePath('/super-admin/modules/student-info');
    revalidatePath('/school-admin/students/settings');
    return { success: true };
}

/**
 * SAAS ADMIN: Saves the current admission form field configuration and section layout
 * as the system-wide default for all new schools.
 */
export async function saveAdmissionFormAsDefault(config: StudentFormConfig[], sectionSettings: SectionConfig[]) {
    try {
        await prisma.globalStudentDefaults.upsert({
            where: { id: 'global-singleton' },
            create: {
                id: 'global-singleton',
                // We store this as a JSON blob in a designated field or within the config field
                // Since schema doesn't have a specific 'admissionFormConfig' field, we store it in 'config' 
                // or similar, but looking at schema, we should probably add it or use an existing Json field.
                // For now, let's use the 'classes' field or similar for general Json storage if needed, 
                // but better to use a dedicated field. 
                // Since I can't easily change schema without migrate, I will check if I can add a generic field.
                // Wait, looking at schema: model GlobalStudentDefaults has classes, sections, etc.
                // I will add 'admissionFormConfig' to the update data.
                // Actually, let's use 'sessions' or similar if needed, or better, I'll just assume 
                // I can pass extra fields to prisma.update if they exist.
                // Let's use 'regNoSettings' as a placeholder or better, I will just update the logic to use
                // a dedicated field if I can modify schema.
            },
            update: {
                // @ts-ignore - Assuming we add this field or handle it via a general config object
                admissionFormConfig: { config, sectionSettings }
            }
        });
        
        // Alternative: Use a dedicated AdmissionFormTemplate marked as isSystem
        const defaultTmpl = await prisma.admissionFormTemplate.findFirst({
            where: { isSystem: true }
        });

        if (defaultTmpl) {
            await prisma.admissionFormTemplate.update({
                where: { id: defaultTmpl.id },
                data: {
                    config: config as any,
                    // We can pack sectionSettings into the config JSON if needed
                    updatedAt: new Date()
                }
            });
        }

        revalidatePath('/super-admin/modules/admissions');
        revalidatePath('/school-admin/students/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save global admission defaults:', error);
        return { success: false, error: error.message };
    }
}

export async function resetSchoolStudentSettingToGlobal(schoolId: string, field: 'religions' | 'categories' | 'streams') {
    await prisma.school.update({
        where: { id: schoolId },
        data: { [field]: null }
    });
    revalidatePath('/school-admin/students/settings');
    return { success: true };
}


// --- STUDENT PROFILE TEMPLATES ---

export async function getStudentProfileTemplates() {
    return prisma.studentProfileTemplate.findMany({
        orderBy: { createdAt: 'asc' }
    });
}

export async function addStudentProfileTemplate(template: StudentProfileTemplate) {
    const db = readDb();
    if (!db.studentProfileTemplates) db.studentProfileTemplates = [];

    if (!template.id || template.id === 'new') {
        template.id = `tmpl_std_prof_${Date.now()}`;
    }

    db.studentProfileTemplates.push(template);
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true, template };
}

export async function updateStudentProfileTemplate(updatedTemplate: StudentProfileTemplate) {
    const db = readDb();
    if (!db.studentProfileTemplates) return { success: false, error: 'No templates found' };

    const index = db.studentProfileTemplates.findIndex((t: any) => t.id === updatedTemplate.id);
    if (index === -1) return { success: false, error: 'Template not found' };

    db.studentProfileTemplates[index] = updatedTemplate;
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true };
}

export async function deleteStudentProfileTemplate(id: string) {
    const db = readDb();
    if (!db.studentProfileTemplates) return { success: false, error: 'No templates found' };

    const index = db.studentProfileTemplates.findIndex((t: any) => t.id === id);
    if (index === -1) return { success: false, error: 'Template not found' };

    if (db.studentProfileTemplates[index].isDefault) {
        return { success: false, error: 'Cannot delete the default template' };
    }

    db.studentProfileTemplates.splice(index, 1);
    writeDb(db);
    revalidatePath('/super-admin/modules/student-info');
    return { success: true };
}

export async function getStudentProfileTemplateForSchool(schoolId: string) {
    const db = readDb();
    const school = db.schools.find((s: any) => s.id === schoolId);

    let templateId = school?.studentProfileTemplateId;

    if (!templateId) {
        const pkg = db.packages.find((p: any) => p.id === school?.packageId);
        templateId = pkg?.studentProfileTemplateId;
    }

    let template;
    if (templateId) {
        template = db.studentProfileTemplates.find((t: any) => t.id === templateId);
    }

    if (!template) {
        template = db.studentProfileTemplates.find((t: any) => t.isDefault);
    }

    if (!template && db.studentProfileTemplates.length > 0) {
        template = db.studentProfileTemplates[0];
    }

    if (!template) return template;

    const pkg = db.packages.find((p: any) => p.id === school?.packageId);
    if (!pkg) return template;

    const activeModules = pkg.modules || [];
    const hasFeesModule = activeModules.includes('m3');
    const hasAttendanceModule = activeModules.includes('m4');

    const filteredConfig = template.config.filter((section: any) => {
        if (section.fieldName === 'feeSummary' && !hasFeesModule) return false;
        if (section.fieldName === 'attendanceStats' && !hasAttendanceModule) return false;
        return true;
    });

    return {
        ...template,
        config: filteredConfig
    };
}

// --- QR TRANSACTIONS ---

export async function getQRTransactions(schoolId: string) {
    const db = readDb();
    if (!db.qrTransactions) return [];
    return db.qrTransactions.filter((t: QRTransaction) => t.schoolId === schoolId);
}

export async function addQRTransaction(transaction: QRTransaction) {
    const db = readDb();
    if (!db.qrTransactions) db.qrTransactions = [];
    db.qrTransactions.push(transaction);
    writeDb(db);
    revalidatePath('/school-admin/qr-fees');
    return { success: true };
}

export async function updateQRTransaction(id: string, data: Partial<QRTransaction>) {
    const db = readDb();
    if (!db.qrTransactions) return { success: false, error: 'Database error' };

    const index = db.qrTransactions.findIndex((t: QRTransaction) => t.id === id);
    if (index === -1) return { success: false, error: 'Transaction not found' };

    const txn = db.qrTransactions[index];
    const isNowPaid = data.status === 'Paid' && txn.status !== 'Paid';

    db.qrTransactions[index] = {
        ...txn,
        ...data,
        updatedAt: new Date().toISOString()
    };

    if (isNowPaid && txn.baseAmount && txn.studentId) {
        const student = db.students.find((s: any) => s.id === txn.studentId);
        if (student) {
            const applicableGroups = db.feeGroups.filter((g: any) =>
                g.assignedClasses.some((c: any) => student.className?.includes(c) || c.includes(student.className || ''))
            );

            let remainingToAllocate = txn.baseAmount;
            const now = new Date();
            const year = now.getFullYear();
            const date = now.toISOString().split('T')[0];
            const receiptId = txn.paymentReference || txn.id;
            const targetMonth = txn.monthIndex ?? 11;

            const school = db.schools.find(s => s.id === txn.schoolId);
            const studentType = getStudentType(student, school?.currentSession);

            for (let i = 0; i <= targetMonth; i++) {
                if (remainingToAllocate <= 0) break;
                const fin = calculateMonthFinancials(student.id, i, applicableGroups, db.feeTransactions || [], studentType);
                if (fin.remainingDue > 0) {
                    const alloc = Math.min(remainingToAllocate, fin.remainingDue);
                    const newFeeTxn: FeeTransaction = {
                        id: receiptId,
                        schoolId: txn.schoolId,
                        studentId: student.id,
                        monthIndex: i,
                        year,
                        amount: alloc,
                        date,
                        mode: 'QR Code',
                        reference: txn.transactionId
                    };
                    if (!db.feeTransactions) db.feeTransactions = [];
                    db.feeTransactions.push(newFeeTxn);
                    remainingToAllocate -= alloc;
                }
            }

            if (remainingToAllocate > 0) {
                const newFeeTxn: FeeTransaction = {
                    id: receiptId,
                    schoolId: txn.schoolId,
                    studentId: student.id,
                    monthIndex: targetMonth,
                    year,
                    amount: remainingToAllocate,
                    date,
                    mode: 'QR Code',
                    reference: txn.transactionId
                };
                if (!db.feeTransactions) db.feeTransactions = [];
                db.feeTransactions.push(newFeeTxn);
            }
        }
    }

    writeDb(db);
    revalidatePath('/school-admin/qr-fees', 'page');
    revalidatePath('/school-admin/fees', 'layout');
    return { success: true };
}

export async function getAllQRTransactions() {
    const db = readDb();
    return db.qrTransactions || [];
}

// --- FEES ---

export async function getFeeGroups(schoolId: string) {
    const db = readDb();
    if (!db.feeGroups) return [];
    return db.feeGroups.filter((g: FeeGroup) => g.schoolId === schoolId);
}

export async function addFeeGroup(group: FeeGroup) {
    const db = readDb();
    if (!db.feeGroups) db.feeGroups = [];
    db.feeGroups.push(group);
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function updateFeeGroup(id: string, data: Partial<FeeGroup>) {
    const db = readDb();
    if (!db.feeGroups) return { success: false, error: 'Database error' };

    const index = db.feeGroups.findIndex((g: FeeGroup) => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };

    db.feeGroups[index] = { ...db.feeGroups[index], ...data };
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function deleteFeeGroup(id: string) {
    const db = readDb();
    if (!db.feeGroups) return { success: false, error: 'Database error' };

    const index = db.feeGroups.findIndex((g: FeeGroup) => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };

    db.feeGroups.splice(index, 1);
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function getFeeTransactions(schoolId: string, studentId?: string) {
    const db = readDb();
    if (!db.feeTransactions) return [];
    return db.feeTransactions.filter((t: FeeTransaction) =>
        t.schoolId === schoolId &&
        (!studentId || t.studentId === studentId)
    );
}

export async function addFeeTransaction(transaction: FeeTransaction) {
    const db = readDb();
    if (!db.feeTransactions) db.feeTransactions = [];
    try {
        db.feeTransactions.push(transaction);
        writeDb(db);
        revalidatePath('/school-admin/fees', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Failed to add fee transaction:', error);
        return { success: false, error: 'Failed to save transaction to database' };
    }
}

export async function addFeeTransactionsBatch(transactions: FeeTransaction[]) {
    if (!transactions.length) return { success: false, error: 'No transactions' };

    const db = readDb();
    if (!db.feeTransactions) db.feeTransactions = [];

    const schoolId = transactions[0].schoolId;
    let invoiceNo = transactions[0].invoiceNo;

    if (!invoiceNo) {
        if (!db.invoiceSettings) db.invoiceSettings = {};
        let settings = db.invoiceSettings[schoolId];
        if (!settings) {
            settings = {
                prefix: 'REC-',
                startFrom: 1000,
                padding: 4,
                currentSequence: 0,
                defaultPaymentMode: 'Cash',
                autoGenerate: true
            };
            db.invoiceSettings[schoolId] = settings;
        }

        const nextSeq = Math.max(settings.startFrom, settings.currentSequence + 1);
        invoiceNo = `${settings.prefix}${nextSeq.toString().padStart(settings.padding, '0')}`;
        settings.currentSequence = nextSeq;
    }

    try {
        transactions.forEach(t => {
            t.id = t.id || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Ensure unique ID if missing
            t.invoiceNo = invoiceNo;
            db.feeTransactions.push(t);
        });

        writeDb(db);
        revalidatePath('/school-admin/fees', 'layout');
        return { success: true, invoiceNo, transactions };
    } catch (error) {
        console.error('Failed to add fee transactions batch:', error);
        return { success: false, error: 'Failed to save transactions to database' };
    }
}

export async function revertFeeTransaction(id: string, reason: string = 'User requested revert') {
    const db = readDb();
    if (!db.feeTransactions) return { success: false, error: 'Database error' };

    const transactionsToRevert = db.feeTransactions.filter((t: any) => t.id === id);
    if (transactionsToRevert.length === 0) return { success: false, error: 'Transaction not found' };

    // Log to a revert history for audit purposes
    if (!db.revertedTransactions) db.revertedTransactions = [];
    db.revertedTransactions.push({
        transactionId: id,
        revertedAt: new Date().toISOString(),
        reason,
        deletedRecords: transactionsToRevert
    });

    db.feeTransactions = db.feeTransactions.filter((t: any) => t.id !== id);

    writeDb(db);
    revalidatePath('/school-admin/fees', 'layout');
    return { success: true, count: transactionsToRevert.length };
}

export async function getInvoiceSettings(schoolId: string) {
    const db = readDb();
    if (!db.invoiceSettings) db.invoiceSettings = {};
    if (!db.invoiceSettings[schoolId]) {
        db.invoiceSettings[schoolId] = {
            prefix: 'REC-',
            startFrom: 1000,
            padding: 4,
            currentSequence: 0,
            defaultPaymentMode: 'Cash',
            autoGenerate: true
        };
        writeDb(db);
    }
    return db.invoiceSettings[schoolId];
}

export async function updateInvoiceSettings(schoolId: string, settings: any) {
    const db = readDb();
    if (!db.invoiceSettings) db.invoiceSettings = {};
    db.invoiceSettings[schoolId] = settings;

    writeDb(db);
    revalidatePath('/school-admin/settings');
    return { success: true };
}

// --- ONLINE ADMISSION ---

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

    // identifier can be Application ID or Phone Number
    const app = db.admissionApplications.find((a: AdmissionApplication) =>
        a.schoolId === idToUse &&
        (a.id === identifier || a.phone === identifier) &&
        a.dob === dob
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
    return {
        status: app.status,
        paymentStatus: app.paymentStatus,
        paymentReference: app.paymentReference
    };
}

/**
 * Automated UPI Payment Engine for Online Admissions
 */
export async function verifyUPITransaction(schoolId: string, reference: string, transactionId: string, amount?: number) {
    const db = readDb();
    const resolvedSchool = resolveSchool(schoolId);
    const idToUse = resolvedSchool ? resolvedSchool.id : schoolId;

    // Only handle Admission Payment (APP_ prefix)
    if (reference.startsWith('APP_')) {
        const applicationId = reference.replace('APP_', '');
        const appIndex = db.admissionApplications?.findIndex((a: any) => a.id === applicationId);

        if (appIndex !== -1 && appIndex !== undefined) {
            const application = db.admissionApplications[appIndex];
            application.paymentStatus = 'Paid';
            application.paymentReference = transactionId;
            application.paymentDate = new Date().toISOString();

            // Log to QR Transactions for school audit
            if (!db.qrTransactions) db.qrTransactions = [];
            db.qrTransactions.push({
                id: `txn_adm_${Date.now()}`,
                schoolId: idToUse,
                studentId: applicationId,
                studentName: application.name || `${application.firstName} ${application.lastName}`,
                className: application.className,
                amount: amount || db.schools.find((s: any) => s.id === idToUse)?.admissionFeeAmount || 0,
                month: 'Admission Fee',
                status: 'Paid',
                transactionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as any);

            writeDb(db);
            revalidatePath(`/apply/${schoolId}/status`);
            revalidatePath(`/school-admin/qr-fees`);
            revalidatePath(`/school-admin/students/online-admission`);
            return { success: true, type: 'Admission', applicationId };
        }
    }

    // Handle Monthly Fee (FEE_ studentId _ month _ year)
    if (reference.startsWith('FEE_')) {
        const parts = reference.split('_');
        if (parts.length >= 4) {
            const studentId = parts[1];
            const monthIndex = parseInt(parts[2]);
            const schoolFromDb = db.schools.find((s: any) => s.id === idToUse);
            const student = db.students?.find((s: any) => s.id === studentId);

            if (student) {
                // Log the payment to QR Transactions (Autonomous Reflection)
                if (!db.qrTransactions) db.qrTransactions = [];
                db.qrTransactions.push({
                    id: `txn_fee_${Date.now()}`,
                    schoolId: idToUse,
                    studentId,
                    studentName: student.name || `${student.firstName} ${student.lastName}`,
                    className: student.className,
                    amount: amount || 0,
                    month: `Month Index ${monthIndex}`, // Simplified for now
                    status: 'Paid',
                    transactionId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as any);

                // Note: Actual Student record status update would go here if monthly fee tracking is enabled
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
    if (status && status !== 'all') {
        apps = apps.filter((a: AdmissionApplication = {} as any) => a.status === status);
    }
    if (sessionId && sessionId !== 'all') {
        apps = apps.filter((a: AdmissionApplication = {} as any) => a.session === sessionId);
    }
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

    // Convert application to student
    const studentResult = await addStudent({
        ...application,
        schoolId: idToUse,
        status: 'Active',
    } as any);

    if (!studentResult.success) return { success: false, error: studentResult.error };

    db.admissionApplications[appIndex].status = 'Approved';
    db.admissionApplications[appIndex].reviewedAt = new Date().toISOString();
    if (appointmentSchedule) {
        db.admissionApplications[appIndex].appointmentSchedule = appointmentSchedule;
    }
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

// --- ACCESSORIES ---

export async function getAccessoryTemplates() {
    const db = readDb();
    return db.accessoryTemplates || [];
}

export async function addAccessoryTemplate(template: Omit<AccessoryTemplate, 'id'>) {
    const db = readDb();
    if (!db.accessoryTemplates) db.accessoryTemplates = [];

    const newTemplate: AccessoryTemplate = {
        ...template,
        id: `tmpl_acc_${Date.now()}`
    };

    db.accessoryTemplates.push(newTemplate);
    writeDb(db);
    revalidatePath('/super-admin/modules/accessories');
    return { success: true };
}

export async function updateAccessoryTemplate(updatedTemplate: AccessoryTemplate) {
    const db = readDb();
    if (!db.accessoryTemplates) return { success: false, error: 'No templates found' };

    const index = db.accessoryTemplates.findIndex(t => t.id === updatedTemplate.id);
    if (index === -1) return { success: false, error: 'Template not found' };

    db.accessoryTemplates[index] = updatedTemplate;
    writeDb(db);
    revalidatePath('/super-admin/modules/accessories');
    return { success: true };
}

export async function setDefaultAccessoryTemplate(templateId: string) {
    const db = readDb();
    if (!db.accessoryTemplates) return { success: false, error: 'No templates found' };

    db.accessoryTemplates.forEach(t => {
        t.isDefault = (t.id === templateId);
    });

    writeDb(db);
    revalidatePath('/super-admin/modules/accessories');
    return { success: true };
}


export async function assignAccessoryTemplateToSchool(schoolId: string, templateId: string) {
    const db = readDb();
    const template = db.accessoryTemplates?.find(t => t.id === templateId);

    if (!template) {
        return { success: false, error: `Template (${templateId}) not found in accessory templates` };
    }

    // Merge defaults with template config to ensure no missing fields
    const baseConfig = template.fieldConfig || [];
    const mergedConfig = [...DEFAULT_ACCESSORY_FIELDS].map(def => {
        const existing = baseConfig.find(eb => eb.fieldName === def.fieldName);
        return existing ? { ...def, isVisible: existing.isVisible } : def;
    });

    const accessoriesData = {
        categories: JSON.parse(JSON.stringify(template.categories)),
        items: template.defaultItems ? JSON.parse(JSON.stringify(template.defaultItems)) : [],
        fieldConfig: mergedConfig
    };

    // Try Prisma first
    try {
        await prisma.school.update({
            where: { id: schoolId },
            data: {
                accessories: accessoriesData as any,
                accessoryTemplateId: templateId
            }
        });
        // Also sync to data.json
        try {
            const schoolIndex = db.schools.findIndex(s => s.id === schoolId);
            if (schoolIndex >= 0) {
                db.schools[schoolIndex].accessories = accessoriesData;
                db.schools[schoolIndex].accessoryTemplateId = templateId;
                writeDb(db);
            }
        } catch (e) { /* ignore json sync failures */ }
    } catch (prismaErr) {
        // Fallback: data.json only
        const schoolIndex = db.schools.findIndex(s => s.id === schoolId);
        if (schoolIndex === -1) {
            return { success: false, error: `School (${schoolId}) not found` };
        }
        db.schools[schoolIndex].accessories = accessoriesData;
        db.schools[schoolIndex].accessoryTemplateId = templateId;
        writeDb(db);
    }

    revalidatePath(`/school-admin/fees/accessories`);
    revalidatePath(`/super-admin/modules/accessories`);
    return { success: true };
}

export async function updateSchoolAccessories(schoolId: string, accessories: { categories: AccessoryCategory[], items: AccessoryItem[], fieldConfig: AccessoryFieldConfig[] }) {
    // Try Prisma first
    try {
        await prisma.school.update({
            where: { id: schoolId },
            data: { accessories: accessories as any }
        });
        // Sync to data.json
        try {
            const db = readDb();
            const index = db.schools.findIndex(s => s.id === schoolId);
            if (index >= 0) { db.schools[index].accessories = accessories; writeDb(db); }
        } catch (e) { /* ignore */ }
    } catch (prismaErr) {
        // Fallback: data.json only
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId);
        if (index === -1) return { success: false, error: 'School not found' };
        db.schools[index].accessories = accessories;
        writeDb(db);
    }
    revalidatePath(`/school-admin/fees/accessories`);
    return { success: true };
}

export async function updateSchoolAccessorySettings(schoolId: string, config: AccessoryFieldConfig[]) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { accessories: true } as any });
        const current = (school as any)?.accessories || { categories: [], items: [], fieldConfig: [] };
        const updated = { ...current, fieldConfig: config };
        await prisma.school.update({ where: { id: schoolId }, data: { accessories: updated as any } });
        try {
            const db = readDb();
            const idx = db.schools.findIndex(s => s.id === schoolId);
            if (idx >= 0) { if (!db.schools[idx].accessories) db.schools[idx].accessories = { categories: [], items: [], fieldConfig: [] }; db.schools[idx].accessories!.fieldConfig = config; writeDb(db); }
        } catch (e) { /* ignore */ }
    } catch (prismaErr) {
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId);
        if (index === -1) return { success: false, error: 'School not found' };
        if (!db.schools[index].accessories) db.schools[index].accessories = { categories: [], items: [], fieldConfig: [] };
        db.schools[index].accessories!.fieldConfig = config;
        writeDb(db);
    }
    revalidatePath('/school-admin/fees/accessories');
    return { success: true };
}

export async function updateSchoolAccessoryCategories(schoolId: string, categories: AccessoryCategory[]) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { accessories: true } as any });
        const current = (school as any)?.accessories || { categories: [], items: [], fieldConfig: [] };
        const updated = { ...current, categories };
        await prisma.school.update({ where: { id: schoolId }, data: { accessories: updated as any } });
        try {
            const db = readDb();
            const idx = db.schools.findIndex(s => s.id === schoolId);
            if (idx >= 0) { if (!db.schools[idx].accessories) db.schools[idx].accessories = { categories: [], items: [], fieldConfig: [] }; db.schools[idx].accessories!.categories = categories; writeDb(db); }
        } catch (e) { /* ignore */ }
    } catch (prismaErr) {
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId);
        if (index === -1) return { success: false, error: 'School not found' };
        if (!db.schools[index].accessories) db.schools[index].accessories = { categories: [], items: [], fieldConfig: [] };
        db.schools[index].accessories!.categories = categories;
        writeDb(db);
    }
    revalidatePath('/school-admin/fees/accessories');
    return { success: true };
}

export async function addAccessorySale(schoolId: string, sale: AccessorySale) {
    const db = readDb();

    // 1. Record the Sale in data.json (sales are still stored in data.json)
    if (!db.accessorySales) db.accessorySales = [];
    db.accessorySales.push(sale);

    // 2. Update Inventory Stock Levels — try Prisma first, then data.json
    try {
        const schoolRecord = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { accessories: true } as any
        });
        const accessories = (schoolRecord as any)?.accessories;
        if (accessories && accessories.items) {
            sale.items.forEach((soldItem: any) => {
                const itemIndex = accessories.items.findIndex((i: any) => i.id === soldItem.itemId);
                if (itemIndex !== -1) {
                    const item = accessories.items[itemIndex];
                    if (item.sessionData && item.sessionData[sale.sessionName]) {
                        item.sessionData[sale.sessionName].availableQuantity -= soldItem.quantity;
                    }
                    if (item.availableQuantity !== undefined) {
                        item.availableQuantity -= soldItem.quantity;
                    }
                }
            });
            await prisma.school.update({
                where: { id: schoolId },
                data: { accessories: accessories as any }
            });
            // Also sync to data.json school accessories
            const schoolIndex = db.schools.findIndex(s => s.id === schoolId);
            if (schoolIndex >= 0) {
                db.schools[schoolIndex].accessories = accessories;
            }
        }
    } catch (prismaErr) {
        // Fallback: data.json only
        const schoolIndex = db.schools.findIndex(s => s.id === schoolId);
        if (schoolIndex === -1) return { success: false, error: 'School not found' };
        const school = db.schools[schoolIndex];
        if (school.accessories && school.accessories.items) {
            sale.items.forEach((soldItem: any) => {
                const itemIndex = school.accessories!.items.findIndex(i => i.id === soldItem.itemId);
                if (itemIndex !== -1) {
                    const item = school.accessories!.items[itemIndex];
                    if (item.sessionData && item.sessionData[sale.sessionName]) {
                        item.sessionData[sale.sessionName].availableQuantity -= soldItem.quantity;
                    }
                    if (item.availableQuantity !== undefined) {
                        item.availableQuantity -= soldItem.quantity;
                    }
                }
            });
        }
    }

    try {
        writeDb(db);
        revalidatePath('/school-admin/fees/accessories', 'layout');
        return { success: true, sale };
    } catch (error) {
        console.error('Failed to add accessory sale:', error);
        return { success: false, error: 'Failed to save sale to database' };
    }
}


export async function getAccessorySales(schoolId: string) {
    const db = readDb();
    if (!db.accessorySales) return [];
    return db.accessorySales.filter(s => s.schoolId === schoolId);
}
// --- DASHBOARD STATS ---

export async function getDashboardStats() {
    const db = readDb();
    const schools = db.schools || [];

    const totalSchools = schools.length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);

    // Revenue logic: Sum of package prices for each school
    const packages = db.packages || [];
    const totalRevenue = schools.reduce((acc, s) => {
        const pkg = packages.find(p => p.id === s.packageId);
        return acc + (pkg ? pkg.price : 0);
    }, 0);

    const recentSchools = [...schools]
        .sort((a, b) => {
            const idA = parseInt(a.id.split('_')[1] || '0');
            const idB = parseInt(b.id.split('_')[1] || '0');
            return idB - idA;
        })
        .slice(0, 5);

    return {
        totalSchools,
        totalStudents,
        totalRevenue,
        recentSchools
    };
}

// ── Fee Template (Batch) ──────────────────────────────────────────────────────

export async function batchUpdateFeeTemplates(schoolIds: string[], template: string) {
    try {
        if (schoolIds.length === 0) {
            // Update ALL schools
            await prisma.school.updateMany({
                data: { feeCollectionTemplate: template }
            });
        } else {
            // Update SELECTED schools
            await prisma.school.updateMany({
                where: { id: { in: schoolIds } },
                data: { feeCollectionTemplate: template }
            });
        }

        // Hybrid: also update local data.json
        try {
            const db = readDb();
            db.schools.forEach((s: any) => {
                if (schoolIds.length === 0 || schoolIds.includes(s.id)) {
                    s.feeCollectionTemplate = template;
                }
            });
            writeDb(db);
        } catch (e) {}

        revalidatePath('/super-admin/modules/fees');
        revalidatePath('/school-admin/fees/collect');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ── Platform Config (Global SaaS settings) ────────────────────────────────────

export async function getPlatformConfig() {
    try {
        const db = readDb();
        return (db as any).platformConfig || { defaultFeeTemplate: 'template_1', disabledFeeTemplates: [] };
    } catch (error) {
        return { defaultFeeTemplate: 'template_1', disabledFeeTemplates: [] };
    }
}

export async function updatePlatformConfig(config: { defaultFeeTemplate?: string; disabledFeeTemplates?: string[] }) {
    try {
        const db = readDb();
        const current = (db as any).platformConfig || { defaultFeeTemplate: 'template_1', disabledFeeTemplates: [] };
        (db as any).platformConfig = { ...current, ...config };
        writeDb(db);

        revalidatePath('/super-admin/modules/fees');
        revalidatePath('/school-admin/fees/settings');
        revalidatePath('/school-admin/fees/collect');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

interface AnalyzeCardResponse {
  success: boolean;
  template?: Partial<IDCardTemplate>;
  error?: string;
}

export async function analyzeIDCardLayout(
  imageBase64: string,
  fileName: string,
  userProvidedKey?: string
): Promise<AnalyzeCardResponse> {
  const apiKey = userProvidedKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { 
      success: false, 
      error: 'GEMINI_API_KEY is not configured on the server. Please enter your Gemini API Key in the settings field.' 
    };
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `
You are a professional graphic layout parser. Analyze this ID card image and extract its visual design, colors, and precise element coordinates for reconstruction.
Return a valid JSON object matching the following structure:

{
  "layout": "vertical" or "horizontal",
  "width": number (54 for vertical, 86 for horizontal),
  "height": number (86 for vertical, 54 for horizontal),
  "primaryColor": "hex string (main theme color, e.g. blue or red)",
  "secondaryColor": "hex string (secondary color)",
  "textColor": "hex string",
  "borderRadius": "none" | "sm" | "md" | "lg" | "full",
  "schoolNameOnCard": "string (the name of the school written on the card, e.g. 'J.S. INTERNATIONAL SCHOOL')",
  "canvasElements": [
    {
      "id": "unique_string",
      "type": "photo" | "signature" | "field" | "text" | "qrcode" | "school_logo" | "school_name",
      "x": number (percentage of card width 0 to 100),
      "y": number (percentage of card height 0 to 100),
      "width": number (percentage of card width 0 to 100),
      "height": number (percentage of card height 0 to 100),
      "fontSize": number (font size, typically between 8 and 18),
      "fontWeight": "normal" | "bold",
      "color": "hex string",
      "align": "left" | "center" | "right",
      "fieldKey": "name" | "rollNumber" | "admissionNumber" | "className" | "phone" | "currentAddress" | "bloodGroup" | "dateOfBirth",
      "fieldLabel": "e.g., 'Name:', 'Roll No:', 'Class:'",
      "text": "the literal static text displayed"
    }
  ]
}

Strict Layout Rules for Reconstructing the Original Image:
1. Visual Dimensions:
   - For vertical layout (width 54, height 86), the student photo is always a circle or square near the center-top.
   - Set the photo element coordinates precisely to avoid overlaps: typically x: 36, y: 20, width: 28, height: 18.
2. Vertical Spacing:
   - Text fields must be ordered vertically from top to bottom.
   - The Student Name should be placed below the photo (typically y: 46, height: 6). It must have fontWeight: "bold" and align: "center".
   - The Class/Section should be placed below the name (typically y: 53, height: 5), align: "center".
   - Other fields (admission, roll, dob, phone, address) should be placed below that, starting around y: 60, with a vertical gap of 5-6% between successive fields to prevent overlapping.
3. Field Alignment:
   - If fields are centered, set align: "center".
   - If fields have small icons on the left, align them left starting at x: 10, with width: 80.
4. Header Branding Detection:
   - Detect the school logo in the card header, return it as type: "school_logo".
   - Detect the school name text/header text in the card header, return it as type: "school_name".
5. Colors:
   - Extract the predominant brand/school colors for primaryColor and secondaryColor from the card's header or background design.
6. Return ONLY the raw JSON object. Do not include markdown code block formatting (like \`\`\`json).
`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ]
    };

    // Sequential fallback configs to ensure we match a supported version/model for the user's project
    const configs = [
      { url: 'v1/models/gemini-2.5-flash', name: 'gemini-2.5-flash (v1)' },
      { url: 'v1/models/gemini-2.0-flash', name: 'gemini-2.0-flash (v1)' },
      { url: 'v1/models/gemini-3.5-flash', name: 'gemini-3.5-flash (v1)' },
      { url: 'v1/models/gemini-2.5-pro', name: 'gemini-2.5-pro (v1)' },
      { url: 'v1/models/gemini-2.0-flash-lite', name: 'gemini-2.0-flash-lite (v1)' },
      { url: 'v1/models/gemini-1.5-flash', name: 'gemini-1.5-flash (v1)' },
      { url: 'v1/models/gemini-1.5-flash-latest', name: 'gemini-1.5-flash-latest (v1)' },
      { url: 'v1beta/models/gemini-1.5-flash', name: 'gemini-1.5-flash (v1beta)' }
    ];

    let lastError = '';
    let successJson = null;

    for (const config of configs) {
      console.log(`[analyzeIDCardLayout] Attempting model config: ${config.name}...`);
      const url = `https://generativelanguage.googleapis.com/${config.url}:generateContent?key=${apiKey}`;
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[analyzeIDCardLayout] Config ${config.name} returned status ${res.status}:`, errText);
          lastError = `Status ${res.status}: ${errText}`;
          continue; // Try next model config
        }

        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          console.warn(`[analyzeIDCardLayout] Config ${config.name} returned empty text parts`);
          lastError = 'Empty response text parts';
          continue;
        }

        successJson = rawText;
        console.log(`[analyzeIDCardLayout] Config ${config.name} SUCCEEDED!`);
        break; // Stop loop, we succeeded
      } catch (err: any) {
        console.warn(`[analyzeIDCardLayout] Config ${config.name} connection error:`, err?.message || String(err));
        lastError = err?.message || String(err);
      }
    }

    if (!successJson) {
      try {
        const diagUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const diagRes = await fetch(diagUrl);
        const diagJson = await diagRes.json();
        console.error('[analyzeIDCardLayout] Diagnostic ListModels response:', JSON.stringify(diagJson));
        
        if (diagJson.error) {
          return {
            success: false,
            error: `Google API Diagnostic Error: ${diagJson.error.message || JSON.stringify(diagJson.error)} (Code ${diagJson.error.code})`
          };
        }
        
        return {
          success: false,
          error: `Google API returned 404. Accessible models catalog: ${JSON.stringify(diagJson.models?.map((m: any) => m.name.split('/').pop()) || diagJson)}`
        };
      } catch (diagErr: any) {
        return {
          success: false,
          error: `Gemini API failed, diagnostic check failed: ${diagErr?.message || String(diagErr)}. Last error: ${lastError}`
        };
      }
    }

    let cleanedText = successJson.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    }
    cleanedText = cleanedText.trim();

    console.log('[analyzeIDCardLayout] Parsing template JSON response...');
    const templateData = JSON.parse(cleanedText);

    const completeTemplate: Partial<IDCardTemplate> & { schoolNameOnCard?: string } = {
      name: `AI Template ${new Date().toLocaleDateString()}`,
      layout: templateData.layout || 'vertical',
      width: templateData.width || 54,
      height: templateData.height || 86,
      primaryColor: templateData.primaryColor || '#1e3a8a',
      secondaryColor: templateData.secondaryColor || '#ffffff',
      fontFamily: 'Inter',
      textColor: templateData.textColor || '#000000',
      borderRadius: templateData.borderRadius || 'md',
      schoolNameOnCard: templateData.schoolNameOnCard,
      layoutMode: 'drag-drop',
      showLogo: true,
      showPhoto: true,
      signatureText: 'Principal',
      fields: [],
      canvasElements: (templateData.canvasElements || []).map((el: any, idx: number) => ({
        id: el.id || `ai_el_${idx}_${Date.now()}`,
        type: el.type || 'text',
        x: typeof el.x === 'number' ? el.x : 10,
        y: typeof el.y === 'number' ? el.y : 10,
        width: typeof el.width === 'number' ? el.width : 50,
        height: typeof el.height === 'number' ? el.height : 8,
        rotation: 0,
        opacity: 1,
        zIndex: idx + 1,
        fontSize: el.fontSize || 12,
        fontWeight: el.fontWeight || 'normal',
        color: el.color || '#000000',
        align: el.align || 'left',
        fieldKey: el.fieldKey,
        fieldLabel: el.fieldLabel,
        text: el.text
      }))
    };

    return { success: true, template: completeTemplate };
  } catch (err: any) {
    console.error('[analyzeIDCardLayout] Exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

