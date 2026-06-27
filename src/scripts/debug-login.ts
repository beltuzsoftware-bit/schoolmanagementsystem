
import { authenticateUser } from '../app/actions';
import { readDb } from '../lib/db';

async function testLogin() {
    console.log('--- Debugging Login for ad@ad.com ---');

    const email = 'ad@ad.com';
    const password = 'password123';

    // 1. Direct DB Check
    const db = readDb();
    const userInDb = db.users.find(u => u.email === email);

    if (userInDb) {
        console.log('✅ User found in DB direct check.');
        console.log(`- Email: ${userInDb.email}`);
        console.log(`- Password in DB: "${userInDb.password}"`);
        console.log(`- Password attempted: "${password}"`);
        console.log(`- Match? ${userInDb.password === password}`);
    } else {
        console.error('❌ User NOT found in DB direct check.');
    }

    // 2. Action Check
    console.log('\nTesting authenticateUser action...');
    const result = await authenticateUser(email, password);

    if (result) {
        console.log('✅ authenticateUser returned SUCCESS.');
        console.log('User:', result);
    } else {
        console.error('❌ authenticateUser returned NULL (Failure).');
    }
}

testLogin().catch(console.error);
