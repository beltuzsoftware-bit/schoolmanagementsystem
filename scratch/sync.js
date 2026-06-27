require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.cwd(), 'data.json');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function sync() {
    console.log('Fetching users from Prisma...');
    const prismaUsers = await prisma.user.findMany();
    console.log(`Found ${prismaUsers.length} users in Prisma.`);

    if (!fs.existsSync(DB_PATH)) {
        console.error('data.json not found!');
        return;
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!db.users) db.users = [];

    let addedCount = 0;
    for (const user of prismaUsers) {
        if (!db.users.some(u => u.id === user.id)) {
            db.users.push(user);
            addedCount++;
        }
    }

    if (addedCount > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log(`Successfully synced ${addedCount} missing users into data.json!`);
    } else {
        console.log('All users are already in sync!');
    }
}

sync()
    .catch(console.error)
    .finally(() => {
        prisma.$disconnect();
        pool.end();
    });
