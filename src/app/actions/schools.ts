'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { School, SaasPackage, User, UserRole, Session } from '@/types';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth-utils';
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

// --- PACKAGES ---

export async function getPackages() {
    try {
        return await prisma.saasPackage.findMany();
    } catch (error) {
        console.warn('[HYBRID] Prisma failed, falling back to local data.json:', error);
        const db = readDb();
        return db.packages || [];
    }
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

export async function getSchools() {
    try {
        const schools = await prisma.school.findMany({
            include: {
                sessions: true,
                _count: {
                    select: { students: true }
                }
            }
        });

        return schools.map((s: any) => ({
            ...s,
            payrollConfig: (s as any).admissionFieldOverrides?.__payrollConfig || null,
            languageSettings: (s as any).admissionFieldOverrides?.__languageAutomation || {},
            transportConfig: (s as any).admissionFieldOverrides?.__transportConfig || { criticalExpiryDays: 30, warningExpiryDays: 60 }
        }));
    } catch (error: any) {
        console.warn('[HYBRID] Prisma getSchools failed:', error.message);
        const db = readDb();
        return (db.schools || []).map((s: any) => ({
            ...s,
            payrollConfig: s.admissionFieldOverrides?.__payrollConfig || null,
            languageSettings: s.admissionFieldOverrides?.__languageAutomation || {},
            transportConfig: s.admissionFieldOverrides?.__transportConfig || { criticalExpiryDays: 30, warningExpiryDays: 60 }
        }));
    }
}

export async function getSchool(id: string) {
    try {
        let school = await prisma.school.findUnique({
            where: { id },
            include: { sessions: true }
        });

        if (!school) {
            school = await prisma.school.findUnique({
                where: { schoolId: id },
                include: { sessions: true }
            });
        }

        if (school) {
            (school as any).payrollConfig = (school as any).admissionFieldOverrides?.__payrollConfig || null;
            (school as any).languageSettings = (school as any).admissionFieldOverrides?.__languageAutomation || {};
            (school as any).transportConfig = (school as any).admissionFieldOverrides?.__transportConfig || { criticalExpiryDays: 30, warningExpiryDays: 60 };
        }

        return school;
    } catch (error) {
        console.warn('[HYBRID] Prisma getSchool failed, falling back to local data.json');
        const db = readDb();
        const school = db.schools.find((s: any) => s.id === id || s.schoolId === id) || null;
        if (school) {
            (school as any).payrollConfig = (school as any).admissionFieldOverrides?.__payrollConfig || null;
            (school as any).languageSettings = (school as any).admissionFieldOverrides?.__languageAutomation || {};
            (school as any).transportConfig = (school as any).admissionFieldOverrides?.__transportConfig || { criticalExpiryDays: 30, warningExpiryDays: 60 };
        }
        return school;
    }
}

export async function addSchool(newSchool: School, adminPassword?: string) {
    try {
        const exists = await prisma.school.findUnique({
            where: { schoolId: newSchool.schoolId }
        });
        if (exists) return { success: false, error: 'A school with this ID already exists' };

        const { 
            sessions, ads, admins, studentCount, 
            _count, updatedAt, createdAt, users, students, 
            inventoryProducts, stockTransactions, accessoryInvoices,
            transportConfig,
            ...schoolData 
        } = newSchool as any;

        if (transportConfig) {
            const overrides = schoolData.admissionFieldOverrides || {};
            (overrides as any).__transportConfig = transportConfig;
            schoolData.admissionFieldOverrides = overrides;
        }

        let finalMaxStudents = schoolData.maxStudents;
        if (!finalMaxStudents && schoolData.packageId) {
            const pkg = await prisma.saasPackage.findUnique({
                where: { id: schoolData.packageId }
            });
            if (pkg) {
                finalMaxStudents = pkg.maxStudents;
            }
        }

        // Pack languageSettings into admissionFieldOverrides to avoid schema mismatch
        if (schoolData.languageSettings) {
            const overrides = schoolData.admissionFieldOverrides || {};
            (overrides as any).__languageAutomation = schoolData.languageSettings;
            schoolData.admissionFieldOverrides = overrides;
            delete schoolData.languageSettings;
        }

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
                maxStudents: finalMaxStudents || 0,
                isActive: true,
                accessories: autoAccessoriesData ? (autoAccessoriesData as any) : undefined,
                accessoryTemplateId: autoTemplateId || undefined,
                classes: INITIAL_CLASS_SETUPS,
                sections: INITIAL_SECTIONS,
                disableReasons: INITIAL_DISABLE_REASONS,
                houses: INITIAL_HOUSES,
                religions: INITIAL_RELIGIONS,
                categories: INITIAL_CATEGORIES,
                streams: INITIAL_STREAMS,
                regNoSettings: INITIAL_REG_SETTINGS,
                enrollNoSettings: INITIAL_ENROLL_SETTINGS,
                apaarIdSettings: INITIAL_APAAR_SETTINGS,
                penNoSettings: INITIAL_PEN_SETTINGS,
                srNoSettings: INITIAL_SR_SETTINGS,
                genRegNoSettings: INITIAL_GEN_REG_SETTINGS,
                rollNoSettings: INITIAL_ROLL_SETTINGS,
                sessionStartMonth: 4,
                users: {
                    create: {
                        name: `${newSchool.name} Admin`,
                        email: newSchool.email,
                        password: adminPassword ? await hashPassword(adminPassword) : await hashPassword(newSchool.email + '_admin'),
                        role: 'SCHOOL_ADMIN',
                        schoolId: undefined, // Will be linked automatically
                        avatar: '/kummi-icon.svg',
                        status: 'Active'
                    }
                }
            }
        });

        try {
            const db = readDb();
            const schoolForJson = {
                ...school,
                admins: [newSchool.email]
            };
            db.schools = [...(db.schools || []), schoolForJson];
            writeDb(db);
        } catch (e) {
            console.warn('[HYBRID] Sync to data.json failed during addSchool');
        }

        // Create initial subscription for the newly created school from their assigned package template
        if (schoolData.packageId) {
            try {
                const pkg = await prisma.saasPackage.findUnique({
                    where: { id: schoolData.packageId }
                }).catch(() => {
                    const db = readDb();
                    return db.packages?.find(p => p.id === schoolData.packageId);
                });
                if (pkg) {
                    const { createSubscriptionFromPackage } = require('./subscriptions');
                    await createSubscriptionFromPackage(school.id, pkg);
                }
            } catch (err) {
                console.warn('[SUBSCRIPTION] Failed to create initial subscription on school onboard:', err);
            }
        }

        revalidatePath('/super-admin/schools');
        return { success: true, school };
    } catch (error: any) {
        console.error('Error adding school:', error);
        return { success: false, error: error.message };
    }
}


export async function updateSchool(id: string, data: Partial<School>, adminPassword?: string) {
    try {
        const oldSchool = await prisma.school.findUnique({
            where: { id }
        });
        if (!oldSchool) return { success: false, error: 'School not found' };

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
            transportConfig,
            ...updateData 
        } = data as any;

        if (payrollConfig) {
            const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
            (overrides as any).__payrollConfig = payrollConfig;
            updateData.admissionFieldOverrides = overrides;
        }

        if (transportConfig) {
            const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
            (overrides as any).__transportConfig = transportConfig;
            updateData.admissionFieldOverrides = overrides;
        }

        if (updateData.packageId && !updateData.maxStudents) {
            const pkg = await prisma.saasPackage.findUnique({
                where: { id: updateData.packageId }
            });
            if (pkg) {
                updateData.maxStudents = pkg.maxStudents;
            }
        }

        // Pack languageSettings into admissionFieldOverrides to avoid schema mismatch
        if (updateData.languageSettings) {
            const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
            (overrides as any).__languageAutomation = updateData.languageSettings;
            updateData.admissionFieldOverrides = overrides;
            delete updateData.languageSettings;
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

        const targetEmail = data.email || (oldSchool as any).admins?.[0];
        if (targetEmail) {
            const existingUser = await prisma.user.findUnique({
                where: { email: targetEmail }
            });

            if (existingUser) {
                const userUpdate: any = {
                    name: data.name ? `${data.name} Admin` : existingUser.name,
                };
                if (adminPassword) userUpdate.password = await hashPassword(adminPassword);
                
                await prisma.user.update({
                    where: { email: targetEmail },
                    data: userUpdate
                });
            }
        }

        try {
            const db = readDb();
            const schoolIndex = db.schools.findIndex(s => s.id === id);
            if (schoolIndex >= 0) {
                db.schools[schoolIndex] = { ...db.schools[schoolIndex], ...updateData };
                writeDb(db);
            }
        } catch (e) {
            console.warn('[HYBRID] Sync to data.json failed during updateSchool');
        }

        revalidatePath('/super-admin/schools');
        revalidatePath('/school-admin/profile');
        return { success: true };
    } catch (error: any) {
        console.warn('[HYBRID] Prisma updateSchool failed, falling back to local data.json:', error.message);
        try {
            const db = readDb();
            const schoolIndex = db.schools.findIndex((s: any) => s.id === id || s.schoolId === id);
            if (schoolIndex < 0) return { success: false, error: 'School not found in local database' };

            const oldSchool = db.schools[schoolIndex];

            // Destructure virtual fields
            const {
                sessions, id: _id, studentCount, ads, admins,
                _count, updatedAt, createdAt, users, students,
                inventoryProducts, stockTransactions, accessoryInvoices,
                payrollConfig,
                transportConfig,
                ...updateData
            } = data as any;

            // Pack transportConfig into admissionFieldOverrides
            if (transportConfig) {
                const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
                (overrides as any).__transportConfig = transportConfig;
                updateData.admissionFieldOverrides = overrides;
            }

            // Pack payrollConfig into admissionFieldOverrides
            if (payrollConfig) {
                const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
                (overrides as any).__payrollConfig = payrollConfig;
                updateData.admissionFieldOverrides = overrides;
            }

            // Pack languageSettings into admissionFieldOverrides
            if (updateData.languageSettings) {
                const overrides = updateData.admissionFieldOverrides || oldSchool.admissionFieldOverrides || {};
                (overrides as any).__languageAutomation = updateData.languageSettings;
                updateData.admissionFieldOverrides = overrides;
                delete updateData.languageSettings;
            }

            db.schools[schoolIndex] = { ...oldSchool, ...updateData };
            
            // Update admin password if provided
            if (adminPassword) {
                const targetEmail = data.email || oldSchool.email || (oldSchool.admins && oldSchool.admins[0]);
                if (targetEmail) {
                    const userIndex = db.users.findIndex((u: any) => u.email === targetEmail);
                    if (userIndex >= 0) {
                        db.users[userIndex].password = await hashPassword(adminPassword);
                        if (data.name) {
                            db.users[userIndex].name = `${data.name} Admin`;
                        }
                    }
                }
            }
            
            writeDb(db);
            revalidatePath('/super-admin/schools');
            revalidatePath('/school-admin/profile');
            return { success: true };
        } catch (jsonError: any) {
            console.error('Error updating school in data.json fallback:', jsonError);
            return { success: false, error: jsonError.message };
        }
    }
}

export async function deleteSchool(id: string) {
    try {
        await prisma.school.delete({
            where: { id }
        });

        try {
            const db = readDb();
            db.schools = (db.schools || []).filter((s: any) => s.id !== id);
            writeDb(db);
        } catch (e) {
            console.warn('[HYBRID] Sync to data.json failed during deleteSchool');
        }

        revalidatePath('/super-admin/schools');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleSchoolStatus(schoolId: string, isActive: boolean) {
    try {
        await prisma.school.update({
            where: { id: schoolId },
            data: { isActive }
        });

        try {
            const db = readDb();
            const schoolIndex = db.schools.findIndex(s => s.id === schoolId);
            if (schoolIndex >= 0) {
                db.schools[schoolIndex].isActive = isActive;
                writeDb(db);
            }
        } catch (e) {
            console.warn('[HYBRID] Sync to data.json failed during toggleSchoolStatus');
        }

        revalidatePath('/super-admin/schools');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSchoolAdmin(schoolId: string) {
    try {
        const user = await prisma.user.findFirst({
            where: { 
                schoolId: schoolId,
                role: 'SCHOOL_ADMIN'
            }
        });
        if (user) return user;
    } catch (e: any) {
        console.warn('[HYBRID] Prisma getSchoolAdmin failed:', e.message);
    }

    const db = readDb();
    const school = db.schools.find(s => s.id === schoolId);
    if (!school || !school.admins || school.admins.length === 0) return null;

    const adminEmail = school.admins[0];
    const user = db.users.find(u => u.email === adminEmail);
    return user || null;
}

export async function getSchoolAdmins(schoolId: string) {
    try {
        return await prisma.user.findMany({
            where: { 
                schoolId: schoolId,
                role: 'SCHOOL_ADMIN'
            }
        });
    } catch (e: any) {
        console.warn('[HYBRID] Prisma getSchoolAdmins failed:', e.message);
        const db = readDb();
        return db.users.filter(u => u.schoolId === schoolId && u.role === 'SCHOOL_ADMIN');
    }
}

export async function manageSession(
    schoolId: string,
    action: 'add' | 'edit' | 'delete' | 'setCurrent',
    data?: Partial<Session>,
    sessionStartMonth?: number
) {
    try {
        switch (action) {
            case 'add':
                if (!data?.name) return { success: false, error: 'Session name is required' };
                
                // Check for duplicates in Prisma
                const existing = await prisma.session.findFirst({
                    where: { schoolId, name: data.name }
                });
                if (existing) return { success: false, error: 'A session with this name already exists' };

                const sessionCount = await prisma.session.count({ where: { schoolId } });
                const { sessionStartMonth: _, ...sessionData } = data as any;
                await prisma.session.create({
                    data: {
                        ...sessionData,
                        schoolId,
                        isCurrent: sessionCount === 0,
                        isActive: data?.isActive ?? true,
                        status: data?.status || 'Active'
                    }
                });
                break;
            case 'edit':
                if (!data?.id) return { success: false, error: 'Session ID is required for editing' };
                await prisma.session.update({
                    where: { id: data.id },
                    data: {
                        name: data.name,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        status: data.status,
                        isActive: data.isActive
                    }
                });
                break;
            case 'delete':
                if (!data?.id) return { success: false, error: 'Session ID is required for deletion' };
                // Use deleteMany to avoid crash if record is already gone
                await prisma.session.deleteMany({
                    where: { id: data.id, schoolId }
                });
                break;
            case 'setCurrent':
                if (!data?.name) return { success: false, error: 'Session name is required' };
                // Reset all sessions for this school
                await prisma.session.updateMany({
                    where: { schoolId },
                    data: { isCurrent: false }
                });
                // Set current
                await prisma.session.updateMany({
                    where: { schoolId, name: data.name },
                    data: { isCurrent: true }
                });
                // Sync currentSession field in school model
                await prisma.school.update({
                    where: { id: schoolId },
                    data: { currentSession: data.name }
                });
                break;
        }

        // Update sessionStartMonth if provided (Global school setting)
        if (sessionStartMonth !== undefined) {
            await prisma.school.update({
                where: { id: schoolId },
                data: { sessionStartMonth }
            });
        }

        // Hybrid Fallback: Also update local data.json
        try {
            const db = readDb();
            const schoolIndex = db.schools.findIndex((s: any) => s.id === schoolId || s.schoolId === schoolId);
            if (schoolIndex !== -1) {
                const school = db.schools[schoolIndex];
                if (!school.sessions) school.sessions = [];
                
                switch (action) {
                    case 'add':
                        // Check for duplicates in JSON
                        if (school.sessions.some((s: any) => s.name === data?.name)) {
                            console.warn('[HYBRID] Duplicate session ignored in JSON');
                        } else {
                            const { sessionStartMonth: _, ...sessionDataJson } = data as any;
                            school.sessions.push({
                                ...sessionDataJson,
                                id: `sess_${Date.now()}`,
                                isCurrent: school.sessions.length === 0,
                                isActive: data?.isActive ?? true,
                                status: data?.status || 'Active'
                            });
                        }
                        break;
                    case 'edit':
                        const editIdx = school.sessions.findIndex((s: any) => s.id === data?.id);
                        if (editIdx !== -1) school.sessions[editIdx] = { ...school.sessions[editIdx], ...data };
                        break;
                    case 'delete':
                        school.sessions = school.sessions.filter((s: any) => s.id !== data?.id);
                        break;
                    case 'setCurrent':
                        school.sessions.forEach((s: any) => s.isCurrent = (s.name === data?.name));
                        school.currentSession = data?.name;
                        break;
                }
                
                if (sessionStartMonth !== undefined) {
                    school.sessionStartMonth = sessionStartMonth;
                }
                
                writeDb(db);
            }
        } catch (err) {
            console.warn('[HYBRID] manageSession local sync failed:', err);
        }

        revalidatePath('/school-admin/profile');
        return { success: true };
    } catch (error: any) {
        console.error(`manageSession ${action} failed:`, error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

export async function getSchoolSessionConfig(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { sessionStartMonth: true } as any });
        return { sessionStartMonth: (school as any)?.sessionStartMonth || 4 };
    } catch {
        const db = readDb();
        const school = db.schools.find((s: any) => s.id === schoolId || s.schoolId === schoolId);
        return { sessionStartMonth: school?.sessionStartMonth || 4 };
    }
}
export async function batchUpdateFeeTemplates(schoolIds: string[], template: string) {
    try {
        if (schoolIds.length === 0) {
            // Update ALL schools
            await prisma.school.updateMany({
                data: { feeCollectionTemplate: template }
            });
            
            try {
                const db = readDb();
                db.schools.forEach((s: any) => s.feeCollectionTemplate = template);
                writeDb(db);
            } catch (e) {}
        } else {
            // Update SELECTED schools
            await prisma.school.updateMany({
                where: { id: { in: schoolIds } },
                data: { feeCollectionTemplate: template }
            });

            try {
                const db = readDb();
                db.schools.forEach((s: any) => {
                    if (schoolIds.includes(s.id)) s.feeCollectionTemplate = template;
                });
                writeDb(db);
            } catch (e) {}
        }

        revalidatePath('/super-admin/schools');
        revalidatePath('/school-admin/fees/generator');
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

