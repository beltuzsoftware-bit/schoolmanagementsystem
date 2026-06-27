'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    getAdmissionApplications, approveAdmissionApplication, rejectAdmissionApplication,
    deleteAdmissionApplication, toggleOnlineAdmission, getOnlineAdmissionStatus,
    updateAdmissionPaymentStatus
} from '@/app/actions';
import { AdmissionApplication } from '@/types';
import {
    UserPlus, Globe, Copy, CheckCircle2, XCircle, Clock, Trash2,
    RefreshCw, ToggleLeft, ToggleRight, Users, ClipboardList,
    ChevronDown, ChevronUp, Loader2, Check, Link2, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Approved: 'bg-green-100 text-green-700 border-green-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    Pending: <Clock className="h-3 w-3" />,
    Approved: <CheckCircle2 className="h-3 w-3" />,
    Rejected: <XCircle className="h-3 w-3" />,
};

export default function OnlineAdmissionPage() {
    const [schoolId, setSchoolId] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [applications, setApplications] = useState<AdmissionApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [filter, setFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [approveApp, setApproveApp] = useState<AdmissionApplication | null>(null);
    const [appointmentValue, setAppointmentValue] = useState('');
    const [copied, setCopied] = useState(false);
    const [school, setSchool] = useState<any>(null);

    // Resolve schoolId from localStorage (same pattern as all other school-admin pages)
    useEffect(() => {
        try {
            const stored = localStorage.getItem('kummi_user');
            if (stored) {
                const user = JSON.parse(stored);
                if (user.schoolId) setSchoolId(user.schoolId);
            }
        } catch {}
    }, []);

    const applyLink = typeof window !== 'undefined' && schoolId
        ? `${window.location.origin}/apply/${schoolId}`
        : '';

    const fetchData = useCallback(async (silent = false) => {
        if (!schoolId) return;
        if (!silent) setLoading(true);
        try {
            const [statusRes, apps] = await Promise.all([
                getOnlineAdmissionStatus(schoolId),
                getAdmissionApplications(schoolId, filter === 'all' ? undefined : filter)
            ]);
            setIsOpen(statusRes.isOpen);
            setSchool(statusRes.school);
            setApplications(apps as AdmissionApplication[]);
        } catch {
            if (!silent) toast.error('Failed to load data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filter, schoolId]);

    // Initial Fetch
    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    // BACKGROUND POLLING: Auto-refresh data every 5 seconds for "Autonomous Reflection"
    useEffect(() => {
        if (!schoolId) return;
        const interval = setInterval(() => {
            fetchData(true); // silent refresh
        }, 5000); 
        return () => clearInterval(interval);
    }, [fetchData, schoolId]);

    const handleToggle = async () => {
        setToggling(true);
        const newState = !isOpen;
        const res = await toggleOnlineAdmission(schoolId, newState);
        if (res.success) {
            setIsOpen(newState);
            toast.success(newState ? 'Online admissions are now OPEN 🎉' : 'Online admissions closed');
        } else {
            toast.error('Failed to update status');
        }
        setToggling(false);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(applyLink);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleConfirmApprove = async () => {
        if (!approveApp) return;
        toast.loading('Approving application...', { id: 'approve' });
        const res = await approveAdmissionApplication(approveApp.id, schoolId, appointmentValue);
        toast.dismiss('approve');
        if (res.success) {
            toast.success(`${approveApp.name} approved and added as student! ✅`);
            setApproveApp(null);
            setAppointmentValue('');
            fetchData();
        } else {
            toast.error(res.error || 'Approval failed');
        }
    };

    const handleReject = async () => {
        if (!rejectId) return;
        const res = await rejectAdmissionApplication(rejectId, schoolId, rejectReason);
        if (res.success) {
            toast.success('Application rejected');
            setRejectId(null);
            setRejectReason('');
            fetchData();
        } else {
            toast.error('Failed to reject');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this application permanently?')) return;
        const res = await deleteAdmissionApplication(id, schoolId);
        if (res.success) {
            toast.success('Application deleted');
            fetchData();
        }
    };

    const handleVerifyPayment = async (appId: string) => {
        if (!confirm('Mark this application as Paid?')) return;
        toast.loading('Verifying payment...', { id: 'verify' });
        const res = await updateAdmissionPaymentStatus(appId, schoolId, `ADMIN_VERIFIED_${Date.now()}`);
        toast.dismiss('verify');
        if (res.success) {
            toast.success('Payment verified! Applicant status updated.');
            fetchData();
        } else {
            toast.error(res.error || 'Verification failed');
        }
    };

    const counts = {
        all: applications.length,
        Pending: applications.filter(a => a.status === 'Pending').length,
        Approved: applications.filter(a => a.status === 'Approved').length,
        Rejected: applications.filter(a => a.status === 'Rejected').length,
    };

    const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <UserPlus className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                    Online Admission
                </h1>
                <p className="text-slate-500 mt-2 text-lg font-medium">
                    Manage your public admission portal and incoming applications.
                </p>
            </div>

            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Toggle Card */}
                <div className={`rounded-3xl p-6 border-2 transition-all ${isOpen
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'bg-gradient-to-br from-slate-50 to-white border-slate-200'}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Portal Status</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Control whether parents can submit applications</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isOpen ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {isOpen ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Open</> : 'Closed'}
                        </span>
                    </div>
                    <button
                        onClick={handleToggle}
                        disabled={toggling}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold text-sm transition-all ${isOpen
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200 shadow-md'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-200 shadow-md'}`}>
                        {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isOpen ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                        {isOpen ? 'Close Admissions' : 'Open Admissions'}
                    </button>
                </div>

                {/* Shareable Link Card */}
                <div className="rounded-3xl p-6 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Globe className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Shareable Link</h2>
                            <p className="text-sm text-slate-500">Share this with parents for online applications</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-4 py-2.5 mb-3">
                        <Link2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500 truncate flex-1 font-mono">{applyLink}</span>
                    </div>
                    <button onClick={handleCopyLink}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${copied
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}>
                        {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
                    </button>
                </div>
            </div>

            {/* Applications Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-indigo-500" />
                        <h2 className="font-bold text-slate-800">Applications</h2>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{applications.length}</span>
                    </div>
                    <button onClick={() => fetchData()} className="p-2 hover:bg-slate-100 rounded-xl transition">
                        <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-100 px-6">
                    {(['all', 'Pending', 'Approved', 'Rejected'] as const).map(tab => (
                        <button key={tab} onClick={() => setFilter(tab)}
                            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${filter === tab
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'all' ? 'All' : tab}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${filter === tab ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                {tab === 'all' ? counts.all : counts[tab]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Loading applications...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                            <Users className="h-12 w-12 text-slate-200 mb-4" />
                            <p className="font-semibold text-slate-400">No applications found</p>
                            <p className="text-sm text-slate-300 mt-1">
                                {isOpen ? 'Share the link above to start receiving applications' : 'Open admissions to start receiving applications'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(app => (
                            <div key={app.id} className="px-6 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-600 flex-shrink-0">
                                            {(app.firstName?.[0] || app.name?.[0] || '?').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{app.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="text-xs text-slate-400">{app.className || 'Class N/A'}</span>
                                                {app.fatherName && <span className="text-xs text-slate-400">Father: {app.fatherName}</span>}
                                                {app.phone && <span className="text-xs text-slate-400">📞 {app.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[app.status]}`}>
                                            {STATUS_ICONS[app.status]}
                                            {app.status}
                                        </span>
                                        {app.paymentStatus === 'Paid' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 border border-green-100 uppercase">
                                                <CreditCard className="w-3 h-3" /> Paid
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Unpaid
                                            </span>
                                        )}
                                        <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                                            className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400">
                                            {expandedId === app.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details + Actions */}
                                {expandedId === app.id && (
                                    <div className="mt-4 pl-14">
                                        <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                                            {Object.entries(app).filter(([k]) => !['id', 'schoolId', 'status', 'submittedAt', 'reviewedAt', 'rejectionReason'].includes(k)).map(([key, val]) => (
                                                val ? (
                                                    <div key={key}>
                                                        <p className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                        <p className="font-semibold text-slate-700 truncate">{String(val)}</p>
                                                    </div>
                                                ) : null
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3">
                                            Submitted: {new Date(app.submittedAt).toLocaleString()}
                                            {app.reviewedAt && <> &bull; Reviewed: {new Date(app.reviewedAt).toLocaleString()}</>}
                                            {app.rejectionReason && <> &bull; Reason: {app.rejectionReason}</>}
                                        </p>

                                        {app.status === 'Pending' && (
                                            <div className="flex gap-2 flex-wrap">
                                                <button onClick={() => { setApproveApp(app); setAppointmentValue(''); }}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition shadow-sm">
                                                    <CheckCircle2 className="h-4 w-4" /> Approve & Enroll
                                                </button>
                                                {app.paymentStatus !== 'Paid' && (
                                                    <button onClick={() => handleVerifyPayment(app.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-sm hover:bg-indigo-100 transition">
                                                        <CreditCard className="h-4 w-4" /> Verify Payment
                                                    </button>
                                                )}
                                                <button onClick={() => { setRejectId(app.id); setRejectReason(''); }}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition">
                                                    <XCircle className="h-4 w-4" /> Reject
                                                </button>
                                            </div>
                                        )}
                                        {app.status !== 'Pending' && (
                                            <button onClick={() => handleDelete(app.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition">
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-black text-slate-800 mb-1">Reject Application</h3>
                        <p className="text-sm text-slate-500 mb-4">Optionally provide a reason for rejection</p>
                        <textarea
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-300"
                            placeholder="Reason for rejection (optional)..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setRejectId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button onClick={handleReject}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition">
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Approve Modal */}
            {approveApp && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Approve Application</h3>
                        <p className="text-sm text-slate-500 mb-6">You are about to approve <b>{approveApp.name}</b>. This will also create a student record.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Interview / Appointment Schedule</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 font-bold bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    placeholder="e.g. 15th Oct, 10:00 AM"
                                    value={appointmentValue}
                                    onChange={e => setAppointmentValue(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 px-1 italic">This will be visible on the applicant's status dashboard.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setApproveApp(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button onClick={handleConfirmApprove}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow-lg shadow-green-200">
                                Approve & Notify
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
