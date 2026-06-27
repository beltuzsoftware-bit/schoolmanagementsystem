'use server';

import { readDb, writeDb } from '@/lib/db';
import { ClassSubjectAllocation } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getClassAllocations(): Promise<ClassSubjectAllocation[]> {
    const db = readDb();
    return db.classAllocations || [];
}

export async function getClassAllocation(className: string): Promise<ClassSubjectAllocation | undefined> {
    const db = readDb();
    return (db.classAllocations || []).find(a => a.className === className);
}

export async function saveClassAllocation(allocation: ClassSubjectAllocation): Promise<{ success: boolean; message: string }> {
    const db = readDb();

    const index = (db.classAllocations || []).findIndex(a => a.className === allocation.className);

    if (index !== -1) {
        db.classAllocations[index] = allocation;
    } else {
        if (!db.classAllocations) db.classAllocations = [];
        db.classAllocations.push(allocation);
    }

    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Class subject allocation saved successfully' };
}
