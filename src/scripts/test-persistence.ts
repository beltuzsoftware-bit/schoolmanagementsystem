
import { readDb, writeDb } from '../lib/db';
import { SaasPackage, School } from '../types';

async function testPersistence() {
    console.log('--- Starting Persistence Test ---');
    const timestamp = Date.now();

    // 1. Read Initial State
    const dbInitial = readDb();
    console.log('Initial Packages:', dbInitial.packages.length);
    console.log('Initial Schools:', dbInitial.schools.length);

    // 2. Add a Test Package
    const newPackage: SaasPackage = {
        id: `p_pers_${timestamp}`,
        name: 'Persistence Package',
        price: 100,
        color: 'bg-green-500',
        description: 'Test Package',
        maxStudents: 50,
        duration: 12,
        modules: ['m1']
    };

    console.log('Adding Package:', newPackage.name);
    dbInitial.packages.push(newPackage);
    writeDb(dbInitial); // Save to file

    // 3. Re-read DB (Simulate new request)
    const dbAfterPackage = readDb();
    if (!dbAfterPackage.packages.find(p => p.id === newPackage.id)) {
        console.error('❌ Package Persistence Failed!');
        process.exit(1);
    } else {
        console.log('✅ Package Persisted.');
    }

    // 4. Add a Test School using that Package
    const testSchool: School = {
        id: `s_pers_${timestamp}`,
        schoolId: 'SCH-PERS-001',
        name: 'Persistence Test School',
        code: 'PERS01',
        address: 'Test Addr',
        contactNumber: '0000000000',
        email: 'pers@test.com',
        logo: '',
        packageId: newPackage.id, // Use the newly created package ID
        studentCount: 0,
        isActive: true,
        admins: ['pers@test.com']
    };

    console.log('Adding School:', testSchool.name);
    dbAfterPackage.schools.push(testSchool);
    writeDb(dbAfterPackage);

    // 5. Verify School Persisted
    const dbFinal = readDb();
    if (!dbFinal.schools.find(s => s.id === testSchool.id)) {
        console.error('❌ School Persistence Failed!');
    } else {
        console.log('✅ School Persisted.');
    }
}

testPersistence().catch(console.error);
