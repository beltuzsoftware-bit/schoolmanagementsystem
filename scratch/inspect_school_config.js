const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const school = await prisma.school.findFirst({
        where: { id: "s_1780586158265" }
    });
    console.log("School:", JSON.stringify(school, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
