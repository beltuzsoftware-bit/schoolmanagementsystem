const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const templates = await prisma.admissionFormTemplate.findMany();
    console.log('TEMPLATES:', JSON.stringify(templates, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
