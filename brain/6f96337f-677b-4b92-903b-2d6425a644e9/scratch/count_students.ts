
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function count() {
    // 1. JSON count
    let jsonCount = 0;
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        jsonCount = data.students?.length || 0;
    } catch (e) {}

    // 2. Prisma count
    let prismaCount = 0;
    try {
        prismaCount = await prisma.student.count();
    } catch (e) {}

    console.log(`JSON Students: ${jsonCount}`);
    console.log(`Prisma Students: ${prismaCount}`);
}

count().finally(() => prisma.$disconnect());
