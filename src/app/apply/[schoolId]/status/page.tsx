'use client';

import React, { useState, useEffect } from 'react';
import { getAdmissionApplicationByAuth, updateAdmissionPaymentStatus, getOnlineAdmissionStatus, getAdmissionApplicationStatus, simulateUPICallback } from '@/app/actions';
import { AdmissionApplication } from '@/types';
import { 
    Loader2, 
    Search, 
    Calendar, 
    Phone, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    FileText, 
    CreditCard, 
    ArrowLeft,
    Download,
    ExternalLink,
    AlertCircle,
    Info,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

export default function AdmissionStatusPage({ params }: { params: Promise<{ schoolId: string }> }) {
    const { schoolId } = React.use(params);
    const [identifier, setIdentifier] = useState('');
    const [dob, setDob] = useState('');
    const [loading, setLoading] = useState(false);
    const [application, setApplication] = useState<AdmissionApplication | null>(null);
    const [school, setSchool] = useState<any>(null);
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Payment update state
    const [paymentRef, setPaymentRef] = useState('');
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const app = await getAdmissionApplicationByAuth(schoolId, identifier, dob);
            if (app) {
                setApplication(app);
                const { school: schoolData } = await getOnlineAdmissionStatus(schoolId);
                setSchool(schoolData);
                setIsLoggedIn(true);
            } else {
                setError('Invalid credentials. Please check your Reference Number/Phone and DOB.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!application || !paymentRef) return;
        
        setIsUpdatingPayment(true);
        try {
            const res = await updateAdmissionPaymentStatus(application.id, schoolId, paymentRef);
            if (res.success) {
                toast.success('Payment reference updated successfully!');
                // Refresh local state
                setApplication({ ...application, paymentStatus: 'Paid', paymentReference: paymentRef });
            } else {
                toast.error(res.error || 'Failed to update payment');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    // Status Polling for Automatic Reflection
    useEffect(() => {
        if (!isLoggedIn || !application || application.paymentStatus === 'Paid') return;

        const interval = setInterval(async () => {
            const status = await getAdmissionApplicationStatus(application.id, schoolId);
            if (status && status.paymentStatus === 'Paid') {
                setApplication(prev => prev ? { 
                    ...prev, 
                    paymentStatus: 'Paid', 
                    paymentReference: status.paymentReference,
                    status: status.status
                } : null);
                toast.success('Payment confirmed automatically!', {
                    icon: <CheckCircle2 className="text-green-500" />,
                    duration: 5000
                });
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isLoggedIn, application?.id, application?.paymentStatus, schoolId]);

    const handleSimulatePayment = async () => {
        if (!application) return;
        setIsUpdatingPayment(true);
        // Add a small delay to make it feel like it's "checking" the bank
        await new Promise(r => setTimeout(r, 2500));
        const res = await simulateUPICallback(application.id, schoolId);
        if (res.success) {
            toast.success('Payment detected! System updating...', {
                icon: <CheckCircle2 className="text-green-500" />,
                duration: 4000
            });
            // Update local state immediately to avoid waiting for polling
            setApplication(prev => prev ? { ...prev, paymentStatus: 'Paid' } : null);
        } else {
            toast.error('Payment not detected. Please try scanning again.');
        }
        setIsUpdatingPayment(false);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Approved': return { color: 'bg-green-500', icon: <CheckCircle2 className="w-8 h-8" />, label: 'Approved' };
            case 'Rejected': return { color: 'bg-red-500', icon: <XCircle className="w-8 h-8" />, label: 'Rejected' };
            default: return { color: 'bg-amber-500', icon: <Clock className="w-8 h-8" />, label: 'Pending Review' };
        }
    };

    if (!isLoggedIn || !application) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border border-white/10 shadow-2xl">
                            <Search className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Track Application</h1>
                        <p className="text-indigo-200/60 text-sm">Enter your details to check your admission status.</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        
                        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Phone or Reference No."
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg font-medium"
                                    />
                                </div>

                                <div className="relative group">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="date"
                                        required
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg font-medium"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in slide-in-from-top-2 duration-300">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Log In'}
                            </button>
                        </form>
                    </div>

                    <div className="text-center mt-8 text-white/40 text-sm">
                        <p>Forgot your reference number? <br />Contact the school administration.</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentStatus = getStatusConfig(application.status);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => setIsLoggedIn(false)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Application Reference</p>
                        <p className="text-sm font-black text-slate-800">{application.id}</p>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6 lg:pb-20">
                {/* Appointment Schedule (Priority View) */}
                {application.status === 'Approved' && (
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/20">
                                <Calendar className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-black mb-1">Admission Interview</h2>
                                <p className="text-indigo-100 text-sm">Your application has been approved! Please visit the school at the scheduled time.</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 text-center">
                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Scheduled For</p>
                                <p className="text-xl font-black">{application.appointmentSchedule || 'TBD (Contact Admin)'}</p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Header Status Card */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border overflow-hidden">
                    <div className={`${currentStatus.color} p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6`}>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/10">
                                {currentStatus.icon}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black">{currentStatus.label}</h1>
                                <p className="text-white/80 text-sm">Last updated: {new Date(application.reviewedAt || application.submittedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
                            <p className="text-white font-bold">{application.name}</p>
                            <p className="text-white/60 text-xs">Primary Applicant</p>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Applying For</p>
                            <p className="text-lg font-black text-slate-800">{application.className} {application.section ? `(${application.section})` : ''}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</p>
                            <p className="text-lg font-black text-slate-800">{application.phone}</p>
                        </div>
                        {application.status === 'Rejected' && application.rejectionReason && (
                            <div className="md:col-span-2 p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-red-900">Reason for Rejection</p>
                                    <p className="text-sm text-red-700 mt-0.5">{application.rejectionReason}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment Status */}
                    <div className="bg-white rounded-[2rem] shadow-sm border p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Payment Status</h3>
                        </div>

                        {application.paymentStatus === 'Paid' ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-sm font-bold text-green-900">Payment Verified</p>
                                        <p className="text-xs text-green-700">Reference: {application.paymentReference}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                    Your payment was received on {new Date(application.paymentDate || application.submittedAt).toLocaleDateString()}. No further action is required.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Payment Required</p>
                                        <p className="text-xs text-amber-700 italic">Please pay ₹{school?.admissionFeeAmount || 0} to proceed.</p>
                                    </div>
                                </div>

                                {school?.upiId && (
                                    <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                        <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-indigo-100">
                                                <QRCode 
                                                    value={`upi://pay?pa=${school.upiId}&pn=${encodeURIComponent(school.name)}&am=${school.admissionFeeAmount || 0}&tr=APP_${application.id}&cu=INR&tn=${encodeURIComponent('Admission Fee for ' + application.name)}`}
                                                    size={160}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">UPI ID: {school.upiId}</p>
                                                <p className="text-xs font-bold text-slate-600">Scan using GPay, PhonePe, or Paytm</p>
                                            </div>
                                        </div>

                                        {/* Deep link for mobile users */}
                                        <a 
                                            href={`upi://pay?pa=${school.upiId}&pn=${encodeURIComponent(school.name)}&am=${school.admissionFeeAmount || 0}&tr=APP_${application.id}&cu=INR&tn=${encodeURIComponent('Admission Fee for ' + application.name)}`}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 md:hidden"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                            Pay via UPI App
                                        </a>                                        <div className="space-y-4">
                                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Autonomous Verification</p>
                                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                                    Once you scan and pay on your phone, click the button below to verify the transaction in real-time.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={handleSimulatePayment}
                                                disabled={isUpdatingPayment}
                                                className="w-full py-4 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:bg-slate-200 flex flex-col items-center justify-center gap-1 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isUpdatingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-6 h-6 animate-pulse" />}
                                                    <span>{isUpdatingPayment ? 'Verifying with Bank...' : 'I have Scan & Paid'}</span>
                                                </div>
                                                {!isUpdatingPayment && <span className="text-[10px] font-bold text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-widest">Click to confirm reflection</span>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <div className="bg-white rounded-[2rem] shadow-sm border p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Submitted Documents</h3>
                        </div>

                        {application.documents && application.documents.length > 0 ? (
                            <div className="space-y-3">
                                {application.documents.map((doc, idx) => (
                                    <div key={idx} className="group flex items-center justify-between p-3 bg-slate-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black uppercase">
                                                {doc.name.split('.').pop()}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{doc.name}</span>
                                        </div>
                                        <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-100 rounded-2xl">
                                <AlertCircle className="w-8 h-8 text-slate-100 mb-2" />
                                <p className="text-xs text-slate-400 font-bold">No documents uploaded</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Help Section */}
                <div className="p-6 rounded-[2rem] bg-indigo-900 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                            <Info className="w-7 h-7 text-indigo-200" />
                        </div>
                        <div>
                            <h4 className="font-black text-lg mb-1">Need assistance?</h4>
                            <p className="text-indigo-200 text-sm leading-relaxed">
                                Our help desk is available from 9:00 AM to 5:00 PM for any technical support or admission queries.
                            </p>
                        </div>
                        <button className="md:ml-auto px-6 py-3 bg-white text-indigo-950 rounded-xl font-bold text-sm shadow-xl hover:bg-indigo-50 transition-colors">
                            Contact Admin
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
