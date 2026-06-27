"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export default function BulkDeletePage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Trash2 className="h-10 w-10 text-rose-600" strokeWidth={3} />
                    Bulk Delete
                </h1>
                <p className="text-slate-500 mt-2 text-lg font-medium">
                    Safely remove multiple student records from the system.
                </p>
            </div>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white min-h-[400px] flex flex-col items-center justify-center p-10 text-center border-rose-100 bg-rose-50/10">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
                    <Trash2 className="h-10 w-10 text-rose-400" />
                </div>
                <CardTitle className="text-2xl font-black text-slate-800 mb-4">Select Records to Delete</CardTitle>
                <CardContent className="max-w-md text-slate-500 font-medium">
                    Please use the Student Details list to select records for bulk deletion. This page will eventually host advanced cleanup tools.
                </CardContent>
            </Card>
        </div>
    );
}
