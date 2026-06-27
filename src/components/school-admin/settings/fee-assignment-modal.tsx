'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeeDiscount, FeeReminder, MONTHS } from '@/types/fees';
import { Student, School } from '@/types';
import { getStudents } from '@/app/actions';
import { Tag, Users, Calendar, Search, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../confirmation-modal';
import SelectCriteriaFilter from './fees/select-criteria-filter';
import StudentSelectionGrid from './fees/student-selection-grid';
import { INITIAL_SECTIONS } from '@/lib/student-constants';

interface FeeAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: FeeDiscount | FeeReminder;
    type: 'discount' | 'reminder';
    school: School;
    onSave: (updatedItem: any) => void;
}

export default function FeeAssignmentModal({
    isOpen,
    onClose,
    item,
    type,
    school,
    onSave
}: FeeAssignmentModalProps) {
    const [config, setConfig] = useState<any>(item);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConfig(item);
            setSelectedStudentIds(item.studentIds || []);
            loadStudents();
        }
    }, [item, isOpen]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await getStudents(school.id);
            setAllStudents(data);
            setSearchResults([]); // Start fresh
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
        onClose();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl bg-white">
                    <DialogHeader className="p-8 border-b bg-white flex flex-row items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
                                <Tag className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black text-red-600 tracking-tight uppercase">Assignment Workspace</DialogTitle>
                                <DialogDescription className="sr-only">Assign students to {config.name}</DialogDescription>
                                <p className="text-slate-500 text-sm font-medium mt-0.5">Find and manage student assignments for <span className="text-red-600 font-bold">{config.name}</span>.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-red-200 text-red-700 px-4 py-1.5 rounded-full font-bold bg-red-50">
                                {selectedStudentIds.length} Targeted Students
                            </Badge>
                            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-red-600 hover:bg-red-50 font-bold">Close</Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4">
                        {/* Search & Results Panel */}
                        <div className="lg:col-span-3 border-r bg-white flex flex-col overflow-hidden">
                                <div className="p-6 border-b bg-slate-50/30">
                                    <SelectCriteriaFilter 
                                        classes={school.classes || []} 
                                        sections={INITIAL_SECTIONS} 
                                        onSearch={handleSearch} 
                                    />
                                </div>

                                <ScrollArea className="flex-1 p-6 bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                                            <Users className="w-4 h-4 text-red-600" />
                                            Student Selection
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-medium italic">Select a class or use the search bar above to see the list of students.</p>
                                    </div>
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
                                </ScrollArea>
                            </div>

                            {/* Frequency & Summary Panel */}
                            <div className="bg-slate-50/50 flex flex-col overflow-hidden border-l">
                                <Tabs defaultValue="months" className="flex flex-col h-full">
                                    <div className="p-4 border-b shrink-0 bg-white">
                                        <TabsList className="w-full bg-slate-100 p-1">
                                            <TabsTrigger value="months" className="flex-1 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-red-600 data-[state=active]:text-white">Frequency</TabsTrigger>
                                            <TabsTrigger value="summary" className="flex-1 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-red-600 data-[state=active]:text-white">Summary</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <ScrollArea className="flex-1 p-5">
                                        <TabsContent value="months" className="m-0 space-y-6">
                                            <div className="flex flex-col gap-1 mb-1">
                                                <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-red-600" />
                                                    Assign Months
                                                </h3>
                                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Which months should this {type} apply to?</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                {MONTHS.map((month, index) => (
                                                    <Button 
                                                        key={month}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const current = config.months || [];
                                                            const updated = current.includes(index) ? current.filter((m: number) => m !== index) : [...current, index];
                                                            setConfig({ ...config, months: updated });
                                                        }}
                                                        className={`h-10 rounded-xl font-bold transition-all justify-start px-3 gap-2 text-[11px] ${config.months?.includes(index) ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' : 'border-slate-200 hover:border-red-300 bg-white'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${config.months?.includes(index) ? 'bg-red-600' : 'bg-slate-300'}`} />
                                                        {month}
                                                    </Button>
                                                ))}
                                            </div>

                                            <div className="pt-4">
                                                <Button 
                                                    variant="secondary" 
                                                    className="w-full font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100"
                                                    onClick={() => setConfig({...config, months: [0,1,2,3,4,5,6,7,8,9,10,11]})}
                                                >
                                                    Select All Months
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="summary" className="m-0 space-y-4">
                                            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                                                <div>
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assignment Target</Label>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{config.name}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div>
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Students</Label>
                                                        <p className="text-lg font-black text-red-600">{selectedStudentIds.length}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Months</Label>
                                                        <p className="text-lg font-black text-red-600">{config.months?.length || 0}</p>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-slate-100 italic text-[11px] text-slate-400">
                                                    Saving will apply this {type} to the selected records. This can be modified later.
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </ScrollArea>

                                    <div className="p-6 mt-auto bg-white border-t space-y-3 shrink-0">
                                        <Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 h-12 text-base font-bold shadow-xl shadow-red-100 transition-all active:scale-95 flex items-center gap-2 text-white">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                            Save Assignment
                                            <ChevronRight className="w-4 h-4 ml-auto text-white/70" />
                                        </Button>
                                        <p className="text-[10px] text-center text-slate-400 font-medium">Verify all selections before saving.</p>
                                    </div>
                                </Tabs>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

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
        </>
    );
}
