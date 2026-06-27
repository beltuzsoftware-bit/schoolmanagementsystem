'use server';

import { readDb, writeDb } from '@/lib/db';
import { CurriculumTemplate, ClassSubjectAllocation } from '@/types';
import { revalidatePath } from 'next/cache';

// --- CURRICULUM TEMPLATES ---

export async function getCurriculumTemplates(): Promise<CurriculumTemplate[]> {
    const db = readDb();
    return db.curriculumTemplates || [];
}

export async function saveCurriculumTemplate(template: CurriculumTemplate): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.curriculumTemplates) db.curriculumTemplates = [];

    const index = db.curriculumTemplates.findIndex(t => t.id === template.id);
    if (index !== -1) {
        db.curriculumTemplates[index] = template;
    } else {
        db.curriculumTemplates.push(template);
    }

    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: 'Curriculum Template saved' };
}

export async function deleteCurriculumTemplate(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    db.curriculumTemplates = (db.curriculumTemplates || []).filter(t => t.id !== id);
    
    // Also remove assignments using this template
    db.classAllocations = (db.classAllocations || []).filter(a => a.templateId !== id);
    
    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: 'Template and its assignments deleted' };
}

// --- CLASS ASSIGNMENTS ---

export async function getClassAllocations(): Promise<ClassSubjectAllocation[]> {
    const db = readDb();
    return db.classAllocations || [];
}

export async function assignTemplateToSelection(
    templateId: string, 
    className: string, 
    section: string, 
    studentIds: string[]
): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.classAllocations) db.classAllocations = [];

    // Unique ID for this specific assignment (Class-Section-Template based)
    const assignmentId = `alloc_${className}_${section}_${templateId}`;
    const index = db.classAllocations.findIndex(a => a.id === assignmentId);

    const newAlloc: ClassSubjectAllocation = {
        id: assignmentId,
        className,
        section,
        templateId,
        studentIds
    };

    if (index !== -1) {
        db.classAllocations[index] = newAlloc;
    } else {
        db.classAllocations.push(newAlloc);
    }

    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: 'Curriculum assigned successfully' };
}

export async function removeStudentFromAssignment(studentId: string, assignmentId: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.classAllocations) return { success: false, message: 'No assignments found' };

    const index = db.classAllocations.findIndex(a => a.id === assignmentId);
    if (index !== -1) {
        const currentIds = db.classAllocations[index].studentIds || [];
        const newIds = currentIds.filter(id => id !== studentId);
        db.classAllocations[index].studentIds = newIds;
        
        // If no students left, maybe remove the assignment entirely? 
        // For now, just save the empty list if that's what happened.
        if (newIds.length === 0) {
            db.classAllocations.splice(index, 1);
        }

        writeDb(db);
        revalidatePath('/school-admin/academics/curriculum');
        return { success: true, message: 'Student removed from group' };
    }

    return { success: false, message: 'Assignment not found' };
}

export async function removeAssignment(className: string, section: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    db.classAllocations = (db.classAllocations || []).filter(a => !(a.className === className && a.section === section));
    writeDb(db);
    revalidatePath('/school-admin/academics/curriculum');
    return { success: true, message: 'Assignment removed' };
}
