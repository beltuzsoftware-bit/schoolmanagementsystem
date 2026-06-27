'use client';

import { useState, useEffect } from 'react';
import { getSchools, batchUpdateFeeTemplates, getPlatformConfig, updatePlatformConfig } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    Settings2, Banknote, ShieldAlert, CheckCircle2,
    Globe, Lock, Unlock, School, RefreshCcw, LayoutTemplate,
    ChevronDown
} from 'lucide-react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const TEMPLATES = [
    {
        id: 'template_1',
        name: 'Template 1',
        label: 'Granular Interface',
        description: 'Traditional table-centric ledger view. Best for detailed admin review and manual multi-month splits.',
        color: 'indigo',
    },
    {
        id: 'template_2',
        name: 'Template 2',
        label: 'Modern Interface',
        description: 'Clean, wizard-style collection flow. Best for fast day-to-day fee collection by front-desk staff.',
        color: 'emerald',
    },
];

export default function SuperAdminFeesModule() {
    const [schools, setSchools] = useState<any[]>([]);
    const [platformConfig, setPlatformConfig] = useState<{
        defaultFeeTemplate: string;
        disabledFeeTemplates: string[];
    }>({ defaultFeeTemplate: 'template_1', disabledFeeTemplates: [] });

    const [isUpdating, setIsUpdating] = useState(false);
    const [updatingSchoolId, setUpdatingSchoolId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const [data, cfg] = await Promise.all([getSchools(), getPlatformConfig()]);
            setSchools(data);
            setPlatformConfig(cfg);
        };
        load();
    }, []);

    // ── Set Default Template (platform level) ─────────────────────────────────
    const handleSetDefault = async (template: string) => {
        setIsUpdating(true);
        try {
            const res = await updatePlatformConfig({ defaultFeeTemplate: template });
            if (res.success) {
                setPlatformConfig(prev => ({ ...prev, defaultFeeTemplate: template }));
                const tpl = TEMPLATES.find(t => t.id === template);
                toast.success(`Default template set to ${tpl?.name} (${tpl?.label})`);
            } else {
                toast.error('Failed to update default template.');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Toggle disable/enable a template ─────────────────────────────────────
    const handleToggleDisable = async (templateId: string, disable: boolean) => {
        const tpl = TEMPLATES.find(t => t.id === templateId);
        const current = platformConfig.disabledFeeTemplates || [];

        // Can't disable all templates
        const enabledCount = TEMPLATES.length - (disable ? current.length + 1 : current.length - 1);
        if (enabledCount < 1) {
            toast.error('At least one template must remain enabled.');
            return;
        }

        // Can't disable the default template
        if (disable && templateId === platformConfig.defaultFeeTemplate) {
            toast.error(`Cannot disable the default template. Change the default first.`);
            return;
        }

        const newDisabled = disable
            ? [...current, templateId]
            : current.filter(id => id !== templateId);

        setIsUpdating(true);
        try {
            const res = await updatePlatformConfig({ disabledFeeTemplates: newDisabled });
            if (res.success) {
                setPlatformConfig(prev => ({ ...prev, disabledFeeTemplates: newDisabled }));
                toast.success(disable
                    ? `${tpl?.name} disabled — schools can no longer select it.`
                    : `${tpl?.name} re-enabled for all schools.`
                );
            } else {
                toast.error('Failed to update template availability.');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Batch deploy to ALL schools ───────────────────────────────────────────
    const handleBatchDeploy = async (template: string) => {
        const tplName = TEMPLATES.find(t => t.id === template)?.name;
        if (!confirm(`Force ALL ${schools.length} schools to use ${tplName}? This overrides individual settings.`)) return;

        setIsUpdating(true);
        try {
            const res = await batchUpdateFeeTemplates([], template);
            if (res.success) {
                toast.success(`All schools switched to ${tplName}`);
                const updated = await getSchools();
                setSchools(updated);
            } else {
                toast.error(res.error || 'Batch update failed.');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Update individual school template ─────────────────────────────────────
    const handleSchoolTemplateChange = async (schoolId: string, template: string) => {
        setUpdatingSchoolId(schoolId);
        try {
            const res = await batchUpdateFeeTemplates([schoolId], template);
            if (res.success) {
                setSchools(prev =>
                    prev.map(s => s.id === schoolId ? { ...s, feeCollectionTemplate: template } : s)
                );
                toast.success(`Updated template for school.`);
            } else {
                toast.error(res.error || 'Failed.');
            }
        } finally {
            setUpdatingSchoolId(null);
        }
    };

    const disabledSet = new Set(platformConfig.disabledFeeTemplates || []);
    const t1Count = schools.filter(s => (s.feeCollectionTemplate || 'template_1') === 'template_1').length;
    const t2Count = schools.filter(s => s.feeCollectionTemplate === 'template_2').length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fees Module Control</h1>
                    <p className="text-slate-500 mt-1">
                        Set the global default template, disable specific layouts, and manage per-school overrides.
                    </p>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 font-bold">
                    {schools.length} Schools Active
                </Badge>
            </div>

            {/* ROW 1: Stats + Default + Disable Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- Distribution Stats --- */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Banknote className="text-indigo-500" size={18} />
                            Template Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-3">
                        {TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{tpl.name}</span>
                                    <span className="text-sm font-black text-slate-800">{tpl.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {disabledSet.has(tpl.id) && (
                                        <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 text-[10px] font-black">DISABLED</Badge>
                                    )}
                                    {tpl.id === platformConfig.defaultFeeTemplate && (
                                        <Badge className="bg-indigo-600 text-[10px] font-black">DEFAULT</Badge>
                                    )}
                                    <Badge className={`${tpl.color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-600'} h-8 w-8 rounded-full flex items-center justify-center p-0 text-sm`}>
                                        {tpl.id === 'template_1' ? t1Count : t2Count}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* --- Default Template Picker --- */}
                <Card className="border-2 border-indigo-100 shadow-lg bg-white">
                    <CardHeader className="bg-indigo-50 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                <Globe className="text-indigo-600" size={18} />
                                Platform Default Template
                            </CardTitle>
                            <Badge className="bg-indigo-200 text-indigo-700 border-none font-black text-[10px] tracking-tighter uppercase">
                                SaaS Config
                            </Badge>
                        </div>
                        <CardDescription className="text-indigo-600/70 text-xs mt-1">
                            New schools and schools without an explicit override will use this template.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            {TEMPLATES.map(tpl => {
                                const isDefault = platformConfig.defaultFeeTemplate === tpl.id;
                                const isDisabled = disabledSet.has(tpl.id);
                                return (
                                    <button
                                        key={tpl.id}
                                        onClick={() => !isDisabled && handleSetDefault(tpl.id)}
                                        disabled={isDisabled || isUpdating}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                            isDefault
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                : isDisabled
                                                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black text-slate-500 uppercase">{tpl.name}</p>
                                                <p className="text-sm font-bold text-slate-800 mt-0.5">{tpl.label}</p>
                                            </div>
                                            {isDefault && (
                                                <span className="flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                                                    <CheckCircle2 size={13} className="stroke-[3]" /> Default
                                                </span>
                                            )}
                                            {isDisabled && (
                                                <span className="flex items-center gap-1 text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                                    <Lock size={13} /> Disabled
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* --- Enable/Disable Templates --- */}
                <Card className="border-2 border-rose-100 shadow-lg bg-white">
                    <CardHeader className="bg-rose-50 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
                                <Lock className="text-rose-600" size={18} />
                                Template Availability
                            </CardTitle>
                            <Badge className="bg-rose-200 text-rose-700 border-none font-black text-[10px] tracking-tighter uppercase">
                                Access Control
                            </Badge>
                        </div>
                        <CardDescription className="text-rose-600/70 text-xs mt-1">
                            Disabled templates cannot be selected by any school admin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {TEMPLATES.map(tpl => {
                            const isDisabled = disabledSet.has(tpl.id);
                            const isDefault = platformConfig.defaultFeeTemplate === tpl.id;
                            return (
                                <div key={tpl.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    isDisabled ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-slate-50'
                                }`}>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{tpl.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{tpl.label}</p>
                                        {isDefault && (
                                            <span className="text-[10px] font-bold text-indigo-600 mt-1 block">
                                                ★ This is the platform default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-black ${isDisabled ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {isDisabled ? 'Disabled' : 'Enabled'}
                                        </span>
                                        <Switch
                                            checked={!isDisabled}
                                            disabled={isUpdating || isDefault}
                                            onCheckedChange={(checked) => handleToggleDisable(tpl.id, !checked)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-[10px] text-slate-400 italic">
                            * The platform default template cannot be disabled. Change the default first.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ROW 2: Global Deploy + Per-School Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Batch Deploy */}
                <Card className="border-2 border-amber-100 shadow-lg bg-white">
                    <CardHeader className="bg-amber-50 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-amber-600" size={18} />
                            <CardTitle className="text-sm font-bold text-amber-900">Force Global Deploy</CardTitle>
                        </div>
                        <CardDescription className="text-amber-700/70 text-xs mt-1">
                            Override ALL individual school settings and force a single template platform-wide.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-3">
                        {TEMPLATES.filter(t => !disabledSet.has(t.id)).map(tpl => (
                            <Button
                                key={tpl.id}
                                variant="outline"
                                className={`w-full h-12 font-bold text-sm justify-start gap-3 ${
                                    tpl.color === 'indigo'
                                        ? 'border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 text-indigo-700'
                                        : 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-700'
                                }`}
                                disabled={isUpdating}
                                onClick={() => handleBatchDeploy(tpl.id)}
                            >
                                <RefreshCcw size={15} />
                                Deploy {tpl.name} to All
                            </Button>
                        ))}
                        <p className="text-[10px] text-amber-600 font-medium pt-1">
                            ⚠ This immediately overrides every school's individual template selection.
                        </p>
                    </CardContent>
                </Card>

                {/* Per-School Table */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <School className="text-slate-500" size={18} />
                                Per-School Template Override
                            </CardTitle>
                            <Badge variant="outline" className="text-slate-600 font-bold text-[10px] uppercase">
                                {schools.length} Schools
                            </Badge>
                        </div>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                            Override the template for individual schools. Changes take effect immediately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-[420px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow className="border-b-2">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-8">#</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">School Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Template</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-48">Override</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schools.map((school, idx) => {
                                        const current = school.feeCollectionTemplate || platformConfig.defaultFeeTemplate || 'template_1';
                                        const tplInfo = TEMPLATES.find(t => t.id === current);
                                        const isBusy = updatingSchoolId === school.id;
                                        return (
                                            <TableRow key={school.id} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="text-xs text-slate-400 font-bold">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-sm text-slate-800">{school.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">{school.schoolId}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`text-[10px] font-black ${
                                                            current === 'template_1'
                                                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        } border`}
                                                        variant="outline"
                                                    >
                                                        {tplInfo?.name} — {tplInfo?.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={current}
                                                        onValueChange={(val) => handleSchoolTemplateChange(school.id, val)}
                                                        disabled={isBusy}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs font-bold border-slate-200 rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TEMPLATES.filter(t => !disabledSet.has(t.id)).map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                                                                    {t.name} — {t.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {schools.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                    <School size={32} className="opacity-30" />
                                    <p className="text-sm font-medium">No schools found</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer note */}
            <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50 flex items-center gap-4">
                <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-500 shrink-0">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800">Financial data is never affected by template changes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Templates only change the visual layout and UI of fee collection. All transaction records, balances, and fee groups remain completely untouched regardless of which template is active.
                    </p>
                </div>
            </div>
        </div>
    );
}
