
import { readDb, writeDb } from '../lib/db';
import { SaasPackage, School } from '../types';

async function testCrud() {
    console.log('--- Starting CRUD Verification Test ---');

    const timestamp = Date.now();

    // 1. Create Package
    const newPackage: SaasPackage = {
        id: 'test-pkg-1',
        name: 'Test Package',
        price: 999,
        color: 'bg-blue-500',
        description: 'A test package',
        maxStudents: 100,
        duration: 12,
        modules: ['m1', 'm2']
    };

    console.log(`Creating Package: ${newPackage.name}`);
    const db1 = readDb();
    db1.packages.push(newPackage);
    writeDb(db1);

    // 2. Update Package
    console.log('Updating Package...');
    const db2 = readDb();
    const pkgIndex = db2.packages.findIndex(p => p.id === newPackage.id);
    if (pkgIndex !== -1) {
        db2.packages[pkgIndex].name = 'Updated CRUD Package';
        writeDb(db2);
        console.log('✅ Package Update written.');
    } else {
        console.error('❌ Package not found for update.');
    }

    // 3. Create School
    const newSchool: School = {
        id: `s_crud_${Date.now()}`,
        schoolId: 'SCH-TEST-001',
        name: 'CRUD School',
        code: 'CS01',
        address: '123 Test St',
        contactNumber: '1234567890',
        email: 'crud@school.com',
        logo: '',
        packageId: newPackage.id,
        studentCount: 0,
        isActive: true,
        admins: []
    };

    console.log(`Creating School: ${newSchool.name}`);
    const db3 = readDb();
    db3.schools.push(newSchool);
    writeDb(db3);

    // 4. Update School
    console.log('Updating School...');
    const db4 = readDb();
    const schoolIndex = db4.schools.findIndex(s => s.id === newSchool.id);
    if (schoolIndex !== -1) {
        db4.schools[schoolIndex].name = 'Updated CRUD School';
        writeDb(db4);
        console.log('✅ School Update written.');
    } else {
        console.error('❌ School not found for update.');
    }

    // 5. Delete School
    console.log('Deleting School...');
    const db5 = readDb();
    const schoolDelIndex = db5.schools.findIndex(s => s.id === newSchool.id);
    if (schoolDelIndex !== -1) {
        db5.schools.splice(schoolDelIndex, 1);
        writeDb(db5);

        // Verify delete
        const dbVerify = readDb();
        if (!dbVerify.schools.find(s => s.id === newSchool.id)) {
            console.log('✅ School Delete verified.');
        } else {
            console.error('❌ School Delete FAILED.');
        }
    }

    // 6. Delete Package
    console.log('Deleting Package...');
    const db6 = readDb();
    const pkgDelIndex = db6.packages.findIndex(p => p.id === newPackage.id);
    if (pkgDelIndex !== -1) {
        db6.packages.splice(pkgDelIndex, 1);
        writeDb(db6);

        // Verify delete
        const dbVerify2 = readDb();
        if (!dbVerify2.packages.find(p => p.id === newPackage.id)) {
            console.log('✅ Package Delete verified.');
        } else {
            console.error('❌ Package Delete FAILED.');
        }
    }
}

testCrud().catch(console.error);
