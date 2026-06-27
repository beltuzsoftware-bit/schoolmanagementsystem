
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
            enrolledSession: true,
            admissionNumber: true
        }
    });

    console.log('Students Sample (first 5):');
    console.log(JSON.stringify(students.slice(0, 5), null, 2));

    const sessions = await prisma.session.findMany({
        where: { schoolId: 's_1776494594378' }
    });
    console.log('Sessions:', JSON.stringify(sessions, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
