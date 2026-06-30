'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { SchoolSubscription, SaasPackage } from '@/types';
import { revalidatePath } from 'next/cache';

// --- GET subscription for a school ------------------------------------------
export async function getSchoolSubscription(schoolId: string): Promise<SchoolSubscription | null> {
    try {
        const record = await (prisma as any).schoolSubscription.findUnique({
            where: { schoolId }
        });
        if (record) {
            return {
                ...record,
                startDate: record.startDate?.toISOString?.() ?? record.startDate,
                endDate: record.endDate?.toISOString?.() ?? record.endDate,
                renewalDate: record.renewalDate?.toISOString?.() ?? record.renewalDate,
                createdAt: record.createdAt?.toISOString?.() ?? record.createdAt,
                updatedAt: record.updatedAt?.toISOString?.() ?? record.updatedAt,
            } as SchoolSubscription;
        }
    } catch {
        // Fallback catch
    }
    // Fallback: JSON db
    const db = readDb() as any;
    return db.schoolSubscriptions?.find((s: SchoolSubscription) => s.schoolId === schoolId) ?? null;
}


// --- UPSERT (create or update) subscription for a school --------------------
export async function upsertSchoolSubscription(
    schoolId: string,
    data: Partial<SchoolSubscription>
): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    
    // 1. Try Prisma first
    try {
        await (prisma as any).schoolSubscription.upsert({
            where: { schoolId },
            create: {
                schoolId,
                price: data.price ?? 0,
                billingCycle: data.billingCycle ?? 'monthly',
                maxStudents: data.maxStudents ?? 500,
                qrTransactionLimit: data.qrTransactionLimit ?? 100,
                modules: data.modules ?? [],
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                endDate: data.endDate ? new Date(data.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
                autoRenew: data.autoRenew ?? false,
                admissionFormTemplateId: data.admissionFormTemplateId ?? null,
                staffFormTemplateId: data.staffFormTemplateId ?? null,
                accessoryTemplateId: data.accessoryTemplateId ?? null,
                templatePackageId: data.templatePackageId ?? null,
                status: data.status ?? 'Active',
                notes: data.notes ?? null,
            },
            update: {
                ...(data.price !== undefined && { price: data.price }),
                ...(data.billingCycle !== undefined && { billingCycle: data.billingCycle }),
                ...(data.maxStudents !== undefined && { maxStudents: data.maxStudents }),
                ...(data.qrTransactionLimit !== undefined && { qrTransactionLimit: data.qrTransactionLimit }),
                ...(data.modules !== undefined && { modules: data.modules }),
                ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
                ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
                ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate ? new Date(data.renewalDate) : null }),
                ...(data.autoRenew !== undefined && { autoRenew: data.autoRenew }),
                ...(data.admissionFormTemplateId !== undefined && { admissionFormTemplateId: data.admissionFormTemplateId }),
                ...(data.staffFormTemplateId !== undefined && { staffFormTemplateId: data.staffFormTemplateId }),
                ...(data.accessoryTemplateId !== undefined && { accessoryTemplateId: data.accessoryTemplateId }),
                ...(data.templatePackageId !== undefined && { templatePackageId: data.templatePackageId }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.notes !== undefined && { notes: data.notes }),
            }
        });
    } catch (e) {
        console.warn('[HYBRID] Prisma upsertSchoolSubscription failed, using local fallback.');
    }

    // 2. Always maintain local data.json fallback
    const db = readDb() as any;
    if (!db.schoolSubscriptions) db.schoolSubscriptions = [];
    const idx = db.schoolSubscriptions.findIndex((s: SchoolSubscription) => s.schoolId === schoolId);
    const existing = idx >= 0 ? db.schoolSubscriptions[idx] : null;
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    const record: SchoolSubscription = {
        id: existing?.id ?? `sub_${Date.now()}`,
        schoolId,
        price: data.price ?? existing?.price ?? 0,
        billingCycle: data.billingCycle ?? existing?.billingCycle ?? 'monthly',
        maxStudents: data.maxStudents ?? existing?.maxStudents ?? 500,
        qrTransactionLimit: data.qrTransactionLimit ?? existing?.qrTransactionLimit ?? 100,
        modules: data.modules ?? existing?.modules ?? [],
        startDate: data.startDate ?? existing?.startDate ?? now,
        endDate: data.endDate ?? existing?.endDate ?? oneYearFromNow,
        renewalDate: data.renewalDate ?? existing?.renewalDate,
        autoRenew: data.autoRenew ?? existing?.autoRenew ?? false,
        admissionFormTemplateId: data.admissionFormTemplateId ?? existing?.admissionFormTemplateId,
        staffFormTemplateId: data.staffFormTemplateId ?? existing?.staffFormTemplateId,
        accessoryTemplateId: data.accessoryTemplateId ?? existing?.accessoryTemplateId,
        templatePackageId: data.templatePackageId ?? existing?.templatePackageId,
        status: data.status ?? existing?.status ?? 'Active',
        notes: data.notes ?? existing?.notes,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
    };
    
    if (idx >= 0) {
        db.schoolSubscriptions[idx] = record;
    } else {
        db.schoolSubscriptions.push(record);
    }
    writeDb(db);
    
    revalidatePath('/super-admin/schools');
    revalidatePath('/super-admin/packages');
    return { success: true };
}

// --- CREATE subscription from a package (template) --------------------------
export async function createSubscriptionFromPackage(
    schoolId: string,
    pkg: SaasPackage,
    overrides: Partial<SchoolSubscription> = {}
): Promise<{ success: boolean }> {
    const startDate = overrides.startDate ?? new Date().toISOString();
    const endMs = new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000;
    const endDate = overrides.endDate ?? new Date(endMs).toISOString();
    return upsertSchoolSubscription(schoolId, {
        price: overrides.price ?? pkg.price,
        billingCycle: overrides.billingCycle ?? (pkg.duration >= 12 ? 'yearly' : 'monthly'),
        maxStudents: overrides.maxStudents ?? pkg.maxStudents,
        qrTransactionLimit: overrides.qrTransactionLimit ?? (pkg.qrTransactionLimit ?? 100),
        modules: overrides.modules ?? pkg.modules,
        startDate,
        endDate,
        admissionFormTemplateId: overrides.admissionFormTemplateId ?? pkg.admissionFormTemplateId,
        staffFormTemplateId: overrides.staffFormTemplateId ?? pkg.staffFormTemplateId,
        accessoryTemplateId: overrides.accessoryTemplateId ?? pkg.accessoryTemplateId,
        templatePackageId: pkg.id,
        status: overrides.status ?? 'Active',
        notes: overrides.notes,
        autoRenew: overrides.autoRenew ?? false,
    });
}

// --- GET all subscriptions ----------------------------------------------------
export async function getSchoolSubscriptions(): Promise<SchoolSubscription[]> {
    try {
        const records = await (prisma as any).schoolSubscription.findMany();
        if (records && records.length > 0) {
            return records.map((r: any) => ({
                ...r,
                startDate: r.startDate?.toISOString?.() ?? r.startDate,
                endDate: r.endDate?.toISOString?.() ?? r.endDate,
                renewalDate: r.renewalDate?.toISOString?.() ?? r.renewalDate,
                createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
                updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
            })) as SchoolSubscription[];
        }
    } catch {
        // Fallback catch
    }
    const db = readDb() as any;
    return db.schoolSubscriptions || [];
}

// --- GET packages with how many schools use each as a template ---------------
export async function getPackagesWithSchoolCount(): Promise<SaasPackage[]> {
    const packages = await prisma.saasPackage.findMany().catch(() => {
        const db = readDb() as any;
        return db.packages ?? [];
    });
    const subs = await getSchoolSubscriptions();
    return packages.map((pkg: any) => ({
        ...pkg,
        schoolsCount: subs.filter(s => s.templatePackageId === pkg.id).length
    }));
}

// ─── MIGRATE existing schools to subscriptions ───────────────────────────────
export async function migrateSchoolsToSubscriptions(): Promise<{ success: boolean }> {
    try {
        const schools = await prisma.school.findMany();
        const packages = await prisma.saasPackage.findMany();
        const subs = await (prisma as any).schoolSubscription.findMany();
        
        for (const school of schools) {
            const exists = subs.find((s: any) => s.schoolId === school.id);
            if (!exists && school.packageId) {
                const pkg = packages.find((p: any) => p.id === school.packageId);
                if (pkg) {
                    await createSubscriptionFromPackage(school.id, pkg);
                }
            }
        }
    } catch {
        // Fallback JSON db
        const db = readDb() as any;
        if (!db.schoolSubscriptions) db.schoolSubscriptions = [];
        const schools = db.schools || [];
        const packages = db.packages || [];
        const subs = db.schoolSubscriptions;
        
        let changed = false;
        for (const school of schools) {
            const exists = subs.find((s: any) => s.schoolId === school.id);
            if (!exists && school.packageId) {
                const pkg = packages.find((p: any) => p.id === school.packageId);
                if (pkg) {
                    const today = new Date().toISOString();
                    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                    subs.push({
                        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        schoolId: school.id,
                        price: pkg.price,
                        billingCycle: pkg.duration >= 12 ? 'yearly' : 'monthly',
                        maxStudents: school.maxStudents ?? pkg.maxStudents ?? 500,
                        qrTransactionLimit: pkg.qrTransactionLimit ?? 100,
                        modules: pkg.modules ?? [],
                        startDate: today,
                        endDate: oneYearFromNow,
                        status: 'Active',
                        templatePackageId: pkg.id,
                        autoRenew: false,
                        createdAt: today,
                        updatedAt: today
                    });
                    changed = true;
                }
            }
        }
        if (changed) {
            writeDb(db);
        }
    }
    return { success: true };
}

// ─── COMPUTE subscription urgency ────────────────────────────────────────────
export async function computeSubscriptionStatus(sub: SchoolSubscription): Promise<{
    daysRemaining: number;
    urgency: 'ok' | 'warning' | 'critical' | 'expired';
}> {
    const now = Date.now();
    const end = new Date(sub.endDate).getTime();
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    let urgency: 'ok' | 'warning' | 'critical' | 'expired' = 'ok';
    if (daysRemaining <= 0) urgency = 'expired';
    else if (daysRemaining <= 7) urgency = 'critical';
    else if (daysRemaining <= 30) urgency = 'warning';
    return { daysRemaining, urgency };
}


