'use client';

import { useState, useEffect } from 'react';
import { StudentFormConfig, SectionConfig } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Zap, Settings, ChevronDown, ChevronUp, Link2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EXTRACTED_ADMISSION_FIELDS } from '@/lib/admission-form-constants';

interface AdmissionFieldConfigEditorProps {
    initialConfig?: StudentFormConfig[];
    initialSectionSettings?: SectionConfig[];
    onChange: (config: StudentFormConfig[]) => void;
    onSectionSettingsChange: (settings: SectionConfig[]) => void;
}

const FIELD_SECTIONS = [
    {
        title: 'Admission Details',
        fields: ['admissionNumber', 'registrationNo', 'enrollmentNo', 'apaarId', 'penNo', 'srNo', 'generalRegistrationNo', 'admissionDate', 'stream', 'classAppliedFor', 'enrolledYear', 'enrolledSession', 'className', 'section', 'rollNumber', 'house', 'rte', 'studentType', 'photo', 'firstLanguage', 'secondLanguage', 'thirdLanguage', 'referredBy', 'sibling']
    },
    {
        title: 'Personal Information',
        fields: ['firstName', 'lastName', 'dob', 'gender', 'bloodGroup', 'religion', 'category', 'phone', 'email', 'whatsappNo', 'alternateNumber', 'height', 'weight', 'measurementDate', 'specialNeeds', 'specialNeedsDetails']
    },
    {
        title: 'Parents/Guardian Details',
        fields: ['fatherName', 'fatherOccupation', 'fatherPhone', 'fatherPhoto', 'fatherDocName', 'fatherDocFile', 'motherName', 'motherOccupation', 'motherPhone', 'motherPhoto', 'motherDocName', 'motherDocFile', 'guardianSelection', 'guardianName', 'guardianRelation', 'guardianOccupation', 'guardianPhone', 'guardianPhoto', 'guardianAddress', 'guardianEmail', 'guardianDocName', 'guardianDocFile', 'fatherEmail', 'motherEmail']
    },
    {
        title: 'Address Details',
        fields: ['currentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country', 'permanentAddress', 'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry']
    },
    {
        title: 'Previous Academic Details',
        fields: ['previousSchool', 'previousLastClass', 'affiliatedBoard', 'marksObtained', 'percentageCGPA', 'result', 'tcDate', 'tcNo', 'tcFile']
    },
    {
        title: 'Bank & Govt IDs',
        fields: ['aadhaarNo', 'samagraId', 'bankAccountNo', 'ifscCode', 'bankName', 'accountHolderName']
    },
    {
        title: 'Miscellaneous',
        fields: ['caste', 'nationality']
    },
    {
        title: 'Miscellaneous Documents',
        fields: ['miscDocuments']
    }
];

const ALLOW_AUTO_TOGGLE = ['registrationNo', 'enrollmentNo', 'apaarId', 'penNo', 'srNo', 'generalRegistrationNo', 'rollNumber'];

export default function AdmissionFieldConfigEditor({ initialConfig, initialSectionSettings, onChange, onSectionSettingsChange }: AdmissionFieldConfigEditorProps) {
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [sectionSettings, setSectionSettings] = useState<SectionConfig[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
    const [newField, setNewField] = useState<Partial<StudentFormConfig>>({
        sectionName: 'Personal Information',
        label: '',
        visible: true,
        required: false,
        fieldType: 'text'
    });

    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
        }
    }, [initialConfig]);

    useEffect(() => {
        if (initialSectionSettings && initialSectionSettings.length > 0) {
            setSectionSettings(initialSectionSettings);
        } else {
            // Default to 3 columns if not set
            setSectionSettings(FIELD_SECTIONS.map(s => ({ sectionName: s.title, columns: (s.title === 'Personal Information' ? 4 : 3) as 1 | 2 | 3 | 4 })));
        }
    }, [initialSectionSettings]);

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

    const handleToggle = (fieldName: string, field: 'visible' | 'required' | 'hasAutoManualToggle') => {
        const item = config.find(i => i.fieldName === fieldName);
        if (item) {
            handleFieldUpdate(fieldName, { [field]: !item[field] });
        }
    };

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination } = result;
        const sourceSectionTitle = source.droppableId;
        const destSectionTitle = destination.droppableId;

        const newConfig = [...config];

        // Find the field being moved
        const sectionFields = getFieldsForSection(sourceSectionTitle, FIELD_SECTIONS.find(s => s.title === sourceSectionTitle)?.fields || []);
        const sourceField = sectionFields[source.index];

        if (!sourceField) return;

        // 1. Remove from old position
        const sourceIdx = newConfig.findIndex(f => f.fieldName === sourceField.fieldName);
        newConfig.splice(sourceIdx, 1);

        // 2. Update sectionName if moved to a different section
        const updatedField = { ...sourceField, sectionName: destSectionTitle };

        // 3. Insert into new position
        const destSectionData = FIELD_SECTIONS.find(s => s.title === destSectionTitle);
        const destSectionFields = getFieldsForSection(destSectionTitle, destSectionData?.fields || []);
        
        let targetIdx;
        if (destination.index >= destSectionFields.length) {
            // Find last index of this section in newConfig
            const lastIdx = newConfig.findLastIndex(f => 
                (destSectionData?.fields.includes(f.fieldName)) || f.sectionName === destSectionTitle
            );
            targetIdx = lastIdx === -1 ? newConfig.length : lastIdx + 1;
        } else {
            const targetField = destSectionFields[destination.index];
            targetIdx = newConfig.findIndex(f => f.fieldName === targetField.fieldName);
            if (targetIdx === -1) targetIdx = newConfig.length;
        }

        newConfig.splice(targetIdx, 0, updatedField);
        
        // Update order indices
        const finalConfig = newConfig.map((f, i) => ({ ...f, orderIndex: i }));
        
        setConfig(finalConfig);
        onChange(finalConfig);
    };

    const resetToDefaultSequence = () => {
        if (confirm('This will reset the field sequence to the system default. Custom labels and visibility will be preserved. Proceed?')) {
            const masterMap = new Map(EXTRACTED_ADMISSION_FIELDS.map((f: StudentFormConfig) => [f.fieldName, f]));
            const customFields = config.filter(f => f.fieldName.startsWith('custom_'));
            
            // Re-map to master order
            const resetConfig = EXTRACTED_ADMISSION_FIELDS.map((master: StudentFormConfig) => {
                const existing = config.find(f => f.fieldName === master.fieldName);
                return existing ? { ...master, ...existing, sectionName: master.sectionName } : master;
            });
            
            // Append custom fields at the end
            const finalConfig = [...resetConfig, ...customFields].map((f, i) => ({ ...f, orderIndex: i }));
            
            setConfig(finalConfig);
            onChange(finalConfig);
        }
    };

    const handleSectionColumnChange = (sectionName: string, columns: 1 | 2 | 3 | 4) => {
        const newSettings = sectionSettings.map(s => {
            if (s.sectionName === sectionName) {
                return { ...s, columns };
            }
            return s;
        });
        if (!newSettings.find(s => s.sectionName === sectionName)) {
            newSettings.push({ sectionName, columns });
        }
        setSectionSettings(newSettings);
        onSectionSettingsChange(newSettings);
    };

    const handleAddField = () => {
        if (!newField.label) return;

        const fieldName = `custom_${newField.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        
        const fieldToAdd: StudentFormConfig = {
            fieldName,
            label: newField.label,
            sectionName: newField.sectionName,
            visible: true,
            required: newField.required || false,
            fieldType: newField.fieldType as any || 'text',
            orderIndex: config.length,
            ...newField
        };

        const updatedConfig = [...config, fieldToAdd];
        setConfig(updatedConfig);
        onChange(updatedConfig);
        setIsAddFieldOpen(false);
        setNewField({
            sectionName: 'Personal Information',
            label: '',
            visible: true,
            required: false,
            fieldType: 'text'
        });
    };

    const handleDeleteField = (fieldName: string) => {
        if (confirm('Are you sure you want to remove this custom field?')) {
            const updatedConfig = config.filter(f => f.fieldName !== fieldName);
            setConfig(updatedConfig);
            onChange(updatedConfig);
        }
    };

    const getFieldsForSection = (sectionTitle: string, standardFields: string[]) => {
        return config.filter(f => 
            standardFields.includes(f.fieldName) || 
            f.sectionName === sectionTitle
        ).filter(f => 
            f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    };

    return (
        <div className="space-y-4 border rounded-[2.5rem] px-3 py-6 bg-slate-50 dark:bg-slate-900/50 border-slate-200 shadow-inner">
            <div className="sticky top-6 bg-slate-50 dark:bg-slate-900/50 pt-2 pb-4 z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        Student Admission Form Configuration
                    </h3>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={resetToDefaultSequence}
                            className="rounded-xl border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200"
                        >
                            <Settings size={14} className="mr-2" /> Reset Sequence
                        </Button>
                        <Dialog open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100">
                                <Plus size={16} className="mr-2" /> Add Custom Field
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">Add New Field</DialogTitle>
                                <DialogDescription>
                                    Define a new custom field for the student registration form.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="label" className="font-bold">Field Label</Label>
                                    <Input
                                        id="label"
                                        placeholder="e.g. Alternate Phone"
                                        className="rounded-xl"
                                        value={newField.label}
                                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="section" className="font-bold">Form Section</Label>
                                    <Select
                                        value={newField.sectionName}
                                        onValueChange={(val: string) => setNewField({ ...newField, sectionName: val })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Select section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FIELD_SECTIONS.map(s => (
                                                <SelectItem key={s.title} value={s.title}>{s.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type" className="font-bold">Field Type</Label>
                                    <Select
                                        value={newField.fieldType}
                                        onValueChange={(val: string) => setNewField({ ...newField, fieldType: val as any })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text Input</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="date">Date Picker</SelectItem>
                                            <SelectItem value="select">Dropdown</SelectItem>
                                            <SelectItem value="textarea">Multi-line Text</SelectItem>
                                            <SelectItem value="checkbox">Toggle/Checkbox</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddField} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full h-12">
                                    Create Field
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    </div>
                </div>
                
                <input
                    type="text"
                    placeholder="Search fields..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Accordion type="multiple" defaultValue={FIELD_SECTIONS.map(s => s.title)} className="space-y-4">
                {FIELD_SECTIONS.map((section) => {
                    const fields = getFieldsForSection(section.title, section.fields);
                    if (fields.length === 0 && !searchTerm) return null;

                    return (
                        <AccordionItem key={section.title} value={section.title} className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{section.title} ({fields.length})</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Columns:</span>
                                        {([1, 2, 3, 4] as const).map(cols => (
                                            <span
                                                key={cols}
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSectionColumnChange(section.title, cols);
                                                }}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${(sectionSettings.find(s => s.sectionName === section.title)?.columns || 3) === cols
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                    }`}
                                            >
                                                {cols}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <Droppable droppableId={section.title}>
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="space-y-3 min-h-[50px]"
                                        >
                                            {fields.map((field, index) => (
                                                <Draggable key={field.fieldName} draggableId={field.fieldName} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1
                                                            }}
                                                        >
                                                            <FieldCard
                                                                field={field}
                                                                allFields={config}
                                                                onToggle={handleToggle}
                                                                onDelete={() => handleDeleteField(field.fieldName)}
                                                                onUpdate={(updates) => handleFieldUpdate(field.fieldName, updates)}
                                                                showAutoToggle={ALLOW_AUTO_TOGGLE.includes(field.fieldName)}
                                                                isCustom={field.fieldName.startsWith('custom_')}
                                                                dragHandleProps={provided.dragHandleProps}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </DragDropContext>
        </div>
    );
}

function FieldCard({ field, allFields, onToggle, onUpdate, onDelete, showAutoToggle, isCustom, dragHandleProps }: {
    field: StudentFormConfig;
    allFields: StudentFormConfig[];
    onToggle: (name: string, type: 'visible' | 'required' | 'hasAutoManualToggle') => void;
    onUpdate: (updates: Partial<StudentFormConfig>) => void;
    onDelete: () => void;
    showAutoToggle: boolean;
    isCustom?: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps | null | undefined;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [optionsText, setOptionsText] = useState(field.options?.join(', ') || '');

    useEffect(() => {
        setOptionsText(field.options?.join(', ') || '');
    }, [field.options]);

    return (
        <div className={`rounded-2xl border transition-all group shadow-sm hover:shadow-md overflow-hidden ${
            isExpanded ? 'border-indigo-400 shadow-indigo-100' :
            field.visible ? 'bg-emerald-100/50 border-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-100'
        }`}>
            <div className="flex items-center justify-between px-2.5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                        <GripVertical size={20} />
                    </div>
                    <Switch
                        checked={field.visible}
                        onCheckedChange={() => onToggle(field.fieldName, 'visible')}
                        className="data-[state=checked]:bg-indigo-600"
                    />
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold truncate ${!field.visible ? 'text-slate-300 line-through' : 'text-slate-700'}`} title={field.label}>
                                {field.label}
                            </span>
                            {isCustom && (
                                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-purple-50 text-purple-600 border-purple-200">
                                    CUSTOM
                                </Badge>
                            )}
                            {field.fieldType && field.fieldType !== 'text' && (
                                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-sky-50 text-sky-600 border-sky-200 capitalize">
                                    {field.fieldType}
                                </Badge>
                            )}
                            {field.dependsOn && (
                                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-amber-50 text-amber-600 border-amber-200">
                                    <Link2 size={8} className="mr-0.5" /> CONDITIONAL
                                </Badge>
                            )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{field.fieldName}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {showAutoToggle && field.visible && (
                        <div className="flex items-center gap-2 border-r pr-3 border-slate-100">
                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">Logic</span>
                            <Switch
                                title="Enable Auto/Manual Toggle"
                                checked={field.hasAutoManualToggle}
                                onCheckedChange={() => onToggle(field.fieldName, 'hasAutoManualToggle')}
                                className="scale-75 data-[state=checked]:bg-amber-500"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-tight ${!field.visible ? 'text-slate-200' : 'text-slate-400'}`}>Required</span>
                        <Checkbox
                            checked={field.required}
                            onCheckedChange={() => onToggle(field.fieldName, 'required')}
                            disabled={!field.visible}
                            className="rounded-md border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                    </div>

                    {/* Prominent Edit Button */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                            isExpanded
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        } ${!field.visible ? 'opacity-30 pointer-events-none' : ''}`}
                        disabled={!field.visible}
                    >
                        {isExpanded ? <ChevronUp size={12} /> : <Settings size={12} />}
                        {isExpanded ? 'Close' : 'Edit'}
                    </button>

                    {isCustom && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Edit Panel */}
            {isExpanded && field.visible && (
                <div className="px-4 pb-6 pt-4 border-t-2 border-indigo-200 bg-indigo-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings size={13} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Editing: {field.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Field Type</label>
                            <Select
                                value={field.fieldType || 'text'}
                                onValueChange={(val: string) => onUpdate({ fieldType: val as any })}
                            >
                                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text Input</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date Picker</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="textarea">Multi-line Text</SelectItem>
                                    <SelectItem value="checkbox">Toggle/Checkbox</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Placeholder</label>
                            <Input
                                placeholder="e.g. Enter name"
                                className="h-9 rounded-xl border-slate-200 bg-white"
                                value={field.placeholder || ''}
                                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                            />
                        </div>
                    </div>

                    {field.fieldType === 'select' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Dropdown Options (Comma Separated)</label>
                            <Input
                                placeholder="e.g. Science, Commerce, Arts"
                                className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                                value={optionsText}
                                onChange={(e) => setOptionsText(e.target.value)}
                                onBlur={() => {
                                    const opts = optionsText.split(',').map(s => s.trim()).filter(Boolean);
                                    onUpdate({ options: opts });
                                }}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Help / Instructions</label>
                        <Input
                            placeholder="Visible below the field (optional)"
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                            value={field.helpText || ''}
                            onChange={(e) => onUpdate({ helpText: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 pl-1 flex items-center gap-1.5">
                            <Link2 size={10} /> Conditional Logic (Optional)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-amber-800 pl-1">Field depends on...</span>
                                <Select
                                    value={field.dependsOn?.fieldName || "none"}
                                    onValueChange={(val) => {
                                        if (val === "none") {
                                            onUpdate({ dependsOn: undefined });
                                        } else {
                                            onUpdate({ dependsOn: { fieldName: val, value: field.dependsOn?.value || '' } });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 rounded-lg border-amber-200 bg-white text-xs">
                                        <SelectValue placeholder="Target field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Disabled</SelectItem>
                                        {allFields
                                            .filter(f => f.fieldName !== field.fieldName)
                                            .map(f => (
                                                <SelectItem key={f.fieldName} value={f.fieldName}>{f.label}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {field.dependsOn && (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-amber-800 pl-1">When value equals...</span>
                                    <Input
                                        className="h-8 rounded-lg border-amber-200 bg-white text-xs"
                                        placeholder="e.g. Other"
                                        value={field.dependsOn.value}
                                        onChange={(e) => onUpdate({
                                            dependsOn: {
                                                fieldName: field.dependsOn!.fieldName,
                                                value: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
