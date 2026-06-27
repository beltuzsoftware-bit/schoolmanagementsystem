'use client';

import React, { useState, useEffect } from 'react';
import { History, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { GlobalTransactionsModal } from '@/components/school-admin/inventory/global-transactions-modal';
import Link from 'next/link';

export default function TransactionsPage() {
    const [schoolId, setSchoolId] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setSchoolId(user.schoolId);
        }
    }, []);

    if (!schoolId) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/school-admin/inventory">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock History</h1>
                        <p className="text-sm font-medium text-slate-500">Comprehensive log of all inward and outward stock movements.</p>
                    </div>
                </div>
            </div>

            <GlobalTransactionsModal schoolId={schoolId} standalone={true} />
        </div>
    );
}
