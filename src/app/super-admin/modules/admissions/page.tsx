"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    UserPlus,
    Settings2,
    ShieldCheck,
    Eye,
    CheckCircle,
    Plus,
    Edit2,
    Trash2,
    Save,
    ClipboardList,
    GraduationCap,
    ArrowRight,
    Star,
    Heart,
    Zap,
    Layout,
    FileText,
    Shield,
    User,
    Users,
    BookOpen,
    Award,
    Smile,
    Bell,
    CalendarCheck,
    Briefcase,
    Globe,
    MapPin,
    Hash,
    Fingerprint,
    Focus,
    Ghost,
    Gift,
    Gamepad2,
    Coffee
} from "lucide-react";

// Available icons for templates
const AVAILABLE_ICONS = [
    { name: 'ClipboardList', icon: ClipboardList },
    { name: 'UserPlus', icon: UserPlus },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Zap', icon: Zap },
    { name: 'Layout', icon: Layout },
    { name: 'FileText', icon: FileText },
    { name: 'Shield', icon: Shield },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'User', icon: User },
    { name: 'Users', icon: Users },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Award', icon: Award },
    { name: 'Smile', icon: Smile },
    { name: 'Bell', icon: Bell },
    { name: 'CalendarCheck', icon: CalendarCheck },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Globe', icon: Globe },
    { name: 'MapPin', icon: MapPin },
    { name: 'Hash', icon: Hash },
    { name: 'Fingerprint', icon: Fingerprint },
    { name: 'Focus', icon: Focus },
    { name: 'Ghost', icon: Ghost },
    { name: 'Gift', icon: Gift },
    { name: 'Gamepad2', icon: Gamepad2 },
    { name: 'Coffee', icon: Coffee }
];

const DynamicIcon = ({ name, size = 20, className = "" }: { name?: string, size?: number, className?: string }) => {
    const IconComponent = AVAILABLE_ICONS.find(i => i.name === name)?.icon || ClipboardList;
    return <IconComponent size={size} className={className} />;
};
import {
    getAdmissionFormTemplates,
    addAdmissionFormTemplate,
    updateAdmissionFormTemplate,
    deleteAdmissionFormTemplate,
    saveAdmissionFormAsDefault,
    duplicateAdmissionFormTemplate
} from "@/app/actions";
import { AdmissionFormTemplate, StudentFormConfig } from "@/types";
import AdmissionFieldConfigEditor from "@/components/super-admin/admission-field-config-editor";
import AdmissionFormPreview from "@/components/super-admin/admission-form-preview";
import { toast } from "sonner";
export default function AdmissionModulePage() {
    const [formTemplates, setFormTemplates] = useState<AdmissionFormTemplate[]>([]);
    const [mounted, setMounted] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AdmissionFormTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTemplateInfo, setNewTemplateInfo] = useState({ name: '', description: '', icon: 'ClipboardList' });
    const [renamingTemplate, setRenamingTemplate] = useState<AdmissionFormTemplate | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        const templates = await getAdmissionFormTemplates();
        setFormTemplates(templates);
    };

    const handleOpenCreateDialog = () => {
        setNewTemplateInfo({ name: '', description: '', icon: 'ClipboardList' });
        setIsCreateDialogOpen(true);
    };

    const handleCreateTemplate = () => {
        if (!newTemplateInfo.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        const newTemplate: AdmissionFormTemplate = {
            id: 'new',
            name: newTemplateInfo.name,
            description: newTemplateInfo.description || 'Customized registration form.',
            icon: newTemplateInfo.icon,
            config: [...(formTemplates[0]?.config || [])]
        };
        setEditingTemplate(newTemplate);
        setIsCreating(true);
        setIsCreateDialogOpen(false);
    };

    const handleOpenRenameDialog = (tmpl: AdmissionFormTemplate) => {
        setRenamingTemplate({ ...tmpl });
        setIsRenameDialogOpen(true);
    };

    const handleRenameTemplate = async () => {
        if (!renamingTemplate || !renamingTemplate.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        try {
            const res = await updateAdmissionFormTemplate(renamingTemplate);
            if (res.success) {
                setFormTemplates(formTemplates.map(t => t.id === renamingTemplate.id ? renamingTemplate : t));
                toast.success('Template renamed successfully');
                setIsRenameDialogOpen(false);
                setRenamingTemplate(null);
            } else {
                toast.error(res.error || 'Failed to rename template');
            }
        } catch (error) {
            toast.error('Failed to rename template');
        }
    };

    const handleSaveAsDefault = async () => {
        if (!editingTemplate) return;
        
        setIsSaving(true);
        try {
            const res = await saveAdmissionFormAsDefault(editingTemplate.config, editingTemplate.sectionSettings || []);
            if (res.success) {
                toast.success('✅ Current configuration saved as System Default!');
            } else {
                toast.error(res.error || 'Failed to save defaults');
            }
        } catch (error) {
            toast.error('An error occurred while saving defaults');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;

        setIsSaving(true);
        try {
            if (isCreating) {
                const res = await addAdmissionFormTemplate(editingTemplate);
                if (res.success && res.template) {
                    setFormTemplates([...formTemplates, res.template]);
                    toast.success('✅ Template created and applied to schools');
                }
            } else {
                const res = await updateAdmissionFormTemplate(editingTemplate);
                if (res.success) {
                    setFormTemplates(formTemplates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                    toast.success('✅ Template saved & pushed to all schools instantly!');
                }
            }
            setEditingTemplate(null);
        } catch (error) {
            toast.error('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDuplicateTemplate = async (tmpl: AdmissionFormTemplate) => {
        setIsSaving(true);
        try {
            const res = await duplicateAdmissionFormTemplate(tmpl.id);
            if (res.success && res.template) {
                setFormTemplates([...formTemplates, res.template]);
                toast.success('✅ Template duplicated successfully');
            } else {
                toast.error(res.error || 'Failed to duplicate template');
            }
        } catch (error) {
            toast.error('An error occurred while duplicating');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm('Are you sure? Schools using this template will revert to default.')) {
            const res = await deleteAdmissionFormTemplate(id);
            if (res.success) {
                setFormTemplates(formTemplates.filter(t => t.id !== id));
                toast.success('Template deleted');
            } else {
                toast.error(res.error || 'Delete failed');
            }
        }
    };

    if (!mounted) return null;

    if (editingTemplate) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-100">
                            <Settings2 className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <input
                                value={editingTemplate.name}
                                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                className="text-3xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-900 w-full tracking-tight"
                                placeholder="Template Name"
                            />
                            <input
                                value={editingTemplate.description}
                                onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                className="text-base text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-full font-medium"
                                placeholder="Enter description..."
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        {/* Live Push Indicator */}
                        {!isCreating && !editingTemplate.isSystem && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live Push Enabled</span>
                            </div>
                        )}
                        <Button variant="ghost" onClick={() => setEditingTemplate(null)} className="rounded-2xl px-6 h-12 font-bold text-slate-500 hover:bg-slate-50">
                            Close
                        </Button>
                        
                        {!editingTemplate.isSystem && (
                            <Button
                                onClick={handleSaveTemplate}
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-10 shadow-xl shadow-indigo-100 font-bold flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Pushing...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {isCreating ? 'Save Template' : 'Save & Push to Schools'}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <div className={`flex ${sidebarOpen ? 'gap-6' : 'gap-0'} relative transition-all duration-500`}>
                    {/* Collapsible Sidebar for Configuration */}
                    <div
                        className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'w-[450px]' : 'w-0'
                            } overflow-hidden`}
                    >
                        <div className="w-[450px] space-y-6">
                            <AdmissionFieldConfigEditor
                                initialConfig={editingTemplate.config}
                                initialSectionSettings={editingTemplate.sectionSettings}
                                onChange={(newConfig) => setEditingTemplate({ ...editingTemplate, config: newConfig })}
                                onSectionSettingsChange={(newSettings) => setEditingTemplate({ ...editingTemplate, sectionSettings: newSettings })}
                            />
                        </div>
                    </div>

                    {/* Full Width Preview */}
                    <div className="flex-1 min-w-0">
                        <div className="sticky top-6">
                            <div className="mb-6 flex items-center justify-between bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-100">
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        variant="ghost"
                                        className="text-white hover:bg-white/10 rounded-2xl h-10 px-4 font-bold"
                                    >
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        {sidebarOpen ? 'Hide' : 'Show'} Configuration
                                    </Button>
                                    <div className="flex items-center gap-3 text-white font-black text-xs uppercase tracking-widest px-3">
                                        <Eye className="h-4 w-4" /> Admission Form Preview
                                    </div>
                                </div>
                                <div className="text-[10px] text-indigo-100 font-black px-4 py-1.5 bg-white/10 rounded-full">WYSIWYG EDITOR</div>
                            </div>
                            <AdmissionFormPreview
                                config={editingTemplate.config}
                                sectionSettings={editingTemplate.sectionSettings}
                                fullWidth={!sidebarOpen}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <div className="absolute -left-12 top-0 text-slate-100 -z-10 select-none">
                        <UserPlus size={120} />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <UserPlus className="h-12 w-12 text-indigo-600" strokeWidth={3} />
                        Admission CRM
                    </h1>
                    <p className="text-slate-500 mt-2 text-xl font-medium max-w-2xl">
                        Optimize the first touchpoint. Centrally manage registration forms and distribution across your school network.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="bg-slate-900 hover:bg-black text-white rounded-3xl h-16 px-10 shadow-2xl shadow-slate-200 font-black text-lg group">
                    <Plus className="mr-2 h-6 w-6 group-hover:rotate-90 transition-transform duration-300" /> Create Admission Template
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {formTemplates.map((tmpl, index) => {
                    const palettes = [
                        { color: 'indigo', primary: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-100/50' },
                        { color: 'emerald', primary: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', shadow: 'shadow-emerald-100/50' },
                        { color: 'rose', primary: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', shadow: 'shadow-rose-100/50' },
                        { color: 'amber', primary: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', shadow: 'shadow-amber-100/50' },
                        { color: 'violet', primary: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', shadow: 'shadow-violet-100/50' },
                    ];
                    const palette = palettes[index % palettes.length];

                    return (
                        <Card key={tmpl.id} className={cn(
                            "group relative rounded-[2rem] border-slate-100 shadow-sm transition-all duration-500 overflow-hidden flex flex-col border-2 hover:shadow-xl",
                            palette.shadow,
                            "hover:border-" + palette.color + "-200"
                        )}>
                            {/* Accent Top Bar */}
                            <div className={cn("h-1.5 w-full", palette.primary)} />

                            <CardHeader className="px-6 pt-5 pb-0 relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm group-hover:scale-110",
                                        palette.light, palette.text,
                                        "group-hover:" + palette.primary + " group-hover:text-white"
                                    )}>
                                        <DynamicIcon name={tmpl.icon} size={20} />
                                    </div>
                                    {(tmpl.isSystem || tmpl.name === "Standard Admission" || tmpl.name === "Standard Admission Form") && (
                                        <Badge className="bg-slate-900 text-white border-none font-black text-[8px] uppercase tracking-tighter px-2 py-0.5 rounded-md shadow-lg shadow-slate-100">
                                            PROTECTED
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-lg font-black text-slate-900 tracking-tight leading-tight line-clamp-1">{tmpl.name}</CardTitle>
                                <CardDescription className="text-[10px] font-medium line-clamp-1 mt-1 text-slate-500/80 leading-relaxed">
                                    {tmpl.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-6 py-4 flex-1 flex flex-col relative z-10">
                                {/* Stats Strip - More Compact */}
                                <div className="flex items-center justify-between gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100/50 mb-4">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600">
                                        <CheckCircle size={12} className="text-emerald-500" />
                                        <span>{tmpl.config?.filter(c => c.visible).length} <span className="text-slate-400 font-bold">FIELDS</span></span>
                                    </div>
                                    <div className="w-px h-3 bg-slate-200" />
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600">
                                        <ShieldCheck size={12} className={palette.text} />
                                        <span>{tmpl.config?.filter(c => c.required).length} <span className="text-slate-400 font-bold">RULES</span></span>
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-2">
                                    {/* Protection check: isSystem flag OR standard naming conventions */}
                                    {(() => {
                                        const standardNames = ["Standard Admission Form", "Standard Admission"];
                                        const isProtected = tmpl.isSystem || standardNames.includes(tmpl.name);
                                        return (
                                            <>
                                                <Button
                                                    onClick={() => { setEditingTemplate({ ...tmpl, isSystem: isProtected }); setIsCreating(false); }}
                                                    className={cn(
                                                        "h-10 w-10 rounded-xl text-white font-black shadow-lg transition-all px-0 flex items-center justify-center",
                                                        isProtected ? "bg-slate-700 hover:bg-slate-800" : palette.primary, 
                                                        palette.shadow, "hover:scale-[1.05] active:scale-95"
                                                    )}
                                                    title={isProtected ? "View Rules (Read-Only)" : "Modify Form Rules"}
                                                >
                                                    {isProtected ? <Eye size={16} /> : <Settings2 size={16} />}
                                                </Button>
                                                
                                                <div className="flex-1" />

                                                <Button
                                                    onClick={() => handleDuplicateTemplate(tmpl)}
                                                    variant="outline"
                                                    className="rounded-xl h-10 w-10 border-slate-200 text-indigo-600 hover:bg-indigo-50 px-0 shadow-sm transition-all hover:scale-105"
                                                    title="Copy / Duplicate Template"
                                                >
                                                    <ClipboardList size={16} />
                                                </Button>

                                                {!isProtected && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleOpenRenameDialog(tmpl)}
                                                            variant="outline"
                                                            className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-50 px-0 shadow-sm transition-all hover:scale-105"
                                                            title="Rename Template"
                                                        >
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDeleteTemplate(tmpl.id)}
                                                            variant="outline"
                                                            className="rounded-xl h-10 w-10 border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-100 px-0 shadow-sm transition-all hover:scale-105"
                                                            title="Delete Template"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Info Card / Add Card Mini */}
                <Card className="rounded-[2rem] border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-slate-50 hover:border-indigo-300 transition-all group cursor-pointer" onClick={handleOpenCreateDialog}>
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all mb-4 shadow-sm">
                        <Plus size={24} />
                    </div>
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">New Template</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Create customized form</p>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group border-none shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                <CardHeader className="p-0 mb-8 relative z-10">
                    <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-4">
                        <ShieldCheck size={16} /> SaaS Admin Insight
                    </div>
                    <CardTitle className="text-2xl font-black">Distribution Layer</CardTitle>
                    <CardDescription className="text-slate-400 font-medium text-sm mt-2 leading-relaxed">
                        These forms are distributed via SaaS Packages. Assign a template to a package in the Package Manager.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4 relative z-10">
                    {[
                        'Real-time propagation',
                        'Package-based tiers',
                        'No school-side setup',
                        'Universal validation'
                    ].map(t => (
                        <div key={t} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                            <CheckCircle size={16} className="text-indigo-400" />
                            <span className="text-sm font-bold tracking-tight">{t}</span>
                        </div>
                    ))}
                    <Button variant="ghost" className="w-full mt-6 rounded-2xl h-12 text-slate-400 hover:text-white hover:bg-white/10 group/btn" onClick={() => window.location.href = '/super-admin/packages'}>
                        Update Package Links <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </CardContent>
            </Card>
            <div className="flex-1" /> {/* Bottom Spacer */}

            {/* Create Template Dialog */ }
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">Create New Template</DialogTitle>
                <DialogDescription className="font-medium">
                    Give your admission form a clear name and description.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name" className="text-sm font-bold text-slate-700">Template Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Premium Admission 2026"
                        value={newTemplateInfo.name}
                        onChange={(e) => setNewTemplateInfo({ ...newTemplateInfo, name: e.target.value })}
                        className="h-12 rounded-xl"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description" className="text-sm font-bold text-slate-700">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Describe what this form is for..."
                        value={newTemplateInfo.description}
                        onChange={(e) => setNewTemplateInfo({ ...newTemplateInfo, description: e.target.value })}
                        className="rounded-xl min-h-[100px]"
                    />
                </div>
                <div className="grid gap-3">
                    <Label className="text-sm font-bold text-slate-700">Choose Icon</Label>
                    <div className="flex flex-wrap gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                        {AVAILABLE_ICONS.map((item) => (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => setNewTemplateInfo({ ...newTemplateInfo, icon: item.name })}
                                className={`p-3 rounded-xl transition-all ${newTemplateInfo.icon === item.name
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110'
                                    : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <item.icon size={20} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl h-12 px-6 font-bold">
                    Cancel
                </Button>
                <Button onClick={handleCreateTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 shadow-lg shadow-indigo-100 font-bold">
                    Start Designing
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Rename Template Dialog */ }
    <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Rename Template</DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                    Update the name and description for this template.
                </DialogDescription>
            </DialogHeader>
            {renamingTemplate && (
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="rename-name" className="text-sm font-bold text-slate-700">Template Name</Label>
                        <Input
                            id="rename-name"
                            placeholder="e.g. Premium Admission 2026"
                            value={renamingTemplate.name}
                            onChange={(e) => setRenamingTemplate({ ...renamingTemplate, name: e.target.value })}
                            className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rename-description" className="text-sm font-bold text-slate-700">Description</Label>
                        <Textarea
                            id="rename-description"
                            placeholder="Describe what this form is for..."
                            value={renamingTemplate.description}
                            onChange={(e) => setRenamingTemplate({ ...renamingTemplate, description: e.target.value })}
                            className="rounded-xl min-h-[100px] border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label className="text-sm font-bold text-slate-700">Assign Icon</Label>
                        <div className="flex flex-wrap gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            {AVAILABLE_ICONS.map((item) => (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => setRenamingTemplate({ ...renamingTemplate, icon: item.name })}
                                    className={`p-3 rounded-xl transition-all ${renamingTemplate.icon === item.name
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110'
                                        : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <item.icon size={20} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="rounded-xl h-12 px-6 font-bold text-slate-500">
                    Cancel
                </Button>
                <Button onClick={handleRenameTemplate} className="bg-slate-900 hover:bg-black text-white rounded-xl h-12 px-8 shadow-xl shadow-slate-200 font-bold transition-all">
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
        </div >
    );
}
