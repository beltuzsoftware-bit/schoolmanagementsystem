'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { AccessoryTemplate, AccessoryCategory, AccessoryItem, AccessoryFieldConfig, AccessorySale } from '@/types';
import { revalidatePath } from 'next/cache';

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

export async function getAccessoryTemplates() {
    const db = readDb();
    return db.accessoryTemplates || [];
}

export async function addAccessoryTemplate(template: Omit<AccessoryTemplate, 'id'>) {
    const db = readDb();
    if (!db.accessoryTemplates) db.accessoryTemplates = [];
    const newTemplate: AccessoryTemplate = { ...template, id: `tmpl_acc_${Date.now()}` };
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

export async function assignAccessoryTemplateToSchool(schoolId: string, templateId: string) {
    const db = readDb();
    const template = db.accessoryTemplates.find(t => t.id === templateId);
    if (!template) return { success: false, error: 'Template not found' };
    const baseConfig = template.fieldConfig || [];
    const mergedConfig = [...DEFAULT_ACCESSORY_FIELDS].map(def => {
        const existing = baseConfig.find(eb => eb.fieldName === def.fieldName);
        return existing ? { ...def, isVisible: existing.isVisible } : def;
    });
    const accessories = {
        categories: JSON.parse(JSON.stringify(template.categories)),
        items: template.defaultItems ? JSON.parse(JSON.stringify(template.defaultItems)) : [],
        fieldConfig: mergedConfig
    };
    try {
        let existing = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!existing) existing = await prisma.school.findUnique({ where: { schoolId } });
        if (existing) {
            await prisma.school.update({ where: { id: existing.id }, data: { accessoryTemplateId: templateId, accessories: accessories as any } });
            revalidatePath(`/school-admin/fees/accessories`);
            revalidatePath(`/super-admin/modules/accessories`);
            return { success: true };
        }
        throw new Error('School not found in Prisma');
    } catch (error: any) {
        const school = db.schools.find(s => s.id === schoolId || s.schoolId === schoolId);
        if (!school) return { success: false, error: `School not found: ${schoolId}` };
        school.accessoryTemplateId = templateId;
        school.accessories = accessories;
        writeDb(db);
        revalidatePath(`/school-admin/fees/accessories`);
        revalidatePath(`/super-admin/modules/accessories`);
        return { success: true };
    }
}

export async function updateSchoolAccessories(schoolId: string, accessories: { categories: AccessoryCategory[], items: AccessoryItem[], fieldConfig: AccessoryFieldConfig[] }) {
    try {
        let existing = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!existing) existing = await prisma.school.findUnique({ where: { schoolId } });
        if (existing) {
            await prisma.school.update({ where: { id: existing.id }, data: { accessories: accessories as any } });
            revalidatePath(`/school-admin/fees/accessories`);
            return { success: true };
        }
        throw new Error('School not found in Prisma');
    } catch (error: any) {
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId || s.schoolId === schoolId);
        if (index === -1) return { success: false, error: `School not found: ${schoolId}` };
        db.schools[index].accessories = accessories;
        writeDb(db);
        revalidatePath(`/school-admin/fees/accessories`);
        return { success: true };
    }
}

export async function updateSchoolAccessorySettings(schoolId: string, config: AccessoryFieldConfig[]) {
    try {
        let existing = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!existing) existing = await prisma.school.findUnique({ where: { schoolId } });
        if (!existing) throw new Error('School not found in Prisma');
        const accessories = (existing.accessories as any) || { categories: [], items: [], fieldConfig: [] };
        accessories.fieldConfig = config;
        await prisma.school.update({ where: { id: existing.id }, data: { accessories } });
        revalidatePath('/school-admin/fees/accessories');
        return { success: true };
    } catch (error: any) {
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId || s.schoolId === schoolId);
        if (index === -1) return { success: false, error: `School not found: ${schoolId}` };
        if (!db.schools[index].accessories) db.schools[index].accessories = { categories: [], items: [], fieldConfig: [] };
        db.schools[index].accessories!.fieldConfig = config;
        writeDb(db);
        revalidatePath('/school-admin/fees/accessories');
        return { success: true };
    }
}

export async function updateSchoolAccessoryCategories(schoolId: string, categories: AccessoryCategory[]) {
    try {
        let existing = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!existing) existing = await prisma.school.findUnique({ where: { schoolId } });
        if (!existing) throw new Error('School not found in Prisma');
        const accessories = (existing.accessories as any) || { categories: [], items: [], fieldConfig: [] };
        accessories.categories = categories;
        await prisma.school.update({ where: { id: existing.id }, data: { accessories } });
        revalidatePath('/school-admin/fees/accessories');
        return { success: true };
    } catch (error: any) {
        const db = readDb();
        const index = db.schools.findIndex(s => s.id === schoolId || s.schoolId === schoolId);
        if (index === -1) return { success: false, error: `School not found: ${schoolId}` };
        if (!db.schools[index].accessories) db.schools[index].accessories = { categories: [], items: [], fieldConfig: [] };
        db.schools[index].accessories!.categories = categories;
        writeDb(db);
        revalidatePath('/school-admin/fees/accessories');
        return { success: true };
    }
}

export async function addAccessorySale(schoolId: string, sale: AccessorySale) {
    const db = readDb();
    if (!db.accessorySales) db.accessorySales = [];
    db.accessorySales.push(sale);

    try {
        let schoolRecord = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!schoolRecord) schoolRecord = await prisma.school.findUnique({ where: { schoolId: schoolId } });

        if (schoolRecord) {
            const accessories = (schoolRecord.accessories as any);
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
                    where: { id: schoolRecord.id },
                    data: { accessories: accessories as any }
                });
                
                // Also sync to data.json school accessories
                const schoolIndex = db.schools.findIndex(s => s.id === schoolId || s.schoolId === schoolId);
                if (schoolIndex >= 0) {
                    db.schools[schoolIndex].accessories = accessories;
                }
            }
        } else {
            throw new Error('School not found in Prisma');
        }
    } catch (prismaErr) {
        const schoolIndex = db.schools.findIndex(s => s.id === schoolId || s.schoolId === schoolId);
        if (schoolIndex === -1) return { success: false, error: 'School not found in inventory database' };
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
        return { success: false, error: 'Failed to save sale to database' };
    }
}

export async function getAccessorySales(schoolId: string) {
    const db = readDb();
    if (!db.accessorySales) return [];
    return db.accessorySales.filter(s => s.schoolId === schoolId);
}

export async function getDashboardStats() {
    const db = readDb();
    const schools = db.schools || [];
    const packages = db.packages || [];
    const totalSchools = schools.length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);
    const totalRevenue = schools.reduce((acc, s) => {
        const pkg = packages.find(p => p.id === s.packageId);
        return acc + (pkg ? pkg.price : 0);
    }, 0);
    const recentSchools = [...schools]
        .sort((a, b) => parseInt(b.id.split('_')[1] || '0') - parseInt(a.id.split('_')[1] || '0'))
        .slice(0, 5);
    return { totalSchools, totalStudents, totalRevenue, recentSchools };
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
