import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RegNoSettings, EnrollmentNoSettings, AutoIdSettings } from '@/types/student-settings';
import { Separator } from '@/components/ui/separator';
import { Settings2, Hash, FileDigit } from 'lucide-react';

interface IdGenerationManagerProps {
    settings: {
        admissionNumber: RegNoSettings;
        registrationNo: RegNoSettings;
        enrollmentNo: EnrollmentNoSettings;
        apaarId?: AutoIdSettings;
        penNo?: AutoIdSettings;
        srNo?: AutoIdSettings;
        generalRegistrationNo?: AutoIdSettings;
        rollNumber?: AutoIdSettings;
    };
    onUpdate: (field: string, settings: any) => void;
}

const generatePreview = (settings: AutoIdSettings) => {
    const { template, customPattern, prefix, separator1, startFrom, padding, suffix } = settings;
    const paddedSerial = startFrom.toString().padStart(padding, '0');

    if (template === 'custom' && customPattern) {
        let result = customPattern;
        result = result.replace(/{SERIAL}/g, paddedSerial);
        result = result.replace(/{CLASS}/g, 'NUR');
        result = result.replace(/{MONTH}/g, 'Nov');
        result = result.replace(/{YEAR}/g, '26');
        return result;
    }

    if (template === 'template2') return `${prefix}${paddedSerial}${suffix}`;
    if (template === 'template3') return `${paddedSerial}`;
    
    return `${prefix}${separator1}${paddedSerial}${suffix ? separator1 + suffix : ''}`;
};

export default function IdGenerationManager({
    settings,
    onUpdate
}: IdGenerationManagerProps) {

    const fields = [
        { key: 'admissionNumber', label: 'Admission No.', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'registrationNo', label: 'Registration No.', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'enrollmentNo', label: 'Enrollment No.', icon: <FileDigit className="w-4 h-4 text-slate-600" /> },
        { key: 'apaarId', label: 'APAAR ID', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'penNo', label: 'Pen No.', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'srNo', label: 'SR No.', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'generalRegistrationNo', label: 'General Reg. No.', icon: <Hash className="w-4 h-4 text-slate-600" /> },
        { key: 'rollNumber', label: 'Roll Number', icon: <Hash className="w-4 h-4 text-slate-600" /> },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                        <Settings2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-indigo-950">ID Generation Configuration</h3>
                        <p className="text-sm text-indigo-700/80">
                            Configure how Registration Numbers, Enrollment Numbers, and other IDs are automatically generated for new students.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {fields.map((field) => {
                    const fieldSettings = (settings as any)[field.key];
                    if (!fieldSettings) return null;

                    return (
                        <div key={field.key} className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                        {field.icon}
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 whitespace-nowrap">{field.label}</h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 shadow-inner shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onUpdate(field.key, { ...fieldSettings, enabled: true })}
                                            className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                                                fieldSettings.enabled 
                                                ? 'bg-white text-indigo-600 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            Auto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdate(field.key, { ...fieldSettings, enabled: false })}
                                            className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all ${
                                                !fieldSettings.enabled 
                                                ? 'bg-amber-500 text-white shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            Manual
                                        </button>
                                    </div>

                                    {field.key === 'rollNumber' && (
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 shrink-0">
                                            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">Unique per Section</span>
                                            <Switch
                                                checked={fieldSettings.isPerSection}
                                                onCheckedChange={(checked) => onUpdate('rollNumber', { ...fieldSettings, isPerSection: checked })}
                                            />
                                        </div>
                                    )}

                                    {field.key === 'enrollmentNo' && (
                                        <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-1.5 shrink-0">
                                            <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap">Same as Reg No</span>
                                            <Switch
                                                checked={fieldSettings.useSameAsRegNo}
                                                onCheckedChange={(checked) => onUpdate('enrollmentNo', { ...fieldSettings, useSameAsRegNo: checked })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`bg-white p-6 rounded-2xl border transition-all ${!fieldSettings.enabled ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 shadow-sm'} space-y-6`}>
                                {!fieldSettings.enabled ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                        <Hash className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Auto-generation disabled</p>
                                        <p className="text-xs mt-1 text-slate-500 font-medium">Students will require manual entry for this ID.</p>
                                    </div>
                                ) : !(field.key === 'enrollmentNo' && fieldSettings.useSameAsRegNo) ? (
                                    <>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Live Preview</Label>
                                            <div className="text-2xl font-black text-slate-800 tracking-wider font-mono bg-white p-3 rounded-lg border border-slate-200 text-center">
                                                {generatePreview(fieldSettings)}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold text-slate-700">Generation Strategy</Label>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'template1', label: 'Standard', desc: 'Pre-Serial-Suf' },
                                                    { id: 'template2', label: 'Compact', desc: 'No Separators' },
                                                    { id: 'template3', label: 'Only Number', desc: 'Numeric Only' },
                                                    { id: 'custom', label: 'Smart Pattern', desc: 'Dynamic Tokens' },
                                                ].map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => onUpdate(field.key, { ...fieldSettings, template: t.id })}
                                                        className={`p-3 rounded-xl border text-left transition-all ${fieldSettings.template === t.id 
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                                    >
                                                        <div className={`text-[10px] font-black uppercase tracking-widest ${fieldSettings.template === t.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                            {t.desc}
                                                        </div>
                                                        <div className="text-xs font-bold mt-0.5">{t.label}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {fieldSettings.template === 'custom' ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-sm font-bold text-slate-700">Custom Pattern</Label>
                                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">Pro Feature</span>
                                                    </div>
                                                    <Input
                                                        value={fieldSettings.customPattern || ''}
                                                        onChange={(e) => onUpdate(field.key, { ...fieldSettings, customPattern: e.target.value })}
                                                        placeholder="e.g. {SERIAL}-{CLASS}-{MONTH}-{YEAR}"
                                                        className="h-12 font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Available Tokens</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { t: '{SERIAL}', label: 'Serial No' },
                                                            { t: '{CLASS}', label: 'Class Code' },
                                                            { t: '{MONTH}', label: 'Month (Nov)' },
                                                            { t: '{YEAR}', label: 'Year (26)' },
                                                        ].map(token => (
                                                            <button
                                                                key={token.t}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = fieldSettings.customPattern || '';
                                                                    onUpdate(field.key, { ...fieldSettings, customPattern: current + token.t });
                                                                }}
                                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                                            >
                                                                {token.t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Prefix</Label>
                                                        <Input
                                                            value={fieldSettings.prefix}
                                                            onChange={(e) => onUpdate(field.key, { ...fieldSettings, prefix: e.target.value })}
                                                            placeholder="e.g. REG"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Separator</Label>
                                                        <Input
                                                            value={fieldSettings.separator1}
                                                            onChange={(e) => onUpdate(field.key, { ...fieldSettings, separator1: e.target.value })}
                                                            placeholder="e.g. -"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Suffix (Optional)</Label>
                                                    <Input
                                                        value={fieldSettings.suffix}
                                                        onChange={(e) => onUpdate(field.key, { ...fieldSettings, suffix: e.target.value })}
                                                        placeholder="e.g. 2024"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Sequence Settings</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Start From Number</Label>
                                                    <Input
                                                        type="number"
                                                        value={fieldSettings.startFrom}
                                                        onChange={(e) => onUpdate(field.key, { ...fieldSettings, startFrom: parseInt(e.target.value) || 0 })}
                                                        className="h-10 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Number Padding (Zeros)</Label>
                                                    <Input
                                                        type="number"
                                                        value={fieldSettings.padding}
                                                        onChange={(e) => onUpdate(field.key, { ...fieldSettings, padding: parseInt(e.target.value) || 0 })}
                                                        min={1}
                                                        max={12}
                                                        className="h-10 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-sm text-slate-500 font-medium italic">
                                            Enrollment Number will be generated exactly like Registration Number
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
