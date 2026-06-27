'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Banknote, CalendarDays } from 'lucide-react';
import { getStudents, getStaffProfiles, getFeeTransactions, getSchools, getPackages } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { School, SaasPackage } from '@/types';

export default function SchoolAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        maxStudents: 0,
        staffPresent: 0,
        totalStaff: 0,
        feeCollection: 0,
        pendingApprovals: 0
    });
    const [activeModules, setActiveModules] = useState<string[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (!storedUser) return;

            const user = JSON.parse(storedUser);
            if (!user.id || !user.schoolId) return;

            try {
                // Fetch School and Package to check modules
                const [schools, packages] = await Promise.all([getSchools(), getPackages()]);
                const school = schools.find((s: School) => s.id === user.schoolId);
                const pkg = packages.find((p: SaasPackage) => p.id === school?.packageId);
                
                if (pkg) {
                    setActiveModules(pkg.modules || []);
                }

                // Fetch Data in Parallel
                const [students, staff, feeTxns] = await Promise.all([
                    getStudents(user.schoolId),
                    getStaffProfiles(user.schoolId),
                    getFeeTransactions(user.schoolId)
                ]);

                // Calculate Stats
                const totalStudents = students.length;
                const totalStaff = staff.length;
                // For "Staff Present", we'll just show total for now or 0 if no attendance system
                // Fees: Sum of all transactions
                const totalFees = feeTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0);

                setStats({
                    totalStudents,
                    maxStudents: (school as any)?.maxStudents || 0,
                    staffPresent: totalStaff, // Refine later with attendance
                    totalStaff,
                    feeCollection: totalFees,
                    pendingApprovals: 0 // Refine later with actual leave requests
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="shadow-sm">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const showStaff = activeModules.includes('m6');
    const showFees = activeModules.includes('m4') || activeModules.includes('m3') || activeModules.includes('m9');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Dashboard</h1>
                <div className="text-sm text-slate-500">Real-time statistics for your school</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className={cn(
                    "shadow-sm border-l-4 relative overflow-hidden",
                    stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents 
                        ? "border-l-red-500 bg-red-50" 
                        : "border-l-blue-500"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={cn("text-sm font-medium", stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents ? "text-red-700 font-bold" : "")}>Total Students</CardTitle>
                        <Users className={cn("h-4 w-4", stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents ? "text-red-500" : "text-muted-foreground")} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold flex items-baseline gap-2">
                                    <span className={cn(stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents ? "text-red-700" : "")}>{stats.totalStudents}</span>
                                    {stats.maxStudents > 0 && (
                                        <span className={cn("text-sm", stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents ? "text-red-500 font-semibold" : "text-slate-400 font-normal")}>
                                            / {stats.maxStudents}
                                        </span>
                                    )}
                                </div>
                                <p className={cn("text-xs", stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents ? "text-red-600/80 font-medium" : "text-muted-foreground")}>
                                    Active enrollments
                                </p>
                            </div>
                            {stats.maxStudents > 0 && stats.totalStudents > stats.maxStudents && (
                                <button 
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-sm transition-colors border border-red-700/50 flex flex-col items-center leading-tight"
                                    onClick={() => alert("Please contact the Super Admin to upgrade your package.")}
                                    title="Contact Super Admin to upgrade package"
                                >
                                    <span>UPGRADE</span>
                                    <span className="text-[9px] font-medium opacity-80 uppercase tracking-wider">Over Limit</span>
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {showStaff && (
                    <Card className="shadow-sm border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Staff Overview</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.staffPresent}/{stats.totalStaff}</div>
                            <p className="text-xs text-muted-foreground">Staff members registered</p>
                        </CardContent>
                    </Card>
                )}

                {showFees && (
                    <Card className="shadow-sm border-l-4 border-l-yellow-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Fee Collection</CardTitle>
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹ {stats.feeCollection.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total collected this session</p>
                        </CardContent>
                    </Card>
                )}

                {(showStaff || activeModules.includes('m7')) && (
                    <Card className="shadow-sm border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                            <p className="text-xs text-muted-foreground">Leave & profile requests</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {showFees && (
                    <Card className="col-span-4 shadow-sm">
                        <CardHeader>
                            <CardTitle>Fee Collection Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                                [Chart will appear when more transactions are recorded]
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                <Card className={`${showFees ? 'col-span-3' : 'col-span-7'} shadow-sm`}>
                    <CardHeader>
                        <CardTitle>School Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm text-slate-600">
                            <div className="p-3 bg-slate-50 rounded-lg border">
                                <span className="font-bold text-slate-800 block">Welcome to your Dashboard</span>
                                Manage your school's daily operations efficiently.
                            </div>
                            {showStaff && (
                                <div className="p-3 bg-slate-50 rounded-lg border">
                                    <span className="font-bold text-slate-800 block">Staff Management Active</span>
                                    You can now manage employees and roles from the sidebar.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

