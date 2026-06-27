'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Fingerprint, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceConfigPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <CalendarCheck className="h-10 w-10 text-emerald-600" />
                        Attendance Logic
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Configure face recognition thresholds, biometric sync, and late-mark rules.
                    </p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-8 shadow-xl shadow-emerald-100 font-bold">
                    <Settings2 className="mr-2 h-4 w-4" /> Attendance Rules
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                            <Fingerprint size={24} />
                        </div>
                        <CardTitle className="text-xl font-black">Biometric Sync</CardTitle>
                        <CardDescription>Configure external device integrations.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200">Manage Devices</Button>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
                            <Clock size={24} />
                        </div>
                        <CardTitle className="text-xl font-black">Shift Timing</CardTitle>
                        <CardDescription>Set working hours and grace periods.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200">Edit Shifts</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
