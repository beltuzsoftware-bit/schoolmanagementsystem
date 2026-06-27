import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const schoolId = 's_1777051111204'; // From user logs
    console.log('Starting manual update for school:', schoolId);
    
    try {
        const result = await prisma.school.update({
            where: { id: schoolId },
            data: {
                feeCollectionTemplate: 'template_2'
            }
        });
        console.log('Update result:', result.feeCollectionTemplate);
    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
