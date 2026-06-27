'use client';

import { useState, useEffect } from 'react';
import { StaffFormConfig, SectionConfig } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Zap, Settings, ChevronDown, ChevronUp, Link2, Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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

interface StaffFieldConfigEditorProps {
    initialConfig?: StaffFormConfig[];
    initialSectionSettings?: SectionConfig[];
    onChange: (config: StaffFormConfig[]) => void;
    onSectionSettingsChange: (settings: SectionConfig[]) => void;
}

const FIELD_SECTIONS = [
    'Personal',
    'Employment',
    'Salary',
    'Address',
    'Bank',
    'Experience',
    'Documents',
    'Login'
] as const;

export default function StaffFieldConfigEditor({ initialConfig, initialSectionSettings, onChange, onSectionSettingsChange }: StaffFieldConfigEditorProps) {
    const [config, setConfig] = useState<StaffFormConfig[]>([]);
    const [sectionSettings, setSectionSettings] = useState<SectionConfig[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
    const [newField, setNewField] = useState<Partial<StaffFormConfig>>({
        section: 'Personal',
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
            // Default settings
            setSectionSettings(FIELD_SECTIONS.map(s => ({ sectionName: s, columns: 3 })));
        }
    }, [initialSectionSettings]);

    const handleFieldUpdate = (id: string, updates: Partial<StaffFormConfig>) => {
        const newConfig = config.map(item => {
            if (item.id === id) {
                return { ...item, ...updates };
            }
            return item;
        });
        setConfig(newConfig);
        onChange(newConfig);
    };

    const handleToggle = (id: string, field: 'visible' | 'required' | 'hasAutoManualToggle') => {
        const item = config.find(i => i.id === id);
        if (item) {
            handleFieldUpdate(id, { [field]: !item[field] });
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

        const fieldName = newField.label.toLowerCase().replace(/\s+/g, '');
        const id = `custom_${fieldName}_${Date.now()}`;

        const fieldToAdd: StaffFormConfig = {
            id,
            fieldName,
            label: newField.label,
            section: newField.section as any,
            visible: true,
            required: newField.required || false,
            fieldType: newField.fieldType as any || 'text',
            ...newField
        };

        const updatedConfig = [...config, fieldToAdd];
        setConfig(updatedConfig);
        onChange(updatedConfig);
        setIsAddFieldOpen(false);
        setNewField({
            section: 'Personal',
            label: '',
            visible: true,
            required: false,
            fieldType: 'text'
        });
    };

    const handleDeleteField = (id: string) => {
        if (confirm('Are you sure you want to remove this custom field?')) {
            const updatedConfig = config.filter(f => f.id !== id);
            setConfig(updatedConfig);
            onChange(updatedConfig);
        }
    };

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination } = result;
        const sourceSection = source.droppableId;
        const destSection = destination.droppableId;

        const newConfig = [...config];

        // Find the actual indices in the main config array
        const sectionFields = config.filter(f => f.section === sourceSection);
        const sourceField = sectionFields[source.index];

        if (!sourceField) return;

        // If moving within same section
        if (sourceSection === destSection) {
            const sourceIdx = config.indexOf(sourceField);

            // Temporarily remove from config
            newConfig.splice(sourceIdx, 1);

            // Find where to insert in the main config
            // We need to find the index relative to the DESTINATION section
            // Let's filter the config again to find fields of this section
            const currentSectionFields = newConfig.filter(f => f.section === sourceSection);
            
            // Insert at the correct spot among the same section fields
            let targetIdx;
            if (destination.index >= currentSectionFields.length) {
                // Find last index of this section in newConfig
                const lastIdx = newConfig.findLastIndex(f => f.section === sourceSection);
                targetIdx = lastIdx === -1 ? newConfig.length : lastIdx + 1;
            } else {
                const targetField = currentSectionFields[destination.index];
                targetIdx = newConfig.indexOf(targetField);
            }

            newConfig.splice(targetIdx, 0, sourceField);
        } else {
            // Moving to a different section
            const sourceIdx = config.indexOf(sourceField);
            newConfig.splice(sourceIdx, 1);

            // Update section
            const updatedField = { ...sourceField, section: destSection as any };

            // Find insertion point in destination section
            const destSectionFields = newConfig.filter(f => f.section === destSection);
            let targetIdx;
            if (destination.index >= destSectionFields.length) {
                const lastIdx = newConfig.findLastIndex(f => f.section === destSection);
                targetIdx = lastIdx === -1 ? newConfig.length : lastIdx + 1;
            } else {
                const targetField = destSectionFields[destination.index];
                targetIdx = newConfig.indexOf(targetField);
            }

            newConfig.splice(targetIdx, 0, updatedField);
        }

        setConfig(newConfig);
        onChange(newConfig);
    };

    const filteredFields = config.filter(f =>
        f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 border rounded-[2.5rem] p-6 bg-slate-50 dark:bg-slate-900/50 border-slate-200 shadow-inner">
            <div className="sticky top-6 bg-slate-50 dark:bg-slate-900/50 pt-2 pb-4 z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        Employee Form Configuration
                    </h3>

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
                                    Define a new custom field for the employee registration form.
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
                                        value={newField.section}
                                        onValueChange={(val: string) => setNewField({ ...newField, section: val as any })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Select section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FIELD_SECTIONS.map(s => (
                                                <SelectItem key={s} value={s}>{s} Details</SelectItem>
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
                                            <SelectItem value="toggle">Toggle / Switch</SelectItem>
                                            <SelectItem value="checkbox">Checkbox</SelectItem>
                                            <SelectItem value="textarea">Multi-line Text</SelectItem>
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

                <input
                    type="text"
                    placeholder="Search fields..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Accordion type="multiple" defaultValue={[...FIELD_SECTIONS]} className="space-y-4">
                {FIELD_SECTIONS.map((section) => {
                    const sectionFields = filteredFields.filter(f => f.section === section);
                    if (sectionFields.length === 0 && !searchTerm) return null; // Only hide if no fields and not searching

                    return (
                        <AccordionItem key={section} value={section} className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 text-left">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{section} Details ({sectionFields.length})</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Columns:</span>
                                        {([1, 2, 3, 4] as const).map(cols => (
                                            <span
                                                key={cols}
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSectionColumnChange(section, cols);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.stopPropagation();
                                                        handleSectionColumnChange(section, cols);
                                                    }
                                                }}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${(sectionSettings.find(s => s.sectionName === section)?.columns || 3) === cols
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
                                <Droppable droppableId={section}>
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="space-y-3 min-h-[50px]"
                                        >
                                            {sectionFields.map((field, index) => (
                                                <Draggable key={field.id} draggableId={field.id} index={index}>
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
                                                                onDelete={() => handleDeleteField(field.id)}
                                                                onUpdate={(updates) => handleFieldUpdate(field.id, updates)}
                                                                isCustom={field.id.startsWith('custom_')}
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

function FieldCard({ field, allFields, onToggle, onUpdate, onDelete, isCustom, dragHandleProps }: {
    field: StaffFormConfig;
    allFields: StaffFormConfig[];
    onToggle: (id: string, type: 'visible' | 'required' | 'hasAutoManualToggle') => void;
    onUpdate: (updates: Partial<StaffFormConfig>) => void;
    onDelete: () => void;
    isCustom?: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps | null | undefined;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`rounded-2xl border transition-all group shadow-sm hover:shadow-md overflow-hidden ${field.visible ? 'bg-emerald-100/50 border-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-100'}`}>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                        <GripVertical size={20} />
                    </div>
                    <Switch
                        checked={field.visible}
                        onCheckedChange={() => onToggle(field.id, 'visible')}
                        className="data-[state=checked]:bg-indigo-600"
                        disabled={field.systemRequired}
                    />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${!field.visible ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                                {field.label}
                            </span>
                            {isCustom && (
                                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-purple-50 text-purple-600 border-purple-200">
                                    CUSTOM
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

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${!field.visible ? 'text-slate-200' : 'text-slate-400'}`}>Required</span>
                        <Checkbox
                            checked={field.required}
                            onCheckedChange={() => onToggle(field.id, 'required')}
                            disabled={!field.visible || field.systemRequired}
                            className="rounded-md border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                            disabled={!field.visible}
                        >
                            {isExpanded ? <ChevronUp size={16} /> : <Settings size={16} />}
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
            </div>

            {/* Advanced Settings Panel */}
            {isExpanded && field.visible && (
                <div className="px-4 pb-6 pt-2 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
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
                                    <SelectItem value="toggle">Toggle / Switch</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                    <SelectItem value="textarea">Multi-line Text</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Placeholder</label>
                            <Input
                                placeholder="e.g. Enter value"
                                className="h-9 rounded-xl border-slate-200 bg-white"
                                value={field.placeholder || ''}
                                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Help / Instructions</label>
                            <Input
                                placeholder="Visible below the field (optional)"
                                className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                                value={field.helpText || ''}
                                onChange={(e) => onUpdate({ helpText: e.target.value })}
                            />
                        </div>
                        {field.fieldType === 'select' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Options (comma separated)</label>
                                <Input
                                    placeholder="e.g. Option 1, Option 2"
                                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                                    value={field.options?.join(', ') || ''}
                                    onChange={(e) => onUpdate({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 pl-1 flex items-center gap-1.5">
                            <Link2 size={10} className="animate-pulse" /> Conditional Logic (Visibility Rules)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <span className="text-[9px] font-black text-amber-800/60 pl-1 uppercase tracking-wider">This field depends on...</span>
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
                                    <SelectTrigger className="h-10 rounded-xl border-amber-200 bg-white text-xs font-bold text-amber-900 shadow-sm">
                                        <SelectValue placeholder="Target field" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-amber-100 shadow-xl">
                                        <SelectItem value="none" className="text-[11px] font-bold text-slate-400">Disabled (Always Visible)</SelectItem>
                                        {allFields
                                            .filter(f => f.id !== field.id)
                                            .map(f => (
                                                <SelectItem key={f.id} value={f.fieldName} className="text-[11px] font-bold">
                                                    {f.label} <span className="text-[8px] text-slate-300 ml-1">({f.section})</span>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {field.dependsOn && (
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-black text-amber-800/60 pl-1 uppercase tracking-wider">Show only when value is...</span>
                                    <Input
                                        className="h-10 rounded-xl border-amber-200 bg-white text-xs font-bold text-amber-900 shadow-sm"
                                        placeholder="e.g. Yes / Active / Male"
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
