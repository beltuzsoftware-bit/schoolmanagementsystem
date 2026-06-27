import { getStudent, getFeeGroups, getFeeTransactions, getSchools, getPlatformConfig } from '@/app/actions';
import StudentFeeDetails from '@/components/school-admin/fees/student-fee-details';
import StudentFeeDetailsV2 from '@/components/school-admin/fees/student-fee-details-v2';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // 1. Fetch student first to get schoolId
    const student = await getStudent(id);
    
    if (!student) {
        notFound();
    }

    // 2. Fetch everything else using student's schoolId
    const [groups, txns, schools, platformConfig] = await Promise.all([
        getFeeGroups(student.schoolId),
        getFeeTransactions(student.schoolId),
        getSchools(),
        getPlatformConfig()
    ]);

    const school = schools.find((s: any) => s.id === student.schoolId || s.schoolId === student.schoolId) || null;
    const schoolTemplate = (school as any)?.feeCollectionTemplate || platformConfig.defaultFeeTemplate || 'template_1';
    const disabledTemplates: string[] = platformConfig.disabledFeeTemplates || [];
    
    // If a school's template was disabled by SaaS admin, fall back to platform default
    const template = disabledTemplates.includes(schoolTemplate)
        ? (platformConfig.defaultFeeTemplate || 'template_1')
        : schoolTemplate;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {template === 'template_1' && (
                <StudentFeeDetails 
                    student={student} 
                    allGroups={groups}
                    allTransactions={txns}
                    schoolDetails={school}
                />
            )}
            
            {template === 'template_2' && (
                <StudentFeeDetailsV2 
                    student={student} 
                    allGroups={groups}
                    allTransactions={txns}
                    schoolDetails={school}
                />
            )}
        </div>
    );
}

