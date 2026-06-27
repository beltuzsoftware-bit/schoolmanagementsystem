'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Plus, 
    Trash2, 
    GripVertical, 
    Settings, 
    ChevronDown, 
    ChevronUp, 
    Zap,
    Info,
    Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FeeTypeConfig {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    orderIndex: number;
}

interface FeesTypeConfigEditorProps {
    items: string[] | FeeTypeConfig[];
    onUpdate: (items: FeeTypeConfig[]) => void;
}

export default function FeesTypeConfigEditor({ items, onUpdate }: FeesTypeConfigEditorProps) {
    const [config, setConfig] = useState<FeeTypeConfig[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FeeTypeConfig | null>(null);
    const [newType, setNewType] = useState({ name: '' });

    // Initialize/Migrate simple strings to FeeTypeConfig objects
    useEffect(() => {
        if (!items) return;
        
        const migrated: FeeTypeConfig[] = items.map((item, index) => {
            if (typeof item === 'string') {
                const uniqueSuffix = Math.random().toString(36).substring(2, 7);
                return {
                    id: `ft_${Date.now()}_${uniqueSuffix}_${index}`,
                    name: item,
                    code: item.toUpperCase().replace(/\s+/g, '_'),
                    isActive: true,
                    orderIndex: index
                };
            }
            return item;
        }).sort((a, b) => a.orderIndex - b.orderIndex);

        setConfig(migrated);
    }, [items]);

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const newItems = Array.from(config);
        const [reorderedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, reorderedItem);
        
        const finalItems = newItems.map((item, idx) => ({ ...item, orderIndex: idx }));
        setConfig(finalItems);
        onUpdate(finalItems);
    };

    const handleToggleActive = (id: string) => {
        const updated = config.map(item => 
            item.id === id ? { ...item, isActive: !item.isActive } : item
        );
        setConfig(updated);
        onUpdate(updated);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this Fee Type? Existing fee groups using this type may be affected.')) {
            const updated = config.filter(item => item.id !== id).map((item, idx) => ({ ...item, orderIndex: idx }));
            setConfig(updated);
            onUpdate(updated);
        }
    };

    const handleAdd = () => {
        if (!newType.name.trim()) return;
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        const newItem: FeeTypeConfig = {
            id: `ft_${Date.now()}_${uniqueSuffix}`,
            name: newType.name.trim(),
            code: newType.name.trim().toUpperCase().replace(/\s+/g, '_'),
            isActive: true,
            orderIndex: config.length
        };
        const updated = [...config, newItem];
        setConfig(updated);
        onUpdate(updated);
        setNewType({ name: '' });
        setIsAddModalOpen(false);
    };

    const handleUpdate = () => {
        if (!editingItem || !editingItem.name.trim()) return;
        const updated = config.map(item => 
            item.id === editingItem.id ? { ...editingItem, code: editingItem.name.trim().toUpperCase().replace(/\s+/g, '_') } : item
        );
        setConfig(updated);
        onUpdate(updated);
        setEditingItem(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-indigo-600 fill-indigo-100" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Fees Type Arrangement</h3>
                </div>
                
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100">
                            <Plus size={16} className="mr-2" /> Add Fee Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">New Fee Type</DialogTitle>
                            <DialogDescription>Define a new category of fees for your school.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="font-bold">Fee Type Name</Label>
                                <Input 
                                    placeholder="e.g. Computer Lab Fee" 
                                    value={newType.name}
                                    onChange={(e) => setNewType({...newType, name: e.target.value})}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full h-12 font-bold">
                                Create Fee Type
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 rounded-[2.5rem] p-4 min-h-[300px]">
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="fee-types">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                {config.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={cn(
                                                    "bg-white border rounded-2xl shadow-sm transition-all group",
                                                    snapshot.isDragging ? "shadow-xl border-indigo-400 scale-[1.02]" : "border-slate-100 hover:border-slate-200",
                                                    !item.isActive && "opacity-60 bg-slate-50/50"
                                                )}
                                            >
                                                <div className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div {...provided.dragHandleProps} className="text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing p-1">
                                                            <GripVertical size={20} />
                                                        </div>
                                                        <Switch 
                                                            checked={item.isActive} 
                                                            onCheckedChange={() => handleToggleActive(item.id)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                item.isActive ? "text-slate-700" : "text-slate-400 line-through"
                                                            )}>
                                                                {item.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">{item.code}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="h-5 px-2 text-[9px] bg-slate-50 border-slate-200 text-slate-500 font-black">
                                                            ID: {item.id.slice(-6)}
                                                        </Badge>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                            onClick={() => setEditingItem(item)}
                                                        >
                                                            <Settings size={16} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {config.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <Info className="mx-auto mb-2 opacity-20" size={32} />
                                        <p className="text-sm font-medium italic">No fee types defined yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">
                    <strong>Drag and drop</strong> the cards to set the order in which fee types appear on invoices and reports. 
                    Disabled fee types will not be available for creating new fee groups.
                </p>
            </div>

            {/* Edit Modal */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Edit Fee Type</DialogTitle>
                        <DialogDescription>Modify the details of this fee category.</DialogDescription>
                    </DialogHeader>
                    {editingItem && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="font-bold">Fee Type Name</Label>
                                <Input 
                                    value={editingItem.name}
                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full h-12 font-bold">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
