'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Check, Edit2, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
    getSubjectGroupTypes, saveSubjectGroupType, deleteSubjectGroupType 
} from '@/app/actions/academics';
import { SubjectGroupType } from '@/types';

export default function SubjectSettingsPage() {
    const [categories, setCategories] = useState<SubjectGroupType[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Category State
    const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('indigo');

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        setLoading(true);
        const c = await getSubjectGroupTypes();
        setCategories(c);
        setLoading(false);
    };

    const handleCategorySubmit = async () => {
        if (!categoryName) return toast.error("Name is required");
        
        const cat: SubjectGroupType = {
            id: isEditingCategory || `cat_${Date.now()}`,
            name: categoryName,
            color: categoryColor
        };

        const result = await saveSubjectGroupType(cat);
        if (result.success) {
            toast.success(result.message);
            setCategoryName('');
            setIsEditingCategory(null);
            init();
        } else toast.error(result.message);
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                    <Settings className="h-8 w-8 text-indigo-600" />
                    Subject Settings
                </h1>
                <p className="text-slate-500 font-medium">Configure global subject group types and UI accents.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-4">
                    <Card className="border-none shadow-xl shadow-slate-100 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-emerald-600 p-6 text-white">
                            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                {isEditingCategory ? 'Edit Group Type' : 'New Group Type'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Group Type Name</Label>
                                <Input 
                                    value={categoryName}
                                    onChange={e => setCategoryName(e.target.value)}
                                    placeholder="e.g., Mandatory, Minor, Skill" 
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold focus-visible:ring-emerald-500" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">UI Color Accent</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {['indigo', 'emerald', 'amber', 'rose', 'blue', 'orange', 'purple', 'slate', 'pink', 'cyan'].map(color => (
                                        <button 
                                            key={color}
                                            onClick={() => setCategoryColor(color)}
                                            className={`h-8 w-full rounded-lg transition-all border-2 ${categoryColor === color ? 'border-slate-900 scale-110' : 'border-transparent opacity-60'}`}
                                            style={{ backgroundColor: `var(--${color}-500, ${color})` }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                {isEditingCategory && <Button type="button" variant="ghost" onClick={() => { setIsEditingCategory(null); setCategoryName(''); }} className="flex-1 h-12 rounded-2xl font-bold text-slate-400">Cancel</Button>}
                                <Button onClick={handleCategorySubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 rounded-2xl font-black shadow-lg shadow-emerald-100 text-white">
                                    <Check className="mr-2 h-5 w-5" /> Save Group Type
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* List Side */}
                <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="group bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center`}>
                                        <div className={`h-4 w-4 rounded-full bg-${cat.color || 'indigo'}-500 shadow-lg shadow-${cat.color || 'indigo'}-200`} />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg uppercase leading-none">{cat.name}</h4>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingCategory(cat.id); setCategoryName(cat.name); setCategoryColor(cat.color || 'indigo'); }} className="h-9 w-9 rounded-full text-indigo-600 hover:bg-indigo-50"><Edit2 className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => { if(confirm('Delete?')) deleteSubjectGroupType(cat.id).then(() => init()); }} className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
