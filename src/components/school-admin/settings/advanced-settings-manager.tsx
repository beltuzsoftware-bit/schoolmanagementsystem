'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus, Settings2, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmationModal from '../confirmation-modal';
import { FeeDiscount, FeeReminder } from '@/types/fees';
import { Badge } from '@/components/ui/badge';

interface AdvancedSettingsManagerProps {
    title: string;
    description?: string;
    items: (FeeDiscount | FeeReminder)[];
    onUpdate: (items: any[]) => void;
    placeholder?: string;
    onAssign: (item: any) => void;
    type: 'discount' | 'reminder';
}

export default function AdvancedSettingsManager({
    title,
    description,
    items,
    onUpdate,
    placeholder = "Enter new name",
    onAssign,
    type
}: AdvancedSettingsManagerProps) {
    const [newItemValue, setNewItemValue] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const handleAdd = () => {
        if (!newItemValue.trim()) return;
        
        const newItem: any = type === 'discount' ? {
            id: `disc_${Date.now()}`,
            name: newItemValue.trim(),
            type: 'FIXED',
            value: 0,
            frequency: 'ONE_TIME',
            assignedClasses: [],
            targetType: 'ALL'
        } : {
            id: `rem_${Date.now()}`,
            name: newItemValue.trim(),
            triggerDays: 0,
            assignedClasses: [],
            targetType: 'ALL'
        };

        onUpdate([...items, newItem]);
        setNewItemValue('');
    };

    const handleSaveEdit = (id: string) => {
        if (!editingValue.trim()) return;
        const newItems = items.map(item => 
            item.id === id ? { ...item, name: editingValue.trim() } : item
        );
        onUpdate(newItems);
        setEditingId(null);
    };

    const confirmDelete = () => {
        if (!itemToDeleteId) return;
        const newItems = items.filter(item => item.id !== itemToDeleteId);
        onUpdate(newItems);
        setDeleteModalOpen(false);
        setItemToDeleteId(null);
    };

    const getStatusBadge = (item: any) => {
        const isAssigned = (item.assignedClasses?.length > 0) || (item.studentIds?.length > 0);
        if (isAssigned) {
            return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 gap-1 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3" /> Assigned</Badge>;
        }
        return <Badge variant="outline" className="text-slate-400 border-slate-200 gap-1 font-bold text-[10px]"><AlertCircle className="w-3 h-3" /> Not Configured</Badge>;
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white rounded-[1.25rem] border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-100 transition-all duration-300 min-h-[100px]">
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex gap-2 shrink-0">
                    <Input
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        placeholder={placeholder}
                        className="bg-white h-10 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 shadow-sm transition-all rounded-xl"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 h-10 rounded-xl px-4">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add New
                    </Button>
                </div>

                <div className="flex-1">
                    {items.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-medium italic">No items created yet.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <li key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                    {editingId === item.id ? (
                                        <div className="flex items-center gap-2 flex-1 mr-4">
                                            <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-10 rounded-lg"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(item.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                            />
                                            <Button size="sm" onClick={() => handleSaveEdit(item.id)} className="bg-emerald-600 hover:bg-emerald-700 h-10 text-white font-bold">Save</Button>
                                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-10 font-bold">Cancel</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{item.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {getStatusBadge(item)}
                                                        {type === 'discount' ? (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase transition-opacity">
                                                                {(item as FeeDiscount).value > 0 ? `${(item as FeeDiscount).value}${(item as FeeDiscount).type === 'PERCENTAGE' ? '%' : ''} OFF` : 'No Value Set'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase transition-opacity">
                                                                {(item as FeeReminder).triggerDays === 0 ? 'On Due Date' : `${Math.abs((item as FeeReminder).triggerDays)}d ${(item as FeeReminder).triggerDays < 0 ? 'Before' : 'After'}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 px-3 gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all font-bold"
                                                    onClick={() => onAssign(item)}
                                                >
                                                    <Settings2 className="w-4 h-4" />
                                                    Assign
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-slate-400 hover:bg-slate-200"
                                                    onClick={() => {
                                                        setEditingId(item.id);
                                                        setEditingValue(item.name);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                                                    onClick={() => {
                                                        setItemToDeleteId(item.id);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Configuration"
                message="Are you sure you want to delete this configuration? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                confirmButtonClasses="bg-rose-600 hover:bg-rose-700"
            />
        </div>
    );
}
