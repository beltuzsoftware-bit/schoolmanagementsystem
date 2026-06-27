const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.student.findUnique({
        where: { id: 'stu_1778757188143' }
    });
    console.log('STUDENT:', JSON.stringify({ name: student.name, className: student.className, section: student.section, schoolId: student.schoolId }, null, 2));

    if (student) {
        const school = await prisma.school.findUnique({
            where: { id: student.schoolId }
        });
        console.log('SCHOOL CLASSES:', JSON.stringify(school.classes, null, 2));
        console.log('SCHOOL ADMISSION FIELD OVERRIDES:', JSON.stringify(school.admissionFieldOverrides, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
