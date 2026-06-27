'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { InventorySettingsModal } from '@/components/school-admin/inventory/inventory-settings-modal';
import Link from 'next/link';

export default function InventorySettingsPage() {
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Settings</h1>
                        <p className="text-sm font-medium text-slate-500">Configure low stock alerts, units, and inventory preferences.</p>
                    </div>
                </div>
            </div>

            <InventorySettingsModal schoolId={schoolId} standalone={true} />
        </div>
    );
}
