import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudentsForSibling } from '@/app/actions';

interface AddSiblingModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    classes: any[];
    onAdd: (siblingId: string, siblingName: string, className: string, syncSettings: any) => void;
}

import ToggleSwitch from './toggle-switch';

export default function AddSiblingModal({ isOpen, onClose, schoolId, classes, onAdd }: AddSiblingModalProps) {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [localSync, setLocalSync] = useState({ parents: true, address: true, guardian: true });
    
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [availableStudents, setAvailableStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Update available sections when class changes
    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.name === selectedClass);
            setAvailableSections(cls?.sections || []);
            setSelectedSection('');
            setAvailableStudents([]);
            setSelectedStudentId('');
        }
    }, [selectedClass, classes]);

    // Fetch students when class and section are selected
    useEffect(() => {
        const fetchStudents = async () => {
            if (selectedClass && selectedSection) {
                setLoadingStudents(true);
                try {
                    const students = await getStudentsForSibling(schoolId, selectedClass, selectedSection);
                    setAvailableStudents(students);
                } catch (error) {
                    console.error("Failed to fetch students");
                } finally {
                    setLoadingStudents(false);
                }
            } else {
                setAvailableStudents([]);
            }
            setSelectedStudentId('');
        };
        
        fetchStudents();
    }, [selectedClass, selectedSection, schoolId]);

    const handleAdd = () => {
        const student = availableStudents.find(s => s.id === selectedStudentId);
        if (student) {
            // Sibling Name | Class | Section | Roll
            const rollText = student.rollNumber ? ` | Roll: ${student.rollNumber}` : '';
            const displayLabel = `${student.name} | ${selectedClass} | ${selectedSection}${rollText}`;
            onAdd(student.id, displayLabel, selectedClass, localSync);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Users size={16} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Add Sibling</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 text-slate-400 h-8 w-8 transition-colors">
                        <X size={16} />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 pt-4 space-y-5">
                    {/* Selection Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full h-11 px-4 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none bg-white transition-all shadow-sm"
                            >
                                <option value="">Select Class</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Section</label>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedClass}
                                className="w-full h-11 px-4 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none bg-white transition-all shadow-sm disabled:bg-slate-50 disabled:opacity-50"
                            >
                                <option value="">Select Section</option>
                                {availableSections.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Student</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                disabled={!selectedClass || !selectedSection || loadingStudents}
                                className="w-full h-11 px-4 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none bg-white transition-all shadow-sm disabled:bg-slate-50 disabled:opacity-50"
                            >
                                <option value="">{loadingStudents ? 'Loading...' : 'Select Student'}</option>
                                {availableStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sync Settings - Horizontal Layout */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-indigo-100 shadow-sm">
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest">Fast Sync Options</h3>
                                <span className="text-xs font-semibold text-slate-600">(Same as)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8">
                            {[
                                { key: 'parents', label: 'Parents Details' },
                                { key: 'address', label: 'Home Address' },
                                { key: 'guardian', label: 'Guardian Info' }
                            ].map(sync => (
                                <div key={sync.key} className="flex flex-col items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide text-center">{sync.label}</span>
                                    <ToggleSwitch
                                        enabled={!(localSync as any)[sync.key]}
                                        onChange={(val: boolean) => setLocalSync(prev => ({ ...prev, [sync.key]: !val }))}
                                        labelOff="Yes"
                                        labelOn="No"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex justify-end gap-3 items-center">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl h-11 px-6 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAdd}
                        disabled={!selectedStudentId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all disabled:opacity-40"
                    >
                        <UserPlus size={18} />
                        Add & Sync
                    </Button>
                </div>
            </div>
        </div>
    );
}
