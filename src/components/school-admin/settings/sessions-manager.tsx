import React, { useState } from 'react';
import { SessionSetup } from '@/types/student-settings';
import ToggleSwitch from '../toggle-switch';
import SelectInput from '../select-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Check, X, Plus, Calendar } from 'lucide-react';
import ConfirmationModal from '../confirmation-modal';

interface SessionsManagerProps {
    sessions: SessionSetup[];
    onUpdate: (sessions: SessionSetup[]) => void;
    startMonth: number;
    onStartMonthChange: (month: number) => void;
}

const MONTHS: { [key: string]: number } = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
};
const MONTH_NAMES = Object.keys(MONTHS);

export default function SessionsManager({
    sessions,
    onUpdate,
    startMonth,
    onStartMonthChange,
    startType,
    onStartTypeChange,
    startDate,
    onStartDateChange
}: SessionsManagerProps & {
    startType: 'month' | 'date';
    onStartTypeChange: (type: 'month' | 'date') => void;
    startDate: string;
    onStartDateChange: (date: string) => void;
}) {
    const [newSessionName, setNewSessionName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

    const startMonthName = MONTH_NAMES[startMonth - 1];
    const endMonthName = MONTH_NAMES[(startMonth - 2 + 12) % 12];

    // Calculate end date based on start date (assuming 1 year academic session)
    const calculateEndDate = (start: string) => {
        if (!start) return '';
        const d = new Date(start);
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1); // End one day before next year start
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleAddSession = () => {
        if (!newSessionName.trim()) return;
        const newSession: SessionSetup = {
            id: `session-${Date.now()}`,
            name: newSessionName.trim(),
            isActive: sessions.length === 0 // Auto-active if first
        };
        onUpdate([...sessions, newSession]);
        setNewSessionName('');
    };

    const handleEditSave = (id: string) => {
        if (!editingValue.trim()) return;
        onUpdate(sessions.map(s => s.id === id ? { ...s, name: editingValue.trim() } : s));
        setEditingId(null);
    };

    const handleSetActive = (id: string) => {
        onUpdate(sessions.map(s => ({
            ...s,
            isActive: s.id === id
        })));
    };

    const handleDeleteClick = (id: string) => {
        setSessionToDeleteId(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!sessionToDeleteId) return;
        const sessionToDelete = sessions.find(s => s.id === sessionToDeleteId);
        let newSessions = sessions.filter(s => s.id !== sessionToDeleteId);

        // If we deleted the active session, make the first available one active
        if (sessionToDelete?.isActive && newSessions.length > 0) {
            newSessions[0].isActive = true;
        }

        onUpdate(newSessions);
        setDeleteModalOpen(false);
        setSessionToDeleteId(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Global Session Config */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-4 flex-1">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Academic Year Configuration</h3>
                            {/* <p className="text-sm text-slate-500">Define when your new academic year typically starts.</p> */}
                        </div>

                        <div className="space-y-3">
                            {/* Label + Toggle Row */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-slate-700">Session Starts In</span>
                                <ToggleSwitch
                                    enabled={startType === 'date'}
                                    onChange={(val) => onStartTypeChange(val ? 'date' : 'month')}
                                    labelOff="Month"
                                    labelOn="Date"
                                />
                            </div>

                            {/* Input Area */}
                            {startType === 'month' ? (
                                <div className="max-w-sm">
                                    <SelectInput
                                        label="" // Label handled above
                                        name="sessionStartMonth"
                                        value={startMonthName}
                                        options={MONTH_NAMES}
                                        onChange={(e) => {
                                            const monthName = e.target.value as keyof typeof MONTHS;
                                            onStartMonthChange(MONTHS[monthName]);
                                        }}
                                    />
                                    <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg inline-block mt-2">
                                        Current Cycle: {startMonthName} to {endMonthName}
                                    </p>
                                </div>
                            ) : (
                                <div className="max-w-sm space-y-2">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => onStartDateChange(e.target.value)}
                                        className="block w-full h-11"
                                    />
                                    {startDate && (
                                        <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg inline-block mt-2">
                                            Approx. End Date: {calculateEndDate(startDate)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Managed Sessions</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Add New */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-3">
                        <Input
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            placeholder="e.g. 2025-2026"
                            className="bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSession()}
                        />
                        <Button onClick={handleAddSession} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Session
                        </Button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic">No sessions created.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {sessions.map((session) => (
                                    <li key={session.id} className={`p-4 flex items-center justify-between transition-colors ${session.isActive ? 'bg-green-50/30' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <ToggleSwitch
                                                    enabled={session.isActive}
                                                    onChange={(enabled) => {
                                                        if (enabled) handleSetActive(session.id);
                                                    }}
                                                    labelOff="Inactive"
                                                    labelOn="Active"
                                                />
                                            </div>

                                            {editingId === session.id ? (
                                                <div className="flex items-center gap-2 flex-1 max-w-xs">
                                                    <Input
                                                        value={editingValue}
                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                        className="h-8 text-sm"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditSave(session.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                    />
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleEditSave(session.id)}>
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className={`font-black text-lg ${session.isActive ? 'text-green-700' : 'text-slate-600'}`}>
                                                    {session.name}
                                                </span>
                                            )}
                                        </div>

                                        {editingId !== session.id && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-indigo-600 hover:bg-indigo-50"
                                                    title="Edit Session Name"
                                                    onClick={() => {
                                                        setEditingId(session.id);
                                                        setEditingValue(session.name);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                    disabled={session.isActive && sessions.length > 1} // Can't delete active unless it's the last one
                                                    onClick={() => handleDeleteClick(session.id)}
                                                    title={session.isActive && sessions.length > 1 ? "Cannot delete active session" : "Delete session"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Session"
                message={`Are you sure you want to delete session? Data linked to this session might be affected.`}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
            />
        </div>
    );
}
