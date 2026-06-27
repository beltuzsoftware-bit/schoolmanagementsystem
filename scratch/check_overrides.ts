import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSchoolOverrides() {
    const schoolId = 's_1777051111204';
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { admissionFieldOverrides: true, admissionFormTemplateId: true }
    });
    
    console.log('--- Heritage Model School (s_1777051111204) ---');
    console.log('Template ID:', school?.admissionFormTemplateId);
    console.log('Overrides for specialNeedsDetails:', (school?.admissionFieldOverrides as any)?.specialNeedsDetails);
    
    if (school?.admissionFormTemplateId) {
        const tmpl = await prisma.admissionFormTemplate.findUnique({
            where: { id: school.admissionFormTemplateId }
        });
        const tmplField = (tmpl?.config as any[])?.find(f => f.fieldName === 'specialNeedsDetails');
        console.log('Template Field Config:', tmplField);
    }
}

checkSchoolOverrides();
