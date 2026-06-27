'use client';

import React, { useState } from 'react';
import StudentRegistrationForm from '@/components/school-admin/student-registration-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserPlus, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImportStudentsModal from '@/components/school-admin/import-students-modal';

export default function NewAdmissionPage() {
    const router = useRouter();

    const [schoolId, setSchoolId] = React.useState<string>("");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                setSchoolId(user.schoolId);
            }
        }
    }, []);

    if (!schoolId) {
        return <div className="p-8 text-center text-slate-500">Loading school configuration...</div>;
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3 font-serif">
                        <UserPlus className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        Student Admissions
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => setIsImportModalOpen(true)}
                        className="rounded-2xl h-14 px-6 border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Import Students
                    </Button>
                </div>
            </div>

            {/* The Form */}
            <StudentRegistrationForm
                schoolId={schoolId}
                onClose={() => router.back()}
                onSuccess={() => router.push('/school-admin/admissions')}
                isFullPage={true}
            />

            {isImportModalOpen && (
                <ImportStudentsModal 
                    schoolId={schoolId}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        setIsImportModalOpen(false);
                        router.push('/school-admin/admissions');
                    }}
                />
            )}
        </div>
    );
}
