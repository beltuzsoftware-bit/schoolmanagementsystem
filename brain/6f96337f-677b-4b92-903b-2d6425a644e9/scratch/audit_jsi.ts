
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const schoolId = 's_1776494594378';
    const students = await prisma.student.findMany({
        where: { schoolId },
        select: {
            id: true,
            name: true,
            className: true,
            section: true,
            currentSessionId: true,
            admissionNumber: true
        }
    });

    console.log(JSON.stringify(students, null, 2));

    const school = await prisma.school.findFirst({
        where: { schoolId },
        select: {
            currentSession: true,
            name: true
        }
    });
    console.log('School:', JSON.stringify(school, null, 2));

    const sessions = await prisma.session.findMany({
        where: { schoolId: 's_1776494594378' } // Wait, schoolId in session table might be the school's ID, not schoolUID
    });
    // In schema, schoolId in Session model is the id of School, which is same as schoolId in some places.
    // Wait, schoolId field in Student is the schoolId (UID).
    
    console.log('Sessions:', JSON.stringify(sessions, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
