"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    Settings2,
    CheckCircle,
    Plus,
    Edit2,
    Trash2,
    Save,
    Layout,
    ShieldCheck,
    Contact,
    GraduationCap,
    Files,
    Activity,
    Wallet,
    ClipboardList,
    Briefcase,
    Zap,
    Award,
    Globe
} from "lucide-react";

// Available icons for templates
const AVAILABLE_ICONS = [
    { name: 'Users', icon: Users },
    { name: 'Layout', icon: Layout },
    { name: 'Contact', icon: Contact },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Files', icon: Files },
    { name: 'Activity', icon: Activity },
    { name: 'Wallet', icon: Wallet },
    { name: 'ClipboardList', icon: ClipboardList },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Zap', icon: Zap },
    { name: 'Award', icon: Award },
    { name: 'Globe', icon: Globe }
];

const DynamicIcon = ({ name, size = 20, className = "" }: { name?: string, size?: number, className?: string }) => {
    const IconComponent = AVAILABLE_ICONS.find(i => i.name === name)?.icon || Users;
    return <IconComponent size={size} className={className} />;
};

import {
    getStudentProfileTemplates,
    addStudentProfileTemplate,
    updateStudentProfileTemplate,
    deleteStudentProfileTemplate,
    getGlobalStudentDefaults,
    updateGlobalStudentDefaults
} from "@/app/actions";
import { StudentProfileTemplate } from "@/types";
import StudentProfileFieldConfigEditor from "@/components/super-admin/student-profile-field-config-editor";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleListManager from '@/components/school-admin/settings/simple-list-manager';
import ClassesManager from '@/components/school-admin/settings/classes-manager';
import IdGenerationManager from '@/components/school-admin/settings/id-generation-manager';
import { ClassSetup, RegNoSettings, EnrollmentNoSettings, AutoIdSettings } from '@/types/student-settings';
import { 
    INITIAL_ADMISSION_SETTINGS,
    INITIAL_REG_SETTINGS, INITIAL_ENROLL_SETTINGS, INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS, INITIAL_SR_SETTINGS, INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS
} from '@/lib/student-constants';
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

export default function StudentInfoModulePage() {
    const [templates, setTemplates] = useState<StudentProfileTemplate[]>([]);
    const [mounted, setMounted] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<StudentProfileTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTemplateInfo, setNewTemplateInfo] = useState({ name: '', description: '', icon: 'Users' });
    const [renamingTemplate, setRenamingTemplate] = useState<StudentProfileTemplate | null>(null);

    // Global Defaults State
    const [globalReligions, setGlobalReligions] = useState<string[]>([]);
    const [globalCategories, setGlobalCategories] = useState<string[]>([]);
    const [globalStreams, setGlobalStreams] = useState<string[]>([]);
    
    const [globalClasses, setGlobalClasses] = useState<ClassSetup[]>([]);
    const [globalSections, setGlobalSections] = useState<string[]>([]);
    const [globalHouses, setGlobalHouses] = useState<string[]>([]);
    const [globalDisableReasons, setGlobalDisableReasons] = useState<string[]>([]);
    
    const [globalAdmissionSettings, setGlobalAdmissionSettings] = useState<RegNoSettings>(INITIAL_ADMISSION_SETTINGS);
    const [globalRegSettings, setGlobalRegSettings] = useState<RegNoSettings>(INITIAL_REG_SETTINGS);
    const [globalEnrollSettings, setGlobalEnrollSettings] = useState<EnrollmentNoSettings>(INITIAL_ENROLL_SETTINGS);
    const [globalApaarSettings, setGlobalApaarSettings] = useState<AutoIdSettings>(INITIAL_APAAR_SETTINGS);
    const [globalPenSettings, setGlobalPenSettings] = useState<AutoIdSettings>(INITIAL_PEN_SETTINGS);
    const [globalSrSettings, setGlobalSrSettings] = useState<AutoIdSettings>(INITIAL_SR_SETTINGS);
    const [globalGenRegSettings, setGlobalGenRegSettings] = useState<AutoIdSettings>(INITIAL_GEN_REG_SETTINGS);
    const [globalRollSettings, setGlobalRollSettings] = useState<AutoIdSettings>(INITIAL_ROLL_SETTINGS);

    const [isSavingGlobals, setIsSavingGlobals] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        const [data, globals] = await Promise.all([
            getStudentProfileTemplates(),
            getGlobalStudentDefaults()
        ]);
        setTemplates(data);
        if (globals) {
            setGlobalReligions(globals.religions || []);
            setGlobalCategories(globals.categories || []);
            setGlobalStreams(globals.streams || []);
            
            setGlobalClasses(globals.classes || []);
            setGlobalSections(globals.sections || []);
            setGlobalHouses(globals.houses || []);
            setGlobalDisableReasons(globals.disableReasons || []);
            
            if (globals.admissionNoSettings) setGlobalAdmissionSettings(globals.admissionNoSettings);
            if (globals.regNoSettings) setGlobalRegSettings(globals.regNoSettings);
            if (globals.enrollNoSettings) setGlobalEnrollSettings(globals.enrollNoSettings);
            if (globals.apaarIdSettings) setGlobalApaarSettings(globals.apaarIdSettings);
            if (globals.penNoSettings) setGlobalPenSettings(globals.penNoSettings);
            if (globals.srNoSettings) setGlobalSrSettings(globals.srNoSettings);
            if (globals.genRegNoSettings) setGlobalGenRegSettings(globals.genRegNoSettings);
            if (globals.rollNoSettings) setGlobalRollSettings(globals.rollNoSettings);
        }
    };

    const handleIdUpdate = (field: string, newSettings: any) => {
        switch (field) {
            case 'admissionNumber': setGlobalAdmissionSettings(newSettings); break;
            case 'registrationNo': setGlobalRegSettings(newSettings); break;
            case 'enrollmentNo': setGlobalEnrollSettings(newSettings); break;
            case 'apaarId': setGlobalApaarSettings(newSettings); break;
            case 'penNo': setGlobalPenSettings(newSettings); break;
            case 'srNo': setGlobalSrSettings(newSettings); break;
            case 'generalRegistrationNo': setGlobalGenRegSettings(newSettings); break;
            case 'rollNumber': setGlobalRollSettings(newSettings); break;
        }
    };

    const handleSaveGlobals = async () => {
        setIsSavingGlobals(true);
        try {
            const res = await updateGlobalStudentDefaults({
                religions: globalReligions,
                categories: globalCategories,
                streams: globalStreams,
                classes: globalClasses,
                sections: globalSections,
                houses: globalHouses,
                disableReasons: globalDisableReasons,
                admissionNoSettings: globalAdmissionSettings,
                regNoSettings: globalRegSettings,
                enrollNoSettings: globalEnrollSettings,
                apaarIdSettings: globalApaarSettings,
                penNoSettings: globalPenSettings,
                srNoSettings: globalSrSettings,
                genRegNoSettings: globalGenRegSettings,
                rollNoSettings: globalRollSettings
            });
            if (res.success) {
                toast.success('Global field defaults saved successfully. These will be inherited by new schools or schools without custom overrides.');
            } else {
                toast.error('Failed to save global defaults');
            }
        } catch (error) {
            toast.error('Failed to save global defaults');
        } finally {
            setIsSavingGlobals(false);
        }
    };

    const handleOpenCreateDialog = () => {
        setNewTemplateInfo({ name: '', description: '', icon: 'Users' });
        setIsCreateDialogOpen(true);
    };

    const handleCreateTemplate = () => {
        if (!newTemplateInfo.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        const newTemplate: StudentProfileTemplate = {
            id: 'new',
            name: newTemplateInfo.name,
            description: newTemplateInfo.description || 'Customized student identity dossier.',
            icon: newTemplateInfo.icon,
            config: [...(templates[0]?.config || [])]
        };
        setEditingTemplate(newTemplate);
        setIsCreating(true);
        setIsCreateDialogOpen(false);
    };

    const handleOpenRenameDialog = (tmpl: StudentProfileTemplate) => {
        setRenamingTemplate({ ...tmpl });
        setIsRenameDialogOpen(true);
    };

    const handleRenameTemplate = async () => {
        if (!renamingTemplate || !renamingTemplate.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        try {
            const res = await updateStudentProfileTemplate(renamingTemplate);
            if (res.success) {
                setTemplates(templates.map(t => t.id === renamingTemplate.id ? renamingTemplate : t));
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
                const res = await addStudentProfileTemplate(editingTemplate);
                if (res.success && res.template) {
                    setTemplates([...templates, res.template]);
                    toast.success('Template created');
                }
            } else {
                const res = await updateStudentProfileTemplate(editingTemplate);
                if (res.success) {
                    setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                    toast.success('Template updated');
                }
            }
            setEditingTemplate(null);
        } catch (error) {
            toast.error('Failed to save template');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm('Are you sure? This action cannot be undone.')) {
            const res = await deleteStudentProfileTemplate(id);
            if (res.success) {
                setTemplates(templates.filter(t => t.id !== id));
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
                        <Button variant="ghost" onClick={() => setEditingTemplate(null)} className="rounded-2xl px-8 h-12 font-bold text-slate-500 hover:bg-slate-50">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-10 shadow-xl shadow-indigo-100 font-bold">
                            <Save className="mr-2 h-4 w-4" /> Save Template
                        </Button>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto">
                    <StudentProfileFieldConfigEditor
                        initialConfig={editingTemplate.config}
                        initialSectionSettings={editingTemplate.sectionSettings}
                        onChange={(newConfig) => setEditingTemplate({ ...editingTemplate, config: newConfig })}
                        onSectionSettingsChange={(newSettings) => setEditingTemplate({ ...editingTemplate, sectionSettings: newSettings })}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <div className="absolute -left-12 top-0 text-slate-100 -z-10 select-none">
                        <Users size={120} />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Users className="h-12 w-12 text-indigo-600" strokeWidth={3} />
                        Student Dossier & Defaults
                    </h1>
                    <p className="text-slate-500 mt-2 text-xl font-medium max-w-2xl">
                        Design the ultimate student identity experience and configure system-wide global field options.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="bg-slate-900 hover:bg-black text-white rounded-3xl h-16 px-10 shadow-2xl shadow-slate-200 font-black text-lg group">
                    <Plus className="mr-2 h-6 w-6 group-hover:rotate-90 transition-transform duration-300" /> Create Profile Template
                </Button>
            </div>

            <Tabs defaultValue="templates" className="space-y-8">
                <TabsList className="bg-slate-100/50 p-2 rounded-2xl border-slate-100 border h-auto flex flex-wrap gap-2 justify-start max-w-fit">
                    <TabsTrigger value="templates" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-200 transition-all duration-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Layout size={18} /> Identity Templates
                    </TabsTrigger>
                    <TabsTrigger value="globals" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-200 transition-all duration-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Globe size={18} /> Global Field Defaults
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {templates.map(tmpl => (
                            <Card key={tmpl.id} className="group relative bg-white rounded-[3rem] border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-700 overflow-hidden flex flex-col border-2 hover:border-indigo-100">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                                <CardHeader className="p-10 pb-4 relative z-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500 shadow-inner">
                                            <DynamicIcon name={tmpl.icon} size={32} />
                                        </div>
                                        {tmpl.isDefault && (
                                            <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-emerald-100">
                                                Active Default
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{tmpl.name}</CardTitle>
                                    <CardDescription className="text-base font-medium line-clamp-2 mt-3 text-slate-400">{tmpl.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pt-4 flex-1 flex flex-col relative z-10">
                                    <div className="mt-4 flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={12} className="text-emerald-500" /> {tmpl.config?.filter(c => c.visible).length} Enabled
                                        </div>
                                    </div>
                                    <div className="mt-10 flex gap-4">
                                        <Button
                                            onClick={() => { setEditingTemplate(tmpl); setIsCreating(false); }}
                                            className="flex-1 rounded-[1.2rem] h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform"
                                        >
                                            <Settings2 size={16} className="mr-2" /> Modify Sections
                                        </Button>
                                        <Button
                                            onClick={() => handleOpenRenameDialog(tmpl)}
                                            variant="outline"
                                            className="rounded-[1.2rem] h-14 w-14 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 px-0 shadow-sm"
                                            title="Rename Template"
                                        >
                                            <Edit2 size={20} />
                                        </Button>
                                        {!tmpl.isDefault && (
                                            <Button
                                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                                variant="outline"
                                                className="rounded-[1.2rem] h-14 w-14 border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-100 px-0 shadow-sm"
                                            >
                                                <Trash2 size={20} />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="globals" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-t-4 border-t-amber-400 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <Globe className="text-amber-500 h-8 w-8" />
                                    System Global Defaults
                                </CardTitle>
                                <CardDescription className="text-slate-500 mt-2 text-base max-w-3xl">
                                    Define the default fallback options for fields like Religions, Categories, and Streams.
                                    Schools will inherit these unless they explicitly customize and override them in their own settings.
                                </CardDescription>
                            </div>
                            <Button onClick={handleSaveGlobals} disabled={isSavingGlobals} className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 px-6 rounded-2xl shadow-lg shadow-amber-200">
                                <Save className="mr-2 h-5 w-5" />
                                {isSavingGlobals ? 'Saving...' : 'Save Global Defaults'}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-8 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <SimpleListManager
                                    title="Religions"
                                    description="Base religions list inherited by default."
                                    items={globalReligions}
                                    onUpdate={setGlobalReligions}
                                    placeholder="E.g., Hinduism, Islam, Christianity..."
                                />
                                <SimpleListManager
                                    title="Categories"
                                    description="Social categories like General, SC, ST."
                                    items={globalCategories}
                                    onUpdate={setGlobalCategories}
                                    placeholder="E.g., General, OBC, SC..."
                                />
                                <SimpleListManager
                                    title="Streams"
                                    description="Academic streams for higher classes."
                                    items={globalStreams}
                                    onUpdate={setGlobalStreams}
                                    placeholder="E.g., Science, Commerce, Arts..."
                                />
                                <SimpleListManager
                                    title="Sections"
                                    description="Default sections available to classes."
                                    items={globalSections}
                                    onUpdate={setGlobalSections}
                                    placeholder="E.g., A, B, C..."
                                />
                                <SimpleListManager
                                    title="Houses / Blocks"
                                    description="Default student house structures."
                                    items={globalHouses}
                                    onUpdate={setGlobalHouses}
                                    placeholder="E.g., Red House..."
                                />
                                <SimpleListManager
                                    title="Disable Reasons"
                                    description="Default reasons for student removal."
                                    items={globalDisableReasons}
                                    onUpdate={setGlobalDisableReasons}
                                    placeholder="Enter reason..."
                                />
                            </div>

                            <div className="pt-8 border-t border-slate-100">
                                <ClassesManager classes={globalClasses} sections={globalSections} onUpdate={setGlobalClasses} />
                            </div>

                            <div className="pt-8 border-t border-slate-100">
                                <IdGenerationManager 
                                    settings={{ 
                                        admissionNumber: globalAdmissionSettings,
                                        registrationNo: globalRegSettings, 
                                        enrollmentNo: globalEnrollSettings, 
                                        apaarId: globalApaarSettings, 
                                        penNo: globalPenSettings, 
                                        srNo: globalSrSettings, 
                                        generalRegistrationNo: globalGenRegSettings, 
                                        rollNumber: globalRollSettings 
                                    }} 
                                    onUpdate={handleIdUpdate} 
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Template Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Create New Template</DialogTitle>
                        <DialogDescription className="font-medium">
                            Give your student profile template a clear name and description.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-sm font-bold text-slate-700">Template Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Premium Dossier 2026"
                                value={newTemplateInfo.name}
                                onChange={(e) => setNewTemplateInfo({ ...newTemplateInfo, name: e.target.value })}
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-sm font-bold text-slate-700">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what this template is for..."
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
                                    value={renamingTemplate.name}
                                    onChange={(e) => setRenamingTemplate({ ...renamingTemplate, name: e.target.value })}
                                    className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rename-description" className="text-sm font-bold text-slate-700">Description</Label>
                                <Textarea
                                    id="rename-description"
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
