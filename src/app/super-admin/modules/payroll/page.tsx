'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Settings2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PayrollConfigPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Wallet className="h-10 w-10 text-indigo-600" />
                        Payroll Configuration
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Manage salary structures, tax rules, and payment gateways.
                    </p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-8 shadow-xl shadow-indigo-100 font-bold">
                    <Settings2 className="mr-2 h-4 w-4" /> Global Settings
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                            <ShieldCheck size={24} />
                        </div>
                        <CardTitle className="text-xl font-black">Salary Rules</CardTitle>
                        <CardDescription>Define earnings and deductions.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200">Configure</Button>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden text-center p-8 flex flex-col items-center justify-center min-h-[300px] border-dashed border-2">
                    <Zap size={48} className="text-slate-200 mb-4" />
                    <h3 className="text-lg font-black text-slate-400">Coming Soon</h3>
                    <p className="text-sm text-slate-400 font-medium">Automated payroll processing is under development.</p>
                </Card>
            </div>
        </div>
    );
}
