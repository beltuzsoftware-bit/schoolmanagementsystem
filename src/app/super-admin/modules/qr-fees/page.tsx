'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, ShieldCheck, Zap, BarChart3, Settings2, Save, Users, Building2, Coins } from "lucide-react";
import { getSchools, getPackages, getAllQRTransactions } from "@/app/actions";
import { School, SaasPackage, QRTransaction } from "@/types";
import { toast } from "sonner";

export default function QRFeeConfigPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [packages, setPackages] = useState<SaasPackage[]>([]);
    const [transactions, setTransactions] = useState<QRTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [schoolsData, packagesData, transactionsData] = await Promise.all([
                    getSchools(),
                    getPackages(),
                    getAllQRTransactions()
                ]);
                setSchools(schoolsData);
                setPackages(packagesData);
                setTransactions(transactionsData);
            } catch (error) {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center font-medium animate-pulse text-slate-500">Loading quota data...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <QrCode className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        QR Quota Management
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Monitor and manage transaction limits & usage quotas for the QR Fee module.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                            <Building2 size={20} />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Schools</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black text-slate-900">{schools.length}</div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                            <Zap size={20} />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Quota</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black text-slate-900">
                            {schools.reduce((acc, s) => {
                                const pkg = packages.find(p => p.id === s.packageId);
                                const limit = pkg?.qrTransactionLimit ?? 0;
                                return acc + (limit === -1 ? 0 : limit);
                            }, 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden border-indigo-100 bg-indigo-50/30">
                    <CardHeader className="p-6 pb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-2 shadow-lg shadow-indigo-100">
                            <BarChart3 size={20} />
                        </div>
                        <CardTitle className="text-sm font-bold text-indigo-900/40 uppercase tracking-widest">Global Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black text-indigo-900">{transactions.length}</div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                            <Coins size={20} />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Rate Plans</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black text-slate-900">{packages.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* School Usage Table */}
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-black text-slate-900">School Quota Tracking</CardTitle>
                            <CardDescription className="text-base font-medium">Monitor active transaction counts per school based on assigned SaaS packages.</CardDescription>
                        </div>
                        <Button variant="outline" className="rounded-xl border-slate-200 bg-white" onClick={() => window.location.href='/super-admin/packages'}>
                            <Settings2 className="mr-2 h-4 w-4" /> Edit Package Limits
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">School Name</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Active Package</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Monthly Quota</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Usage (Month)</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Rate (₹/Txn)</th>
                                    <th className="p-6 text-right text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map(school => {
                                    const pkg = packages.find(p => p.id === school.packageId);
                                    const limit = pkg?.qrTransactionLimit ?? 0;
                                    const rate = pkg?.transactionRate ?? 0;
                                    
                                    // Calculate real usage for this school
                                    const usage = transactions.filter(t => t.schoolId === school.id).length;
                                    const percentage = limit === -1 ? 0 : (usage / limit) * 100;
                                    
                                    return (
                                        <tr key={school.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="font-bold text-slate-900">{school.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">ID: {school.schoolId}</div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <Badge className={`${pkg?.color || 'bg-slate-500'} text-white border-none text-[10px] font-black uppercase tracking-tighter`}>
                                                    {pkg?.name || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="font-black text-slate-900">
                                                    {limit === -1 ? 'Unlimited' : limit}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                                                    {pkg?.duration === 12 ? 'Yearly' : 'Monthly'} Reset
                                                </div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="w-full max-w-[120px]">
                                                    <div className="flex justify-between text-[10px] font-black mb-1">
                                                        <span className="text-indigo-600">{usage} used</span>
                                                        <span className={percentage > 80 ? 'text-rose-500' : 'text-slate-400'}>
                                                            {limit === -1 ? '0%' : `${Math.round(percentage)}%`}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                                            style={{ width: `${limit === -1 ? 10 : Math.min(100, percentage)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="font-bold text-slate-700">₹{rate}</div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50 text-right">
                                                {percentage > 95 && limit !== -1 ? (
                                                    <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[10px]">Quota Full</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px]">Healthy</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Config Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Global Quota Settings</h3>
                            <p className="text-slate-500 font-medium">Default behaviors for QR limit enforcement.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-800">Hard Enforcement</Label>
                                <p className="text-xs text-slate-400 font-medium italic">Stop QR generation exactly at limit.</p>
                            </div>
                            <div className="h-6 w-11 bg-indigo-600 rounded-full relative cursor-pointer shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-800">Auto Top-up Alert</Label>
                                <p className="text-xs text-slate-400 font-medium italic">Notify Super Admin when school hits 90%.</p>
                            </div>
                            <div className="h-6 w-11 bg-slate-200 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
                            </div>
                        </div>

                        <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-200 mt-4">
                            <Save className="mr-2 h-4 w-4" /> Save Global Policy
                        </Button>
                    </div>
                </Card>

                <Card className="rounded-[2.5rem] bg-indigo-900 p-10 text-white relative overflow-hidden group border-none shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-200 border border-white/20">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">SaaS Efficiency</h3>
                            <p className="text-indigo-200 font-medium text-sm">Managing scale via tiered quotas.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                        <p className="text-sm text-indigo-100 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                            The Quota Module is designed to prevent resource over-utilization. By setting per-transaction rates, you can cover UPI provider costs or generate revenue per successful payment generate.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-4 rounded-2xl bg-indigo-800 border border-indigo-700">
                                <div className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Billing</div>
                                <div className="text-lg font-black italic">Pre-paid</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-800 border border-indigo-700">
                                <div className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Enforcement</div>
                                <div className="text-lg font-black italic">Real-time</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
