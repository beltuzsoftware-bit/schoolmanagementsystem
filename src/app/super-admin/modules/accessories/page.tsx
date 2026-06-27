'use client';

import { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { 
    ShoppingBag, 
    Tag, 
    Warehouse, 
    Settings2, 
    Plus, 
    Package, 
    Edit, 
    Trash2, 
    School as SchoolIcon,
    ChevronRight,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    getAccessoryTemplates, 
    getSchools, 
    assignAccessoryTemplateToSchool,
    addAccessoryTemplate,
    updateAccessoryTemplate,
    setDefaultAccessoryTemplate
} from '@/app/actions';
import { AccessoryTemplate, School, AccessoryFieldConfig } from '@/types';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
} from "@/components/ui/dialog";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const DEFAULT_FIELDS = [
    { fieldName: 'hsnCode', label: 'HSN Code' },
    { fieldName: 'description', label: 'Description' },
    { fieldName: 'vendorDetails', label: 'Vendor Details' },
    { fieldName: 'entryDate', label: 'Entry Date' },
    { fieldName: 'entryQuantity', label: 'Entry Qty' },
    { fieldName: 'totalQuantity', label: 'Total Qty' },
    { fieldName: 'availableQuantity', label: 'Available Qty' },
    { fieldName: 'thresholdQuantity', label: 'Threshold Qty' },
    { fieldName: 'buyPrice', label: 'Buy Rate' },
    { fieldName: 'sellPrice', label: 'Sell Rate' },
    { fieldName: 'carryForward', label: 'Carry Forward' },
];

export default function AccessoriesConfigPage() {
    const [templates, setTemplates] = useState<AccessoryTemplate[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    // Template Form State
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<AccessoryTemplate> | null>(null);
    const [tplName, setTplName] = useState('');
    const [tplDesc, setTplDesc] = useState('');
    const [tplConfig, setTplConfig] = useState<AccessoryFieldConfig[]>([]);

    // Assignment state
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            const [tpls, scls] = await Promise.all([
                getAccessoryTemplates(),
                getSchools()
            ]);
            setTemplates(tpls);
            setSchools(scls);
            setIsLoading(false);
        };
        loadData();
    }, []);

    const resetTemplateForm = () => {
        setEditingTemplate(null);
        setTplName('');
        setTplDesc('');
        setTplConfig(DEFAULT_FIELDS.map(f => ({
            fieldName: f.fieldName,
            label: f.label,
            isVisible: true,
            isRequired: false
        })));
    };

    const handleCreateOrUpdateTemplate = async () => {
        if (!tplName) {
            toast.error("Template name is required");
            return;
        }

        const templateData: Partial<AccessoryTemplate> = {
            ...editingTemplate,
            name: tplName,
            description: tplDesc,
            fieldConfig: tplConfig,
            categories: editingTemplate?.categories || [],
            defaultItems: editingTemplate?.defaultItems || []
        };

        let result;
        if (editingTemplate?.id) {
            result = await updateAccessoryTemplate(templateData as AccessoryTemplate);
        } else {
            result = await addAccessoryTemplate(templateData as Omit<AccessoryTemplate, 'id'>);
        }

        if (result.success) {
            toast.success(editingTemplate?.id ? "Template updated" : "Template created");
            setIsTemplateDialogOpen(false);
            resetTemplateForm();
            const updatedTpls = await getAccessoryTemplates();
            setTemplates(updatedTpls);
        } else {
            toast.error("Failed to save template");
        }
    };

    const handleEditTemplate = (tpl: AccessoryTemplate) => {
        setEditingTemplate(tpl);
        setTplName(tpl.name);
        setTplDesc(tpl.description || '');
        setTplConfig(tpl.fieldConfig || []);
        setIsTemplateDialogOpen(true);
    };

    const handleSetDefaultTemplate = async (templateId: string) => {
        const result = await setDefaultAccessoryTemplate(templateId);
        if (result.success) {
            toast.success("Default template updated successfully");
            const updatedTpls = await getAccessoryTemplates();
            setTemplates(updatedTpls);
        } else {
            toast.error(result.error || "Failed to set default template");
        }
    };

    const handleAssign = async () => {
        if (!selectedSchoolId || !selectedTemplateId) {
            toast.error("Please select both a school and a template");
            return;
        }

        setIsAssigning(true);
        const result = await assignAccessoryTemplateToSchool(selectedSchoolId, selectedTemplateId);
        setIsAssigning(false);

        if (result.success) {
            toast.success("Template assigned successfully to school");
            setSelectedSchoolId('');
            setSelectedTemplateId('');
            const updatedSchools = await getSchools();
            setSchools(updatedSchools);
        } else {
            toast.error(result.error || "Failed to assign template");
        }
    };

    if (isLoading) return <div className="p-8 text-center animate-pulse">Loading Configurations...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <ShoppingBag className="h-10 w-10 text-indigo-600" />
                        Accessories Logic
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Define global categories and inventory structures for schools.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
                        setIsTemplateDialogOpen(open);
                        if (!open) resetTemplateForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={resetTemplateForm} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-8 shadow-xl shadow-indigo-100 font-bold">
                                <Plus className="mr-2 h-4 w-4" /> New Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tight">
                                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                                </DialogTitle>
                                <DialogDescription className="text-lg">
                                    Define global field visibility and requirement logic.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-8 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Template Name</label>
                                        <input 
                                            className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-6 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="Standard Comprehensive"
                                            value={tplName}
                                            onChange={(e) => setTplName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Description</label>
                                        <input 
                                            className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-6 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="Default inventory structure"
                                            value={tplDesc}
                                            onChange={(e) => setTplDesc(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-indigo-600" />
                                        Field Configuration
                                    </h3>
                                    <div className="rounded-3xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Field Name</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visible</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Required (Default)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 text-slate-900">
                                                {tplConfig.map((field, idx) => (
                                                    <tr key={field.fieldName} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-700">{field.label}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.isVisible}
                                                                onChange={(e) => {
                                                                    const newConfig = [...tplConfig];
                                                                    newConfig[idx].isVisible = e.target.checked;
                                                                    setTplConfig(newConfig);
                                                                }}
                                                                className="h-5 w-5 accent-indigo-600 cursor-pointer" 
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.isRequired}
                                                                disabled={!field.isVisible}
                                                                onChange={(e) => {
                                                                    const newConfig = [...tplConfig];
                                                                    newConfig[idx].isRequired = e.target.checked;
                                                                    setTplConfig(newConfig);
                                                                }}
                                                                className="h-5 w-5 accent-indigo-600 cursor-pointer disabled:opacity-30" 
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl shadow-2xl shadow-indigo-100 transition-all active:scale-95"
                                    onClick={handleCreateOrUpdateTemplate}
                                >
                                    {editingTemplate?.id ? 'Update Template' : 'Create Template'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Global Templates */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Global Templates</h2>
                        <Badge variant="outline" className="rounded-full px-4 border-indigo-100 text-indigo-600 bg-indigo-50/50 font-bold">
                            {templates.length} Available
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-slate-900">
                        {templates.map((tpl) => (
                            <Card key={tpl.id} className="rounded-[2rem] border-none shadow-xl shadow-slate-100/50 bg-white overflow-hidden ring-1 ring-slate-100 hover:ring-indigo-100 transition-all group">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-black">{tpl.name}</CardTitle>
                                                <CardDescription className="mt-1 font-medium">{tpl.description}</CardDescription>
                                            </div>
                                        </div>
                                        {tpl.isDefault && (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full px-3 font-bold text-[10px] tracking-wider uppercase">Default</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 pt-0">
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {tpl.categories.map(cat => (
                                            <Badge key={cat.id} variant="secondary" className="bg-slate-50 text-slate-500 border-none rounded-lg px-3 py-1 text-xs font-bold">
                                                {cat.name}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex gap-3 pt-6 border-t border-slate-50">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(tpl)} className="rounded-xl font-bold text-indigo-600 hover:bg-indigo-50">
                                            <Edit className="w-4 h-4 mr-2" /> Edit Template
                                        </Button>
                                        {!tpl.isDefault && (
                                            <Button variant="ghost" size="sm" onClick={() => handleSetDefaultTemplate(tpl.id)} className="rounded-xl font-bold text-emerald-600 hover:bg-emerald-50">
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Set as Default
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Column: Template Assignment */}
                <div className="space-y-6">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-100/50 bg-white overflow-hidden ring-1 ring-indigo-50">
                        <CardHeader className="p-8 pb-4 bg-indigo-50/30">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-4">
                                <SchoolIcon size={24} />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-900">Assign to School</CardTitle>
                            <CardDescription className="font-medium">Setup a school's accessory structure using a global template.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2 text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">
                                    Target School
                                </div>
                                <Select onValueChange={setSelectedSchoolId} value={selectedSchoolId}>
                                    <SelectTrigger className="w-full rounded-2xl h-14 border-slate-100 hover:border-indigo-200 bg-slate-50/50 transition-colors px-6 text-slate-900">
                                        <SelectValue placeholder="Select a school" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        {schools.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="rounded-xl my-1 mx-1 focus:bg-indigo-50 text-slate-900">
                                                {s.name} {s.accessories ? '(Linked)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="space-y-2 text-sm font-bold text-slate-400 uppercase tracking-widest pl-1 pt-2">
                                    Base Template
                                </div>
                                <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                                    <SelectTrigger className="w-full rounded-2xl h-14 border-slate-100 hover:border-indigo-200 bg-slate-50/50 transition-colors px-6 text-slate-900">
                                        <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id} className="rounded-xl my-1 mx-1 focus:bg-indigo-50 text-slate-900">
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 shadow-xl shadow-indigo-100 font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                                onClick={handleAssign}
                                disabled={isAssigning || !selectedSchoolId || !selectedTemplateId}
                            >
                                {isAssigning ? 'Linking...' : 'Initialize School Catalog'}
                            </Button>

                            <p className="text-[11px] text-center text-slate-400 font-medium px-4">
                                This will copy all categories and items from the template to the school. The school can then customize their own settings.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Quick Stats Sidebar */}
                    <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-100/50 bg-gradient-to-br from-slate-900 to-indigo-950 overflow-hidden text-white">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <Settings2 className="w-6 h-6 text-indigo-400" />
                                <Badge className="bg-white/10 text-indigo-200 border-none rounded-full">System Stats</Badge>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <CheckCircle2 size={20} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black">{schools.filter(s => s.accessories).length}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Schools initialized</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400">
                                        <ChevronRight size={20} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black">{templates.reduce((acc, curr) => acc + curr.categories.length, 0)}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global categories</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
