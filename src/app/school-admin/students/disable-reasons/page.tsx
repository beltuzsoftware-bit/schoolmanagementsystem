'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Save, Trash2, Edit2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getSchools, updateStudentSettings, getGlobalStudentDefaults } from '@/app/actions';
import { School } from '@/types';
import SimpleListManager from '@/components/school-admin/settings/simple-list-manager';

export default function DisableReasonsPage() {
    const [school, setSchool] = useState<School | null>(null);
    const [disableReasons, setDisableReasons] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const storedUser = localStorage.getItem('kummi_user');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        const schoolId = user.schoolId;
        if (!schoolId) return;

        const [schools, globals] = await Promise.all([
            getSchools(),
            getGlobalStudentDefaults()
        ]);

        const mySchool = schools.find((s: School) => s.id === schoolId);
        if (mySchool) {
            setSchool(mySchool);
            const ms = mySchool as any;
            setDisableReasons(ms.disableReasons || globals?.disableReasons || []);
        }
    };

    const handleUpdateReasons = async (newReasons: string[]) => {
        if (!school) return;
        setDisableReasons(newReasons);
        setLoading(true);
        try {
            const res = await updateStudentSettings(school.id, {
                disableReasons: newReasons,
                useCustomDisableReasons: true
            });
            if (res.success) {
                toast.success("Disable reasons updated successfully");
            } else {
                toast.error("Failed to update reasons");
            }
        } catch (error) {
            toast.error("Error saving reasons");
        } finally {
            setLoading(false);
        }
    };

    const filteredReasons = disableReasons.filter(r => 
        r.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Disable Reason</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage reasons for disabling student accounts.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Form Info */}
                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                    <Card className="border-t-4 border-t-teal-600 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Add Disable Reason</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed font-medium">
                                <Info size={14} className="inline mr-1 mb-0.5" />
                                These reasons will appear in the dropdown menu when you disable a student account.
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600">Disable Reason *</Label>
                                <div className="flex flex-col gap-2">
                                    <Input 
                                        id="newReason"
                                        placeholder="e.g. FINANCIAL PROBLEM" 
                                        className="h-10 text-xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.currentTarget as HTMLInputElement).value;
                                                if (val) {
                                                    handleUpdateReasons([...disableReasons, val]);
                                                    (e.currentTarget as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <Button 
                                        onClick={() => {
                                            const input = document.getElementById('newReason') as HTMLInputElement;
                                            if (input.value) {
                                                handleUpdateReasons([...disableReasons, input.value]);
                                                input.value = '';
                                            }
                                        }}
                                        className="w-full bg-slate-700 hover:bg-slate-800 h-9 text-[11px] font-bold uppercase tracking-wider"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: List */}
                <div className="md:col-span-8 lg:col-span-9">
                    <Card className="border-t-4 border-t-slate-200 shadow-sm min-h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold">Disable Reason List</CardTitle>
                            <div className="relative w-48">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-medium"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="w-full overflow-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 opacity-60">
                                        <tr>
                                            <th className="px-6 py-3 font-bold uppercase tracking-wider">Disable Reason</th>
                                            <th className="px-6 py-3 font-bold uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredReasons.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                                    No reasons found matching your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReasons.map((reason, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tight">
                                                        {reason}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 pr-2">
                                                            <button 
                                                                onClick={() => {
                                                                    const newVal = prompt("Edit Disable Reason:", reason);
                                                                    if (newVal && newVal !== reason) {
                                                                        const updated = [...disableReasons];
                                                                        updated[disableReasons.indexOf(reason)] = newVal;
                                                                        handleUpdateReasons(updated);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if (confirm(`Are you sure you want to delete "${reason}"?`)) {
                                                                        handleUpdateReasons(disableReasons.filter(r => r !== reason));
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Footer Info */}
                            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                                <span>Records: {filteredReasons.length} to {disableReasons.length} of {disableReasons.length}</span>
                                <div className="flex gap-1">
                                    <button className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-300 pointer-events-none">{'<'}</button>
                                    <button className="px-2 py-1 bg-white border border-teal-600 text-teal-600 rounded">1</button>
                                    <button className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-400">{'>'}</button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
