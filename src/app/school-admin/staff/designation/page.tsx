'use client';

import { useState, useEffect, useRef } from 'react';
import {
    getStaffDesignations, addStaffDesignation, deleteStaffDesignation, updateStaffDesignation,
    getStaffProfiles
} from '@/app/actions';
import { Briefcase, Plus, Trash2, Pencil, Check, X, Users, Loader2, Search, ChevronRight, TrendingUp, ArrowUpRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Designation { id: string; schoolId: string; name: string; }
interface StaffCount { [name: string]: number; }

export default function DesignationPage() {
    const [schoolId, setSchoolId] = useState('');
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [staffCounts, setStaffCounts] = useState<StaffCount>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const modalInputRef = useRef<HTMLInputElement>(null);

    const load = async (sid: string) => {
        setLoading(true);
        try {
            const [deses, profiles] = await Promise.all([getStaffDesignations(sid), getStaffProfiles(sid)]);
            setDesignations(deses as Designation[]);
            const counts: StaffCount = {};
            (profiles as any[]).forEach((p: any) => {
                if (p.status === 'Inactive') return;
                const d = p.designation?.trim(); if (d) counts[d] = (counts[d] || 0) + 1;
            });
            setStaffCounts(counts);
        } catch { toast.error('Failed to load'); } finally { setLoading(false); }
    };

    useEffect(() => {
        const sid = JSON.parse(localStorage.getItem('kummi_user') || '{}').schoolId || '';
        setSchoolId(sid); if (sid) load(sid);
    }, []);

    useEffect(() => { if (showModal) setTimeout(() => modalInputRef.current?.focus(), 50); }, [showModal]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        const res = await addStaffDesignation(schoolId, newName.trim()) as any;
        if (res.success) { setDesignations(p => [...p, res.designation]); setNewName(''); toast.success(`"${res.designation.name}" added`); setShowModal(false); }
        else toast.error(res.error || 'Failed');
        setAdding(false);
    };

    const handleDelete = async (des: Designation) => {
        if (!confirm(`Delete "${des.name}"? This cannot be undone.`)) return;
        setDeletingId(des.id);
        const res = await deleteStaffDesignation(des.id) as any;
        if (res.success) { setDesignations(p => p.filter(d => d.id !== des.id)); toast.success('Deleted'); }
        else toast.error(res.error || 'Failed');
        setDeletingId(null);
    };

    const handleEditSave = async (des: Designation) => {
        if (!editName.trim() || editName.trim() === des.name) { setEditingId(null); return; }
        const res = await updateStaffDesignation(des.id, editName.trim()) as any;
        if (res.success) { setDesignations(p => p.map(d => d.id === des.id ? { ...d, name: editName.trim() } : d)); toast.success('Updated'); }
        else toast.error(res.error || 'Failed');
        setEditingId(null);
    };

    const filtered = designations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    const totalStaff = Object.values(staffCounts).reduce((a, b) => a + b, 0);
    const maxStaff = Math.max(...Object.values(staffCounts), 1);
    const assigned = designations.filter(d => staffCounts[d.name] > 0).length;

    return (
        <div className="space-y-6 font-sans">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-400">
                <Link href="/school-admin/staff" className="hover:text-slate-600 transition-colors font-medium">Staff Management</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-600 font-semibold">Designations</span>
            </nav>

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Designations</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Define job titles and roles for your staff</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/school-admin/staff/department" className="text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all">
                        Departments
                    </Link>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg transition-all shadow-sm shadow-violet-200 active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" /> Add Designation
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Designations</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{designations.length}</p>
                        <p className="text-xs text-violet-500 font-semibold mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{assigned} active</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-violet-500" />
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Assigned</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{totalStaff}</p>
                        <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />across all roles</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-500" />
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unused Roles</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{designations.length - assigned}</p>
                        <p className="text-xs text-amber-500 font-semibold mt-1 flex items-center gap-1"><Briefcase className="h-3 w-3" />no staff yet</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-amber-500" />
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search designations..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
                </div>

                {loading ? (
                    <div className="divide-y divide-slate-50">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="grid grid-cols-[2rem_1fr_7rem_10rem_6rem] gap-4 px-5 py-4 items-center animate-pulse">
                                <div className="h-3 bg-slate-100 rounded-full" />
                                <div className="h-4 bg-slate-100 rounded-full w-2/5" />
                                <div className="h-4 bg-slate-100 rounded-full" />
                                <div className="h-2 bg-slate-100 rounded-full" />
                                <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                            <Briefcase className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{search ? `No results for "${search}"` : 'No designations yet'}</p>
                        <p className="text-xs text-slate-400 mt-1">{search ? 'Try a different keyword' : 'Click "Add Designation" to create your first one'}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-[2rem_1fr_7rem_12rem_7rem] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>#</span>
                            <span>Designation</span>
                            <span>Staff</span>
                            <span>Utilization</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {filtered.map((des, idx) => {
                                const count = staffCounts[des.name] || 0;
                                const pct = Math.round((count / maxStaff) * 100);
                                return (
                                    <div key={des.id} className="group grid grid-cols-[2rem_1fr_7rem_12rem_7rem] gap-4 px-5 py-3.5 items-center hover:bg-violet-50/30 transition-colors">
                                        <span className="text-[11px] font-bold text-slate-300">{idx + 1}</span>

                                        <div className="min-w-0">
                                            {editingId === des.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(des); if (e.key === 'Escape') setEditingId(null); }}
                                                        className="flex-1 px-2.5 py-1.5 text-sm border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleEditSave(des)} className="p-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200"><Check className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-3.5 w-3.5" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                                        <Briefcase className="h-3.5 w-3.5 text-violet-600" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700 truncate">{des.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-sm font-bold ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{count}</span>
                                            <span className="text-xs text-slate-400">staff</span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${pct > 66 ? 'bg-emerald-400' : pct > 33 ? 'bg-violet-400' : count > 0 ? 'bg-amber-400' : 'bg-slate-200'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">{pct}% of top role</p>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            {editingId !== des.id && (
                                                <>
                                                    <button onClick={() => { setEditingId(des.id); setEditName(des.name); }} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors" title="Rename">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(des)} disabled={deletingId === des.id} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-40" title="Delete">
                                                        {deletingId === des.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[11px] text-slate-400">Showing <span className="font-bold text-slate-600">{filtered.length}</span> of <span className="font-bold text-slate-600">{designations.length}</span> designations</p>
                            <p className="text-[11px] text-slate-400 italic">Hover a row to edit or delete</p>
                        </div>
                    </>
                )}
            </div>

            {/* Add Designation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">New Designation</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Define a job title or role for your school</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Designation Title</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        ref={modalInputRef}
                                        type="text"
                                        placeholder="e.g. Principal, Teacher, Librarian..."
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400 transition-all"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Enter</kbd> to save quickly
                                </p>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                                <button
                                    onClick={handleAdd}
                                    disabled={adding || !newName.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl transition-all shadow-sm shadow-violet-200 active:scale-[0.98]"
                                >
                                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Add Designation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
