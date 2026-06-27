'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, ArrowRight, Wallet, CalendarCheck, Sparkles, Phone, ShieldCheck, Heart, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getParentSiblings } from '@/app/actions';

export default function ParentDashboard() {
    const [user, setUser] = useState<any>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // In a real app, we'd fetch brothers/sisters via an API
            // For this mock, we'll try to find them in the database if possible
            // But since we are client-side, we'll simulate the list based on the user's phone
            fetchChildren(parsedUser.email); // email stores the mobile for parents
        }
    }, []);

    const fetchChildren = async (mobile: string) => {
        setLoading(true);
        try {
            const result = await getParentSiblings(mobile);
            // Transform siblings into the format expected by the UI
            const formattedChildren = result.map((s: any) => ({
                id: s.admissionNumber || s.id,
                name: s.name,
                class: s.className || s.class || 'N/A',
                section: s.section || 'A',
                attendance: '95%', // Placeholder for attendance
                feeStatus: 'Paid', // Placeholder for fee status
                photo: s.photo || null
            }));
            setChildren(formattedChildren);
        } catch (error) {
            console.error('Failed to fetch children:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-12">
            {/* --- TOP BANNER --- */}
            <div className="relative p-10 rounded-[3rem] bg-indigo-950 text-white overflow-hidden shadow-2xl shadow-indigo-200">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                            <ShieldCheck size={10} className="text-emerald-400" /> Guardian Portal Verified
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                            Welcome, <br />
                            <span className="text-indigo-300">{user.name}</span>
                        </h1>
                        <p className="text-sm text-indigo-100/60 font-medium max-w-md">
                            Access real-time academic tracking, fee management, and institutional updates for all your children in one consolidated view.
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[140px]">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Children</p>
                            <p className="text-3xl font-black">{children.length}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[140px]">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Dues</p>
                            <p className="text-3xl font-black text-amber-400">₹ 4.2k</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CHILDREN GRID --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="text-indigo-600" /> My Children
                    </h3>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-2">
                        View All Records <ArrowRight size={12} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {children.map((child, i) => (
                        <div key={child.id} className="group cursor-pointer">
                            <Card className="rounded-[3rem] border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-700 bg-white overflow-hidden relative">
                                <div className="p-8">
                                    <div className="flex items-start gap-6">
                                        <div className="h-24 w-20 rounded-[1.75rem] bg-slate-50 border-2 border-slate-100 transition-colors group-hover:border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                                            {child.photo ? (
                                                <img src={child.photo} alt={child.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="text-slate-200" size={32} />
                                            )}
                                            <div className="absolute top-0 right-0 p-1 bg-indigo-600 rounded-bl-xl text-white">
                                                <Sparkles size={10} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Class {child.class} &bull; {child.section}</span>
                                                    <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll: {child.id}</span>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{child.name}</h4>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="px-4 py-3 rounded-2xl bg-slate-50 flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attendance</span>
                                                    <span className="text-sm font-black text-slate-900">{child.attendance}</span>
                                                </div>
                                                <div className="px-4 py-3 rounded-2xl bg-slate-50 flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fee Status</span>
                                                    <span className={cn(
                                                        "text-sm font-black",
                                                        child.feeStatus === 'Paid' ? "text-emerald-600" : "text-amber-600"
                                                    )}>{child.feeStatus}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 grid grid-cols-3 gap-2">
                                        <ChildAction icon={<CalendarCheck size={16} />} label="Attendance" />
                                        <ChildAction icon={<GraduationCap size={16} />} label="Results" />
                                        <ChildAction icon={<Wallet size={16} />} label="Pay Fees" highlight />
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100">
                                    <div className={cn("h-full transition-all duration-1000", i === 0 ? "bg-indigo-500 w-[94%]" : "bg-indigo-500 w-[88%]")} />
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- CONTACT SUPPORT --- */}
            <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <Phone size={32} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                    <h4 className="text-lg font-black text-indigo-900 tracking-tight">Need help with academic details?</h4>
                    <p className="text-sm font-medium text-indigo-700/70">Connect with the school administration directly for any queries regarding your child's progress or documentation.</p>
                </div>
                <button className="px-8 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-xl shadow-indigo-100">
                    Contact Admin
                </button>
            </div>
        </div>
    );
}

function ChildAction({ icon, label, highlight = false }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
    return (
        <button className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300",
            highlight 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
        )}>
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}
