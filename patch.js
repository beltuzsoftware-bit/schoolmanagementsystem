const fs = require('fs');
const path = require('path');

const actionsPath = path.join(__dirname, 'src/app/actions.ts');
const content = fs.readFileSync(actionsPath, 'utf-8');
const lines = content.split('\n');

// Find the end of searchStudents
const searchStudentsIndex = lines.findIndex(l => l.includes('export async function searchStudents'));
let searchStudentsEnd = -1;
for (let i = searchStudentsIndex; i < lines.length; i++) {
    if (lines[i].includes('return students;')) {
        searchStudentsEnd = i + 1; // pointing to the closing '}'
        break;
    }
}

// Find STAFF PROFILES comment that normally exists right after add/update/delete/import functions
const staffProfilesIndex = lines.findIndex(l => l.includes('export async function getStaffProfiles'));
// Look backwards for the import that is supposed to be right before getStaffProfiles
let staffImportIndex = staffProfilesIndex;
while(staffImportIndex > 0 && !lines[staffImportIndex].includes('import { StaffProfile')) {
    staffImportIndex--;
}
if(staffImportIndex === 0) staffImportIndex = staffProfilesIndex;

const top = lines.slice(0, searchStudentsEnd + 1).join('\n');
const bottom = lines.slice(staffImportIndex).join('\n');

const insertedBlock = `
export async function addStudent(studentData: Partial<Student>) {
    const db = readDb();
    if (!db.students) db.students = [];

    // Validation
    if (!studentData.name || !studentData.schoolId) {
        return { success: false, error: 'Missing required fields' };
    }

    const schoolIndex = db.schools.findIndex((s: any) => s.id === studentData.schoolId);
    if (schoolIndex === -1) return { success: false, error: 'School not found' };
    const school = db.schools[schoolIndex];

    // Auto-generate fields based on settings
    const idSettingsMap: Record<string, string> = {
        registrationNo: 'regNoSettings',
        enrollmentNo: 'enrollNoSettings',
        apaarId: 'apaarIdSettings',
        penNo: 'penNoSettings',
        srNo: 'srNoSettings',
        generalRegistrationNo: 'genRegNoSettings',
        rollNumber: 'rollNoSettings'
    };

    Object.entries(idSettingsMap).forEach(([field, settingKey]) => {
        const settings = (school as any)[settingKey];
        if (!(studentData as any)[field] && settings) {
            // Handle Enrollment Same as RegNo logic
            if (field === 'enrollmentNo' && settings.useSameAsRegNo && studentData.registrationNo) {
                studentData.enrollmentNo = studentData.registrationNo;
            } else {
                (studentData as any)[field] = generateNextId(settings);
                settings.currentSerial = (settings.currentSerial < settings.startFrom ? settings.startFrom : settings.currentSerial + 1);
            }
        }
    });

    // Default Admission Number if missing (fallback to Reg No or specific logic)
    if (!studentData.admissionNumber) {
        studentData.admissionNumber = studentData.registrationNo || \`ADM-\${Date.now()}\`;
    }

    // Validate Uniqueness
    if (studentData.admissionNumber) {
        const isDuplicateDate = db.students.some((s: Record<string, any>) => s.schoolId === studentData.schoolId && s.admissionNumber === studentData.admissionNumber);
        if (isDuplicateDate) {
            return { success: false, error: \`Admission Number \${studentData.admissionNumber} already exists. Please use a unique number.\` };
        }
    }

    // Construct full name
    const name = \`\${studentData.firstName || ''} \${studentData.lastName || ''}\`.trim();

    const newStudent: Student = {
        id: \`stu_\${Date.now()}\`,
        status: 'Active',
        currentSessionId: studentData.currentSessionId || school.currentSession || '',
        ...studentData,
        name,
        gender: studentData.gender?.toLowerCase()
    } as Student;

    db.students.push(newStudent);

    // Update school student count
    school.studentCount = (school.studentCount || 0) + 1;

    writeDb(db);
    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/students');
    return { success: true, student: newStudent };
}

export async function importStudentsBatch(schoolId: string, studentsData: Partial<Student>[]) {
    const db = readDb();
    if (!db.students) db.students = [];

    const schoolIndex = db.schools.findIndex((s: any) => s.id === schoolId);
    if (schoolIndex === -1) return { success: false, error: 'School not found' };
    const school = db.schools[schoolIndex];

    let successCount = 0;
    
    // Auto-generate fields based on settings
    const idSettingsMap: Record<string, string> = {
        registrationNo: 'regNoSettings',
        enrollmentNo: 'enrollNoSettings',
        apaarId: 'apaarIdSettings',
        penNo: 'penNoSettings',
        srNo: 'srNoSettings',
        generalRegistrationNo: 'genRegNoSettings',
        rollNumber: 'rollNoSettings'
    };

    for (const studentData of studentsData) {
        if (!studentData.firstName && !studentData.lastName && !studentData.name) continue; // Skip completely empty rows

        Object.entries(idSettingsMap).forEach(([field, settingKey]) => {
            const settings = (school as any)[settingKey];
            if (!(studentData as any)[field] && settings) {
                if (field === 'enrollmentNo' && settings.useSameAsRegNo && studentData.registrationNo) {
                    studentData.enrollmentNo = studentData.registrationNo;
                } else {
                    (studentData as any)[field] = generateNextId(settings);
                    settings.currentSerial = (settings.currentSerial < settings.startFrom ? settings.startFrom : settings.currentSerial + 1);
                }
            }
        });

        if (!studentData.admissionNumber) {
            studentData.admissionNumber = studentData.registrationNo || \`ADM-\${Date.now()}-\${successCount}\`;
        }

        // Validate Uniqueness
        if (studentData.admissionNumber) {
            const isDuplicate = db.students.some((s: Record<string, any>) => s.schoolId === schoolId && s.admissionNumber === studentData.admissionNumber);
            if (isDuplicate) {
                return { success: false, error: \`Duplicate Admission Number found: \${studentData.admissionNumber}. Import aborted to prevent duplicate records.\` };
            }
        }

        const name = studentData.name || \`\${studentData.firstName || ''} \${studentData.lastName || ''}\`.trim();

        const newStudent: Student = {
            ...studentData,
            id: \`stu_\${Date.now()}_\${successCount}_\${Math.random().toString(36).substr(2, 5)}\`,
            status: 'Active',
            currentSessionId: studentData.currentSessionId || school.currentSession || '',
            schoolId: schoolId,
            name,
            gender: studentData.gender?.toLowerCase()
        } as Student;

        db.students.push(newStudent);
        school.studentCount = (school.studentCount || 0) + 1;
        successCount++;
    }

    writeDb(db);
    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/students');
    return { success: true, count: successCount };
}

export async function updateStudent(id: string, data: Partial<Student>) {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    const index = db.students.findIndex((s: any) => s.id === id);
    if (index === -1) return { success: false, error: 'Student not found' };

    const student = db.students[index];
    const updatedData = { ...data };

    // Sync name if names are being updated
    if (data.firstName !== undefined || data.lastName !== undefined) {
        const fName = data.firstName !== undefined ? data.firstName : student.firstName;
        const lName = data.lastName !== undefined ? data.lastName : student.lastName;
        updatedData.name = \`\${fName || ''} \${lName || ''}\`.trim();
    }

    // Normalize gender
    if (data.gender) {
        updatedData.gender = data.gender.toLowerCase();
    }

    db.students[index] = { ...student, ...updatedData };
    writeDb(db);
    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    revalidatePath('/school-admin/students');
    return { success: true };
}

export async function deleteStudent(id: string) {
    const db = readDb();
    if (!db.students) return { success: false, error: 'Database error' };

    const index = db.students.findIndex((s: any) => s.id === id);
    if (index === -1) return { success: false, error: 'Student not found' };

    db.students.splice(index, 1);
    writeDb(db);
    revalidatePath('/school-admin/id-cards');
    revalidatePath('/school-admin/admissions');
    return { success: true };
}

import { StaffProfile, AttendanceRecord, AttendanceMaster } from '@/types/staff';

// --- STAFF PROFILES ---
`;

fs.writeFileSync(actionsPath, top + '\n' + insertedBlock + '\n' + bottom);
console.log('Fixed syntax perfectly.');
