import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const schoolId = process.argv[2] || 's_1777051111204';
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: { admissionFormTemplate: true }
    });

    console.log('--- SCHOOL ---');
    console.log('Name:', school?.name);
    console.log('Template ID:', school?.admissionFormTemplateId);
    console.log('Template Name:', (school as any)?.admissionFormTemplate?.name);
    
    const students = await prisma.student.findMany({
        where: { schoolId },
        take: 5
    });

    console.log('--- STUDENTS (FIRST 5) ---');
    students.forEach(s => {
        console.log(`ID: ${s.id}, Name: ${s.name}, AdmNo: ${s.admissionNumber}, Religion: ${s.religion}, Category: ${s.category}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
