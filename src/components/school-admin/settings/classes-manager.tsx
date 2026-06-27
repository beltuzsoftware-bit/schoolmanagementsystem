import React, { useState } from 'react';
import { ClassSetup } from '@/types/student-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus, ArrowRight } from 'lucide-react';
import Checkbox from '../checkbox';
import ConfirmationModal from '../confirmation-modal';
import { Card } from '@/components/ui/card';

interface ClassesManagerProps {
    classes: ClassSetup[];
    sections: string[]; // Master list of sections
    onUpdate: (classes: ClassSetup[]) => void;
    onAddSection?: (section: string) => void; // Callback to add a new section to the master list
}

export default function ClassesManager({ classes, sections, onUpdate, onAddSection }: ClassesManagerProps) {
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');

    // Editor State
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [className, setClassName] = useState('');
    const [classCode, setClassCode] = useState(''); // New
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [createLoginDefault, setCreateLoginDefault] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [classToDeleteId, setClassToDeleteId] = useState<string | null>(null);

    const startAdd = () => {
        setClassName('');
        setClassCode('');
        setSelectedSections(new Set());
        setCreateLoginDefault(false);
        setEditingClassId(null);
        setView('add');
    };

    const startEdit = (cls: ClassSetup) => {
        setClassName(cls.name);
        setClassCode(cls.code || '');
        setSelectedSections(new Set(cls.sections));
        setCreateLoginDefault(cls.createStudentLoginDefault);
        setEditingClassId(cls.id);
        setView('edit');
    };

    const handleSave = () => {
        if (!className.trim()) return;

        const newClass: ClassSetup = {
            id: editingClassId || `class-${Date.now()}`,
            name: className.trim(),
            code: classCode.trim().toUpperCase(),
            sections: Array.from(selectedSections),
            subjects: [], // Initialize with empty array, subjects managed separately
            createStudentLoginDefault: createLoginDefault
        };

        if (editingClassId) {
            onUpdate(classes.map(c => c.id === editingClassId ? newClass : c));
        } else {
            onUpdate([...classes, newClass]);
        }
        setView('list');
    };

    const handleDeleteClick = (id: string) => {
        setClassToDeleteId(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (classToDeleteId) {
            onUpdate(classes.filter(c => c.id !== classToDeleteId));
            setDeleteModalOpen(false);
            setClassToDeleteId(null);
        }
    };

    // --- Sub-components (Render helpers) ---

    // 1. List View
    const renderList = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div>
                    <h3 className="text-lg font-bold text-indigo-900">Manage Classes</h3>
                    <p className="text-sm text-indigo-700/80">Configure classes and assign available sections.</p>
                </div>
                <Button onClick={startAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-100">
                    <Plus className="w-5 h-5 mr-2" />
                    New Class
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(!classes || classes.length === 0) ? (
                    <div className="col-span-full text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                        No classes configured. Click "New Class" to start.
                    </div>
                ) : (
                    classes.map((cls, idx) => {
                        const colorVariants = [
                            "bg-blue-100 border-blue-200 hover:bg-blue-200 hover:border-blue-300",
                            "bg-indigo-100 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300",
                            "bg-fuchsia-100 border-fuchsia-200 hover:bg-fuchsia-200 hover:border-fuchsia-300",
                            "bg-emerald-100 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300",
                            "bg-rose-100 border-rose-200 hover:bg-rose-200 hover:border-rose-300",
                            "bg-amber-100 border-amber-200 hover:bg-amber-200 hover:border-amber-300",
                        ];
                        const colorClass = colorVariants[idx % colorVariants.length];
                        return (
                        <div key={cls.id} className={`p-6 rounded-[1.5rem] border shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-between gap-6 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 h-full ${colorClass}`}>
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <h4 className="text-xl font-black text-slate-800">{cls.name}</h4>
                                    <span className="px-2 py-1 bg-white/80 rounded-lg text-[10px] font-black text-slate-600 border border-slate-200 shadow-sm">
                                        ID CODE: {cls.code || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                    <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md font-medium text-xs uppercase tracking-wide">
                                        sections: {cls.sections.length > 0 ? cls.sections.join(', ') : 'None'}
                                    </span>
                                    {cls.createStudentLoginDefault && (
                                        <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wide border border-green-100">
                                            Auto-Login
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/60">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEdit(cls)}
                                    className="h-9 w-9 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 bg-white/40"
                                    title="Edit Class"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(cls.id)}
                                    className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 bg-white/40"
                                    title="Delete Class"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
    );

    // 2. Editor View
    const renderEditor = () => (
        <Card className="p-6 md:p-8 animate-in zoom-in-95 duration-200 border-2 border-slate-100 shadow-xl rounded-3xl">
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-slate-800">
                        {view === 'add' ? 'Add New Class' : 'Edit Class'}
                    </h3>
                    <Button variant="ghost" onClick={() => setView('list')} className="text-slate-500">Cancel</Button>
                </div>

                <div className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Class Name</label>
                            <Input
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="e.g. Class 10"
                                className="h-12 text-lg font-medium"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Class Code (for ID Gen)</label>
                            <Input
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value)}
                                placeholder="e.g. 10A"
                                className="h-12 text-lg font-bold uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {/* Inline Section Adder */}
                            {onAddSection && (
                                <div className="flex gap-2 mb-4 pb-4 border-b border-slate-200/60">
                                    <Input 
                                        value={newSectionName}
                                        onChange={(e) => setNewSectionName(e.target.value)}
                                        placeholder="Quick add section (e.g. E)"
                                        className="h-9 text-xs bg-white"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = newSectionName.trim().toUpperCase();
                                                if (val && !sections.includes(val)) {
                                                    onAddSection(val);
                                                    const newSet = new Set(selectedSections);
                                                    newSet.add(val);
                                                    setSelectedSections(newSet);
                                                    setNewSectionName('');
                                                }
                                            }
                                        }}
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-9 px-3 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold"
                                        onClick={() => {
                                            const val = newSectionName.trim().toUpperCase();
                                            if (val && !sections.includes(val)) {
                                                onAddSection(val);
                                                const newSet = new Set(selectedSections);
                                                newSet.add(val);
                                                setSelectedSections(newSet);
                                                setNewSectionName('');
                                            }
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(!sections || sections.length === 0) ? (
                                    <p className="col-span-full text-slate-400 text-sm italic">No sections available. Add one using the field above.</p>
                                ) : (
                                    sections.map(sec => (
                                        <Checkbox
                                            key={sec}
                                            label={sec}
                                            name={`sec-${sec}`}
                                            checked={selectedSections.has(sec)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedSections);
                                                if (e.target.checked) newSet.add(sec);
                                                else newSet.delete(sec);
                                                setSelectedSections(newSet);
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <Checkbox
                            label="Automatically create student login credentials"
                            name="autoLogin"
                            checked={createLoginDefault}
                            onChange={(e) => setCreateLoginDefault(e.target.checked)}
                        />
                        <p className="pl-7 mt-1 text-xs text-slate-400">If checked, students added to this class will have login access by default.</p>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-indigo-200">
                            Save Class
                        </Button>
                        <Button variant="outline" onClick={() => setView('list')} className="h-12 px-6 rounded-xl font-bold text-slate-600">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );

    return (
        <>
            {view === 'list' && renderList()}
            {(view === 'add' || view === 'edit') && renderEditor()}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Class"
                message="Are you sure you want to delete this class? This will not delete students, but will remove class association."
                confirmButtonText="Delete Class"
                confirmButtonClasses="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            />
        </>
    );
}
