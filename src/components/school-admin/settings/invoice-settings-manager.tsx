'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { getInvoiceSettings, updateInvoiceSettings } from '@/app/actions';

export interface InvoiceSettings {
    prefix: string;
    startFrom: number;
    padding: number;
    currentSequence: number; // Track the last used number
    defaultPaymentMode: string;
    autoGenerate: boolean;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
    prefix: 'REC-',
    startFrom: 1000,
    padding: 4,
    currentSequence: 0,
    defaultPaymentMode: 'Cash',
    autoGenerate: true
};

export default function InvoiceSettingsManager() {
    const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const init = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.schoolId) {
                    const saved = await getInvoiceSettings(user.schoolId);
                    if (saved) {
                        setSettings(saved);
                    }
                }
            }
        };
        init();
    }, []);

    const handleChange = (field: keyof InvoiceSettings, value: any) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        // Validation
        if (settings.padding < 1 || settings.padding > 10) {
            toast.error("Padding must be between 1 and 10");
            return;
        }
        if (settings.startFrom < 1) {
            toast.error("Start number must be positive");
            return;
        }

        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                await updateInvoiceSettings(user.schoolId, settings);
                toast.success("Invoice settings saved successfully");
            }
        }
    };

    if (!isClient) return null;

    // Preview
    const nextSeq = Math.max(settings.startFrom, settings.currentSequence + 1);
    const previewId = `${settings.prefix}${nextSeq.toString().padStart(settings.padding, '0')}`;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Invoice Generation</h3>
                <p className="text-slate-500 text-sm mt-1">Configure how receipt IDs are generated.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Default Receipt Generation Mode</Label>
                        <div className="flex bg-slate-100 p-1 rounded-xl h-11 border border-slate-200/60 shadow-inner">
                            <button
                                type="button"
                                className={`flex-grow rounded-lg text-[11px] font-black transition-all ${settings.autoGenerate ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-600'}`}
                                onClick={() => handleChange('autoGenerate', true)}
                            >
                                AUTO GENERATION
                            </button>
                            <button
                                type="button"
                                className={`flex-grow rounded-lg text-[11px] font-black transition-all ${!settings.autoGenerate ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-600'}`}
                                onClick={() => handleChange('autoGenerate', false)}
                            >
                                MANUAL ENTRY
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Choose if the system defaults to Auto-generating receipt IDs or Manual entry. Admin can still toggle this during payment collection.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Prefix</Label>
                        <Input
                            value={settings.prefix}
                            onChange={(e) => handleChange('prefix', e.target.value)}
                            placeholder="e.g. REC-"
                        />
                        <p className="text-[10px] text-slate-400">Fixed text at the start of the ID.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Start Sequence From</Label>
                        <Input
                            type="number"
                            value={settings.startFrom}
                            onChange={(e) => handleChange('startFrom', parseInt(e.target.value) || 0)}
                            min={1}
                        />
                        <p className="text-[10px] text-slate-400">The first receipt will start from this number.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Padding (Digits)</Label>
                        <Input
                            type="number"
                            value={settings.padding}
                            onChange={(e) => handleChange('padding', parseInt(e.target.value) || 4)}
                            min={1}
                            max={10}
                        />
                        <p className="text-[10px] text-slate-400">Minimum number of digits (e.g. 4 &rarr; 0001).</p>
                    </div>


                </div>

                <div className="flex flex-col justify-between p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">ID Preview</h4>
                        <div className="text-3xl font-mono font-bold text-indigo-600 tracking-wider">
                            {previewId}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            current sequence: {settings.currentSequence}
                        </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-amber-800">
                                <strong>Note:</strong> Changing settings will only affect <strong>future</strong> receipts. Existing receipt IDs will remain unchanged.
                            </p>
                        </div>
                        <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
