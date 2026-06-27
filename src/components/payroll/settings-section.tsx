'use client';

import React from 'react';
import {
    Settings as SettingsIcon,
    Calendar,
    Clock,
    ShieldCheck,
    Save,
    Info,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { School } from '@/types';
import { CalculationMode } from '@/types/staff';

interface SettingsSectionProps {
    school: School;
    onUpdateSchool: (updates: Partial<School>) => Promise<any>;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ school, onUpdateSchool }) => {
    const [localConfig, setLocalConfig] = React.useState(school.payrollConfig || { mode: CalculationMode.CALENDAR_DAYS, fixedValue: 26 });
    const [isSaved, setIsSaved] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        const res = await onUpdateSchool({ payrollConfig: localConfig });
        if (res?.success) {
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        }
        setIsSubmitting(false);
    };

    // Live preview calculation
    const getPreviewDays = () => {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        if (localConfig.mode === CalculationMode.FIXED_DAYS) return localConfig.fixedValue;

        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(today.getFullYear(), today.getMonth(), d);
            if (localConfig.mode === CalculationMode.CALENDAR_EXCLUDE_SUNDAY) {
                if (date.getDay() !== 0) workingDays++;
            } else {
                workingDays++;
            }
        }
        return workingDays;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Institution Settings</h2>
                    <p className="text-slate-500">Configure global payroll policies for {school.name}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                    {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {isSaved ? 'SETTINGS SAVED' : 'SAVE CONFIGURATION'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Policy Selector Cards */}
                {[
                    {
                        id: CalculationMode.CALENDAR_EXCLUDE_SUNDAY,
                        title: 'Dynamic (No Sundays)',
                        desc: 'Calculate daily rate based on exact calendar days excluding Sundays.',
                        icon: Calendar,
                        color: 'text-blue-600',
                        bg: 'bg-blue-100',
                        gradientFrom: 'from-blue-500',
                        gradientTo: 'to-blue-700',
                        ring: 'ring-blue-200',
                        border: 'border-blue-500',
                    },
                    {
                        id: CalculationMode.CALENDAR_INCLUDE_ALL_DAYS,
                        title: 'Full Calendar',
                        desc: 'Calculate based on every single day in the month (e.g., 30 or 31).',
                        icon: Clock,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-100',
                        gradientFrom: 'from-emerald-500',
                        gradientTo: 'to-emerald-700',
                        ring: 'ring-emerald-200',
                        border: 'border-emerald-500',
                    },
                    {
                        id: CalculationMode.FIXED_DAYS,
                        title: 'Fixed Standard',
                        desc: 'Use a fixed manual divisor for every month regardless of calendar.',
                        icon: ShieldCheck,
                        color: 'text-amber-600',
                        bg: 'bg-amber-100',
                        gradientFrom: 'from-amber-500',
                        gradientTo: 'to-amber-600',
                        ring: 'ring-amber-200',
                        border: 'border-amber-500',
                    }
                ].map((mode) => {
                    const isActive = localConfig.mode === mode.id || 
                        (mode.id === CalculationMode.CALENDAR_INCLUDE_ALL_DAYS && localConfig.mode === CalculationMode.CALENDAR_DAYS);
                    return (
                        <button
                            key={mode.id}
                            onClick={() => setLocalConfig({ ...localConfig, mode: mode.id as any })}
                            className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
                                isActive
                                    ? `${mode.border} bg-white shadow-xl ${mode.ring} ring-4`
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                            }`}
                        >
                            {/* Colored top banner when active */}
                            {isActive && (
                                <div className={`bg-gradient-to-br ${mode.gradientFrom} ${mode.gradientTo} px-5 pt-5 pb-4`}>
                                    <div className="flex items-center justify-between">
                                        <div className="bg-white/20 w-11 h-11 rounded-xl flex items-center justify-center">
                                            <mode.icon size={22} className="text-white" />
                                        </div>
                                        <span className="flex items-center gap-1.5 bg-white text-green-700 text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                            <CheckCircle2 size={12} className="stroke-[3]" />
                                            ACTIVE
                                        </span>
                                    </div>
                                    <h4 className="font-black text-white mt-3 text-base">{mode.title}</h4>
                                </div>
                            )}

                            {/* Inactive icon header */}
                            {!isActive && (
                                <div className="px-5 pt-5 pb-2">
                                    <div className={`${mode.bg} ${mode.color} w-11 h-11 rounded-xl flex items-center justify-center mb-3`}>
                                        <mode.icon size={22} />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-base">{mode.title}</h4>
                                </div>
                            )}

                            {/* Description */}
                            <div className="px-5 pb-5 pt-2">
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">{mode.desc}</p>
                                {!isActive && (
                                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider">Click to activate</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Configuration Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        {localConfig.mode === CalculationMode.FIXED_DAYS && (
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Fixed Working Days / Month</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={localConfig.fixedValue}
                                        onChange={(e) => setLocalConfig({ ...localConfig, fixedValue: parseInt(e.target.value) || 26 })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DAYS</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Standard divisor for all months (e.g., 26 is common for 6-day work weeks).</p>
                            </div>
                        )}

                        <div className="p-6 bg-slate-900 rounded-2xl text-white overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-all duration-700" />
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Policy Live Preview</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-4xl font-black">{getPreviewDays()} Days</p>
                                        <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1">Calculated Divisor for {new Date().toLocaleDateString('en-US', { month: 'long' })}</p>
                                    </div>
                                    <Info size={24} className="text-indigo-400/50" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><AlertCircle size={20} /></div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-800">Legal Compliance</h5>
                                <p className="text-xs text-slate-500 mt-1">Changing the calculation mode affects Loss of Pay (LOP) and Daily Wage rates for all employees immediately.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><ShieldCheck size={20} /></div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-800">SaaS Multi-Tenancy</h5>
                                <p className="text-xs text-slate-500 mt-1">This setting is isolated to <strong>{school.name}</strong> and does not affect other institutions on the network.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsSection;
