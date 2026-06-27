
import { readDb, writeDb } from '../lib/db';
import { addSchool } from '../app/actions';
import { School } from '../types';

async function testPasswordCreation() {
    console.log('--- Starting Password Creation Verification ---');

    const timestamp = Date.now();
    const customPassword = 'SecretPassword123!';

    const schoolData: School = {
        id: `s_pwd_${timestamp}`,
        schoolId: 'SCH-PWD-001',
        name: 'Password Test School',
        code: 'PWD01',
        address: 'Test Addr',
        contactNumber: '0000000000',
        email: 'admin@passwordtest.com',
        logo: '',
        packageId: 'p1', // Assuming p1 exists
        studentCount: 0,
        isActive: true,
        admins: ['admin@passwordtest.com']
    };

    console.log(`Creating School: ${schoolData.name} with password: ${customPassword}`);

    // Call the action directly
    await addSchool(schoolData, customPassword);

    // Verify
    const db = readDb();
    const createdUser = db.users.find(u => u.email === schoolData.email);

    if (createdUser) {
        console.log('✅ Admin User created.');
        if (createdUser.password === customPassword) {
            console.log('✅ Password matched custom password.');
        } else {
            console.error(`❌ Password Mismatch! Expected: ${customPassword}, Found: ${createdUser.password}`);
        }
    } else {
        console.error('❌ Admin User NOT created.');
    }
}

testPasswordCreation().catch(console.error);
