'use client';

import { useState, useEffect } from 'react';
import { IDCardTemplate, School } from '@/types';
import IDCardTemplateEditor from '@/components/super-admin/id-card-template-editor';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Copy, Trash2, Loader2, Globe, Lock } from 'lucide-react';
import { getIDCardTemplates, addIDCardTemplate, updateIDCardTemplate, deleteIDCardTemplate, getSchools } from '@/app/actions';
import { toast } from 'sonner';

export default function IDCardsPage() {
    const [templates, setTemplates] = useState<IDCardTemplate[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<IDCardTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [templatesData, schoolsData] = await Promise.all([
                getIDCardTemplates(),
                getSchools()
            ]);
            setTemplates(templatesData);
            setSchools(schoolsData);
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Failed to load templates or schools');
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (updatedTemplate: IDCardTemplate) => {
        try {
            if (isCreating) {
                const res = await addIDCardTemplate(updatedTemplate);
                if (res.success && res.template) {
                    setTemplates([...templates, res.template]);
                    toast.success('Saved successfully');
                    setEditingTemplate(null);
                    setIsCreating(false);
                } else {
                    toast.error((res as any).error || 'Failed to create template');
                }
            } else {
                const res = await updateIDCardTemplate(updatedTemplate);
                if (res.success) {
                    setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
                    toast.success('Saved successfully');
                    setEditingTemplate(null);
                    setIsCreating(false);
                } else {
                    toast.error((res as any).error || 'Failed to update template');
                }
            }
        } catch (error) {
            toast.error('Failed to save template');
        }
    };

    const handleCreate = () => {
        const newTemplate: IDCardTemplate = {
            id: 'new',
            name: 'New Template',
            layout: 'vertical',
            width: 54,
            height: 86,
            primaryColor: '#3b82f6',
            secondaryColor: '#ffffff',
            fontFamily: 'Inter',
            showPhoto: true,
            showLogo: true,
            signatureText: 'Principal',
            fields: [
                { id: 'f1', label: 'Name', key: 'name', bold: true },
                { id: 'f2', label: 'Class', key: 'className', bold: false }
            ]
        };
        setEditingTemplate(newTemplate);
        setIsCreating(true);
    };

    const handleEdit = (tmpl: IDCardTemplate) => {
        setEditingTemplate(tmpl);
        setIsCreating(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            try {
                const res = await deleteIDCardTemplate(id);
                if (res.success) {
                    setTemplates(templates.filter(t => t.id !== id));
                    toast.success('Template deleted');
                }
            } catch (error) {
                toast.error('Failed to delete template');
            }
        }
    };

    const handleToggleGlobal = async (tmpl: IDCardTemplate) => {
        const updated = { 
            ...tmpl, 
            isGlobal: tmpl.isGlobal === undefined ? true : !tmpl.isGlobal 
        };
        try {
            const res = await updateIDCardTemplate(updated);
            if (res.success) {
                setTemplates(templates.map(t => t.id === tmpl.id ? updated : t));
                toast.success(updated.isGlobal ? 'Template published globally' : 'Template restricted to own school');
            }
        } catch (error) {
            toast.error('Failed to update template status');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

    if (editingTemplate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        {isCreating ? 'Create New Template' : `Edit ${editingTemplate.name}`}
                    </h1>
                </div>
                <IDCardTemplateEditor
                    template={editingTemplate}
                    onSave={handleSave}
                    onCancel={() => setEditingTemplate(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">ID Card Templates</h1>
                    <p className="text-slate-500 mt-2">Design and manage student ID cards for your schools.</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <Plus size={18} className="mr-2" /> Create New Design
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(tmpl => (
                    <div key={tmpl.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

                        {/* Preview Area (Mini Card) */}
                        <div className="bg-slate-50 h-48 flex items-center justify-center p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                            <div
                                className="shadow-lg rounded-lg bg-white relative z-10 transform group-hover:scale-105 transition-transform duration-500"
                                style={{
                                    width: tmpl.layout === 'vertical' ? '80px' : '140px',
                                    aspectRatio: `${tmpl.width}/${tmpl.height}`,
                                    backgroundColor: tmpl.secondaryColor,
                                    borderTop: `4px solid ${tmpl.primaryColor}`
                                }}
                            >
                                <div className="h-1/3 w-full opacity-20" style={{ backgroundColor: tmpl.primaryColor }} />
                            </div>
                        </div>

                        {/* Info Area */}
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{tmpl.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{tmpl.layout} • {tmpl.width}x{tmpl.height}mm</p>
                                    {tmpl.schoolId ? (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border px-2 py-0.5 rounded-full">
                                                School: {schools.find(s => s.id === tmpl.schoolId)?.name || 'Custom'}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tmpl.isGlobal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {tmpl.isGlobal ? 'Global' : 'Private'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                                System Global
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full shadow-sm border shrink-0" style={{ backgroundColor: tmpl.primaryColor }} />
                            </div>

                            <div className="mt-auto flex flex-col gap-2">
                                {tmpl.schoolId && (
                                    <Button 
                                        onClick={() => handleToggleGlobal(tmpl)} 
                                        variant="outline" 
                                        className={`w-full text-xs font-semibold gap-1.5 h-8 ${tmpl.isGlobal ? 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                    >
                                        {tmpl.isGlobal ? (
                                            <>
                                                <Lock size={12} /> Make Private
                                            </>
                                        ) : (
                                            <>
                                                <Globe size={12} /> Publish to All Schools
                                            </>
                                        )}
                                    </Button>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={() => handleEdit(tmpl)} variant="outline" className="flex-1 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 h-8 text-xs">
                                        <Edit2 size={12} className="mr-1.5" /> Edit
                                    </Button>
                                    <Button onClick={() => handleDelete(tmpl.id)} variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 px-2 h-8 shrink-0">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
