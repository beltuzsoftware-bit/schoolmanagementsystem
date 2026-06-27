import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConfig() {
    const schoolId = 's_1777051111204';
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { admissionFieldOverrides: true, admissionFormTemplateId: true }
    });
    console.log('Template ID:', school?.admissionFormTemplateId);
    console.log('Overrides:', JSON.stringify(school?.admissionFieldOverrides, null, 2));

    if (school?.admissionFormTemplateId) {
        const template = await prisma.admissionFormTemplate.findUnique({
            where: { id: school.admissionFormTemplateId }
        });
        console.log('Template Config Count:', template?.config?.length);
        const healthFields = (template?.config as any[])?.filter(f => 
            f.fieldName.toLowerCase().includes('needs') || 
            f.fieldName.toLowerCase().includes('height') ||
            f.fieldName.toLowerCase().includes('weight')
        );
        console.log('Health Fields in Template:', JSON.stringify(healthFields, null, 2));
    }
}

checkConfig();
