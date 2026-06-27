
import { readDb, writeDb } from '../lib/db';
import { updateSchool, addSchool, getSchoolAdmin, addPackage } from '../app/actions';
import { School, SaasPackage } from '../types';

async function testUpdatePersistence() {
    console.log('--- Starting Update Persistence verification ---');
    const timestamp = Date.now();
    const email = `upd_${timestamp}@test.com`;
    const initialPass = 'InitialPass123';

    // 1. Create a Package first
    const newPackage: SaasPackage = {
        id: `p_upd_${timestamp}`,
        name: 'Update Test Package',
        price: 100,
        color: 'bg-update',
        description: 'Test Package',
        maxStudents: 50,
        duration: 12,
        modules: ['m1']
    };
    await addPackage(newPackage);

    // 2. Create Initial School
    const schoolId = `s_upd_${timestamp}`;
    const testSchool: School = {
        id: schoolId,
        schoolId: 'SCH-UPD-001',
        name: 'Update Test School',
        code: 'UPD01',
        address: 'Test Addr',
        contactNumber: '0000000000',
        email: email,
        logo: '',
        packageId: newPackage.id,
        studentCount: 0,
        isActive: true,
        admins: [email]
    };

    await addSchool(testSchool, initialPass);
    console.log('✅ Created school with pass:', initialPass);

    // 3. Update School
    const newPass = 'UpdatedPass456!';
    console.log('Updating school password to:', newPass);

    await updateSchool(schoolId, { name: 'Update Test School Renamed' }, newPass);

    // 4. Verify Persistence
    // Need to read fresh from DB
    const admin = await getSchoolAdmin(schoolId);

    if (admin) {
        if (admin.password === newPass) {
            console.log('✅ Password successfully updated and persisted:', admin.password);
        } else {
            console.error(`❌ Password Persistence Failed! Expected: ${newPass}, Found: ${admin.password}`);
        }

        if (admin.name.includes('Renamed')) { // Admin name is also updated based on school name
            console.log('✅ Admin name synced with School name.');
        } else {
            console.error('❌ Admin name sync failed.');
        }
    } else {
        console.error('❌ Admin user not found after update.');
    }
}

testUpdatePersistence().catch(console.error);
