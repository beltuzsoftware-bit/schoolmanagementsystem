'use client';

import { useState, useEffect } from 'react';
import { StudentFormConfig, SectionConfig } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Settings, ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

interface StudentProfileFieldConfigEditorProps {
    initialConfig?: StudentFormConfig[];
    initialSectionSettings?: SectionConfig[];
    onChange: (config: StudentFormConfig[]) => void;
    onSectionSettingsChange: (settings: SectionConfig[]) => void;
}

const SECTION_KEY = 'Overview'; // Student profile is simpler, usually one main list of sections

export default function StudentProfileFieldConfigEditor({ initialConfig, initialSectionSettings, onChange, onSectionSettingsChange }: StudentProfileFieldConfigEditorProps) {
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
        }
    }, [initialConfig]);

    const handleFieldUpdate = (fieldName: string, updates: Partial<StudentFormConfig>) => {
        const newConfig = config.map(item => {
            if (item.fieldName === fieldName) {
                return { ...item, ...updates };
            }
            return item;
        });
        setConfig(newConfig);
        onChange(newConfig);
    };

    const handleToggle = (fieldName: string, field: 'visible' | 'required') => {
        const item = config.find(i => i.fieldName === fieldName);
        if (item) {
            handleFieldUpdate(fieldName, { [field]: !item[field] });
        }
    };

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const newConfig = [...config];
        const [reorderedItem] = newConfig.splice(result.source.index, 1);
        newConfig.splice(result.destination.index, 0, reorderedItem);

        setConfig(newConfig);
        onChange(newConfig);
    };

    const filteredFields = config.filter(f =>
        f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 border rounded-[2.5rem] p-6 bg-slate-50 dark:bg-slate-900/50 border-slate-200 shadow-inner">
            <div className="bg-slate-50 dark:bg-slate-900/50 pt-2 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        Profile Section Control
                    </h3>
                </div>

                <input
                    type="text"
                    placeholder="Search sections..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="profile-sections">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3"
                        >
                            {filteredFields.map((field, index) => (
                                <Draggable key={field.fieldName} draggableId={field.fieldName} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`${snapshot.isDragging ? 'opacity-80' : 'opacity-100'}`}
                                        >
                                            <div className={`rounded-2xl border transition-all group shadow-sm hover:shadow-md overflow-hidden ${field.visible ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center justify-between p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                                                            <GripVertical size={20} />
                                                        </div>
                                                        <Switch
                                                            checked={field.visible}
                                                            onCheckedChange={() => handleToggle(field.fieldName, 'visible')}
                                                            className="data-[state=checked]:bg-indigo-600"
                                                        />
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-sm font-bold ${!field.visible ? 'text-slate-400' : 'text-slate-900'}`}>
                                                                    {field.label}
                                                                </span>
                                                                {field.fieldName === 'feeSummary' && (
                                                                    <Badge variant="outline" className="text-[9px] h-5 bg-amber-50 text-amber-700 border-amber-200 uppercase font-black">Requires: Fees Module</Badge>
                                                                )}
                                                                {field.fieldName === 'attendanceStats' && (
                                                                    <Badge variant="outline" className="text-[9px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-black">Requires: Attendance Module</Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{field.fieldName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <div className="p-6 bg-indigo-600 rounded-3xl text-white mt-10 shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-2 font-black text-xs uppercase tracking-widest opacity-80">
                    <Settings size={14} /> Profile Display Logic
                </div>
                <p className="text-sm font-medium leading-relaxed">
                    Enable or disable sections in the Student Identity Dossier. Drag to reorder.
                </p>
            </div>
        </div>
    );
}
