'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PurchaseInvoicesModal } from '@/components/school-admin/inventory/purchase-invoices-modal';
import Link from 'next/link';

export default function VendorPurchasesPage() {
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vendor Purchases</h1>
                        <p className="text-sm font-medium text-slate-500">Manage purchase invoices and stock inward from suppliers.</p>
                    </div>
                </div>
            </div>

            <PurchaseInvoicesModal schoolId={schoolId} standalone={true} />
        </div>
    );
}
