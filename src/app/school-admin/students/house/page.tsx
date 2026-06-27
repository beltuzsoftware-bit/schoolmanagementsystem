"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function StudentHousePage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Home className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                    Student House
                </h1>
                <p className="text-slate-500 mt-2 text-lg font-medium">
                    Manage the school house system (e.g., Red, Blue, Green, Yellow).
                </p>
            </div>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white min-h-[400px] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                    <Home className="h-10 w-10 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl font-black text-slate-800 mb-4">House Management</CardTitle>
                <CardContent className="max-w-md text-slate-500 font-medium">
                    Define your school's house labels and track house-wise student distribution here.
                </CardContent>
            </Card>
        </div>
    );
}
