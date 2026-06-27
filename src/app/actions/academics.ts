'use server';

import { readDb, writeDb } from '@/lib/db';
import { Subject, SubjectGroup, SubjectGroupType } from '@/types';
import { revalidatePath } from 'next/cache';

// --- SUBJECT GROUPS ---

export async function getSubjectGroups(): Promise<SubjectGroup[]> {
    const db = readDb();
    return db.subjectGroups || [];
}

export async function createSubjectGroup(formData: FormData): Promise<{ success: boolean; message: string }> {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as 'Core Subject' | 'Elective' | 'Optional';

    if (!name) {
        return { success: false, message: 'Name is required' };
    }

    const db = readDb();
    const newGroup: SubjectGroup = {
        id: `sg_${Date.now()}`,
        name,
        description,
        category: category || 'Core Subject'
    };

    if (!db.subjectGroups) db.subjectGroups = [];
    db.subjectGroups.push(newGroup);
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject Group created' };
}

export async function updateSubjectGroup(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as 'Core Subject' | 'Elective' | 'Optional';

    const db = readDb();
    const index = db.subjectGroups.findIndex(g => g.id === id);

    if (index === -1) {
        return { success: false, message: 'Group not found' };
    }

    db.subjectGroups[index] = {
        ...db.subjectGroups[index],
        name,
        description,
        category: category || 'Core Subject'
    };
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject Group updated' };
}

export async function deleteSubjectGroup(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    const initialLength = db.subjectGroups.length;
    db.subjectGroups = db.subjectGroups.filter(g => g.id !== id);

    if (db.subjectGroups.length === initialLength) {
        return { success: false, message: 'Group not found' };
    }

    // Also remove group reference from subjects? Or keep it? keeping it for now.
    // Ideally we should check if subjects are using it.

    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject Group deleted' };
}

// --- SUBJECTS ---

export async function getSubjects(): Promise<Subject[]> {
    const db = readDb();
    return db.subjects || [];
}

export async function createSubject(formData: FormData): Promise<{ success: boolean; message: string }> {
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const type = formData.get('type') as 'Theory' | 'Practical';
    const category = formData.get('category') as 'Core Subject' | 'Elective' | 'Optional';
    const subjectGroupId = formData.get('subjectGroupId') as string;

    if (!name || !code || !type) {
        return { success: false, message: 'Missing required fields' };
    }

    const db = readDb();
    const newSubject: Subject = {
        id: `sub_${Date.now()}`,
        name,
        code,
        type,
        category: category || 'Core Subject',
        subjectGroupId: subjectGroupId || undefined
    };

    if (!db.subjects) db.subjects = [];
    db.subjects.push(newSubject);
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject created' };
}

export async function updateSubject(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const type = formData.get('type') as 'Theory' | 'Practical';
    const category = formData.get('category') as 'Core Subject' | 'Elective' | 'Optional';
    const subjectGroupId = formData.get('subjectGroupId') as string;

    const db = readDb();
    const index = db.subjects.findIndex(s => s.id === id);

    if (index === -1) {
        return { success: false, message: 'Subject not found' };
    }

    db.subjects[index] = {
        ...db.subjects[index],
        name,
        code,
        type,
        category: category || 'Core Subject',
        subjectGroupId: subjectGroupId || undefined
    };
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject updated' };
}

export async function deleteSubject(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    const initialLength = db.subjects.length;
    db.subjects = db.subjects.filter(s => s.id !== id);

    if (db.subjects.length === initialLength) {
        return { success: false, message: 'Subject not found' };
    }

    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    return { success: true, message: 'Subject deleted' };
}

// --- SUBJECT GROUP TYPES ---

export async function getSubjectGroupTypes(): Promise<SubjectGroupType[]> {
    const db = readDb();
    return db.subjectGroupTypes || [];
}

export async function saveSubjectGroupType(category: SubjectGroupType): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.subjectGroupTypes) db.subjectGroupTypes = [];
    
    const index = db.subjectGroupTypes.findIndex(c => c.id === category.id);
    if (index !== -1) {
        db.subjectGroupTypes[index] = category;
    } else {
        db.subjectGroupTypes.push(category);
    }
    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    revalidatePath('/school-admin/academics/subjects/settings');
    return { success: true, message: 'Group Type saved successfully' };
}

export async function deleteSubjectGroupType(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.subjectGroupTypes) db.subjectGroupTypes = [];
    
    const initialLength = db.subjectGroupTypes.length;
    db.subjectGroupTypes = db.subjectGroupTypes.filter(c => c.id !== id);
    
    if (db.subjectGroupTypes.length === initialLength) {
        return { success: false, message: 'Group Type not found' };
    }
    
    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    revalidatePath('/school-admin/academics/subjects/settings');
    return { success: true, message: 'Group Type deleted successfully' };
}

export async function createSubjects(subjectsList: Omit<Subject, 'id'>[]): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.subjects) db.subjects = [];
    
    subjectsList.forEach((sub, i) => {
        const newSubject: Subject = {
            ...sub,
            id: `sub_${Date.now()}_${i}`
        };
        db.subjects.push(newSubject);
    });
    
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: `${subjectsList.length} subjects created successfully` };
}

export async function saveSubjectsOrder(subjectIds: string[]): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.subjects) db.subjects = [];
    
    const subjectMap = new Map(db.subjects.map(s => [s.id, s]));
    
    const reorderedSubjects: Subject[] = [];
    subjectIds.forEach(id => {
        const sub = subjectMap.get(id);
        if (sub) {
            reorderedSubjects.push(sub);
            subjectMap.delete(id);
        }
    });
    
    subjectMap.forEach(sub => {
        reorderedSubjects.push(sub);
    });
    
    db.subjects = reorderedSubjects;
    writeDb(db);
    revalidatePath('/school-admin/academics/subjects');
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: 'Subjects order updated successfully' };
}
