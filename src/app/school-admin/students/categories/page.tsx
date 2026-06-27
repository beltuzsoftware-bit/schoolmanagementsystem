"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags } from "lucide-react";

export default function StudentCategoriesPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Tags className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                    Student Categories
                </h1>
                <p className="text-slate-500 mt-2 text-lg font-medium">
                    Define and manage student classifications (e.g., General, OBC, SC/ST, EWS).
                </p>
            </div>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white min-h-[400px] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
                    <Tags className="h-10 w-10 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl font-black text-slate-800 mb-4">Category Configuration</CardTitle>
                <CardContent className="max-w-md text-slate-500 font-medium">
                    This section will allow you to manage the dropdown options for student categories used during registration.
                </CardContent>
            </Card>
        </div>
    );
}
