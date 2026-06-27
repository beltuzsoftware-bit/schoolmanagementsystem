'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentRegistrationForm from '@/components/school-admin/student-registration-form';
import { getStudentById } from '@/app/actions';
import { Student } from '@/types';

export default function EditStudentPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = params?.id as string;

    const [student, setStudent] = useState<Student | null>(null);
    const [schoolId, setSchoolId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const result = await getStudentById(studentId);
                if (!result?.student) { setError('Student not found'); setLoading(false); return; }
                setStudent(result.student as Student);
                setSchoolId(result.student.schoolId);
            } catch {
                setError('Failed to load student');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [studentId]);

    const handleBack = () => router.push('/school-admin/students');

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
                <div className="bg-white rounded-3xl p-12 shadow-sm text-center">
                    <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <User className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-slate-500 font-semibold">Loading student profile...</p>
                </div>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
                <div className="bg-white rounded-3xl p-12 shadow-sm text-center max-w-sm">
                    <p className="text-rose-500 font-bold text-lg mb-4">{error || 'Student not found'}</p>
                    <Button onClick={handleBack} variant="outline" className="rounded-xl">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f7f6]">
            {/* Page Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="rounded-xl h-10 px-4 text-slate-500 hover:text-slate-900 hover:bg-slate-50 gap-2 font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Students
                    </Button>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-3">
                        {student.photo ? (
                            <img
                                src={student.photo}
                                alt={student.name}
                                className="h-9 w-9 rounded-xl object-cover border border-slate-100"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                <User className="w-5 h-5 text-indigo-400" />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Editing Profile</p>
                            <h1 className="text-sm font-black text-slate-900">{student.name}</h1>
                        </div>
                    </div>
                    {student.admissionNumber && (
                        <span className="ml-auto text-[11px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                            {student.admissionNumber}
                        </span>
                    )}
                </div>
            </div>

            {/* Form — full page, no modal */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <StudentRegistrationForm
                    schoolId={schoolId}
                    initialData={student}
                    isFullPage={true}
                    onClose={handleBack}
                    onSuccess={() => {
                        router.push('/school-admin/students');
                    }}
                />
            </div>
        </div>
    );
}
