'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Activity, ShieldAlert, Database } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function RootPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono">
            <div className="container mx-auto p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-indigo-500">
                            <AvatarImage src="/saraswati.png" />
                            <AvatarFallback className="bg-indigo-900 text-indigo-200">SA</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold text-indigo-400">Saraswati</h1>
                            <p className="text-sm text-slate-500">System Root | Master Access</p>
                        </div>
                    </div>
                    <Button variant="destructive" className="bg-red-900/50 hover:bg-red-900 text-red-100 border border-red-800">
                        <ShieldAlert className="mr-2 h-4 w-4" /> Emergency Shutdown
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-slate-900 border-slate-800 text-slate-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-teal-400" /> Observability</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>System Uptime</span> <span className="text-teal-400">99.99%</span></div>
                                <div className="flex justify-between"><span>Active Nodes</span> <span className="text-teal-400">12</span></div>
                                <div className="flex justify-between"><span>Memory Usage</span> <span className="text-teal-400">34%</span></div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800 text-slate-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-purple-400" /> Data Integrity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>DB Status</span> <span className="text-purple-400">Healthy</span></div>
                                <div className="flex justify-between"><span>Last Backup</span> <span className="text-slate-500">2 mins ago</span></div>
                                <div className="flex justify-between"><span>Total Records</span> <span className="text-purple-400">1.2M</span></div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800 text-slate-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400" /> Tenant Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>Active Schools</span> <span className="text-blue-400">542</span></div>
                                <div className="flex justify-between"><span>Critical Alerts</span> <span className="text-red-400">0</span></div>
                                <div className="flex justify-between"><span>SaaS Revenue</span> <span className="text-green-400">₹ 8.5M</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-slate-100">System Logs (Real-time)</h2>
                    <div className="h-64 overflow-y-auto font-mono text-xs space-y-1 text-slate-400">
                        <div className="flex gap-2"><span className="text-slate-600">[19:30:01]</span> <span className="text-green-500">INFO</span> School(s1) Profile Updated</div>
                        <div className="flex gap-2"><span className="text-slate-600">[19:29:45]</span> <span className="text-blue-500">AUTH</span> User(superadmin) Logged in</div>
                        <div className="flex gap-2"><span className="text-slate-600">[19:28:12]</span> <span className="text-green-500">INFO</span> New Package Created: Enterprise</div>
                        <div className="flex gap-2"><span className="text-slate-600">[19:25:30]</span> <span className="text-yellow-500">WARN</span> High latency detected in API-Gateway</div>
                        <div className="flex gap-2"><span className="text-slate-600">[19:20:01]</span> <span className="text-green-500">INFO</span> System Backup Completed</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
