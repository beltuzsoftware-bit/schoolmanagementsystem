"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    X,
    ClipboardList,
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
    Globe,
    MapPin,
    Hash,
    Fingerprint,
    Focus,
    Ghost,
    Gift,
    Gamepad2,
    Coffee,
    ArrowRight,
    Briefcase,
    IdCard,
    Settings2,
    ShieldCheck,
    LayoutDashboard,
    Eye,
    Plus,
    CheckCircle,
    Edit2,
    Trash2,
    Save,
    GraduationCap
} from "lucide-react";

// Available icons for templates
const AVAILABLE_ICONS = [
    { name: 'ClipboardList', icon: ClipboardList },
    { name: 'Users', icon: Users },
    { name: 'User', icon: User },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Zap', icon: Zap },
    { name: 'Layout', icon: Layout },
    { name: 'FileText', icon: FileText },
    { name: 'Shield', icon: Shield },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Award', icon: Award },
    { name: 'Smile', icon: Smile },
    { name: 'Bell', icon: Bell },
    { name: 'CalendarCheck', icon: CalendarCheck },
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
import { IDCardPreview } from "@/components/id-cards/id-card-preview";
import {
    getIDCardTemplates,
    getSchools,
    getStaffFormTemplates,
    addStaffFormTemplate,
    updateStaffFormTemplate,
    deleteStaffFormTemplate
} from "@/app/actions";
import { IDCardTemplate, School, StaffFormConfig, StaffFormTemplate, SectionConfig } from "@/types";
import StaffFieldConfigEditor from "@/components/super-admin/staff-field-config-editor";
import StaffFormPreview from "@/components/super-admin/staff-form-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function StaffModulePage() {
    const [idTemplates, setIdTemplates] = useState<IDCardTemplate[]>([]);
    const [formTemplates, setFormTemplates] = useState<StaffFormTemplate[]>([]);
    const [school, setSchool] = useState<School | null>(null);
    const [mounted, setMounted] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<StaffFormTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTemplateInfo, setNewTemplateInfo] = useState({ name: '', description: '', icon: 'ClipboardList' });
    const [renamingTemplate, setRenamingTemplate] = useState<StaffFormTemplate | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        const [idT, formT, schools] = await Promise.all([
            getIDCardTemplates(),
            getStaffFormTemplates(),
            getSchools()
        ]);

        setIdTemplates(idT.filter(tmpl =>
            tmpl.id.includes('faculty') ||
            tmpl.name.toLowerCase().includes('staff') ||
            tmpl.id === 'tmpl_faculty_special'
        ));
        setFormTemplates(formT);
        if (schools.length > 0) setSchool(schools[0]);
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

        const newTemplate: StaffFormTemplate = {
            id: 'new',
            name: newTemplateInfo.name,
            description: newTemplateInfo.description || 'Customized staff registration form.',
            icon: newTemplateInfo.icon,
            config: [...(formTemplates[0]?.config || [])]
        };
        setEditingTemplate(newTemplate);
        setIsCreating(true);
        setIsCreateDialogOpen(false);
    };

    const handleOpenRenameDialog = (tmpl: StaffFormTemplate) => {
        setRenamingTemplate({ ...tmpl });
        setIsRenameDialogOpen(true);
    };

    const handleRenameTemplate = async () => {
        if (!renamingTemplate || !renamingTemplate.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        try {
            const res = await updateStaffFormTemplate(renamingTemplate);
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

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;

        try {
            if (isCreating) {
                const res = await addStaffFormTemplate(editingTemplate);
                if (res.success && res.template) {
                    setFormTemplates([...formTemplates, res.template]);
                    toast.success('Form template created');
                }
            } else {
                const res = await updateStaffFormTemplate(editingTemplate);
                if (res.success) {
                    setFormTemplates(formTemplates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                    toast.success('Form template updated');
                }
            }
            setEditingTemplate(null);
        } catch (error) {
            toast.error('Failed to save template');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm('Are you sure? Schools using this template will revert to default.')) {
            const res = await deleteStaffFormTemplate(id);
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
                <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl">
                            <Settings2 className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <input
                                value={editingTemplate.name}
                                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                className="text-2xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-900 w-full"
                                placeholder="Template Name"
                            />
                            <input
                                value={editingTemplate.description}
                                onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                className="text-sm text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                                placeholder="Enter description..."
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setEditingTemplate(null)} className="rounded-xl px-6">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-indigo-100">
                            <Save className="mr-2 h-4 w-4" /> Save Template
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2rem]">
                            <CardHeader className="bg-slate-900 text-white p-6">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-indigo-400" />
                                    Configure Fields
                                </CardTitle>
                                <CardDescription className="text-slate-400">Enable or require specific fields.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <StaffFieldConfigEditor
                                    initialConfig={editingTemplate.config}
                                    initialSectionSettings={editingTemplate.sectionSettings}
                                    onChange={(newConfig: StaffFormConfig[]) => setEditingTemplate({ ...editingTemplate, config: newConfig })}
                                    onSectionSettingsChange={(newSettings: SectionConfig[]) => setEditingTemplate({ ...editingTemplate, sectionSettings: newSettings })}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="sticky top-6">
                            <div className="mb-4 flex items-center justify-between bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-widest px-3">
                                    <Eye className="h-3.5 w-3.5" /> Live Preview
                                </div>
                                <div className="text-[10px] text-indigo-400 font-bold">RELECTING REAL-TIME CHANGES</div>
                            </div>
                            <StaffFormPreview
                                config={editingTemplate.config}
                                sectionSettings={editingTemplate.sectionSettings}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Briefcase className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        Human Resource
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Standardize employee registration and professional identity across schools.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-8 shadow-xl shadow-indigo-100 font-bold">
                    <Plus className="mr-2 h-5 w-5" /> Create New Form Template
                </Button>
            </div>

            <Tabs defaultValue="forms" className="w-full">
                <div className="flex items-center justify-between mb-8 bg-slate-50 p-2 rounded-3xl border border-slate-100">
                    <TabsList className="bg-transparent gap-2">
                        <TabsTrigger value="forms" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600 font-black transition-all">
                            <ClipboardList className="mr-2 h-4 w-4" /> Form Templates
                        </TabsTrigger>
                        <TabsTrigger value="idcards" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600 font-black transition-all">
                            <IdCard className="mr-2 h-4 w-4" /> Identity Standards
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="forms" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {formTemplates.map(tmpl => (
                            <Card key={tmpl.id} className="group relative bg-white rounded-[2rem] border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col hover:-translate-y-1">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <DynamicIcon name={tmpl.icon} size={24} />
                                        </div>
                                        {tmpl.isDefault && (
                                            <Badge className="bg-green-500 text-white border-none font-bold text-[10px] uppercase">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">{tmpl.name}</CardTitle>
                                    <CardDescription className="text-sm line-clamp-2 mt-2">{tmpl.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                                    <div className="mt-6 flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-1">
                                            <CheckCircle size={10} className="text-green-500" /> {tmpl.config.filter(c => c.visible).length} Visible Fields
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ShieldCheck size={10} className="text-indigo-400" /> {tmpl.config.filter(c => c.required).length} Required
                                        </div>
                                    </div>
                                    <div className="mt-8 flex gap-3">
                                        <Button
                                            onClick={() => { setEditingTemplate(tmpl); setIsCreating(false); }}
                                            variant="outline"
                                            className="flex-1 rounded-xl h-12 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-900 font-bold"
                                        >
                                            <Settings2 size={14} className="mr-2" /> Modify Rules
                                        </Button>
                                        <Button
                                            onClick={() => handleOpenRenameDialog(tmpl)}
                                            variant="outline"
                                            className="rounded-xl h-12 w-12 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 px-0"
                                            title="Rename Template"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        {!tmpl.isDefault && (
                                            <Button
                                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                                variant="ghost"
                                                className="rounded-xl h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-4"
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="idcards" className="mt-0">
                    <div className="grid gap-8 lg:grid-cols-12">
                        <div className="lg:col-span-8">
                            <Card className="border-none shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] bg-white rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="pb-0 pt-10 px-10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-3xl font-black text-slate-800">Faculty Special Edition</CardTitle>
                                            <CardDescription className="text-base mt-2">Professional identity standard for institutional faculty.</CardDescription>
                                        </div>
                                        <Button variant="outline" className="rounded-2xl border-slate-200 hover:bg-slate-100 h-12 px-6" onClick={() => window.location.href = '/super-admin/modules/id-cards'}>
                                            Go to Cards Module <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-10 pt-6 flex flex-col md:flex-row items-center gap-16">
                                    <div className="flex-1 space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 text-xs font-black uppercase tracking-widest rounded-full w-fit">
                                                <CheckCircle className="h-4 w-4" /> High Priority Template
                                            </div>
                                            <p className="text-slate-600 leading-relaxed text-lg">
                                                This template is optimized for high-resolution printing on standard PVC cards (54x86mm). It includes dynamic fields for Department and Employee ID.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['PVC Printing', 'Dynamic Styling', 'QR Support', 'Hi-Res Photos'].map(t => (
                                                <div key={t} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {t}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative group perspective-1000">
                                        <div className="absolute -inset-8 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-[3rem] blur-3xl group-hover:opacity-100 transition-opacity duration-700 opacity-70" />
                                        <div className="relative transform-gpu group-hover:rotate-y-12 transition-transform duration-700 ease-out">
                                            {idTemplates.length > 0 ? (
                                                <IDCardPreview
                                                    student={{
                                                        name: "Dr. Sarah Jenkins",
                                                        employeeId: "EMP-2024-089",
                                                        department: "Social Sciences",
                                                        designation: "Senior Professor",
                                                        admissionNumber: "EMP-089",
                                                        dob: "1985-04-12",
                                                        photo: "https://i.pravatar.cc/150?u=sarah"
                                                    } as any}
                                                    template={idTemplates.find(t => t.id === 'tmpl_faculty_special') || idTemplates[0]}
                                                    school={school}
                                                    scale={5.5}
                                                />
                                            ) : (
                                                <div className="w-[300px] h-[480px] bg-slate-100 rounded-[2.5rem] animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <Card className="rounded-[2rem] border-slate-100 shadow-xl p-8 bg-slate-900 text-white">
                                <CardHeader className="p-0 mb-6">
                                    <CardTitle>Module Capabilities</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs mt-1">What schools get with this module.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 space-y-4">
                                    {[
                                        { title: 'Leave Management', icon: ShieldCheck, color: 'text-green-400' },
                                        { title: 'Attendance Logs', icon: Users, color: 'text-indigo-400' },
                                        { title: 'Role Permissions', icon: Settings2, color: 'text-purple-400' },
                                        { title: 'Digital Profiles', icon: IdCard, color: 'text-orange-400' },
                                    ].map((cap, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                            <cap.icon className={`h-5 w-5 ${cap.color}`} />
                                            <span className="font-bold text-sm tracking-tight">{cap.title}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Template Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Create New Template</DialogTitle>
                        <DialogDescription className="font-medium">
                            Give your staff registration form a clear name and description.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-sm font-bold text-slate-700">Template Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Faculty Registration 2026"
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

            {/* Rename Template Dialog */}
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
                                    placeholder="e.g. Faculty Registration 2026"
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
        </div>
    );
}
