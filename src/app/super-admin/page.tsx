'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDashboardStats } from '@/app/actions';
import { Users, School, Wallet, UserPlus, Briefcase, IdCard, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        totalSchools: 0,
        totalStudents: 0,
        totalRevenue: 0,
        recentSchools: [] as any[]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardStats().then(data => {
            setStats(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-slate-400 font-medium whitespace-nowrap">Loading statistics...</div>
        </div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Super Admin Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Schools</CardTitle>
                        <School className="h-4 w-4 opacity-75" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSchools}</div>
                        <p className="text-xs opacity-75">Real-time database count</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none text-white shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
                        <Users className="h-4 w-4 opacity-75" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs opacity-75">Aggregated from all schools</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-none text-white shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Monthly Revenue</CardTitle>
                        <Wallet className="h-4 w-4 opacity-75" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹ {stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs opacity-75">Based on active subscriptions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                                {stats.totalSchools === 0 ? "No data available yet" : "[Revenue Chart Placeholder]"}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Modules Quick Access</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Configure and manage system modules</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:text-indigo-700 hover:bg-indigo-100" onClick={() => window.location.href = '/super-admin/modules'}>
                                View All
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { title: 'Global Settings', href: '/super-admin/global-parameters', icon: 'Globe', color: 'text-amber-600', bg: 'bg-amber-100' },
                                    { title: 'Admissions', href: '/super-admin/modules/admissions', icon: 'UserPlus', color: 'text-blue-600', bg: 'bg-blue-100' },
                                    { title: 'Students', href: '/super-admin/modules/student-info', icon: 'Users', color: 'text-indigo-600', bg: 'bg-indigo-100' },
                                    { title: 'Staff', href: '/super-admin/modules/staff', icon: 'Briefcase', color: 'text-emerald-600', bg: 'bg-emerald-100' },
                                ].map((m) => (
                                    <button
                                        key={m.title}
                                        onClick={() => window.location.href = m.href}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-lg transition-all group"
                                    >
                                        <div className={cn("p-3 rounded-xl", m.bg, m.color)}>
                                            {m.icon === 'Globe' && <Globe size={20} />}
                                            {m.icon === 'UserPlus' && <UserPlus size={20} />}
                                            {m.icon === 'Users' && <Users size={20} />}
                                            {m.icon === 'Briefcase' && <Briefcase size={20} />}
                                            {m.icon === 'IdCard' && <IdCard size={20} />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{m.title}</span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Schools</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentSchools.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                    No schools onboarded yet.
                                </div>
                            ) : (
                                stats.recentSchools.map(school => (
                                    <div key={school.id} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{school.name}</p>
                                            <p className="text-sm text-muted-foreground">{school.email}</p>
                                        </div>
                                        <div className="ml-auto font-medium">+{school.studentCount || 0} Students</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
