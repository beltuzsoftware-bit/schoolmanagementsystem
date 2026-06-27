'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calendar, Clock, Award, Bell, BookText, FileSpreadsheet, Fingerprint, Sparkles, User, GraduationCap, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StudentDashboard() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    if (!user) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* --- HERO SECTION --- */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        <Sparkles size={10} /> Academic Session 2024-2025
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                        Welcome back, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">
                            {user.name.split(' ')[0]}
                        </span>
                    </h1>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
                        Stay on top of your studies. Here is a quick look at your academic progress and upcoming schedule.
                    </p>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-200 min-w-[220px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <GraduationCap size={28} />
                    </div>
                    <div className="text-center relative z-10">
                        <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">Enrolled Identity</p>
                        <p className="text-lg font-black tracking-tight">{user.name}</p>
                    </div>
                    <div className="w-full h-px bg-white/10 my-1" />
                    <Badge variant="outline" className="text-white border-white/30 py-1 px-4 font-black text-[10px] tracking-widest uppercase rounded-xl backdrop-blur-md">
                        ID: {user.email}
                    </Badge>
                </div>
            </div>

            {/* --- QUICK STATS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Attendance" value="92%" icon={<Fingerprint />} color="indigo" />
                <StatCard label="Active Subjects" value="8" icon={<BookText />} color="amber" />
                <StatCard label="Completed Fees" value="80%" icon={<FileSpreadsheet />} color="emerald" />
                <StatCard label="Class Rank" value="#4" icon={<Award />} color="fuchsia" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- SCHEDULE --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Today's Timeline</h3>
                        <Badge className="bg-slate-100 text-slate-600 border-none rounded-lg px-3 py-1 font-bold text-[10px] tracking-widest uppercase">Monday, Oct 24</Badge>
                    </div>
                    <div className="space-y-4">
                        <TimelineItem subject="Mathematics" time="08:30 AM" room="Room 302" teacher="Dr. S. Sharma" color="indigo" current />
                        <TimelineItem subject="Physics" time="09:45 AM" room="Lab A" teacher="Prof. Verma" color="amber" />
                        <TimelineItem subject="Recess" time="11:00 AM" room="Main Court" teacher="Break" color="slate" />
                        <TimelineItem subject="English Literature" time="11:30 AM" room="Hall B" teacher="Ms. Andrews" color="emerald" />
                    </div>
                </div>

                {/* --- NOTIFICATIONS --- */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Alerts & Notices</h3>
                    <div className="p-1 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
                        <div className="space-y-1">
                            <NoticeItem 
                                title="Unit Test - Mathematics" 
                                date="Oct 26" 
                                type="Exam" 
                                color="amber"
                            />
                            <NoticeItem 
                                title="School Annual Sports Meet" 
                                date="Nov 05" 
                                type="Event" 
                                color="indigo"
                            />
                            <NoticeItem 
                                title="Winter Uniform Notice" 
                                date="Oct 20" 
                                type="Admin" 
                                color="slate"
                            />
                        </div>
                        <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                            Archive View <ChevronRight size={12} className="inline ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'indigo' | 'amber' | 'emerald' | 'fuchsia' }) {
    const colors = {
        indigo: "bg-indigo-600 shadow-indigo-100",
        amber: "bg-amber-500 shadow-amber-100",
        emerald: "bg-emerald-500 shadow-emerald-100",
        fuchsia: "bg-fuchsia-600 shadow-fuchsia-100"
    };

    return (
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-xl hover:border-indigo-100 duration-500">
            <div className={cn("h-10 w-10 rounded-xl mb-4 flex items-center justify-center text-white shadow-md", colors[color])}>
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-black text-slate-900 tracking-tight">{value}</p>
        </div>
    );
}

function TimelineItem({ subject, time, room, teacher, color, current = false }: { subject: string; time: string; room: string; teacher: string; color: string; current?: boolean }) {
    return (
        <div className={cn(
            "p-6 rounded-3xl border transition-all duration-300 flex items-center justify-between",
            current 
                ? "bg-white border-indigo-200 shadow-xl shadow-indigo-50 ring-1 ring-indigo-50" 
                : "bg-slate-50 border-slate-100 opacity-60 hover:opacity-100"
        )}>
            <div className="flex items-center gap-5">
                <div className="flex flex-col items-center">
                    <div className={cn("h-3 w-3 rounded-full mb-2", current ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                    <div className="w-px h-8 bg-slate-200" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight mb-1">{subject}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <Clock size={12} className="opacity-50" /> {time}
                        <span className="opacity-20">&bull;</span>
                        <User size={12} className="opacity-50" /> {teacher}
                    </div>
                </div>
            </div>
            <Badge className="bg-slate-100 text-slate-500 border-none rounded-xl px-4 py-1.5 font-black text-[10px] tracking-widest uppercase">
                {room}
            </Badge>
        </div>
    );
}

function NoticeItem({ title, date, type, color }: { title: string; date: string; type: string; color: 'indigo' | 'amber' | 'slate' }) {
    const bgColors = {
        indigo: "bg-indigo-50 text-indigo-600",
        amber: "bg-amber-50 text-amber-600",
        slate: "bg-slate-50 text-slate-500"
    };

    return (
        <div className="p-5 flex items-start gap-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer group">
            <div className={cn("h-10 w-10 shrink-0 rounded-xl flex flex-col items-center justify-center font-black", bgColors[color])}>
                <span className="text-[10px] leading-tight uppercase">{date.split(' ')[0]}</span>
                <span className="text-xs leading-none">{date.split(' ')[1]}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{type}</span>
                    <div className="h-1 w-1 rounded-full bg-slate-200" />
                </div>
                <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{title}</h4>
            </div>
        </div>
    );
}
