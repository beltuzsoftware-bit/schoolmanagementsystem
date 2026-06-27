'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Check, X, Save, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Actions
import {
    getSubjects, createSubject, updateSubject, deleteSubject,
} from '@/app/actions/academics';
import { getClassAllocation, saveClassAllocation } from '@/app/actions/class-allocation';

// Types
import { Subject, ClassSubjectAllocation } from '@/types';
import { INITIAL_CLASS_SETUPS } from '@/lib/student-constants';

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // --- SUBJECTS TAB STATE ---
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    // --- ASSIGN TAB STATE ---
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [allocation, setAllocation] = useState<ClassSubjectAllocation>({
        id: '',
        className: '',
        coreSubjects: [],
        electiveGroups: [],
        optionalGroups: []
    });
    const [loadingAllocation, setLoadingAllocation] = useState(false);


    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const s = await getSubjects();
        setSubjects(s);
    };

    // --- SUBJECT HANDLERS ---
    const handleSubjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let result;
        if (editingSubject) {
            result = await updateSubject(editingSubject.id, formData);
        } else {
            result = await createSubject(formData);
        }

        if (result.success) {
            toast.success(result.message);
            setIsSubjectDialogOpen(false);
            setIsAddingSubject(false); // Close inline form
            setEditingSubject(null);
            loadData();
        } else {
            toast.error(result.message);
        }
    };

    const handleDeleteSubject = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const result = await deleteSubject(id);
        if (result.success) {
            toast.success(result.message);
            loadData();
        }
    };

    // --- ASSIGNMENT HANDLERS ---
    const handleClassChange = async (className: string) => {
        setSelectedClass(className);
        if (!className) return;

        setLoadingAllocation(true);
        try {
            const data = await getClassAllocation(className);
            if (data) {
                setAllocation(data);
            } else {
                // Reset to empty structure for new class
                setAllocation({
                    id: `alloc_${Date.now()}`,
                    className,
                    coreSubjects: [],
                    electiveGroups: [],
                    optionalGroups: []
                });
            }
        } catch (error) {
            toast.error("Failed to load class allocation");
        } finally {
            setLoadingAllocation(false);
        }
    };

    const handleSaveAllocation = async () => {
        if (!selectedClass) return;

        try {
            const result = await saveClassAllocation(allocation);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error("Failed to save allocation");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        }
    };

    // --- ASSIGN 2 HANDLERS ---
    const handleAssign2Toggle = (category: 'Core' | 'Elective' | 'Optional', subjectId: string) => {
        setAllocation(prev => {
            const next = { ...prev };

            if (category === 'Core') {
                const core = next.coreSubjects || [];
                if (core.includes(subjectId)) {
                    next.coreSubjects = core.filter(id => id !== subjectId);
                } else {
                    next.coreSubjects = [...core, subjectId];
                }
            } else if (category === 'Elective') {
                // Find or create 'General Electives' group
                const newElectiveGroups = [...(allocation.electiveGroups || [])];
                let groupIdx = newElectiveGroups.findIndex(g => g.name === 'General Electives');

                if (groupIdx === -1) {
                    newElectiveGroups.push({ id: `eg_gen_${Date.now()}`, name: 'General Electives', subjects: [] });
                    groupIdx = newElectiveGroups.length - 1;
                }

                const group = { ...newElectiveGroups[groupIdx] };
                if (group.subjects.includes(subjectId)) {
                    group.subjects = group.subjects.filter((id: string) => id !== subjectId);
                } else {
                    group.subjects = [...group.subjects, subjectId];
                }
                newElectiveGroups[groupIdx] = group;
                next.electiveGroups = newElectiveGroups;

            } else if (category === 'Optional') {
                // Find or create 'General Optionals' group
                const newOptionalGroups = [...(allocation.optionalGroups || [])];
                let groupIdx = newOptionalGroups.findIndex(g => g.name === 'General Optionals');

                if (groupIdx === -1) {
                    newOptionalGroups.push({ id: `og_gen_${Date.now()}`, name: 'General Optionals', subjects: [] });
                    groupIdx = newOptionalGroups.length - 1;
                }

                const group = { ...newOptionalGroups[groupIdx] };
                if (group.subjects.includes(subjectId)) {
                    group.subjects = group.subjects.filter((id: string) => id !== subjectId);
                } else {
                    group.subjects = [...group.subjects, subjectId];
                }
                newOptionalGroups[groupIdx] = group;
                next.optionalGroups = newOptionalGroups;
            }

            return next;
        });
    };

    // Helper to check if subject is selected in Assign 2 mode
    const isSubjectSelectedAssign2 = (category: 'Core' | 'Elective' | 'Optional', subjectId: string) => {
        if (category === 'Core') {
            return (allocation.coreSubjects || []).includes(subjectId);
        } else if (category === 'Elective') {
            const group = (allocation.electiveGroups || []).find(g => g.name === 'General Electives');
            return group ? group.subjects.includes(subjectId) : false;
        } else if (category === 'Optional') {
            const group = (allocation.optionalGroups || []).find(g => g.name === 'General Optionals');
            return group ? group.subjects.includes(subjectId) : false;
        }
        return false;
    };





    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3 font-serif">
                        <BookOpen className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        Subjects Management
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Configure Subjects, Groups, and Class Curriculum.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="subjects" className="space-y-4">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1.5 h-auto flex flex-wrap gap-1.5 w-full md:w-fit justify-start bg-muted/50 rounded-xl">
                    <TabsTrigger value="subjects" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        Subjects
                    </TabsTrigger>
                    <TabsTrigger value="assign" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        Curriculum
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB: SUBJECTS --- */}
                <TabsContent value="subjects" className="space-y-6">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">SUBJECTS</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-7 w-7 p-0 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewMode('list')}
                                    className={`h-7 w-7 p-0 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                            {!isAddingSubject && (
                                <Button onClick={() => { setIsAddingSubject(true); setEditingSubject(null); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:scale-105 active:scale-95">
                                    <Plus className="h-4 w-4" /> Add New
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* View Content */}
                    {viewMode === 'grid' ? (
                        <>
                            {/* Grid View - Inline Add/Edit Form */}
                            {(isAddingSubject || editingSubject) && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner animate-in slide-in-from-top-4 duration-300 mb-6">
                                    <form onSubmit={handleSubjectSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4 space-y-1.5">
                                                <Label htmlFor="s-name" className="text-xs uppercase font-bold text-slate-500 tracking-wider">Entry Name</Label>
                                                <Input id="s-name" name="name" defaultValue={editingSubject?.name} required placeholder="e.g. Mathematics" className="bg-white border-slate-200 focus:ring-indigo-500 h-11" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="s-code" className="text-xs uppercase font-bold text-slate-500 tracking-wider">Code</Label>
                                                <Input id="s-code" name="code" defaultValue={editingSubject?.code} required placeholder="MATH" className="bg-white border-slate-200 h-11" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="s-type" className="text-xs uppercase font-bold text-slate-500 tracking-wider">Format</Label>
                                                <select id="s-type" name="type" className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={editingSubject?.type || 'Theory'}>
                                                    <option value="Theory">Theory</option>
                                                    <option value="Practical">Practical</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="s-category" className="text-xs uppercase font-bold text-slate-500 tracking-wider">Subject Type</Label>
                                                <select id="s-category" name="category" className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={editingSubject?.category || 'Core Subject'}>
                                                    <option value="Core Subject">Mandatory</option>
                                                    <option value="Elective">Elective</option>
                                                    <option value="Optional">Optional</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 flex items-center gap-2 h-11">
                                                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white h-full text-base font-medium transition-colors">{editingSubject ? 'Update' : 'Save'}</Button>
                                                <Button type="button" variant="secondary" className="h-full aspect-square p-0 bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors" onClick={() => { setIsAddingSubject(false); setEditingSubject(null); }}><span className="sr-only">Cancel</span><span className="text-xl">×</span></Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1 space-y-1.5">
                                                <Label htmlFor="s-group" className="text-xs uppercase font-bold text-slate-500 tracking-wider">Group (Optional)</Label>
                                                <select id="s-group" name="subjectGroupId" className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={editingSubject?.subjectGroupId || ''}>
                                                    <option value="">None</option>
                                                    <option value="">None</option>

                                                </select>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Subjects Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {subjects.map(subject => (
                                    <div key={subject.id} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[120px]">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-800 text-lg uppercase leading-tight tracking-tight">{subject.name}</h4>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 font-mono font-medium border border-slate-200">{subject.code}</span>
                                                {subject.category === 'Core Subject' ? (
                                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-medium">Mandatory</span>
                                                ) : subject.category === 'Elective' ? (
                                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-medium">Elective</span>
                                                ) : (
                                                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-medium">Optional</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-full" onClick={() => { setEditingSubject(subject); setIsAddingSubject(false); }}><Edit2 className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDeleteSubject(subject.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                {subjects.length === 0 && (
                                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">No subjects found.</div>
                                )}
                            </div>
                        </>
                    ) : (
                        // List View (Type 2)
                        <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[30%]">Entry Name</TableHead>
                                        <TableHead className="w-[15%]">Code</TableHead>
                                        <TableHead className="w-[20%]">Subject Type</TableHead>
                                        <TableHead className="w-[20%]">Format</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Inline Add Row */}
                                    {isAddingSubject && (
                                        <TableRow className="bg-indigo-50/30 hover:bg-indigo-50/50 border-b-2 border-indigo-100">
                                            <TableCell colSpan={5} className="p-2">
                                                <form onSubmit={handleSubjectSubmit} className="flex flex-wrap items-center gap-2">
                                                    <div className="flex-1 min-w-[200px]">
                                                        <Input autoFocus name="name" required placeholder="Subject Name" className="bg-white border-indigo-200 focus:border-indigo-500 h-9" />
                                                    </div>
                                                    <div className="w-[120px]">
                                                        <Input name="code" required placeholder="Code" className="bg-white border-indigo-200 focus:border-indigo-500 h-9" />
                                                    </div>
                                                    <div className="w-[150px]">
                                                        <select name="category" className="flex w-full rounded-md border border-indigo-200 bg-white px-3 py-1 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                            <option value="Core Subject">Mandatory</option>
                                                            <option value="Elective">Elective</option>
                                                            <option value="Optional">Optional</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-[150px]">
                                                        <select name="type" className="flex w-full rounded-md border border-indigo-200 bg-white px-3 py-1 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                            <option value="Theory">Theory</option>
                                                            <option value="Practical">Practical</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-1 ml-auto">
                                                        <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-9 px-4">
                                                            <Check className="h-4 w-4" /> Save
                                                        </Button>
                                                        <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingSubject(false)} className="h-9 w-9 p-0 text-slate-500 hover:text-red-600">
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </form>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {/* Existing Subjects */}
                                    {subjects.map(subject => (
                                        <TableRow key={subject.id} className="group hover:bg-slate-50/80">
                                            <TableCell className="font-medium text-slate-800">
                                                {editingSubject?.id === subject.id ? (
                                                    <form id={`edit-form-${subject.id}`} onSubmit={handleSubjectSubmit} className="contents">
                                                        <Input name="name" defaultValue={subject.name} className="h-8 max-w-[250px]" />
                                                    </form>
                                                ) : subject.name}
                                            </TableCell>
                                            <TableCell>
                                                {editingSubject?.id === subject.id ? (
                                                    <Input form={`edit-form-${subject.id}`} name="code" defaultValue={subject.code} className="h-8 w-24" />
                                                ) : <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{subject.code}</span>}
                                            </TableCell>
                                            <TableCell>
                                                {editingSubject?.id === subject.id ? (
                                                    <select form={`edit-form-${subject.id}`} name="category" defaultValue={subject.category} className="h-8 rounded border border-slate-200 text-sm px-2">
                                                        <option value="Core Subject">Mandatory</option>
                                                        <option value="Elective">Elective</option>
                                                        <option value="Optional">Optional</option>
                                                    </select>
                                                ) : (
                                                    subject.category === 'Core Subject' ? (
                                                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Mandatory</Badge>
                                                    ) : subject.category === 'Elective' ? (
                                                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Elective</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Optional</Badge>
                                                    )
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingSubject?.id === subject.id ? (
                                                    <select form={`edit-form-${subject.id}`} name="type" defaultValue={subject.type} className="h-8 rounded border border-slate-200 text-sm px-2">
                                                        <option value="Theory">Theory</option>
                                                        <option value="Practical">Practical</option>
                                                    </select>
                                                ) : <span className="text-sm text-slate-600">{subject.type}</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {editingSubject?.id === subject.id ? (
                                                        <>
                                                            <Button type="submit" form={`edit-form-${subject.id}`} size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"><Check className="h-4 w-4" /></Button>
                                                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSubject(null)} className="h-8 w-8 p-0 text-red-500"><X className="h-4 w-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingSubject(subject); setIsAddingSubject(false); }}><Edit2 className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteSubject(subject.id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {subjects.length === 0 && !isAddingSubject && (
                                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No subjects configured. Switch views or click Add New.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>


                {/* --- TAB: CURRICULUM (ASSIGN) --- */}
                <TabsContent value="assign" className="space-y-6">
                    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

                        {/* Top Bar: Dropdown and Save */}
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10">
                            <div className="w-full md:w-1/3">
                                <Label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Class</Label>
                                <Select value={selectedClass} onValueChange={handleClassChange}>
                                    <SelectTrigger className="w-full h-11 border-indigo-200 focus:ring-indigo-500">
                                        <SelectValue placeholder="Choose a class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INITIAL_CLASS_SETUPS.map(cls => (
                                            <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedClass && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <Button size="lg" onClick={handleSaveAllocation} className="bg-green-600 hover:bg-green-700 font-semibold shadow-sm">
                                        Update
                                    </Button>
                                    <Button size="lg" variant="outline" className="text-slate-600">
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>

                        {!selectedClass ? (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-slate-50/50">
                                <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium text-lg">Select a class above to configure subjects</p>
                            </div>
                        ) : loadingAllocation ? (
                            <div className="flex items-center justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-500">

                                {/* Summary Dashboard */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="bg-indigo-50 border-indigo-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <BookOpen className="h-24 w-24 text-indigo-900" />
                                        </div>
                                        <CardContent className="p-6 relative z-10">
                                            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Mandatory</p>
                                            <div className="flex items-baseline gap-2 mb-3">
                                                <span className="text-4xl font-black text-indigo-900">
                                                    {(allocation.coreSubjects || []).length}
                                                </span>
                                                <span className="text-sm font-medium text-indigo-700">Subjects</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(allocation.coreSubjects || []).length > 0 ? subjects.filter(s => (allocation.coreSubjects || []).includes(s.id)).map(s => (
                                                    <span key={s.id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/60 text-indigo-900 border border-indigo-100 shadow-sm">
                                                        {s.name}
                                                    </span>
                                                )) : <span className="text-sm text-indigo-400 italic">None selected</span>}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <LayoutGrid className="h-24 w-24 text-amber-900" />
                                        </div>
                                        <CardContent className="p-6 relative z-10">
                                            <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Elective</p>
                                            <div className="flex items-baseline gap-2 mb-3">
                                                <span className="text-4xl font-black text-amber-900">
                                                    {(allocation.electiveGroups || []).find(g => g.name === 'General Electives')?.subjects.length || 0}
                                                </span>
                                                <span className="text-sm font-medium text-amber-700">Subjects</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {((allocation.electiveGroups || []).find(g => g.name === 'General Electives')?.subjects.length || 0) > 0 ?
                                                    subjects.filter(s => (allocation.electiveGroups || []).find(g => g.name === 'General Electives')?.subjects.includes(s.id))
                                                        .map(s => (
                                                            <span key={s.id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/60 text-amber-900 border border-amber-100 shadow-sm">
                                                                {s.name}
                                                            </span>
                                                        ))
                                                    : <span className="text-sm text-amber-400 italic">None selected</span>
                                                }
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <List className="h-24 w-24 text-blue-900" />
                                        </div>
                                        <CardContent className="p-6 relative z-10">
                                            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Optional</p>
                                            <div className="flex items-baseline gap-2 mb-3">
                                                <span className="text-4xl font-black text-blue-900">
                                                    {(allocation.optionalGroups || []).find(g => g.name === 'General Optionals')?.subjects.length || 0}
                                                </span>
                                                <span className="text-sm font-medium text-blue-700">Subjects</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {((allocation.optionalGroups || []).find(g => g.name === 'General Optionals')?.subjects.length || 0) > 0 ?
                                                    subjects.filter(s => (allocation.optionalGroups || []).find(g => g.name === 'General Optionals')?.subjects.includes(s.id))
                                                        .map(s => (
                                                            <span key={s.id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/60 text-blue-900 border border-blue-100 shadow-sm">
                                                                {s.name}
                                                            </span>
                                                        ))
                                                    : <span className="text-sm text-blue-400 italic">None selected</span>
                                                }
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Core Subjects Section */}
                                <Card className="border-indigo-100 shadow-sm overflow-hidden">
                                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 py-3">
                                        <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                            <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                                            Core Subjects
                                        </h4>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {subjects.filter(s => s.category === 'Core Subject').map(subject => {
                                                const isChecked = isSubjectSelectedAssign2('Core', subject.id);
                                                return (
                                                    <div key={subject.id} className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                        <Checkbox
                                                            id={`core-${subject.id}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleAssign2Toggle('Core', subject.id)}
                                                            className="mt-1 data-[state=checked]:bg-indigo-600"
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <Label
                                                                htmlFor={`core-${subject.id}`}
                                                                className="text-sm font-semibold text-slate-700 cursor-pointer"
                                                            >
                                                                {subject.name}
                                                            </Label>
                                                            <span className="text-xs text-slate-400">{subject.code}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {subjects.filter(s => s.category === 'Core Subject').length === 0 && <p className="text-sm text-slate-400 italic">No core subjects defined.</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Elective Subjects Section */}
                                <Card className="border-amber-100 shadow-sm overflow-hidden">
                                    <CardHeader className="bg-amber-50/50 border-b border-amber-100 py-3">
                                        <h4 className="font-bold text-amber-900 flex items-center gap-2">
                                            <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                                            Elective Subjects
                                        </h4>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {subjects.filter(s => s.category === 'Elective').map(subject => {
                                                const isChecked = isSubjectSelectedAssign2('Elective', subject.id);
                                                return (
                                                    <div key={subject.id} className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${isChecked ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                        <Checkbox
                                                            id={`elective-${subject.id}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleAssign2Toggle('Elective', subject.id)}
                                                            className="mt-1 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <Label
                                                                htmlFor={`elective-${subject.id}`}
                                                                className="text-sm font-semibold text-slate-700 cursor-pointer"
                                                            >
                                                                {subject.name}
                                                            </Label>
                                                            <span className="text-xs text-slate-400">{subject.code}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {subjects.filter(s => s.category === 'Elective').length === 0 && <p className="text-sm text-slate-400 italic">No elective subjects defined.</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Optional Subjects Section */}
                                <Card className="border-blue-100 shadow-sm overflow-hidden">
                                    <CardHeader className="bg-blue-50/50 border-b border-blue-100 py-3">
                                        <h4 className="font-bold text-blue-900 flex items-center gap-2">
                                            <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                                            Optional Subjects
                                        </h4>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {subjects.filter(s => s.category === 'Optional').map(subject => {
                                                const isChecked = isSubjectSelectedAssign2('Optional', subject.id);
                                                return (
                                                    <div key={subject.id} className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                        <Checkbox
                                                            id={`optional-${subject.id}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleAssign2Toggle('Optional', subject.id)}
                                                            className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <Label
                                                                htmlFor={`optional-${subject.id}`}
                                                                className="text-sm font-semibold text-slate-700 cursor-pointer"
                                                            >
                                                                {subject.name}
                                                            </Label>
                                                            <span className="text-xs text-slate-400">{subject.code}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {subjects.filter(s => s.category === 'Optional').length === 0 && <p className="text-sm text-slate-400 italic">No optional subjects defined.</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>



        </div >
    );
}
