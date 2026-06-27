'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Download, Filter } from 'lucide-react';
import { StaffList } from '@/components/staff/staff-list';
import AdvancedStaffForm from '@/components/staff/advanced-staff-form';
import { toast } from 'sonner';

export default function StaffPage() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [schoolId, setSchoolId] = useState<string>('');
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                setSchoolId(user.schoolId);
            }
        }
    }, []);

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        setEditingStaff(null);
    };

    const handleEdit = (staff: any) => {
        setEditingStaff(staff);
        setIsAddOpen(true);
    };

    const handleClose = () => {
        setIsAddOpen(false);
        setEditingStaff(null);
    };

    if (!mounted) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 italic">
                        Staff <span className="text-indigo-600">Management</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-black opacity-60">
                        Human Resource & Faculty Database
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="hidden sm:flex border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button className="bg-[#1d7cf2] hover:bg-blue-600 shadow-lg shadow-blue-200" onClick={() => setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Staff Member
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={<Users className="text-indigo-600" />} label="Total Staff" value="24" color="bg-indigo-50" />
                <StatCard icon={<Users className="text-emerald-600" />} label="Present Today" value="22" color="bg-emerald-50" />
                <StatCard icon={<Users className="text-orange-600" />} label="On Leave" value="2" color="bg-orange-50" />
            </div>

            <StaffList schoolId={schoolId} refreshTrigger={refreshTrigger} onEdit={handleEdit} />

            <AdvancedStaffForm
                open={isAddOpen}
                onClose={handleClose}
                onSuccess={handleSuccess}
                schoolId={schoolId}
                initialData={editingStaff}
            />
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
    return (
        <div className={`p-4 rounded-xl border border-slate-100 ${color} flex items-center gap-4`}>
            <div className="p-3 rounded-lg bg-white shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
}
