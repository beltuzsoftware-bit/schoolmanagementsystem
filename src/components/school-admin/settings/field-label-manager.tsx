'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Save, RotateCcw, Search, Layout, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, GripVertical, FileText, Calendar, Hash, Type, Grip } from "lucide-react";
import { StudentFormConfig } from "@/types";
import { getAdmissionFormConfigForSchool, updateSchoolAdmissionFieldOverride, reorderSchoolAdmissionFields, resetSchoolAdmissionFields, setSchoolAdmissionFormToAdvanced } from "@/app/actions";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface FieldLabelManagerProps {
    schoolId: string;
}

export default function FieldLabelManager({ schoolId }: FieldLabelManagerProps) {
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [applyingAdvanced, setApplyingAdvanced] = useState(false);
    useEffect(() => {
        fetchConfig();
    }, [schoolId]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await getAdmissionFormConfigForSchool(schoolId);
            setConfig(res.config);
        } catch (error) {
            toast.error("Failed to load field configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (fieldName: string, updates: Partial<StudentFormConfig>) => {
        setSaving(fieldName);
        try {
            const res = await updateSchoolAdmissionFieldOverride(schoolId, fieldName, updates);
            if (res.success) {
                setConfig(prev => prev.map(f => f.fieldName === fieldName ? { ...f, ...updates } : f));
                if (updates.label) toast.success(`Label updated`);
            } else {
                toast.error("Failed to update setting");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(null);
        }
    };

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        
        const { source, destination } = result;
        const sectionName = source.droppableId;
        
        // Reordering within the same section only (as fields are grouped by section in the UI)
        if (source.index === destination.index) return;

        // Get the fields for this section
        const sectionFields = config.filter(f => (f.sectionName || "General / Others") === sectionName);
        
        // Reorder the section fields
        const newSectionFields = [...sectionFields];
        const [movedField] = newSectionFields.splice(source.index, 1);
        newSectionFields.splice(destination.index, 0, movedField);

        // Update the full config
        const newConfig = config.map(f => {
            if ((f.sectionName || "General / Others") === sectionName) {
                // Find matching index in newSectionFields
                const originalIdx = sectionFields.findIndex(sf => sf.fieldName === f.fieldName);
                // This is a bit complex in a map, better to rebuild the array
                return f;
            }
            return f;
        });

        // Better way to rebuild the config maintaining section grouping
        const fieldNamesInOrder: string[] = [];
        const uniqueSections = Array.from(new Set(config.map(f => f.sectionName || "General / Others")));
        
        uniqueSections.forEach(s => {
            if (s === sectionName) {
                newSectionFields.forEach(f => fieldNamesInOrder.push(f.fieldName));
            } else {
                config.filter(f => (f.sectionName || "General / Others") === s).forEach(f => fieldNamesInOrder.push(f.fieldName));
            }
        });

        // Optimistic UI update
        const reorderedConfig = fieldNamesInOrder.map(name => config.find(f => f.fieldName === name)!);
        setConfig(reorderedConfig);

        try {
            const res = await reorderSchoolAdmissionFields(schoolId, fieldNamesInOrder);
            if (res.success) {
                toast.success("Order updated");
            } else {
                fetchConfig(); // Revert
                toast.error("Failed to save new order");
            }
        } catch (e) {
            fetchConfig(); // Revert
            toast.error("Error saving new order");
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset ALL field labels, visibility, and order to platform defaults? This action cannot be undone.")) return;
        
        setResetting(true);
        try {
            const res = await resetSchoolAdmissionFields(schoolId);
            if (res.success) {
                toast.success("Field configuration reset to defaults");
                fetchConfig();
            } else {
                toast.error("Failed to reset configuration");
            }
        } catch (error) {
            toast.error("An error occurred while resetting");
        } finally {
            setResetting(false);
        }
    };

    const handleSetAdvanced = async () => {
        if (!confirm("This will enable ALL 120+ fields in the admission form and restore the advanced sequence. This is recommended for full form control. Continue?")) return;
        
        setApplyingAdvanced(true);
        try {
            const res = await setSchoolAdmissionFormToAdvanced(schoolId);
            if (res.success) {
                toast.success("Advanced Form Mode Applied!");
                fetchConfig();
            } else {
                toast.error("Failed to apply advanced mode");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setApplyingAdvanced(false);
        }
    };

    const groupedFields = config.reduce((acc, field) => {
        const section = field.sectionName || "General / Others";
        if (!acc[section]) acc[section] = [];
        acc[section].push(field);
        return acc;
    }, {} as Record<string, StudentFormConfig[]>);

    const filteredSections = Object.entries(groupedFields).map(([section, fields]) => {
        const filtered = fields.filter(f => 
            f.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            f.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { section, fields: filtered };
    }).filter(s => s.fields.length > 0);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Settings2 className="w-10 h-10 mb-4 animate-spin opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Loading Field Configuration...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Warning / Info Banner */}
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex gap-4 items-start">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <Layout size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Terminology Customization</h4>
                    <p className="text-xs text-indigo-700/80 mt-1 font-medium leading-relaxed">
                        Adjust these labels to match your school's specific terminology. <b>Drag the handles</b> on the left to rearrange field order.
                    </p>
                </div>
            </div>

            {/* Search bar & Default Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search fields by label or system name..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleReset} 
                        disabled={resetting || loading || applyingAdvanced}
                        className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-2 group"
                    >
                        <RotateCcw size={14} className={cn("group-hover:rotate-[-120deg] transition-transform", resetting && "animate-spin")} />
                        {resetting ? 'Resetting...' : 'Reset to Default'}
                    </Button>
                    <Button 
                        onClick={handleSetAdvanced} 
                        disabled={resetting || loading || applyingAdvanced}
                        className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-slate-900 text-white shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                    >
                        <Layout size={14} className={applyingAdvanced ? "animate-spin" : ""} />
                        {applyingAdvanced ? 'Applying...' : 'Apply Advanced Form (All Fields)'}
                    </Button>
                </div>
            </div>

            {/* Fields Listing */}
            <DragDropContext onDragEnd={handleOnDragEnd}>
                <div className="space-y-12">
                    {filteredSections.map(({ section, fields }) => (
                        <div key={section} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">{section}</h3>
                                <div className="h-[1px] w-full bg-slate-200" />
                            </div>
                            
                            <Droppable droppableId={section}>
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="flex flex-col gap-3 min-h-[50px]"
                                    >
                                        {fields.map((field, idx) => {
                                            const isDate = field.fieldName.toLowerCase().includes('date');
                                            const isFile = field.fieldName.toLowerCase().includes('file') || field.fieldName.toLowerCase().includes('photo');
                                            const isNumber = field.fieldName.toLowerCase().includes('no') || field.fieldName.toLowerCase().includes('amount') || field.fieldName.toLowerCase().includes('number');

                                            return (
                                                <Draggable key={field.fieldName} draggableId={field.fieldName} index={idx}>
                                                    {(provided, snapshot) => (
                                                        <div 
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={cn(
                                                                "relative group flex items-center gap-4 p-2 pl-4 bg-white border border-slate-200 rounded-[1.5rem] transition-all duration-300",
                                                                snapshot.isDragging ? "shadow-2xl border-indigo-400 z-50 scale-[1.02] bg-indigo-50/10" : "hover:shadow-lg hover:border-indigo-200",
                                                                !field.visible && !snapshot.isDragging && "bg-slate-50/50 border-dashed border-slate-300"
                                                            )}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            {/* Drag/Sort Handle */}
                                                            <div 
                                                                {...provided.dragHandleProps}
                                                                className="flex items-center justify-center shrink-0 h-10 w-8 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 transition-colors"
                                                            >
                                                                <div className="h-8 w-6 flex items-center justify-center rounded-lg hover:bg-indigo-50 transition-all">
                                                                    <GripVertical size={20} />
                                                                </div>
                                                            </div>

                                                            {/* Field Icon & Identity */}
                                                            <div className={cn(
                                                                "flex items-center gap-3 min-w-0 flex-1",
                                                                !field.visible && "opacity-40"
                                                            )}>
                                                                <div className={cn(
                                                                    "h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm",
                                                                    field.visible ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-slate-200 text-slate-500"
                                                                )}>
                                                                    {isDate ? <Calendar size={18} /> : 
                                                                    isFile ? <FileText size={18} /> : 
                                                                    isNumber ? <Hash size={18} /> : <Type size={18} />}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                            {field.fieldName}
                                                                        </span>
                                                                        {field.required && field.visible && (
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" title="Mandatory Field" />
                                                                        )}
                                                                    </div>
                                                                    <input
                                                                        defaultValue={field.label}
                                                                        placeholder="Enter descriptive label"
                                                                        className={cn(
                                                                            "w-full bg-transparent border-none p-0 h-7 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0 outline-none transition-all",
                                                                            !field.visible && "text-slate-400"
                                                                        )}
                                                                        onBlur={(e) => {
                                                                            if (e.target.value !== field.label && e.target.value.trim() !== "") {
                                                                                handleUpdate(field.fieldName, { label: e.target.value });
                                                                            }
                                                                        }}
                                                                        disabled={saving === field.fieldName}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Toggles Group */}
                                                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50 mr-2">
                                                                {/* Visibility Controller */}
                                                                <div 
                                                                    onClick={() => handleUpdate(field.fieldName, { visible: !field.visible })}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all",
                                                                        field.visible ? "bg-white text-emerald-600 shadow-sm border border-emerald-100" : "text-slate-400 hover:bg-slate-200/50"
                                                                    )}
                                                                >
                                                                    {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                                    <span className="text-[10px] font-black uppercase tracking-tight hidden md:inline">
                                                                        {field.visible ? 'Visible' : 'Hidden'}
                                                                    </span>
                                                                </div>

                                                                {/* Requirement Controller */}
                                                                <div 
                                                                    onClick={() => field.visible && handleUpdate(field.fieldName, { required: !field.required })}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                                                                        !field.visible ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
                                                                        field.required ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-200/50"
                                                                    )}
                                                                >
                                                                    {field.required ? <Lock size={14} /> : <Unlock size={14} />}
                                                                    <span className="text-[10px] font-black uppercase tracking-tight hidden md:inline">
                                                                        Required
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {saving === field.fieldName && (
                                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-[1.5rem] z-[60] transition-all">
                                                                    <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl shadow-xl border border-indigo-100 scale-90">
                                                                        <RotateCcw size={14} className="text-indigo-600 animate-spin" />
                                                                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Applying Changes...</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}

                    {filteredSections.length === 0 && (
                        <div className="py-20 text-center">
                            <p className="text-slate-400 font-bold italic">No fields match your search query.</p>
                        </div>
                    )}
                </div>
            </DragDropContext>
        </div>
    );
}
