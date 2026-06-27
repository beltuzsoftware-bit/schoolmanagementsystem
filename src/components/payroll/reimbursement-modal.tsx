'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ReceiptText, DollarSign } from 'lucide-react';
import { StaffProfile, Reimbursement } from '@/types/staff';
import { User, School } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';

interface ReimbursementModalProps {
    staff: StaffProfile;
    user: User;
    school: School;
    onClose: () => void;
    onUpdate: (staffId: string, reimbursements: Reimbursement[]) => Promise<any>;
}

const ReimbursementModal: React.FC<ReimbursementModalProps> = ({ staff, user, school, onClose, onUpdate }) => {
    const [items, setItems] = useState<Reimbursement[]>(staff.reimbursements || []);
    const [newItem, setNewItem] = useState({ label: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currencySymbol = getCurrencySymbol(school.currency);

    const handleAdd = () => {
        if (!newItem.label || !newItem.amount) return;
        const updated = [...items, { ...newItem, id: Date.now().toString(), amount: parseFloat(newItem.amount) }];
        setItems(updated);
        setNewItem({ label: '', amount: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleRemove = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        let finalItems = [...items];
        if (newItem.label && newItem.amount) {
            finalItems.push({
                id: Date.now().toString(),
                label: newItem.label,
                amount: parseFloat(newItem.amount),
                date: newItem.date
            });
        }
        const res = await onUpdate(staff.id, finalItems);
        if (res?.success) {
            onClose();
        }
        setIsSubmitting(false);
    };

    const total = items.reduce((sum, i) => sum + i.amount, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ReceiptText className="text-indigo-600" size={20} />
                        <h2 className="font-bold text-slate-800">Add Variable Earnings</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Staff: {user.name}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder="Reason (e.g. Travel)"
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newItem.label}
                                onChange={e => setNewItem({ ...newItem, label: e.target.value })}
                            />
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold">{currencySymbol}</span>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newItem.amount}
                                    onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add to List
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {items.length > 0 ? items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                                    <p className="text-[10px] text-slate-400">{item.date}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-emerald-600">{currencySymbol}{item.amount.toLocaleString()}</span>
                                    <button onClick={() => handleRemove(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400 text-xs italic">
                                No extra earnings added yet.
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-right flex-1 pr-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Total Variable</p>
                            <p className="text-xl font-black text-slate-800">{currencySymbol}{total.toLocaleString()}</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            Update Ledger
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReimbursementModal;
