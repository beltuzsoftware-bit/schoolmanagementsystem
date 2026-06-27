'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    ArrowLeft,
    ArrowRight,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getStaffProfiles, getUsers, getAttendanceMaster, updateAttendance } from '@/app/actions';
import { AttendanceStatus, AttendanceRecord } from '@/types/staff';
import { toast } from 'sonner';

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [staff, setStaff] = useState<any[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
    const [loading, setLoading] = useState(true);
    const [schoolId, setSchoolId] = useState('');
    const [pendingUpdates, setPendingUpdates] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setSchoolId(user.schoolId || '');
        }
    }, []);

    useEffect(() => {
        if (!schoolId) return;
        const loadData = async () => {
            setLoading(true);
            try {
                const [profiles, users, attendanceMaster] = await Promise.all([
                    getStaffProfiles(schoolId),
                    getUsers({ schoolId }),
                    getAttendanceMaster()
                ]);

                const merged = profiles.map(p => ({
                    ...p,
                    user: users.find((u: any) => u.id === p.userId)
                }));

                setStaff(merged);

                // Set records for the selected date
                const records = attendanceMaster[selectedDate] || [];
                const map: Record<string, AttendanceStatus> = {};
                records.forEach((r: AttendanceRecord) => map[r.staffId] = r.status);
                setAttendanceMap(map);
                setPendingUpdates({}); // Reset pending on date change
            } catch (error) {
                toast.error('Failed to load attendance data');
            }
            setLoading(false);
        };
        loadData();
    }, [selectedDate, schoolId]);

    const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
        setAttendanceMap(prev => ({ ...prev, [staffId]: status }));
        setPendingUpdates(prev => ({ ...prev, [staffId]: status }));
    };

    const markAllPresent = () => {
        const newUpdates: Record<string, AttendanceStatus> = {};
        const newMap = { ...attendanceMap };

        staff.forEach(s => {
            // Only update if not already present to avoid redundant pending updates
            if (newMap[s.id] !== AttendanceStatus.PRESENT) {
                newMap[s.id] = AttendanceStatus.PRESENT;
                newUpdates[s.id] = AttendanceStatus.PRESENT;
            }
        });

        setAttendanceMap(newMap);
        setPendingUpdates(prev => ({ ...prev, ...newUpdates }));
        toast.info('Marked all as Present. Click Save Changes to persist.');
    };

    const saveChanges = async () => {
        if (Object.keys(pendingUpdates).length === 0) return;
        setIsSaving(true);

        const records: AttendanceRecord[] = Object.entries(pendingUpdates).map(([id, stat]) => ({
            staffId: id,
            status: stat
        }));

        try {
            const res = await updateAttendance(selectedDate, records);
            if (res.success) {
                toast.success('Attendance saved successfully');
                setPendingUpdates({});
            } else {
                toast.error('Failed to save attendance');
            }
        } catch (e) {
            toast.error('Error saving attendance');
        }
        setIsSaving(false);
    };

    const stats = useMemo(() => {
        const total = staff.length;
        const present = Object.values(attendanceMap).filter(s => s === AttendanceStatus.PRESENT || s === AttendanceStatus.LATE).length;
        const absent = Object.values(attendanceMap).filter(s => s === AttendanceStatus.ABSENT).length;
        const half = Object.values(attendanceMap).filter(s => s === AttendanceStatus.HALF_DAY).length;
        const percent = total > 0 ? Math.round(((present + (half * 0.5)) / total) * 100) : 0;

        return { total, present, absent, half, percent };
    }, [attendanceMap, staff]);

    const filteredStaff = staff.filter(s =>
        s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading attendance register...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1 bg-indigo-600 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Daily Attendance</p>
                        <h3 className="text-4xl font-black mt-1">{stats.percent}%</h3>
                        <div className="w-full bg-white/20 h-2 rounded-full mt-4 overflow-hidden">
                            <div className="bg-white h-full" style={{ width: `${stats.percent}%` }} />
                        </div>
                    </div>
                    <p className="text-[10px] font-bold mt-6 opacity-80 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} /> {stats.present} Staff Present Today
                    </p>
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Strength', val: stats.total, color: 'text-slate-600', bg: 'bg-white' },
                        { label: 'Present / Late', val: stats.present, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                        { label: 'Absentees', val: stats.absent, color: 'text-rose-600', bg: 'bg-rose-50/50' },
                        { label: 'Half Days', val: stats.half, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                    ].map((s, i) => (
                        <div key={i} className={`${s.bg} p-5 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <h4 className={`text-2xl font-black ${s.color} mt-1`}>{s.val}</h4>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500"><ArrowLeft size={16} /></button>

                        <div className="px-4 py-2 flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 outline-none uppercase"
                            />
                        </div>

                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() + 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500"><ArrowRight size={16} /></button>
                    </div>

                    {Object.keys(pendingUpdates).length > 0 && (
                        <Button
                            onClick={saveChanges}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg animate-in fade-in zoom-in"
                        >
                            {isSaving ? 'Saving...' : `Save ${Object.keys(pendingUpdates).length} Changes`}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        onClick={markAllPresent}
                        className="text-xs font-black border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                        Auto-Mark All Present
                    </Button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search staff..."
                        className="pl-9 h-10 text-xs"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Employee Details</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredStaff.map((item) => {
                            const status = attendanceMap[item.id] || null;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50/30">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.user?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.designation}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 border-indigo-100">
                                            {item.department}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <StatusBtn active={status === AttendanceStatus.PRESENT} label="P" color="bg-emerald-500" onClick={() => handleStatusChange(item.id, AttendanceStatus.PRESENT)} />
                                            <StatusBtn active={status === AttendanceStatus.ABSENT} label="A" color="bg-rose-500" onClick={() => handleStatusChange(item.id, AttendanceStatus.ABSENT)} />
                                            <StatusBtn active={status === AttendanceStatus.HALF_DAY} label="H" color="bg-amber-500" onClick={() => handleStatusChange(item.id, AttendanceStatus.HALF_DAY)} />
                                            <StatusBtn active={status === AttendanceStatus.LATE} label="L" color="bg-indigo-500" onClick={() => handleStatusChange(item.id, AttendanceStatus.LATE)} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-600" />
                <p className="text-[10px] text-amber-800 font-bold uppercase">
                    Attendance records are linked to Payroll calculation. Mark absentees to trigger LOP.
                </p>
            </div>
        </div>
    );
}

function StatusBtn({ active, label, color, onClick }: { active: boolean; label: string; color: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${active ? `${color} text-white shadow-lg scale-110` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
        >
            {label}
        </button>
    );
}
