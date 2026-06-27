'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    BookOpen, 
    Languages, 
    Layers, 
    CheckCircle2, 
    UserCircle2, 
    Trash2, 
    Plus, 
    Save, 
    ArrowRight,
    Users,
    Zap,
    Info,
    Search,
    ChevronDown,
    X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---

interface SubjectProfile {
    id: string;
    name: string;
    l1: string;
    l2: string;
    l3: string;
    electives: string[];
}

interface StudentMock {
    id: string;
    name: string;
    rollNo: string;
    className: string;
    sectionName: string;
    l1: string;
    l2: string;
    l3: string;
    electives: string[];
}

// --- MOCK DATA ---

const CLASSES = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const INITIAL_SUBJECTS = ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French'];
const INITIAL_ELECTIVES = ['Computer Science', 'Physical Education', 'Arts', 'Music', 'Geography'];

const MOCK_STUDENTS: StudentMock[] = [
    { id: '1', name: 'Aarav Sharma', rollNo: '101', className: 'Class 5', sectionName: 'A', l1: '', l2: '', l3: '', electives: [] },
    { id: '2', name: 'Ishita Roy', rollNo: '102', className: 'Class 5', sectionName: 'A', l1: '', l2: '', l3: '', electives: [] },
    { id: '3', name: 'Kabir Das', rollNo: '103', className: 'Class 5', sectionName: 'A', l1: '', l2: '', l3: '', electives: [] },
    { id: '4', name: 'Meera Sen', rollNo: '104', className: 'Class 6', sectionName: 'B', l1: '', l2: '', l3: '', electives: [] },
    { id: '5', name: 'Rohan Bose', rollNo: '105', className: 'Class 6', sectionName: 'B', l1: '', l2: '', l3: '', electives: [] },
];

export default function SubjectManagerTestPage() {
    // --- STATE ---
    const [languages, setLanguages] = useState<string[]>(INITIAL_SUBJECTS);
    const [electivesPool, setElectivesPool] = useState<string[]>(INITIAL_ELECTIVES);
    
    const [profiles, setProfiles] = useState<SubjectProfile[]>([
        { id: 'p1', name: 'English Main Group', l1: 'English', l2: 'Hindi', l3: 'Bengali', electives: ['Computer Science'] },
        { id: 'p2', name: 'Bengali Main Group', l1: 'Bengali', l2: 'English', l3: 'Hindi', electives: ['Arts'] },
    ]);

    const [students, setStudents] = useState<StudentMock[]>(MOCK_STUDENTS);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filters
    const [selectedClass, setSelectedClass] = useState('Class 5');
    const [selectedSection, setSelectedSection] = useState('A');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newProfile, setNewProfile] = useState<Partial<SubjectProfile>>({
        name: '',
        l1: '',
        l2: '',
        l3: '',
        electives: []
    });

    // --- ACTIONS ---

    const handleCreateProfile = () => {
        if (!newProfile.name || !newProfile.l1) {
            toast.error("Please provide at least a name and First Language");
            return;
        }
        const profile: SubjectProfile = {
            id: `p-${Date.now()}`,
            name: newProfile.name!,
            l1: newProfile.l1!,
            l2: newProfile.l2 || 'None',
            l3: newProfile.l3 || 'None',
            electives: newProfile.electives || []
        };
        setProfiles([...profiles, profile]);
        setShowModal(false);
        setNewProfile({ name: '', l1: '', l2: '', l3: '', electives: [] });
        toast.success("New Subject Group Created!");
    };

    const toggleStudentSelection = (id: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    const selectAll = (filteredOnes: StudentMock[]) => {
        if (selectedStudentIds.size === filteredOnes.length && filteredOnes.length > 0) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredOnes.map(s => s.id)));
        }
    };

    const applyProfileToSelected = (profile: SubjectProfile) => {
        if (selectedStudentIds.size === 0) {
            toast.error("Please select students first");
            return;
        }

        setStudents(prev => prev.map(s => {
            if (selectedStudentIds.has(s.id)) {
                return {
                    ...s,
                    l1: profile.l1,
                    l2: profile.l2,
                    l3: profile.l3,
                    electives: profile.electives
                };
            }
            return s;
        }));

        toast.success(`Applied "${profile.name}" to ${selectedStudentIds.size} students`);
        setSelectedStudentIds(new Set());
    };

    const updateIndividualLanguage = (studentId: string, rank: 'l1' | 'l2' | 'l3', value: string) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [rank]: value } : s));
    };

    // --- RENDER HELPERS ---

    const filteredStudents = students.filter(s => {
        const matchesClass = s.className === selectedClass && s.sectionName === selectedSection;
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo.includes(searchQuery);
        return matchesClass && matchesSearch;
    });

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 pb-20 animate-in fade-in duration-700 relative">
            
            {/* Modal Overlay for Creating Group */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <Card className="w-full max-w-xl rounded-[2.5rem] shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300">
                        <CardHeader className="bg-indigo-600 p-8 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Create Subject Group</CardTitle>
                                    <CardDescription className="text-indigo-100 font-medium mt-1">Define a preset combination of languages and electives.</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 rounded-full">
                                    <X size={24} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Group Name</label>
                                <Input 
                                    placeholder="e.g. Science Batch - English Medium" 
                                    className="h-12 rounded-2xl bg-slate-50 border-none font-bold"
                                    value={newProfile.name}
                                    onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">L1</label>
                                    <select 
                                        className="w-full h-12 bg-slate-50 rounded-2xl px-4 font-bold outline-none"
                                        value={newProfile.l1}
                                        onChange={(e) => setNewProfile({...newProfile, l1: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">L2</label>
                                    <select 
                                        className="w-full h-12 bg-slate-50 rounded-2xl px-4 font-bold outline-none"
                                        value={newProfile.l2}
                                        onChange={(e) => setNewProfile({...newProfile, l2: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">L3</label>
                                    <select 
                                        className="w-full h-12 bg-slate-50 rounded-2xl px-4 font-bold outline-none"
                                        value={newProfile.l3}
                                        onChange={(e) => setNewProfile({...newProfile, l3: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <Button onClick={() => setShowModal(false)} variant="ghost" className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400">Cancel</Button>
                                <Button onClick={handleCreateProfile} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">
                                    Create Group Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                            <BookOpen size={24} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Subject Selection POC</h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-14">Test the flow of assigning 1st, 2nd, and 3rd languages to students.</p>
                </div>
                
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 animate-bounce-subtle">
                    <div className="h-10 w-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <Zap size={20} fill="white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Proof of Concept Mode</p>
                        <p className="text-sm font-bold text-emerald-800">Changes here are for testing only.</p>
                    </div>
                </div>
            </div>

            {/* Class Selection Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                    <Users size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Select Target:</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        className="h-12 bg-slate-50 border-none rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                        className="h-12 bg-slate-50 border-none rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                    >
                        {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-50 border-none text-indigo-600 font-bold px-3 py-1.5 rounded-xl">
                        {filteredStudents.length} Students found
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* LEFT COLUMN: Setup & Profiles */}
                <div className="xl:col-span-1 space-y-8">
                    {/* Subject Profiles */}
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                        <CardHeader className="bg-indigo-600 text-white">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Subject Group Profiles
                            </CardTitle>
                            <CardDescription className="text-indigo-100 text-[10px] font-medium">Apply combinations in one click.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {profiles.map(profile => (
                                <div 
                                    key={profile.id} 
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-300 transition-all cursor-pointer"
                                    onClick={() => applyProfileToSelected(profile)}
                                >
                                    <h5 className="font-black text-slate-700 text-sm mb-2 group-hover:text-indigo-600 transition-colors">{profile.name}</h5>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 font-bold uppercase">L1</span>
                                            <span className="font-black text-slate-600">{profile.l1}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 font-bold uppercase">L2</span>
                                            <span className="font-black text-slate-600">{profile.l2}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 font-bold uppercase">L3</span>
                                            <span className="font-black text-slate-600">{profile.l3}</span>
                                        </div>
                                    </div>
                                    <Button className="w-full mt-4 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm rounded-xl font-black text-[10px] uppercase tracking-widest h-8">
                                        Apply to Selected
                                    </Button>
                                </div>
                            ))}
                            <Button 
                                onClick={() => setShowModal(true)}
                                className="w-full rounded-xl bg-slate-800 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-12 shadow-lg"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Group
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Language Pool Info */}
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-slate-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Available Subjects</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {languages.map(lang => (
                                    <Badge key={lang} variant="secondary" className="px-3 py-1.5 rounded-xl bg-white text-slate-600 border border-slate-100 font-bold text-[9px] uppercase">
                                        {lang}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Batch Assignment Table */}
                <div className="xl:col-span-3 space-y-6">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <CardHeader className="p-8 bg-white border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <Users className="w-6 h-6 text-indigo-500" />
                                    Student Subject Assignment
                                </CardTitle>
                                <CardDescription className="font-medium text-indigo-600">{selectedClass} - Section {selectedSection}</CardDescription>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <Input 
                                        placeholder="Search by name or roll..." 
                                        className="pl-11 pr-4 h-12 w-[300px] rounded-2xl bg-slate-50 border-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-indigo-100 font-medium text-sm transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    onClick={() => selectAll(filteredStudents)}
                                    variant="outline" 
                                    className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                                >
                                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="p-6 text-left w-[60px]"></th>
                                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Student</th>
                                            <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">1st Language</th>
                                            <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">2nd Language</th>
                                            <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">3rd Language</th>
                                            <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Electives</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center">
                                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                                        <Search size={48} strokeWidth={1} />
                                                        <p className="font-black text-xs uppercase tracking-[0.3em]">No students found for this class</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map(student => (
                                                <tr 
                                                    key={student.id} 
                                                    className={cn(
                                                        "transition-all duration-300 group",
                                                        selectedStudentIds.has(student.id) ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
                                                    )}
                                                >
                                                    <td className="p-6">
                                                        <div 
                                                            onClick={() => toggleStudentSelection(student.id)}
                                                            className={cn(
                                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                                                                selectedStudentIds.has(student.id) 
                                                                    ? "bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200" 
                                                                    : "border-slate-200 bg-white"
                                                            )}
                                                        >
                                                            {selectedStudentIds.has(student.id) && <CheckCircle2 size={14} strokeWidth={3} />}
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs border border-white shadow-sm overflow-hidden">
                                                                {student.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 text-sm tracking-tight">{student.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll: {student.rollNo}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* L1 Selection */}
                                                    <td className="p-6">
                                                        <select 
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                                                            value={student.l1}
                                                            onChange={(e) => updateIndividualLanguage(student.id, 'l1', e.target.value)}
                                                        >
                                                            <option value="">Select L1</option>
                                                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* L2 Selection */}
                                                    <td className="p-6">
                                                        <select 
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                                                            value={student.l2}
                                                            onChange={(e) => updateIndividualLanguage(student.id, 'l2', e.target.value)}
                                                        >
                                                            <option value="">Select L2</option>
                                                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* L3 Selection */}
                                                    <td className="p-6">
                                                        <select 
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                                                            value={student.l3}
                                                            onChange={(e) => updateIndividualLanguage(student.id, 'l3', e.target.value)}
                                                        >
                                                            <option value="">Select L3</option>
                                                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* Electives */}
                                                    <td className="p-6 text-center">
                                                        <div className="flex flex-wrap justify-center gap-1.5 max-w-[200px] mx-auto">
                                                            {student.electives.length > 0 ? student.electives.map(e => (
                                                                <Badge key={e} className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">
                                                                    {e}
                                                                </Badge>
                                                            )) : (
                                                                <span className="text-[10px] text-slate-300 italic font-medium">None set</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                    <Info size={16} />
                                </div>
                                <p className="text-xs font-medium text-slate-500">
                                    <span className="font-black text-slate-800">Note:</span> First select the **Class** and **Section**, then apply your **Subject Groups**.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="ghost" className="rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-rose-500">
                                    Clear All
                                </Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 rounded-[1.5rem] font-black text-sm tracking-tight shadow-xl shadow-indigo-100 flex items-center gap-3">
                                    <Save size={20} />
                                    Save Selections
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
