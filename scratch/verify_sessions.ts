
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Session and Student Data ---');
    
    // 1. Check for the session
    const sessions = await prisma.session.findMany({
        where: { name: '2027-2028' }
    });
    
    console.log('\nSessions found for "2027-2028":');
    console.table(sessions.map(s => ({ id: s.id, name: s.name, isCurrent: s.isCurrent })));

    if (sessions.length === 0) {
        console.log('WARNING: No session record found with the name "2027-2028"');
    }

    // 2. Check for the students
    const students = await prisma.student.findMany({
        where: {
            name: {
                in: ['std_lkg', 'Cool', 'Pool']
            }
        }
    });

    console.log('\nStudents found:');
    const tableData = students.map(st => {
        const sessionMatch = sessions.find(s => s.id === st.currentSessionId);
        return {
            name: st.name,
            admission: st.admissionNumber,
            sessionId: st.currentSessionId,
            sessionNameMatch: sessionMatch ? sessionMatch.name : 'NO MATCH',
            status: st.status
        };
    });
    console.table(tableData);

    // 3. Overall check
    const sessionId = sessions[0]?.id;
    const missingSession = students.filter(s => s.currentSessionId !== sessionId);
    
    if (missingSession.length === 0 && students.length === 3) {
        console.log('\n✅ VERIFIED: All 3 students are correctly linked to the "2027-2028" session.');
    } else {
        console.log('\n❌ DISCREPANCY DETECTED:');
        if (students.length !== 3) {
            console.log(`- Expected 3 students, found ${students.length}.`);
        }
        if (missingSession.length > 0) {
            console.log(`- ${missingSession.length} student(s) have a different sessionId than the 2027-2028 record.`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
