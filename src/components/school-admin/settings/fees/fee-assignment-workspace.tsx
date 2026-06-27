'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeeDiscount, FeeReminder, MONTHS } from '@/types/fees';
import { Student, School } from '@/types';
import { getStudents } from '@/app/actions';
import { Tag, Users, CheckCircle2, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../../confirmation-modal';
import SelectCriteriaFilter from './select-criteria-filter';
import StudentSelectionGrid from './student-selection-grid';
import { INITIAL_SECTIONS } from '@/lib/student-constants';
import { Label } from '@/components/ui/label';

interface FeeAssignmentWorkspaceProps {
    item: FeeDiscount | FeeReminder;
    type: 'discount' | 'reminder';
    school: School;
    onSave: (updatedItem: any) => void;
    onBack: () => void;
}

export default function FeeAssignmentWorkspace({
    item,
    type,
    school,
    onSave,
    onBack
}: FeeAssignmentWorkspaceProps) {
    const [config, setConfig] = useState<any>(item);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        setConfig(item);
        setSelectedStudentIds(item.studentIds || []);
        loadStudents();
    }, [item]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await getStudents(school.id);
            setAllStudents(data);
            if (item.studentIds && item.studentIds.length > 0) {
                const assigned = data.filter((s: Student) => item.studentIds!.includes(s.id));
                setSearchResults(assigned);
            } else {
                setSearchResults([]); 
            }
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (criteria: any) => {
        let filtered = [...allStudents];
        if (criteria.className && criteria.className !== 'Select') {
            filtered = filtered.filter(s => s.className === criteria.className);
        }
        if (criteria.section && criteria.section !== 'Select') {
            filtered = filtered.filter(s => s.section === criteria.section);
        }
        if (criteria.gender && criteria.gender !== 'Select') {
            filtered = filtered.filter(s => s.gender === criteria.gender);
        }
        if (criteria.rte && criteria.rte !== 'Select') {
            filtered = filtered.filter(s => s.rte === criteria.rte);
        }
        if (criteria.category && criteria.category !== 'Select') {
            if (criteria.category === 'SC' || criteria.category === 'ST') {
                filtered = filtered.filter(s => s.category === 'SC' || s.category === 'ST');
            } else {
                filtered = filtered.filter(s => s.category === criteria.category);
            }
        }
        setSearchResults(filtered);
    };

    const handleSave = () => {
        if (selectedStudentIds.length === 0) {
            toast.warning("No students selected for assignment.");
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirmSave = () => {
        onSave({
            ...config,
            studentIds: selectedStudentIds,
            targetType: 'SPECIFIC'
        });
        setConfirmOpen(false);
        onBack();
    };

    const ALL_MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    let startMonth = 0;
    if (school && school.sessionStartMonth != null) {
        if (typeof school.sessionStartMonth === 'string') {
            const idx = ALL_MONTHS.findIndex((m: string) => m.toLowerCase() === (school.sessionStartMonth as unknown as string).toLowerCase().slice(0, m.length));
            startMonth = idx >= 0 ? idx : 0;
        } else {
            startMonth = Number(school.sessionStartMonth) - 1;
            if (isNaN(startMonth)) startMonth = 0;
        }
    }
    
    const sortedMonths = [...(config.months || [])].sort((a, b) => {
        const adjA = (a - startMonth + 12) % 12;
        const adjB = (b - startMonth + 12) % 12;
        return adjA - adjB;
    });

    return (
        <div className="flex flex-col bg-white rounded-2xl border shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
            {/* Redesigned Workspace Header */}
            <div className="p-6 border-b bg-white flex flex-row items-center justify-between shrink-0 sticky top-0 z-10 rounded-t-2xl">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                        <Tag className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-red-600 tracking-tight uppercase">Assignment Workspace</h2>
                        <p className="text-slate-500 text-xs font-semibold">Managing <span className="text-red-600 underline underline-offset-4 decoration-2"> {config.name} </span> for targeted students.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border rounded-full">
                         <Users className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-[11px] font-bold text-slate-600">Selected: <span className="text-red-600">{selectedStudentIds.length}</span></span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {/* Search & Results Panel - Now Full Width and Full Length */}
                <div className="flex-1 flex flex-col">
                    <div className="p-6 border-b bg-slate-50/50 shrink-0">
                        <SelectCriteriaFilter 
                            classes={school.classes || []} 
                            sections={INITIAL_SECTIONS} 
                            onSearch={handleSearch} 
                        />
                    </div>

                    <div className="flex-1 p-6 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-red-600" />
                                Student Selection
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <Info className="w-3 h-3" />
                                All matching students shown below
                            </div>
                        </div>
                        <div className="pb-10">
                            <StudentSelectionGrid 
                                students={searchResults}
                                selectedIds={selectedStudentIds}
                                onToggle={(id) => {
                                    setSelectedStudentIds(prev => 
                                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                    );
                                }}
                                onToggleAll={setSelectedStudentIds}
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Action Footer - Always visible at bottom of container */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_-10px_25px_-10px_rgba(0,0,0,0.1)] z-20 rounded-b-2xl">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        {/* Summary Info */}
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-[10px] items-center font-black uppercase text-slate-400 tracking-wider leading-tight">Selected Students</p>
                                <p className="text-xl font-black text-red-600 leading-tight">{selectedStudentIds.length}</p>
                            </div>
                        </div>

                        {/* Read-only Month Display */}
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 leading-tight">Beneficiary Months</p>
                            <div className="flex flex-wrap gap-1">
                                {sortedMonths.map((mIdx: number) => (
                                    <Badge key={mIdx} variant="secondary" className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold px-1.5 h-5">
                                        {(ALL_MONTHS[mIdx] || 'Month').slice(0, 3).toUpperCase()}
                                    </Badge>
                                ))}
                                {(config.months || []).length === 0 && <span className="text-[10px] italic text-slate-400">No months selected</span>}
                                {(config.months || []).length === 12 && <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-black h-5 uppercase">All Session Months</Badge>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={onBack}
                            className="flex-1 md:flex-none h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                            Back to Settings
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={selectedStudentIds.length === 0}
                            className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 h-11 px-8 text-sm font-bold shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <CheckCircle2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                            Confirm & Save Assignment
                        </Button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmSave}
                title="Confirm Bulk Assignment"
                message={`Are you sure you want to assign ${config.name} to ${selectedStudentIds.length} students?`}
                confirmButtonText="Confirm & Apply"
                cancelButtonText="Review"
                confirmButtonClasses="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}
