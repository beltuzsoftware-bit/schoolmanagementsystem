
import { readDb, writeDb } from '../lib/db';
import { User } from '../types';

async function repairUsers() {
    console.log('--- Starting User Repair Script ---');
    const db = readDb();
    let fixedCount = 0;

    for (const school of db.schools) {
        if (school.admins && school.admins.length > 0) {
            const adminEmail = school.admins[0];
            const existingUser = db.users.find(u => u.email === adminEmail);

            if (!existingUser) {
                console.log(`Fixing missing user for school: ${school.name} (${adminEmail})`);

                const newUser: User = {
                    id: `u_repair_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    name: `${school.name} Admin`,
                    email: adminEmail,
                    password: 'password123', // Default password
                    role: 'SCHOOL_ADMIN',
                    schoolId: school.id,
                    avatar: '/logo_placeholder.png',
                    status: 'Active'
                };

                db.users.push(newUser);
                fixedCount++;
            }
        }
    }

    if (fixedCount > 0) {
        writeDb(db);
        console.log(`✅ successfully created ${fixedCount} missing admin users.`);
    } else {
        console.log('✅ No missing users found.');
    }
}

repairUsers().catch(console.error);
