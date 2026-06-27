'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, GripVertical, ChevronRight, Save, Trash2, Languages, Cpu, GraduationCap, ArrowRightLeft, Plus, Settings, CheckCircle2, XCircle, Edit2, Pencil, Check, Layers, Users, ArrowUpDown, Loader2, Tag, Search, LayoutGrid, List, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS, INITIAL_CATEGORIES } from '@/lib/student-constants';
import { 
    getSubjects, getSubjectGroupTypes, saveSubjectGroupType, deleteSubjectGroupType,
    createSubject, createSubjects, updateSubject, deleteSubject, saveSubjectsOrder
} from '@/app/actions/academics';
import { Subject, CurriculumTemplate, ClassSubjectAllocation, SubjectGroupType, Student } from '@/types';
import { getCurriculumTemplates, saveCurriculumTemplate, deleteCurriculumTemplate, getClassAllocations, assignTemplateToSelection, removeAssignment, removeStudentFromAssignment } from '@/app/actions/curriculum';
import { getStudents, getSchools } from '@/app/actions';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
    indigo: '#4F39F6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    blue: '#3b82f6',
    orange: '#f97316',
    purple: '#a855f7',
    slate: '#64748b',
    pink: '#ec4899',
    cyan: '#06b6d4',
};

export default function CurriculumPage() {
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
    const [assignments, setAssignments] = useState<ClassSubjectAllocation[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [schoolClasses, setSchoolClasses] = useState<any[]>(INITIAL_CLASS_SETUPS);
    const [schoolSections, setSchoolSections] = useState<string[]>(INITIAL_SECTIONS);
    const [schoolCategories, setSchoolCategories] = useState<string[]>(INITIAL_CATEGORIES);
    const [loading, setLoading] = useState(false);

    // Current Template State
    const [activeTemplate, setActiveTemplate] = useState<CurriculumTemplate | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [languageGroups, setLanguageGroups] = useState<{ id: string, name: string, subjects: Subject[] }[]>([]);
    const [coreSubjects, setCoreSubjects] = useState<Subject[]>([]);
    const [electiveSubjects, setElectiveSubjects] = useState<Subject[]>([]);
    const [optionalSubjects, setOptionalSubjects] = useState<Subject[]>([]);

    // Assignment State
    const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
    const [isBulkUnassignMode, setIsBulkUnassignMode] = useState(false);
    const [selectedForUnassign, setSelectedForUnassign] = useState<string[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
    const [assignmentFilter, setAssignmentFilter] = useState({ class: '', section: '', category: '', gender: '', rte: '', searchQuery: '', templateId: '' });
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('templates');
    const [isEditing, setIsEditing] = useState(false);

    // Category State
    const [categories, setCategories] = useState<SubjectGroupType[]>([]);
    const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('indigo');

    // Master Subjects State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [batchSubjects, setBatchSubjects] = useState<Omit<Subject, 'id'>[]>([]);
    const [masterSearchQuery, setMasterSearchQuery] = useState('');
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    useEffect(() => {
        init();
    }, []);

    const [hasSearched, setHasSearched] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'primary';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const init = async () => {
        setLoading(true);
        const storedUser = localStorage.getItem('kummi_user');
        const schoolId = storedUser ? JSON.parse(storedUser).schoolId : null;

        const [subs, temps, allocs, cats, studs, allSchools] = await Promise.all([
            getSubjects(),
            getCurriculumTemplates(),
            getClassAllocations(),
            getSubjectGroupTypes(),
            schoolId ? getStudents(schoolId) : Promise.resolve([]),
            getSchools()
        ]);

        const mySchool = allSchools.find((s: any) => s.id === schoolId);
        if (mySchool) {
            if (mySchool.useCustomClasses && mySchool.classes) setSchoolClasses(mySchool.classes);
            else setSchoolClasses(INITIAL_CLASS_SETUPS);

            if (mySchool.useCustomSections && mySchool.sections) setSchoolSections(mySchool.sections);
            else setSchoolSections(INITIAL_SECTIONS);

            if (mySchool.useCustomCategories && mySchool.categories) setSchoolCategories(mySchool.categories);
            else setSchoolCategories(INITIAL_CATEGORIES);
        }

        setAllSubjects(subs);
        setTemplates(temps);
        setAssignments(allocs);
        setCategories(cats);
        setAllStudents(studs);
        setAvailableSubjects(subs);
        setLoading(false);
    };

    const handleSearch = () => {
        // Validation: Must have at least something to search
        if (!assignmentFilter.class && !assignmentFilter.section && !assignmentFilter.searchQuery) {
            toast.error("Please select criteria or enter a search keyword");
            return;
        }

        // Specific Validation: If Class is selected, Section must also be selected
        if (assignmentFilter.class && !assignmentFilter.section) {
            toast.error("Please select a Section (or All Sections)");
            return;
        }

        setIsSearching(true);
        // Simulate loading for better UX
        setTimeout(() => {
            setHasSearched(true);
            setIsSearching(false);
        }, 600);
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getFilteredStudents = () => {
        let filtered = allStudents.filter(s => {
            const classMatch = !assignmentFilter.class || assignmentFilter.class === 'ALL' || s.className === assignmentFilter.class;
            const sectionMatch = !assignmentFilter.section || assignmentFilter.section === 'ALL' || s.section === assignmentFilter.section;
            const categoryMatch = !assignmentFilter.category || s.category === assignmentFilter.category;
            const genderMatch = !assignmentFilter.gender || s.gender === assignmentFilter.gender;
            const rteMatch = !assignmentFilter.rte || (assignmentFilter.rte === 'Yes' ? s.rte === 'Yes' : s.rte !== 'Yes');
            
            const groupMatch = !assignmentFilter.templateId || 
                assignmentFilter.templateId === 'ALL' ||
                (assignmentFilter.templateId === 'NONE' ? 
                    !assignments.some(a => (a.studentIds || []).includes(s.id)) : 
                    assignments.some(a => a.templateId === assignmentFilter.templateId && (a.studentIds || []).includes(s.id))
                );
            
            const searchLower = assignmentFilter.searchQuery.toLowerCase().trim();
            const searchMatch = !searchLower || 
                (s.name || '').toLowerCase().includes(searchLower) ||
                (s.admissionNumber || '').toLowerCase().includes(searchLower) ||
                (s.rollNumber || '').toString().toLowerCase().includes(searchLower);

            return classMatch && sectionMatch && categoryMatch && genderMatch && rteMatch && searchMatch && groupMatch;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                let valA: any;
                let valB: any;

                if (sortConfig.key === 'assignedGroup') {
                    const allocA = assignments.find(al => (al.studentIds || []).includes(a.id));
                    valA = templates.find(t => t.id === allocA?.templateId)?.name || '';
                    const allocB = assignments.find(al => (al.studentIds || []).includes(b.id));
                    valB = templates.find(t => t.id === allocB?.templateId)?.name || '';
                } else if (sortConfig.key === 'rollNumber') {
                    valA = parseInt(a.rollNumber?.toString().replace(/\D/g, '') || '0');
                    valB = parseInt(b.rollNumber?.toString().replace(/\D/g, '') || '0');
                } else {
                    valA = (a as any)[sortConfig.key] || '';
                    valB = (b as any)[sortConfig.key] || '';
                }

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    };

    const handleCreateTemplate = () => {
        const newTemplate: CurriculumTemplate = {
            id: `temp_${Date.now()}`,
            name: 'New Subject Group',
            languageGroups: [
                { id: 'lang-1', name: 'Language 1', subjects: [] },
                { id: 'lang-2', name: 'Language 2', subjects: [] },
                { id: 'lang-3', name: 'Language 3', subjects: [] },
            ],
            coreSubjects: [],
            electiveGroups: [{ id: 'elec-1', name: 'Elective Group', subjects: [] }],
            optionalGroups: [{ id: 'opt-1', name: 'Optional Group', subjects: [] }]
        };
        loadTemplate(newTemplate);
        setActiveTab('add');
    };

    const loadTemplate = (template: CurriculumTemplate) => {
        setActiveTemplate(template);
        setTemplateName(template.name);
        
        const mapIdsToSubjects = (ids: string[]) => 
            ids.map(id => allSubjects.find(s => s.id === id)).filter(Boolean) as Subject[];

        setCoreSubjects(mapIdsToSubjects(template.coreSubjects));
        setElectiveSubjects(mapIdsToSubjects(template.electiveGroups[0]?.subjects || []));
        setOptionalSubjects(mapIdsToSubjects(template.optionalGroups[0]?.subjects || []));
        
        const langGrps = template.languageGroups.map(g => ({
            id: g.id,
            name: g.name,
            subjects: mapIdsToSubjects(g.subjects)
        }));
        setLanguageGroups(langGrps);

        const assignedIds = new Set([
            ...template.coreSubjects,
            ...(template.electiveGroups[0]?.subjects || []),
            ...(template.optionalGroups[0]?.subjects || []),
            ...template.languageGroups.flatMap(g => g.subjects)
        ]);
        setAvailableSubjects(allSubjects.filter(s => !assignedIds.has(s.id)));
    };

    const handleEditTemplate = (template: CurriculumTemplate) => {
        loadTemplate(template);
        setIsEditing(true);
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const getList = (id: string) => {
            if (id === 'available') return availableSubjects;
            if (id === 'core') return coreSubjects;
            if (id === 'elective') return electiveSubjects;
            if (id === 'optional') return optionalSubjects;
            const langIdx = languageGroups.findIndex(g => g.id === id);
            if (langIdx !== -1) return languageGroups[langIdx].subjects;
            return [];
        };

        const setList = (id: string, newList: Subject[]) => {
            if (id === 'available') setAvailableSubjects(newList);
            else if (id === 'core') setCoreSubjects(newList);
            else if (id === 'elective') setElectiveSubjects(newList);
            else if (id === 'optional') setOptionalSubjects(newList);
            else {
                const langIdx = languageGroups.findIndex(g => g.id === id);
                if (langIdx !== -1) {
                    const newLangGroups = [...languageGroups];
                    newLangGroups[langIdx].subjects = newList;
                    setLanguageGroups(newLangGroups);
                }
            }
        };

        const sourceList = [...getList(source.droppableId)];
        const destList = source.droppableId === destination.droppableId ? sourceList : [...getList(destination.droppableId)];
        
        const [removed] = sourceList.splice(source.index, 1);
        destList.splice(destination.index, 0, removed);

        setList(source.droppableId, sourceList);
        if (source.droppableId !== destination.droppableId) {
            setList(destination.droppableId, destList);
        }
    };

    const handleSaveTemplate = async () => {
        if (!activeTemplate || !templateName) {
            toast.error("Subject group name is required");
            return;
        }

        const templateToSave: CurriculumTemplate = {
            ...activeTemplate,
            name: templateName,
            coreSubjects: coreSubjects.map(s => s.id),
            languageGroups: languageGroups.map(g => ({ id: g.id, name: g.name, subjects: g.subjects.map(s => s.id) })),
            electiveGroups: [{ id: 'elec-1', name: 'Elective Group', subjects: electiveSubjects.map(s => s.id) }],
            optionalGroups: [{ id: 'opt-1', name: 'Optional Group', subjects: optionalSubjects.map(s => s.id) }]
        };

        const result = await saveCurriculumTemplate(templateToSave);
        if (result.success) {
            toast.success(result.message);
            init(); // Refresh lists
            setActiveTab('templates');
            setIsEditing(false);
            setActiveTemplate(null);
        } else {
            toast.error(result.message);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Subject Group',
            message: 'Are you sure you want to delete this group? This will also remove assignments to classes. This action cannot be undone.',
            variant: 'danger',
            onConfirm: async () => {
                const result = await deleteCurriculumTemplate(id);
                if (result.success) {
                    toast.success(result.message);
                    if (activeTemplate?.id === id) {
                        setActiveTemplate(null);
                        setIsEditing(false);
                    }
                    init();
                }
                closeConfirm();
            }
        });
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

    const handleDeleteCategory = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Group Type',
            message: 'Are you sure you want to delete this category? This might affect existing groupings.',
            variant: 'danger',
            onConfirm: async () => {
                const result = await deleteSubjectGroupType(id);
                if (result.success) {
                    toast.success(result.message);
                    init();
                } else toast.error(result.message);
                closeConfirm();
            }
        });
    };

    // --- MASTER SUBJECT HANDLERS ---
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
            setIsAddingSubject(false);
            setEditingSubject(null);
            init();
        } else {
            toast.error(result.message);
        }
    };

    const handleAddToBatch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const groupType = formData.get('groupType') as string;
        const type = formData.get('type') as 'Theory' | 'Practical';

        if (!name || !code) {
            toast.error("Name and Code are required");
            return;
        }

        const newSubject: Omit<Subject, 'id'> = {
            name,
            code,
            groupType,
            type
        };

        setBatchSubjects(prev => [...prev, newSubject]);
        e.currentTarget.reset();
        toast.info("Subject added to batch list");
    };

    const handleSaveBatch = async () => {
        if (batchSubjects.length === 0) return;
        
        const result = await createSubjects(batchSubjects);
        if (result.success) {
            toast.success(result.message);
            setBatchSubjects([]);
            setIsAddingSubject(false);
            init();
        } else {
            toast.error(result.message);
        }
    };

    const removeFromBatch = (index: number) => {
        setBatchSubjects(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteSubject = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Subject',
            message: 'Are you sure you want to delete this subject? This will remove it from all groups.',
            variant: 'danger',
            onConfirm: async () => {
                const result = await deleteSubject(id);
                if (result.success) {
                    toast.success(result.message);
                    init();
                }
                closeConfirm();
            }
        });
    };


    const handleRemoveStudentFromGroup = async (studentId: string, assignmentId: string) => {
        const result = await removeStudentFromAssignment(studentId, assignmentId);
        if (result.success) {
            toast.success(result.message);
            init();
        } else {
            toast.error(result.message);
        }
    };

    const handleBulkRemoveFromGroups = async () => {
        if (selectedForUnassign.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Bulk Unassign Students',
            message: `Are you sure you want to remove ${selectedForUnassign.length} students from their currently assigned groups?`,
            variant: 'danger',
            onConfirm: async () => {
                for (const studentId of selectedForUnassign) {
                    const alloc = assignments.find(a => (a.studentIds || []).includes(studentId));
                    if (alloc) {
                        await removeStudentFromAssignment(studentId, alloc.id);
                    }
                }
                toast.success(`Removed ${selectedForUnassign.length} students from groups`);
                setSelectedForUnassign([]);
                init();
                closeConfirm();
            }
        });
    };

    const handleSaveAllAssignments = async () => {
        const entries = Object.entries(pendingAssignments);
        if (entries.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Save All Assignments',
            message: `Are you sure you want to commit subject groupings for ${entries.length} students?`,
            variant: 'primary',
            onConfirm: async () => {
                // Group by Template + Class + Section
                const groups: Record<string, string[]> = {};
                for (const [sId, tId] of entries) {
                    const student = allStudents.find(s => s.id === sId);
                    if (!student) continue;
                    const key = `${student.className}|${student.section}|${tId}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(sId);
                }

                for (const [key, sIds] of Object.entries(groups)) {
                    const [className, section, templateId] = key.split('|');
                    await assignTemplateToSelection(templateId, className, section, sIds);
                }

                toast.success('All assignments saved successfully');
                setPendingAssignments({});
                init();
                closeConfirm();
            }
        });
    };

    const handleAssign = async () => {
        if (!selectedTemplateForAssign) {
            toast.error('Please select a curriculum group');
            return;
        }

        if (selectedStudentIds.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        let targetClass = assignmentFilter.class;
        let targetSection = assignmentFilter.section;

        // Smart Inference: If filter is empty but students are selected
        if (!targetClass || !targetSection || targetClass === 'ALL' || targetSection === 'ALL') {
            const selectedStudents = allStudents.filter(s => selectedStudentIds.includes(s.id));
            const classes = new Set(selectedStudents.map(s => s.className));
            const sections = new Set(selectedStudents.map(s => s.section));

            if (classes.size === 1 && sections.size === 1) {
                targetClass = Array.from(classes)[0] || '';
                targetSection = Array.from(sections)[0] || '';
            } else {
                toast.error('Please select a specific Class and Section in the header filters');
                return;
            }
        }

        const tName = templates.find(t => t.id === selectedTemplateForAssign)?.name || 'this group';
        
        setConfirmModal({
            isOpen: true,
            title: 'Apply Assignment',
            message: `Are you sure you want to assign "${tName}" to ${selectedStudentIds.length} students in ${targetClass}-${targetSection}?`,
            variant: 'primary',
            onConfirm: async () => {
                const result = await assignTemplateToSelection(
                    selectedTemplateForAssign, 
                    targetClass, 
                    targetSection, 
                    selectedStudentIds
                );

                if (result.success) {
                    toast.success(result.message);
                    setSelectedStudentIds([]);
                    init();
                } else {
                    toast.error(result.message);
                }
                closeConfirm();
            }
        });
    };

    const handleRepositoryDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(allSubjects);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setAllSubjects(items);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        // We'll create a new action for this or just reuse updateSubject logic
        // For simplicity, we'll assume a 'updateSubjectsOrder' action exists or we implement it
        // Since it's a mock, we'll just show success for now and I'll add the action
        const result = await saveSubjectsOrder(allSubjects.map(s => s.id));
        if (result.success) {
            toast.success("Subject display order updated");
            init();
        } else {
            toast.error(result.message);
        }
        setIsSavingOrder(false);
    };

    const handleRemoveAssignment = async (className: string, section: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Assignment',
            message: `Are you sure you want to remove the subject grouping for all students in ${className}-${section}?`,
            variant: 'danger',
            onConfirm: async () => {
                const result = await removeAssignment(className, section);
                if (result.success) {
                    toast.success(result.message);
                    init();
                } else {
                    toast.error(result.message);
                }
                closeConfirm();
            }
        });
    };

    const handleBulkRemoveAssignments = async () => {
        const selected = assignments.filter(a => selectedAssignmentIds.includes(a.id));
        if (selected.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Bulk Remove Assignments',
            message: `Are you sure you want to remove ${selected.length} group assignments? This will unassign all students in these classes.`,
            variant: 'danger',
            onConfirm: async () => {
                for (const alloc of selected) {
                    await removeAssignment(alloc.className, alloc.section || '');
                }
                toast.success(`Removed ${selected.length} assignments`);
                setSelectedAssignmentIds([]);
                init();
                closeConfirm();
            }
        });
    };

    const renderBuilder = () => {
        if (!activeTemplate) return null;
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-xl shadow-slate-100 rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex-1 w-full">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Subject Group Name</Label>
                            <Input 
                                value={templateName} 
                                onChange={e => setTemplateName(e.target.value)}
                                placeholder="e.g., Standard Grade 10 Curriculum"
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-xl font-black focus-visible:ring-indigo-500"
                            />
                        </div>
                        <Button onClick={handleSaveTemplate} className="bg-[#4F39F6] hover:bg-[#4F39F6]/90 h-14 px-8 rounded-2xl font-bold shadow-lg shadow-[#4F39F6]/20 self-end transition-all active:scale-95">
                            <Save className="mr-2 h-5 w-5" /> Save Subject Group
                        </Button>
                    </CardContent>
                </Card>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT: Available Subjects - REDUCED SIZE */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-[0.1em]">Subject Pool</h3>
                                </div>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-200">{availableSubjects.length} Available</span>
                            </div>
                            <Droppable droppableId="available">
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`min-h-[600px] p-6 rounded-[3rem] transition-all border-2 border-dashed ${snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/50 border-slate-100 shadow-inner'}`}
                                    >
                                        <div className="mb-6">
                                            <div className="relative group">
                                                <Input 
                                                    placeholder="Search pool..." 
                                                    value={subjectSearchQuery}
                                                    onChange={e => setSubjectSearchQuery(e.target.value)}
                                                    className="h-12 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm pl-11 text-sm font-bold focus-visible:ring-indigo-500 transition-all group-hover:border-indigo-200"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <Plus className="h-5 w-5 text-slate-400 rotate-45 group-hover:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                                            {availableSubjects
                                                .filter(s => 
                                                    s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) || 
                                                    s.code.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                                                )
                                                .map((subject, index) => (
                                                    <SubjectItem key={subject.id} subject={subject} index={index} compact />
                                                ))
                                            }
                                            {provided.placeholder}
                                            {availableSubjects.length === 0 && (
                                                <div className="col-span-full py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest text-xs">All subjects assigned</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        {/* RIGHT: Groups - INCREASED SIZE */}
                        <div className="lg:col-span-9 space-y-8">
                            {/* ROW 1: LANGUAGES */}
                            <section className="space-y-3">
                                 <div className="flex items-center gap-2 px-2">
                                     <Languages className="h-4 w-4 text-indigo-500" />
                                     <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Language Distribution</h3>
                                 </div>
                                 <div className="grid grid-cols-3 gap-3">
                                     {languageGroups.map((group) => (
                                         <GroupContainer 
                                             key={group.id} 
                                             id={group.id} 
                                             title={group.name} 
                                             subjects={group.subjects} 
                                             color="bg-indigo-100/50 border-indigo-200" 
                                             height="max-h-[160px] min-h-[100px]"
                                         />
                                     ))}
                                 </div>
                            </section>

                            {/* ROW 2: CORE, ELECTIVE, OPTIONAL */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 px-2">
                                    <GraduationCap className="h-4 w-4 text-[#4F39F6]" />
                                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Subject Distribution</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <GroupContainer 
                                        id="core" 
                                        title="Core" 
                                        subjects={coreSubjects} 
                                        color="bg-emerald-100/50 border-emerald-200" 
                                        height="max-h-[600px] min-h-[200px]"
                                    />
                                    <GroupContainer 
                                        id="elective" 
                                        title="Elective" 
                                        subjects={electiveSubjects} 
                                        color="bg-amber-100/50 border-amber-200" 
                                        height="max-h-[600px] min-h-[200px]"
                                    />
                                    <GroupContainer 
                                        id="optional" 
                                        title="Optional" 
                                        subjects={optionalSubjects} 
                                        color="bg-cyan-100/50 border-cyan-200" 
                                        height="max-h-[600px] min-h-[200px]"
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </DragDropContext>
            </div>
        );
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white animate-in zoom-in-95 duration-300">
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${confirmModal.variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                    {confirmModal.variant === 'danger' ? <XCircle className="h-8 w-8" /> : <Settings className="h-8 w-8" />}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{confirmModal.title}</h3>
                                    <p className="text-slate-500 font-medium text-sm leading-relaxed">{confirmModal.message}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                    <Button 
                                        variant="outline" 
                                        onClick={closeConfirm}
                                        className="h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={confirmModal.onConfirm}
                                        className={`h-12 rounded-xl font-bold shadow-lg ${confirmModal.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
                                    >
                                        {confirmModal.variant === 'danger' ? 'Delete' : 'Confirm'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <ArrowRightLeft className="h-5 w-5" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subject Settings</h1>
                </div>

                {activeTab === 'assign' && (
                    <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-100/80 rounded-xl p-1.5 animate-in fade-in slide-in-from-left-4 duration-500">
                        <Select value={assignmentFilter.class} onValueChange={(val) => setAssignmentFilter({...assignmentFilter, class: val})}>
                            <SelectTrigger className="w-[120px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm">
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {schoolClasses.map(c => <SelectItem key={c.id} value={c.name} className="font-medium text-[13px] py-2.5 text-slate-600">{c.name}</SelectItem>)}
                                <SelectItem value="ALL" className="font-bold text-[13px] text-indigo-600 border-t border-slate-50 mt-1 py-2.5 uppercase tracking-wide text-center">All Classes</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select 
                            value={assignmentFilter.section} 
                            onValueChange={(val) => setAssignmentFilter({...assignmentFilter, section: val})}
                            disabled={!assignmentFilter.class}
                        >
                            <SelectTrigger className={cn(
                                "w-[115px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm transition-all",
                                !assignmentFilter.class && "opacity-50 cursor-not-allowed"
                            )}>
                                <SelectValue placeholder="Section" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {schoolSections.map(s => <SelectItem key={s} value={s} className="font-medium text-[13px] py-2.5 text-slate-600">{s}</SelectItem>)}
                                <SelectItem value="ALL" className="font-bold text-[13px] text-indigo-600 border-t border-slate-50 mt-1 py-2.5 uppercase tracking-wide text-center">All Sections</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={assignmentFilter.category} onValueChange={(val) => setAssignmentFilter({...assignmentFilter, category: val})}>
                            <SelectTrigger className="w-[130px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {schoolCategories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="font-medium text-[13px] py-2.5 text-slate-600">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={assignmentFilter.gender} onValueChange={(val) => setAssignmentFilter({...assignmentFilter, gender: val})}>
                            <SelectTrigger className="w-[110px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm">
                                <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="Male" className="font-medium text-[13px] py-2.5 text-slate-600">Male</SelectItem>
                                <SelectItem value="Female" className="font-medium text-[13px] py-2.5 text-slate-600">Female</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={assignmentFilter.rte} onValueChange={(val) => setAssignmentFilter({...assignmentFilter, rte: val})}>
                            <SelectTrigger className="w-[90px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm">
                                <SelectValue placeholder="RTE" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="Yes" className="font-medium text-[13px] py-2.5 text-slate-600">Yes</SelectItem>
                                <SelectItem value="No" className="font-medium text-[13px] py-2.5 text-slate-600">No</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={assignmentFilter.templateId} onValueChange={(val) => setAssignmentFilter({...assignmentFilter, templateId: val})}>
                            <SelectTrigger className="w-[150px] h-9 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm">
                                <SelectValue placeholder="Subject Group" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="ALL" className="font-bold text-[13px] text-indigo-600 border-b border-slate-50 mb-1 py-2.5 uppercase tracking-wide">All Groups</SelectItem>
                                <SelectItem value="NONE" className="font-bold text-[13px] text-rose-600 border-b border-slate-50 mb-1 py-2.5 uppercase tracking-wide">Not Assigned</SelectItem>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="font-medium text-[13px] py-2.5 text-slate-600">{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input 
                                placeholder="Search student..." 
                                value={assignmentFilter.searchQuery}
                                onChange={(e) => setAssignmentFilter({...assignmentFilter, searchQuery: e.target.value})}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                className="w-[150px] h-9 pl-8 bg-white border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                        </div>

                        <Button 
                            onClick={handleSearch} 
                            disabled={isSearching}
                            className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white p-0 rounded-lg shadow-md shadow-emerald-100 transition-all shrink-0"
                        >
                            {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="w-4 h-4" />} 
                        </Button>
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-8 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50">
                    <TabsList className="bg-slate-200/20 p-1 rounded-xl h-11 w-fit flex border-none shadow-none">
                        <TabsTrigger value="templates" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Subject Groups</TabsTrigger>
                        <TabsTrigger value="add" onClick={handleCreateTemplate} className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">New Group</TabsTrigger>
                        <TabsTrigger value="assign" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Assign Group</TabsTrigger>
                        <TabsTrigger value="subjects" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Subjects</TabsTrigger>
                        <TabsTrigger value="category" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Group Types</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-6 pr-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Groups :</span>
                            <span className="text-sm font-black text-indigo-600">{templates.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Links :</span>
                            <span className="text-sm font-black text-indigo-600">{assignments.length}</span>
                        </div>
                    </div>
                </div>

                {/* TAB 0: MASTER SUBJECTS */}
                <TabsContent value="subjects" className="space-y-6 outline-none">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Master Subject Repository</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <Search className="h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search repository..." 
                                    value={masterSearchQuery}
                                    onChange={(e) => setMasterSearchQuery(e.target.value)}
                                    className="border-none shadow-none focus-visible:ring-0 h-7 text-xs min-w-[250px] font-bold"
                                />
                            </div>
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <Button size="sm" variant="ghost" onClick={() => setViewMode('grid')} className={`h-8 w-8 p-0 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setViewMode('list')} className={`h-8 w-8 p-0 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List className="h-4 w-4" /></Button>
                            </div>
                            {!isAddingSubject && (
                                <Button onClick={() => { setIsAddingSubject(true); setEditingSubject(null); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                                    <Plus className="h-4 w-4" /> ADD SUBJECT
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* View Content */}
                    {viewMode === 'grid' ? (
                        <>
                            {(isAddingSubject || editingSubject) && (
                                <Card className="bg-slate-50 border-none rounded-[2.5rem] shadow-xl shadow-slate-100/50 animate-in slide-in-from-top-4 duration-300 mb-8 overflow-hidden ring-1 ring-slate-100">
                                    <div className="bg-indigo-600 px-8 py-4 text-white">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            {editingSubject ? 'Update Subject Details' : 'Add New Subject Entry'}
                                        </h4>
                                    </div>
                                    <CardContent className="p-6"> 
                                        <form onSubmit={editingSubject ? handleSubjectSubmit : handleAddToBatch} className="space-y-0">
                                            <div className="flex flex-wrap md:flex-nowrap items-end gap-4">
                                                <div className="flex-[3] min-w-[200px] space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Subject Name</Label>
                                                    <Input name="name" defaultValue={editingSubject?.name} required placeholder="e.g., Mathematics" className="h-12 rounded-xl border-slate-100 bg-white font-black text-sm focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="w-32 space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Code</Label>
                                                    <Input name="code" defaultValue={editingSubject?.code} required placeholder="MATH10" className="h-12 rounded-xl border-slate-100 bg-white font-mono font-bold focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="w-40 space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Format</Label>
                                                    <select name="type" className="flex w-full rounded-xl border border-slate-100 bg-white px-4 py-1 text-xs font-black h-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer" defaultValue={editingSubject?.type || 'Theory'}>
                                                        <option value="Theory">Theory</option>
                                                        <option value="Practical">Practical</option>
                                                    </select>
                                                </div>
                                                <div className="flex-[2] min-w-[160px] space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Group Type</Label>
                                                    <select name="groupType" className="flex w-full rounded-xl border border-slate-100 bg-white px-4 py-1 text-xs font-black h-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer" defaultValue={editingSubject?.groupType || 'Core Subject'}>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto pb-0.5">
                                                    <Button type="button" variant="ghost" onClick={() => { setIsAddingSubject(false); setEditingSubject(null); setBatchSubjects([]); }} className="h-10 px-4 rounded-xl font-black text-slate-400 hover:bg-slate-100 text-[10px] uppercase tracking-widest">
                                                        Cancel
                                                    </Button>
                                                    {editingSubject ? (
                                                        <Button type="submit" className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
                                                            Update
                                                        </Button>
                                                    ) : (
                                                        <Button type="submit" className="h-12 w-12 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center" title="Add to List">
                                                            <Plus className="h-6 w-6" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </form>

                                        {batchSubjects.length > 0 && (
                                            <div className="mt-8 pt-8 border-t border-slate-100/50">
                                                <div className="flex items-center justify-between mb-4 px-2">
                                                    <h5 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Batch Buffer ({batchSubjects.length} Entries)</h5>
                                                    <Button onClick={handleSaveBatch} className="bg-[#4F39F6] hover:bg-[#4F39F6]/90 text-white h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#4F39F6]/20 transition-all active:scale-95">
                                                        COMMIT ALL ENTRIES
                                                    </Button>
                                                </div>
                                                <div className="space-y-2 overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-50">
                                                                <th className="text-left py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                                                                <th className="text-left py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Code</th>
                                                                <th className="text-left py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Group</th>
                                                                <th className="text-left py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Format</th>
                                                                <th className="text-right py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batchSubjects.map((s, idx) => (
                                                                <tr key={idx} className="border-b border-slate-50/50 hover:bg-white transition-colors animate-in slide-in-from-left-2 duration-300">
                                                                    <td className="py-3 px-4 font-black text-slate-700 uppercase">{s.name}</td>
                                                                    <td className="py-3 px-4 font-mono text-[10px] text-indigo-600 font-bold">{s.code}</td>
                                                                    <td className="py-3 px-4">
                                                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight">{s.groupType}</span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-slate-400 font-bold uppercase text-[9px]">{s.type}</td>
                                                                    <td className="py-3 px-4 text-right">
                                                                        <Button onClick={() => removeFromBatch(idx)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {allSubjects
                                    .filter(s => s.name.toLowerCase().includes(masterSearchQuery.toLowerCase()) || s.code.toLowerCase().includes(masterSearchQuery.toLowerCase()))
                                    .map((subject, idx) => {
                                        const type = (subject.groupType || '').toLowerCase();
                                        let currentStyle = "bg-slate-50/50 border-slate-100 hover:border-slate-400 hover:border-b-slate-500 shadow-slate-50";
                                        
                                        if (type.includes('core')) currentStyle = "bg-emerald-100 border-emerald-200 hover:border-emerald-400 hover:border-b-emerald-500 shadow-emerald-50";
                                        else if (type.includes('language')) currentStyle = "bg-indigo-100 border-indigo-200 hover:border-indigo-400 hover:border-b-indigo-500 shadow-indigo-50";
                                        else if (type.includes('elective')) currentStyle = "bg-amber-100 border-amber-200 hover:border-amber-400 hover:border-b-amber-500 shadow-amber-50";
                                        else if (type.includes('optional')) currentStyle = "bg-cyan-100 border-cyan-200 hover:border-cyan-400 hover:border-b-cyan-500 shadow-cyan-50";

                                        const cat = categories.find(c => c.name === subject.groupType);
                                        const hex = cat ? (COLOR_MAP[cat.color as keyof typeof COLOR_MAP] || COLOR_MAP.indigo) : '#94a3b8';

                                        return (
                                            <div key={subject.id} className={`group relative ${currentStyle} border rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between min-h-[100px] border-b-[4px]`}>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-mono text-[8px] font-black uppercase tracking-wider text-slate-400 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                            {subject.code}
                                                        </span>
                                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); setIsAddingSubject(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Edit2 className="h-3 w-3" /></Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}><Trash2 className="h-3 w-3" /></Button>
                                                        </div>
                                                    </div>
                                                    <h4 className="font-black text-slate-900 text-[11px] uppercase leading-tight tracking-tight line-clamp-2">
                                                        {subject.name}
                                                    </h4>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ borderColor: `${hex}40`, backgroundColor: `${hex}10`, color: hex }}>
                                                        {subject.groupType === 'Core Subject' ? 'Mandatory' : (subject.groupType || 'Unset')}
                                                    </span>
                                                    <span className="text-[7px] font-black text-slate-800 uppercase tracking-widest">{subject.type}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {allSubjects.length === 0 && (
                                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-300 bg-slate-50/30 flex flex-col items-center gap-4">
                                        <BookOpen className="h-12 w-12 opacity-20" />
                                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">No subjects found in repository</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-100">
                                        <GripVertical className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-slate-900 tracking-[0.1em]">List Reordering</h3>
                                        <p className="text-[10px] font-bold text-slate-400 italic">Drag rows to arrange. Reflects globally.</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleSaveOrder} 
                                    disabled={isSavingOrder}
                                    className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3"
                                >
                                    {isSavingOrder ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-5 w-5" />}
                                    Save New Order
                                </Button>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                                <DragDropContext onDragEnd={handleRepositoryDragEnd}>
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="w-10 py-6 pl-8"></TableHead>
                                                <TableHead className="w-[35%] py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Entry Name</TableHead>
                                                <TableHead className="w-[15%] py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID Code</TableHead>
                                                <TableHead className="w-[20%] py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Subject Group</TableHead>
                                                <TableHead className="w-[15%] py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Format</TableHead>
                                                <TableHead className="text-right py-6 pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <Droppable droppableId="list-repository">
                                            {(provided) => (
                                                <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                                                    {isAddingSubject && (
                                                        <TableRow className="bg-indigo-50/40 hover:bg-indigo-50/60 border-b border-indigo-100 transition-colors">
                                                            <TableCell className="pl-8"></TableCell>
                                                            <TableCell colSpan={5} className="p-4">
                                                                <form onSubmit={handleAddToBatch} className="flex flex-wrap items-center gap-3">
                                                                    <div className="flex-1 min-w-[200px]">
                                                                        <Input autoFocus name="name" required placeholder="Subject Name" className="bg-white border-indigo-100 focus:border-indigo-500 h-11 rounded-xl font-bold" />
                                                                    </div>
                                                                    <div className="w-[120px]">
                                                                        <Input name="code" required placeholder="Code" className="bg-white border-indigo-100 focus:border-indigo-500 h-11 rounded-xl font-mono font-bold" />
                                                                    </div>
                                                                    <div className="w-[180px]">
                                                                        <select name="groupType" className="flex w-full rounded-xl border border-indigo-100 bg-white px-4 py-1 text-xs h-11 font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                                                            {categories.map(cat => (
                                                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="w-[140px]">
                                                                        <select name="type" className="flex w-full rounded-xl border border-indigo-100 bg-white px-4 py-1 text-xs h-11 font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                                                            <option value="Theory">Theory</option>
                                                                            <option value="Practical">Practical</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-auto pr-4">
                                                                        <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100">
                                                                            <Plus className="h-4 w-4" /> ADD
                                                                        </Button>
                                                                        <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAddingSubject(false); setBatchSubjects([]); }} className="h-11 w-11 p-0 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl">
                                                                            <X className="h-5 w-5" />
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}

                                                    {allSubjects
                                                        .filter(s => s.name.toLowerCase().includes(masterSearchQuery.toLowerCase()) || s.code.toLowerCase().includes(masterSearchQuery.toLowerCase()))
                                                        .map((subject, index) => (
                                                            <Draggable key={subject.id} draggableId={subject.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <TableRow 
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        className={`group border-b border-slate-50 transition-all ${snapshot.isDragging ? 'bg-white shadow-2xl z-50 ring-2 ring-indigo-500/20' : 'hover:bg-slate-50/50'}`}
                                                                    >
                                                                        <TableCell className="pl-8" {...provided.dragHandleProps}>
                                                                            <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors cursor-grab active:cursor-grabbing" />
                                                                        </TableCell>
                                                                        <TableCell className="font-black text-slate-800 py-5 uppercase tracking-tight">
                                                                            {editingSubject?.id === subject.id ? (
                                                                                <form id={`edit-form-${subject.id}`} onSubmit={handleSubjectSubmit} className="contents">
                                                                                    <Input name="name" defaultValue={subject.name} className="h-10 max-w-[300px] rounded-xl border-indigo-200 font-black uppercase" />
                                                                                </form>
                                                                            ) : subject.name}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {editingSubject?.id === subject.id ? (
                                                                                <Input form={`edit-form-${subject.id}`} name="code" defaultValue={subject.code} className="h-10 w-32 rounded-xl border-indigo-200 font-mono font-bold" />
                                                                            ) : <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500 font-bold border border-slate-200/50">{subject.code}</span>}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {editingSubject?.id === subject.id ? (
                                                                                <select form={`edit-form-${subject.id}`} name="groupType" defaultValue={subject.groupType} className="h-10 rounded-xl border border-indigo-200 text-xs font-black px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                                                                    {categories.map(cat => (
                                                                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                (() => {
                                                                                    const cat = categories.find(c => c.name === subject.groupType);
                                                                                    const hex = cat ? (COLOR_MAP[cat.color as keyof typeof COLOR_MAP] || COLOR_MAP.indigo) : '#94a3b8';
                                                                                    
                                                                                    return (
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border whitespace-nowrap" style={{ borderColor: `${hex}40`, backgroundColor: `${hex}10`, color: hex }}>
                                                                                            {subject.groupType === 'Core Subject' ? 'Mandatory' : (subject.groupType || 'N/A')}
                                                                                        </span>
                                                                                    );
                                                                                })()
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {editingSubject?.id === subject.id ? (
                                                                                <select form={`edit-form-${subject.id}`} name="type" defaultValue={subject.type} className="h-10 rounded-xl border border-indigo-200 text-xs font-black px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                                                                    <option value="Theory">Theory</option>
                                                                                    <option value="Practical">Practical</option>
                                                                                </select>
                                                                            ) : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subject.type}</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-right pr-8">
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                {editingSubject?.id === subject.id ? (
                                                                                    <>
                                                                                        <Button type="submit" form={`edit-form-${subject.id}`} size="sm" className="h-10 w-10 p-0 bg-[#4F39F6] hover:bg-[#4F39F6]/90 text-white rounded-xl shadow-lg shadow-[#4F39F6]/20"><Check className="h-5 w-5" /></Button>
                                                                                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSubject(null)} className="h-10 w-10 p-0 text-rose-500 hover:bg-rose-50 rounded-xl"><X className="h-5 w-5" /></Button>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Button size="icon" variant="ghost" className="h-9 w-9 text-indigo-600 hover:bg-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onClick={() => { setEditingSubject(subject); setIsAddingSubject(false); }}><Edit2 className="h-4 w-4" /></Button>
                                                                                        <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteSubject(subject.id)}><Trash2 className="h-4 w-4" /></Button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                    {provided.placeholder}
                                                    {allSubjects.length === 0 && !isAddingSubject && (
                                                        <TableRow><TableCell colSpan={6} className="text-center py-24 text-slate-300 font-black uppercase tracking-[0.2em] italic text-[10px]">No subjects configured in master repository</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            )}
                                        </Droppable>
                                    </Table>
                                </DragDropContext>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* TAB 1: DASHBOARD (Subject Settings) */}
                <TabsContent value="templates" className="space-y-8 outline-none">
                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {templates.map((t, idx) => {
                                    const getSubjectNames = (ids: string[]) => {
                                        return ids
                                            .map(id => allSubjects.find(s => s.id === id))
                                            .filter(Boolean)
                                            .sort((a, b) => {
                                                const idxA = allSubjects.findIndex(s => s.id === a?.id);
                                                const idxB = allSubjects.findIndex(s => s.id === b?.id);
                                                return idxA - idxB;
                                            })
                                            .map(s => s?.name);
                                    };
                                    const coreSubjects = getSubjectNames(t.coreSubjects);
                                    const langGroups = t.languageGroups.map(lg => ({ name: lg.name, subjects: getSubjectNames(lg.subjects) }));
                                    const electives = t.electiveGroups.map(eg => ({ name: eg.name, subjects: getSubjectNames(eg.subjects) }));
                                    const optionals = t.optionalGroups.map(og => ({ name: og.name, subjects: getSubjectNames(og.subjects) }));
                                    const linkedAllocs = assignments.filter(a => a.templateId === t.id);
                                    const totalStudents = linkedAllocs.reduce((sum, a) => sum + (a.studentIds || []).length, 0);
                                    
                                    // Rotating colors like in Classes Manager
                                    const colorVariants = [
                                        "bg-emerald-100 border-emerald-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100",
                                        "bg-rose-100 border-rose-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100",
                                        "bg-amber-100 border-amber-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100",
                                        "bg-blue-100 border-blue-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100",
                                        "bg-indigo-100 border-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100",
                                        "bg-purple-100 border-purple-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100",
                                    ];
                                    const cardStyle = colorVariants[idx % colorVariants.length];

                                    return (
                                        <Card key={t.id} className={`border shadow-sm rounded-3xl overflow-hidden group hover:border-indigo-300 hover:shadow-lg transition-all duration-500 ${cardStyle}`}>
                                        <CardHeader className="p-4 pb-3 bg-white/60 border-b border-indigo-100/60 flex flex-row items-center justify-between backdrop-blur-sm">
                                            <div>
                                                <CardTitle className="text-sm font-black text-slate-800">{t.name}</CardTitle>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-slate-400 hover:text-indigo-600" 
                                                    onClick={() => {
                                                        setSelectedTemplateForAssign(t.id);
                                                        setActiveTab('assign');
                                                    }}
                                                >
                                                    <Tag className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => handleEditTemplate(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="space-y-4">
                                                {/* Languages */}
                                                {langGroups.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Language</span>
                                                        <div className="grid grid-cols-3 gap-x-4">
                                                            {langGroups.map((lg, idx) => (
                                                                <div key={lg.name} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-black text-indigo-500 uppercase whitespace-nowrap">{lg.name}</span>
                                                                        {idx < langGroups.length - 1 && <span className="text-slate-200 font-normal">|</span>}
                                                                    </div>
                                                                    <div className="text-[11px] font-bold text-slate-600 truncate">
                                                                        {lg.subjects.join(', ') || '—'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Core */}
                                                <div className="space-y-1 pt-2 border-t border-slate-50">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Core</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[11px] font-bold text-slate-700">{coreSubjects.join(' | ')}</span>
                                                    </div>
                                                </div>

                                                {/* Electives & Optionals Inline */}
                                                {( (electives.length > 0 && electives[0].subjects.length > 0) || (optionals.length > 0 && optionals[0].subjects.length > 0) ) && (
                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                                        {/* Electives */}
                                                        <div>
                                                            {electives.length > 0 && electives[0].subjects.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Elective</span>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                                        {electives.map((eg, idx) => (
                                                                            <div key={eg.name} className="space-y-0.5">
                                                                                {electives.length > 1 && (
                                                                                    <span className="text-[8px] font-black text-amber-500 uppercase block">{eg.name}</span>
                                                                                )}
                                                                                <div className="text-[10px] font-bold text-slate-600 line-clamp-2">
                                                                                    {eg.subjects.join(', ') || '—'}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1 opacity-40">
                                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Elective</span>
                                                                    <div className="text-[10px] font-bold text-slate-300 italic">None</div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Optionals */}
                                                        <div className="border-l border-slate-100/50 pl-4">
                                                            {optionals.length > 0 && optionals[0].subjects.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block mb-1">Optional</span>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                                        {optionals.map((og, idx) => (
                                                                            <div key={og.name} className="space-y-0.5">
                                                                                {optionals.length > 1 && (
                                                                                    <span className="text-[8px] font-black text-cyan-500 uppercase block">{og.name}</span>
                                                                                )}
                                                                                <div className="text-[10px] font-bold text-slate-600 line-clamp-2">
                                                                                    {og.subjects.join(', ') || '—'}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1 opacity-40">
                                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Optional</span>
                                                                    <div className="text-[10px] font-bold text-slate-300 italic">None</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>

                                        {/* Linked Classes Footer */}
                                        <div className={`px-4 py-3 border-t border-slate-200/70 ${linkedAllocs.length > 0 ? 'bg-indigo-50/40' : 'bg-slate-50/40'}`}>
                                            {linkedAllocs.length > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-1.5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                                            Linked Classes
                                                        </span>
                                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                            {totalStudents} Students
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {linkedAllocs.map(a => (
                                                            <span key={a.id} className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-white border border-indigo-100 text-indigo-600 px-2 py-1 rounded-lg shadow-sm">
                                                                {a.className}
                                                                {a.section && <span className="text-indigo-300">·</span>}
                                                                {a.section && <span className="text-indigo-400">{a.section}</span>}
                                                                <span className="text-[8px] text-indigo-300 font-bold ml-0.5">({(a.studentIds || []).length})</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-300 tracking-widest">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                                    No classes linked yet
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                            {templates.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                                    <h3 className="text-lg font-black text-slate-400">No Groups Found</h3>
                                    <Button onClick={() => setActiveTab('add')} className="mt-4 bg-indigo-600">Create New</Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                                <Button variant="ghost" onClick={() => { setIsEditing(false); setActiveTemplate(null); }} className="text-xs font-black uppercase tracking-widest"><ChevronRight className="h-4 w-4 rotate-180 mr-2" /> Back</Button>
                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">Editing: {activeTemplate?.name}</span>
                            </div>
                            {renderBuilder()}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: ADD */}
                <TabsContent value="add" className="outline-none">
                    {activeTemplate && activeTemplate.id.startsWith('temp_') ? renderBuilder() : (
                        <div className="py-32 text-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem]">
                            <Plus className="h-12 w-12 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-slate-800">Initialize New Subject Group</h3>
                            <Button onClick={handleCreateTemplate} className="mt-8 bg-indigo-600 h-14 px-10 rounded-2xl font-black">GET STARTED</Button>
                        </div>
                    )}
                </TabsContent>

                {/* TAB 3: ASSIGNMENTS */}
                <TabsContent value="assign" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="lg:col-span-3 space-y-6">
                            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl sticky top-8">
                                <CardHeader className="bg-indigo-600 text-white rounded-t-3xl">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 py-1">
                                        <Tag className="h-4 w-4" /> ASSIGN CLASS
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Selected Subject Group</Label>
                                        <Select value={selectedTemplateForAssign} onValueChange={setSelectedTemplateForAssign}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-white font-medium text-sm text-slate-600">
                                                <SelectValue placeholder="Select Group" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                {templates.map(t => <SelectItem key={t.id} value={t.id} className="font-medium text-sm py-2.5 text-slate-600">{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Live Subject Preview */}
                                    {selectedTemplateForAssign && (() => {
                                        const t = templates.find(t => t.id === selectedTemplateForAssign);
                                        if (!t) return null;
                                        const getNames = (ids: string[]) => ids.map(id => allSubjects.find(s => s.id === id)?.name).filter(Boolean) as string[];
                                        const langGroups = t.languageGroups.map(g => ({ name: g.name, subjects: getNames(g.subjects) })).filter(g => g.subjects.length > 0);
                                        const core = getNames(t.coreSubjects);
                                        const elective = getNames(t.electiveGroups.flatMap(g => g.subjects));
                                        const optional = getNames(t.optionalGroups.flatMap(g => g.subjects));
                                        const hasContent = langGroups.length > 0 || core.length > 0 || elective.length > 0 || optional.length > 0;
                                        if (!hasContent) return (
                                            <div className="bg-slate-50 rounded-2xl p-4 text-center text-xs font-black uppercase text-slate-300 tracking-widest animate-in fade-in duration-300">
                                                No subjects configured
                                            </div>
                                        );
                                        return (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 px-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Group Subjects Preview</span>
                                                </div>
                                                <div className={cn(
                                                    "rounded-2xl p-4 space-y-4 border transition-colors duration-500",
                                                    [
                                                        'bg-indigo-50/50 border-indigo-100/50',
                                                        'bg-emerald-50/50 border-emerald-100/50',
                                                        'bg-amber-50/50 border-amber-100/50',
                                                        'bg-rose-50/50 border-rose-100/50',
                                                        'bg-blue-50/50 border-blue-100/50',
                                                        'bg-orange-50/50 border-orange-100/50',
                                                        'bg-purple-50/50 border-purple-100/50',
                                                    ][templates.findIndex(temp => temp.id === t.id) % 7]
                                                )}>
                                                    {langGroups.length > 0 && (
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-1.5">
                                                                <div className="h-1 w-3 bg-indigo-400 rounded-full" /> Languages
                                                            </span>
                                                            <div className="space-y-1.5">
                                                                {langGroups.map(g => (
                                                                    <div key={g.name} className="flex items-start gap-2">
                                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mt-0.5 whitespace-nowrap min-w-[36px]">{g.name.replace('Language ', 'L')}:</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {g.subjects.map(s => (
                                                                                <span key={s} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md leading-snug">{s}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {core.length > 0 && (
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase text-[#4F39F6] tracking-widest flex items-center gap-1.5">
                                                                <div className="h-1 w-3 bg-[#4F39F6] rounded-full" /> Core
                                                            </span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {core.map(s => <span key={s} className="text-[10px] font-bold bg-[#4F39F6]/10 text-[#4F39F6] px-2 py-0.5 rounded-md leading-snug">{s}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {elective.length > 0 && (
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
                                                                <div className="h-1 w-3 bg-amber-400 rounded-full" /> Elective
                                                            </span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {elective.map(s => <span key={s} className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md leading-snug">{s}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {optional.length > 0 && (
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase text-cyan-600 tracking-widest flex items-center gap-1.5">
                                                                <div className="h-1 w-3 bg-cyan-500 rounded-full" /> Optional
                                                            </span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {optional.map(s => <span key={s} className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md leading-snug">{s}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}


                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selection Summary</span>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selectedStudentIds.length} Students</span>
                                        </div>
                                        <Button 
                                            onClick={handleAssign} 
                                            disabled={!selectedTemplateForAssign || selectedStudentIds.length === 0}
                                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="h-5 w-5" /> APPLY SETTINGS
                                        </Button>

                                        {Object.keys(pendingAssignments).length > 0 && (
                                            <Button 
                                                onClick={handleSaveAllAssignments} 
                                                className="w-full h-14 bg-[#4F39F6] hover:bg-[#4F39F6]/90 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#4F39F6]/20 transition-all active:scale-95 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2"
                                            >
                                                <Save className="h-5 w-5" /> SAVE ALL CHANGES ({Object.keys(pendingAssignments).length})
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-9 space-y-6">


                            {/* Student Selection Section */}
                            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl bg-white overflow-hidden">
                                <CardContent className="p-0">
                                    {!hasSearched ? (
                                        <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-50/30">
                                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                                <Users className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Select criteria and click search</h3>
                                            <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase tracking-widest">Apply filters above to find students</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-6 bg-white border-b border-slate-50 flex items-center gap-6">
                                                <div className="flex items-center gap-3">
                                                    <Users className="h-4 w-4 text-rose-600" />
                                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest whitespace-nowrap">Student Selection</h3>
                                                </div>
                                                
                                                {(() => {
                                                    const unassignedInView = getFilteredStudents().filter(s => !assignments.some(a => (a.studentIds || []).includes(s.id)));
                                                    const allUnassignedSelected = unassignedInView.length > 0 && unassignedInView.every(s => selectedStudentIds.includes(s.id));
                                                    
                                                    return (
                                                        <div className="flex items-center gap-6 pl-6 border-l border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox 
                                                                    id="select-all" 
                                                                    checked={allUnassignedSelected}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            const newSelected = Array.from(new Set([...selectedStudentIds, ...unassignedInView.map(s => s.id)]));
                                                                            setSelectedStudentIds(newSelected);
                                                                        } else {
                                                                            const unassignedIds = unassignedInView.map(s => s.id);
                                                                            setSelectedStudentIds(selectedStudentIds.filter(id => !unassignedIds.includes(id)));
                                                                        }
                                                                    }}
                                                                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-sm" 
                                                                />
                                                                <Label htmlFor="select-all" className="text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-600 transition-colors">Select All</Label>
                                                            </div>

                                                            <div className="flex items-center gap-2 border-l border-slate-50 pl-6">
                                                                <Checkbox 
                                                                    id="bulk-unassign" 
                                                                    checked={isBulkUnassignMode}
                                                                    onCheckedChange={(val) => {
                                                                        setIsBulkUnassignMode(!!val);
                                                                        if (!val) setSelectedForUnassign([]);
                                                                    }}
                                                                    className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600 shadow-sm" 
                                                                />
                                                                <Label htmlFor="bulk-unassign" className="text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-rose-600 transition-colors">Bulk Edit Assignments</Label>
                                                            </div>

                                                            {selectedForUnassign.length > 0 && (
                                                                <Button 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    onClick={handleBulkRemoveFromGroups}
                                                                    className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100"
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-2" /> Unassign Selected ({selectedForUnassign.length})
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50">
                                                        <TableRow className="border-none hover:bg-transparent">
                                                            <TableHead className="w-12"></TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('admissionNumber')}
                                                            >
                                                                <div className="flex items-center gap-2">Admission No <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('assignedGroup')}
                                                            >
                                                                <div className="flex items-center gap-2">Assigned Group <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('rollNumber')}
                                                            >
                                                                <div className="flex items-center gap-2">Roll No <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('name')}
                                                            >
                                                                <div className="flex items-center gap-2">Student Name <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('className')}
                                                            >
                                                                <div className="flex items-center gap-2">Class/Section <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('gender')}
                                                            >
                                                                <div className="flex items-center gap-2">Gender <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                            <TableHead 
                                                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => requestSort('category')}
                                                            >
                                                                <div className="flex items-center gap-2">Category/RTE <ArrowUpDown className="h-3 w-3" /></div>
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {getFilteredStudents().map((student) => (
                                                            <TableRow key={student.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-all ${selectedStudentIds.includes(student.id) ? 'bg-indigo-50/30' : ''}`}>
                                                                <TableCell className="py-4">
                                                                    {(() => {
                                                                        const isAssigned = assignments.some(a => (a.studentIds || []).includes(student.id));
                                                                        return !isAssigned ? (
                                                                            <Checkbox 
                                                                                checked={selectedStudentIds.includes(student.id)}
                                                                                onCheckedChange={() => {
                                                                                    const current = [...selectedStudentIds];
                                                                                    const idx = current.indexOf(student.id);
                                                                                    if (idx > -1) current.splice(idx, 1);
                                                                                    else current.push(student.id);
                                                                                    setSelectedStudentIds(current);
                                                                                }}
                                                                                className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-sm transition-all"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-4 h-4 flex items-center justify-center">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#4F39F6]/30" />
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-500 uppercase py-4">{student.admissionNumber}</TableCell>
                                                                <TableCell className="py-4">
                                                                    {(() => {
                                                                        const alloc = assignments.find(a => (a.studentIds || []).includes(student.id));
                                                                        const template = templates.find(t => t.id === alloc?.templateId);
                                                                        return template ? (
                                                                            <span className={`group/pill inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border transition-all ${isBulkUnassignMode ? 'bg-rose-50 text-rose-600 border-rose-100 ring-2 ring-rose-50' : 'bg-[#4F39F6]/10 text-[#4F39F6] border-[#4F39F6]/20'}`}>
                                                                                {isBulkUnassignMode ? (
                                                                                    <Checkbox 
                                                                                        checked={selectedForUnassign.includes(student.id)}
                                                                                        onCheckedChange={() => {
                                                                                            const current = [...selectedForUnassign];
                                                                                            const idx = current.indexOf(student.id);
                                                                                            if (idx > -1) current.splice(idx, 1);
                                                                                            else current.push(student.id);
                                                                                            setSelectedForUnassign(current);
                                                                                        }}
                                                                                        className="h-3 w-3 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                                                                    />
                                                                                ) : null}
                                                                                {template.name}
                                                                                {!isBulkUnassignMode && (
                                                                                    <button 
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleRemoveStudentFromGroup(student.id, alloc!.id);
                                                                                        }}
                                                                                        className="hover:text-rose-600 transition-colors"
                                                                                        title="Remove from group"
                                                                                    >
                                                                                        <XCircle className="w-3 h-3 fill-white" />
                                                                                    </button>
                                                                                )}
                                                                            </span>
                                                                        ) : (
                                                                            <Select 
                                                                                value={pendingAssignments[student.id] || '__clear__'} 
                                                                                onValueChange={(val) => {
                                                                                    if (val === '__clear__') {
                                                                                        const next = {...pendingAssignments};
                                                                                        delete next[student.id];
                                                                                        setPendingAssignments(next);
                                                                                    } else {
                                                                                        setPendingAssignments({...pendingAssignments, [student.id]: val});
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className={`h-8 w-[140px] text-[10px] font-black uppercase transition-all ${pendingAssignments[student.id] ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50/50 text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                                                                                    <SelectValue placeholder="—" />
                                                                                </SelectTrigger>
                                                                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                                                    <SelectItem value="__clear__" className="text-[11px] font-bold text-slate-300">Clear</SelectItem>
                                                                                    {templates.map(t => (
                                                                                        <SelectItem key={t.id} value={t.id} className="text-[11px] font-bold text-slate-600 py-2.5">{t.name}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        );
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-black text-rose-600 py-4 uppercase tracking-tighter bg-rose-50/30 px-4 rounded-lg">{student.rollNumber || '—'}</TableCell>
                                                                <TableCell className="text-sm font-black text-slate-700 py-4 uppercase">{student.name}</TableCell>
                                                                <TableCell className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-full w-fit uppercase">{student.className} - {student.section}</TableCell>
                                                                <TableCell className={`text-[10px] font-black uppercase py-4 ${student.gender === 'Female' ? 'text-rose-500' : 'text-blue-500'}`}>{student.gender}</TableCell>
                                                                <TableCell className="text-[10px] font-black text-slate-400 uppercase py-4">{student.category || 'GENERAL'} / {student.rte === 'Yes' ? 'YES' : 'NO'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {getFilteredStudents().length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={7} className="py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest text-xs">
                                                                    No students found matching the criteria
                                                                 </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 4: GROUP TYPES */}
                <TabsContent value="category" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-3">
                            <Card className="border-none shadow-xl shadow-slate-100 rounded-[2.5rem] bg-white ring-1 ring-slate-100">
                                <CardHeader className="bg-slate-900 p-8 text-white rounded-t-[2.5rem]">
                                    <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Layers className="h-5 w-5 text-indigo-400" /> {isEditingCategory ? 'Update' : 'Create'}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <Input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Group Type Name" className="h-14 rounded-xl" />
                                    <div className="grid grid-cols-5 gap-2">
                                        {Object.entries(COLOR_MAP).map(([name, hex]) => (
                                            <button key={name} onClick={() => setCategoryColor(name)} className={`h-8 rounded-lg border-2 ${categoryColor === name ? 'border-slate-900' : 'border-transparent'}`} style={{ backgroundColor: hex }} />
                                        ))}
                                    </div>
                                    <Button onClick={handleCategorySubmit} className="w-full h-14 bg-indigo-600 rounded-xl font-black">{isEditingCategory ? 'UPDATE' : 'CREATE'}</Button>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-9 space-y-3">
                            {categories.map(cat => {
                                const hex = COLOR_MAP[cat.color as keyof typeof COLOR_MAP] || COLOR_MAP.indigo;
                                return (
                                    <div key={cat.id} className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-white transition-all" style={{ borderLeft: `4px solid ${hex}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />
                                            <span className="font-black text-slate-700 text-sm uppercase">{cat.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setIsEditingCategory(cat.id); setCategoryName(cat.name); setCategoryColor(cat.color || 'indigo'); }} className="h-8 w-8 text-slate-400 hover:text-indigo-600"><Edit2 className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)} className="h-8 w-8 text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SubjectItem({ subject, index, compact = false }: { subject: Subject, index: number, compact?: boolean }) {
    const type = (subject.groupType || '').toLowerCase();
    let typeStyle = "bg-slate-50/50 border-slate-100";
    if (type.includes('core')) typeStyle = "bg-emerald-50 border-emerald-100/50";
    else if (type.includes('language')) typeStyle = "bg-indigo-50 border-indigo-100/50";
    else if (type.includes('elective')) typeStyle = "bg-amber-50 border-amber-100/50";
    else if (type.includes('optional')) typeStyle = "bg-cyan-50 border-cyan-100/50";

    return (
        <Draggable draggableId={subject.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        "rounded-2xl border shadow-sm flex items-center gap-3 group transition-all",
                        snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 ring-offset-2 bg-white" : "hover:border-indigo-200 hover:bg-white",
                        compact ? "p-2" : "p-4",
                        typeStyle
                    )}
                >
                    <div className={cn(
                        "rounded-lg flex items-center justify-center transition-colors",
                        compact ? "h-7 w-7" : "h-10 w-10",
                        snapshot.isDragging ? "bg-indigo-50" : "bg-white/50 group-hover:bg-indigo-50"
                    )}>
                        <GripVertical className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-slate-300 group-hover:text-indigo-400`} />
                    </div>
                    <div>
                        <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black text-slate-900 leading-tight`}>{subject.name}</div>
                        <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-800 uppercase tracking-widest`}>{subject.code}</div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}

function GroupContainer({ id, title, subjects, color, height = "min-h-[120px]" }: { id: string, title: string, subjects: Subject[], color: string, height?: string }) {
    return (
        <div className={`flex flex-col rounded-[2rem] border overflow-hidden ${color} transition-all duration-300`}>
            <div className="p-3 border-b border-inherit flex items-center justify-between bg-white/30 backdrop-blur-sm">
                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.15em]">{title}</h4>
                <span className="text-[9px] font-black opacity-40 px-2 py-0.5 rounded-full border border-current">{subjects.length}</span>
            </div>
            <Droppable droppableId={id}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`p-3 transition-all flex flex-col gap-2 overflow-y-auto custom-scrollbar ${height} ${snapshot.isDraggingOver ? 'bg-white/60' : ''}`}
                    >
                        {subjects.map((subject, index) => (
                            <SubjectItem key={subject.id} subject={subject} index={index} compact />
                        ))}
                        {provided.placeholder}
                        {subjects.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center text-[9px] font-black text-slate-300 uppercase tracking-widest italic py-4">Drop here</div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
