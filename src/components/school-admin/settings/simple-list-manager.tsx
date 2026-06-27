import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import ConfirmationModal from '../confirmation-modal';

interface SimpleListManagerProps {
    title: string;
    description?: string;
    items: string[];
    onUpdate: (items: string[]) => void;
    placeholder?: string;
    confirmDeleteMessage?: (item: string) => string;
}

export default function SimpleListManager({
    title,
    description,
    items = [],
    onUpdate,
    placeholder = "Enter new item name",
    confirmDeleteMessage = (item) => `Are you sure you want to delete "${item}"?`
}: SimpleListManagerProps) {
    const [newItemValue, setNewItemValue] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);

    const handleAdd = () => {
        if (!newItemValue.trim()) return;
        onUpdate([...items, newItemValue.trim()]);
        setNewItemValue('');
    };

    const handleSaveEdit = (index: number) => {
        if (!editingValue.trim()) return;
        const newItems = [...items];
        newItems[index] = editingValue.trim();
        onUpdate(newItems);
        setEditingIndex(null);
    };

    const handleDeleteClick = (index: number) => {
        setItemToDeleteIndex(index);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (itemToDeleteIndex === null) return;
        const newItems = items.filter((_, i) => i !== itemToDeleteIndex);
        onUpdate(newItems);
        setDeleteModalOpen(false);
        setItemToDeleteIndex(null);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
            </div>

            <div className="flex-1 flex flex-col bg-white rounded-[1.25rem] border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-100 transition-all duration-300 min-h-[100px]">
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex gap-2 shrink-0">
                    <Input
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        placeholder={placeholder}
                        className="bg-white h-9 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 shadow-sm transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 h-9">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add
                    </Button>
                </div>

                <div className="flex-1">
                    {(!items || items.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 italic">No items added yet.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <li key={index} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                    {editingIndex === index ? (
                                        <div className="flex items-center gap-2 flex-1 mr-4">
                                            <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-9"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(index);
                                                    if (e.key === 'Escape') setEditingIndex(null);
                                                }}
                                            />
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleSaveEdit(index)}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-600" onClick={() => setEditingIndex(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium text-slate-700">{item}</span>
                                            <div className="flex items-center gap-2 transition-opacity">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                                    title="Edit Item"
                                                    onClick={() => {
                                                        setEditingIndex(index);
                                                        setEditingValue(item);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete Item"
                                                    onClick={() => handleDeleteClick(index)}
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
                title="Delete Item"
                message={itemToDeleteIndex !== null ? confirmDeleteMessage(items[itemToDeleteIndex]) : 'Are you sure?'}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                confirmButtonClasses="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            />
        </div>
    );
}
