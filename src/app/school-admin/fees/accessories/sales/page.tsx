'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSchool, getStudents } from '@/app/actions';
import StudentSalesSystem from '@/components/school-admin/fees/accessories/student-sales-system';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { School, Student } from '@/types';

export default function AccessorySalesPage() {
    const [school, setSchool] = useState<School | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (!storedUser) {
                setIsLoading(false);
                return;
            }
            const user = JSON.parse(storedUser);
            const schoolId = user.schoolId;
            if (!schoolId) {
                setIsLoading(false);
                return;
            }
            try {
                const [schoolData, studentsData] = await Promise.all([
                    getSchool(schoolId),
                    getStudents(schoolId)
                ]);
                if (schoolData) {
                    setSchool(schoolData);
                }
                if (studentsData) {
                    setStudents(studentsData);
                }
            } catch (e) {
                console.error("Error loading accessory sales data:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center animate-pulse">Loading Student Sales Module...</div>;
    }

    if (!school) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <Card className="max-w-md border-none shadow-2xl rounded-3xl">
                    <CardContent className="pt-10 pb-10 text-center">
                        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-20" />
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configuration Missing</h2>
                        <p className="text-slate-500 mt-2">We couldn't load the inventory for this school. Please check your settings.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const inventory = school.accessories?.items || [];
    const currentSession = school.currentSession || "2024-25";

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <ShoppingBag className="w-10 h-10 text-indigo-600" />
                        Student Purchase
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Record accessory purchases for students and track inventory levels</p>
                </div>
            </div>

            <StudentSalesSystem 
                students={students} 
                inventory={inventory} 
                school={school}
                currentSession={currentSession}
            />
        </div>
    );
}
