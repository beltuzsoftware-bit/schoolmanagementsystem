'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
    CheckCircle2, Clock, XCircle, Calendar, 
    Palmtree, Printer, FileDown, FileSpreadsheet, Copy 
} from 'lucide-react';
import { getStudentAttendance, getSchoolSessionConfig } from '@/app/actions';
import { StudentAttendanceData, AttendanceStatus } from '@/types/attendance';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AttendanceTabProps {
    studentId: string;
    sessionId: string;
    schoolId: string;
}

const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const STATUS_CONFIG: Record<AttendanceStatus, { color: string; bg: string; label: string }> = {
    'P': { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Present' },
    'L': { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Late' },
    'A': { color: 'text-rose-600', bg: 'bg-rose-50', label: 'Absent' },
    'H': { color: 'text-sky-600', bg: 'bg-sky-50', label: 'Holiday' },
    'F': { color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Half Day' },
    '-': { color: 'text-slate-300', bg: 'bg-transparent', label: 'No Data' }
};

export default function AttendanceTab({ studentId, sessionId, schoolId }: AttendanceTabProps) {
    const [data, setData] = useState<StudentAttendanceData | null>(null);
    const [startMonth, setStartMonth] = useState(4); // April default
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const [attendanceRes, configRes] = await Promise.all([
                    getStudentAttendance(studentId, sessionId),
                    getSchoolSessionConfig(schoolId)
                ]);
                setData(attendanceRes);
                setStartMonth(configRes.sessionStartMonth);
            } catch (error) {
                console.error("Error fetching attendance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [studentId, sessionId, schoolId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-slate-500">No attendance data found.</div>;

    // Generate month sequence starting from startMonth (1-indexed)
    const sessionMonths: { index: number; name: string }[] = [];
    for (let i = 0; i < 12; i++) {
        const index = (startMonth - 1 + i) % 12;
        sessionMonths.push({
            index: index + 1,
            name: MONTHS[index]
        });
    }

    const stats = [
        { label: 'Total Present', value: data.summary.totalPresent, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Total Late', value: data.summary.totalLate, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Total Absent', value: data.summary.totalAbsent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Total Half Day', value: data.summary.totalHalfDay, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Holiday', value: data.summary.totalHoliday, icon: Palmtree, color: 'text-sky-600', bg: 'bg-sky-50' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-600">{stat.label}</p>
                                <p className={cn("text-3xl font-black", stat.color)}>{stat.value}</p>
                            </div>
                            <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", stat.bg)}>
                                <stat.icon size={20} className={stat.color} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Attendance Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest mr-2">Legend:</span>
                    {Object.entries(STATUS_CONFIG).filter(([k]) => k !== '-').map(([key, config]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className={cn("text-xs font-black", config.color)}>{key}</span>
                            <span className="text-[11px] font-bold text-slate-700 uppercase">{config.label}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-teal-600"><Copy size={16} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-teal-600"><FileSpreadsheet size={16} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-teal-600"><FileDown size={16} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-teal-600"><Printer size={16} /></Button>
                </div>
            </div>

            {/* Attendance Grid */}
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="sticky left-0 bg-slate-100 z-10 px-4 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider border-r border-slate-200 min-w-[100px]">
                                    Date | Month
                                </th>
                                {sessionMonths.map((m) => (
                                    <th key={m.name} className="px-3 py-4 text-[11px] font-black text-slate-800 uppercase tracking-wider text-center border-r last:border-r-0 border-slate-200 whitespace-nowrap">
                                        {m.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <tr key={day} className="hover:bg-slate-50 transition-colors group">
                                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 px-4 py-3 text-sm font-black text-slate-900 border-r border-slate-200 text-center">
                                        {day}
                                    </td>
                                    {sessionMonths.map((m) => {
                                        // Simple date logic for mock (YYYY-MM-DD)
                                        // Real app would handle actual year
                                        const year = new Date().getFullYear();
                                        const dateKey = `${year}-${String(m.index).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const status = data.records[dateKey] || '-';
                                        const config = STATUS_CONFIG[status];
                                        
                                        return (
                                            <td key={m.name} className="px-3 py-3 text-center border-r last:border-r-0 border-slate-100">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-black transition-all duration-200",
                                                    config.bg,
                                                    config.color,
                                                    status !== '-' && "shadow-sm border border-black/5 scale-110"
                                                )}>
                                                    {status === '-' ? '-' : status}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
