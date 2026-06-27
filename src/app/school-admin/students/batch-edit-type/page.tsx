'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Search, 
    CheckSquare, 
    Square, 
    Save, 
    ArrowRight, 
    Users,
    AlertCircle,
    UserCheck,
    History
} from 'lucide-react';
import { toast } from 'sonner';
import { getSchools, searchStudents, batchUpdateStudentTypes } from '@/app/actions';
import { School, Student } from '@/types';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function BatchEditStudentTypePage() {
    const [school, setSchool] = useState<School | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    // Filters
    const [selectedClass, setSelectedClass] = useState('Select');
    const [selectedSection, setSelectedSection] = useState('Select');
    const [keyword, setKeyword] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({
        class: 'Select',
        section: 'Select',
        keyword: ''
    });
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchSchool();
    }, []);

    const fetchSchool = async () => {
        setLoading(true);
        try {
            const storedUser = localStorage.getItem('kummi_user');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);
            const schools = await getSchools();
            const mySchool = schools.find((s: School) => s.id === user.schoolId);
            if (mySchool) {
                setSchool(mySchool);
            }
        } catch (error) {
            console.error('Failed to fetch school:', error);
            toast.error('Failed to load school data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (mode: 'class' | 'keyword') => {
        if (!school) return;
        
        let filters: any = {};
        if (mode === 'class') {
            if (selectedClass === 'Select') {
                toast.error('Please select at least a Class to search');
                return;
            }
            filters = { className: selectedClass, section: selectedSection === 'Select' ? 'all' : selectedSection };
            setAppliedFilters({ class: selectedClass, section: selectedSection, keyword: '' });
            setKeyword('');
        } else {
            if (!keyword.trim()) {
                toast.error('Please enter a keyword to search');
                return;
            }
            filters = { keyword: keyword.trim() };
            setAppliedFilters({ class: 'Select', section: 'Select', keyword: keyword.trim() });
            setSelectedClass('Select');
            setSelectedSection('Select');
        }

        setSearching(true);
        setSelectedIds([]);
        try {
            const results = await searchStudents(school.id, filters);
            setStudents(results as Student[]);
            if (results.length === 0) {
                toast.info('No students found for the selected criteria');
            }
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Failed to fetch students');
        } finally {
            setSearching(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === students.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(students.map(s => s.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchUpdate = async (type: 'new' | 'old') => {
        if (!school || selectedIds.length === 0) return;
        
        setSaving(true);
        try {
            const res = await batchUpdateStudentTypes(school.id, selectedIds, type);
            if (res.success) {
                toast.success(`Successfully updated ${res.count} students to "${type}" type`);
                // Update local state to reflect changes
                setStudents(prev => prev.map(s => 
                    selectedIds.includes(s.id) ? { ...s, studentType: type } : s
                ));
                setSelectedIds([]);
            } else {
                toast.error('Failed to update students');
            }
        } catch (error) {
            console.error('Batch update failed:', error);
            toast.error('An error occurred during bulk update');
        } finally {
            setSaving(false);
        }
    };

    if (!isMounted) return null;

    const classes = (school as any)?.classes || INITIAL_CLASS_SETUPS;
    const sections = (school as any)?.sections || INITIAL_SECTIONS;

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Users className="h-8 w-8 text-indigo-600" />
                        Batch Student Type Editor
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Bulk update student status to 'New' or 'Old' for accurate fee calculations.
                    </p>
                </div>
            </div>

            {/* FILTER BAR - "Select Criteria" Replica */}
            <Card className="shadow-sm border-t-2 border-t-indigo-600 rounded-2xl overflow-hidden mb-8">
                <CardContent className="p-5 pt-3">
                    <h2 className="text-lg text-slate-800 font-bold mb-3 mt-0">Select Criteria</h2>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* Filter by Class & Section (GREEN REPLICA) */}
                        <div className="bg-green-50/70 border border-green-200 rounded-xl p-5 w-full" onKeyDown={(e) => { if (e.key === 'Enter') handleSearch('class'); }}>
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 min-w-0 w-full">
                                    <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Class <span className="text-rose-500">*</span></Label>
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {classes.map((c: any) => (
                                                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Classes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 min-w-0 w-full">
                                    <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Section</Label>
                                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                                        <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {sections.map((s: string) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Sections</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    onClick={() => handleSearch('class')} 
                                    disabled={searching || !school}
                                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(37,99,235,0.25)] shrink-0 transition-all w-full sm:w-auto"
                                >
                                    {searching ? (
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" /> Search</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Search by Keyword (INDIGO REPLICA) */}
                        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 w-full">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 min-w-0 w-full">
                                    <Label className="text-sm mb-1.5 block text-indigo-900 font-extrabold h-5">Search By Keyword</Label>
                                    <Input 
                                        placeholder="Name, Roll No, Admission ID..." 
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSearch('keyword');
                                        }}
                                        className="w-full h-12 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-sm font-semibold"
                                    />
                                </div>
                                <Button 
                                    onClick={() => handleSearch('keyword')} 
                                    disabled={searching || !school}
                                    className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] shrink-0 transition-all w-full sm:w-auto"
                                >
                                    {searching ? (
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" /> Search</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Selection & Actions Bar - Sticky */}
            {students.length > 0 && (
                <div className="sticky top-20 z-20 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6 ml-2">
                            <div 
                                onClick={toggleSelectAll}
                                className="flex items-center gap-3 cursor-pointer group"
                            >
                                <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/20">
                                    {selectedIds.length === students.length ? (
                                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                                    ) : selectedIds.length > 0 ? (
                                        <div className="h-2 w-2 rounded-sm bg-indigo-400" />
                                    ) : (
                                        <Square className="h-4 w-4 text-slate-500" />
                                    )}
                                </div>
                                <span className="text-sm font-bold">Select All ({students.length})</span>
                            </div>
                            
                            <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
                            
                            <div className="text-sm font-bold text-indigo-400">
                                {selectedIds.length} Selected
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                disabled={selectedIds.length === 0 || saving}
                                onClick={() => handleBatchUpdate('new')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-6 font-black h-11 text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all"
                            >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Mark as NEW
                            </Button>
                            <Button
                                disabled={selectedIds.length === 0 || saving}
                                onClick={() => handleBatchUpdate('old')}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl px-6 font-black h-11 text-xs uppercase tracking-widest shadow-lg shadow-amber-900/20 transition-all"
                            >
                                <History className="mr-2 h-4 w-4" />
                                Mark as OLD
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Students List */}
            <div className="grid grid-cols-1 gap-4">
                {students.length > 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="overflow-x-auto font-sans">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="hover:bg-transparent border-none">
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none text-center w-20">Select</th>
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none">Admission No</th>
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none">Student Name</th>
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none">Class & Section</th>
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none">Enrolled Session</th>
                                        <th className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none">Current Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.map((student) => {
                                        const isSelected = selectedIds.includes(student.id);
                                        return (
                                            <tr 
                                                key={student.id} 
                                                className={`group transition-all hover:bg-slate-50/50 cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                                onClick={() => toggleSelect(student.id)}
                                            >
                                                <td className="px-6 py-4 text-center border-b border-slate-50">
                                                    <div className={`h-6 w-6 rounded-lg mx-auto flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                                                        {isSelected && <CheckSquare className="h-4 w-4" />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50">
                                                    <span className="text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg uppercase">
                                                        {student.admissionNumber}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">Roll No: {student.rollNumber || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-700">{student.className}</span>
                                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                        <span className="text-sm font-bold text-slate-500">{student.section}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50">
                                                    <span className="text-sm font-medium text-slate-600">{student.enrolledSession}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50">
                                                    {student.studentType ? (
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg tracking-widest ${
                                                            student.studentType === 'new' 
                                                                ? 'bg-emerald-100 text-emerald-700' 
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {student.studentType}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 italic">No Override</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : !searching && (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">
                        <Users className="h-16 w-16 mb-6 opacity-20" />
                        <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest">No Students Displayed</h3>
                        <p className="text-sm mt-1">Select filters above and click search to load students.</p>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex gap-4 animate-in slide-in-from-bottom-2 duration-700">
                <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-1">About Student Type Manual Override</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Fees are calculated based on whether a student is 'New' or 'Old'. By default, the system checks if the student's enrollment session matches the current session. Use this tool to manually override this logic for specific students (e.g., old students who were imported in the current session).
                    </p>
                </div>
            </div>
        </div>
    );
}
