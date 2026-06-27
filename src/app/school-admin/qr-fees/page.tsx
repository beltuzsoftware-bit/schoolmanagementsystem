'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Printer, CheckCircle2, IndianRupee, User, Calendar, CreditCard, ChevronLeft, History, Check, X, Search, Info } from 'lucide-react';
import { getStudents, getSchools, getPackages, addQRTransaction, getQRTransactions, updateQRTransaction, getFeeGroups, getFeeTransactions } from '@/app/actions';
import { calculateMonthFinancials, SESSION_MONTHS, getStudentType } from '@/lib/fees-helper';
import { SaasPackage } from '@/types';
import { Student, QRTransaction } from '@/types';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function QRFeesPage() {
    const router = useRouter();
    const [schoolId, setSchoolId] = useState<string>('');
    const [schoolName, setSchoolName] = useState<string>('My School');
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [upiId, setUpiId] = useState<string>('school@upi'); // Default mock UPI
    
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [amount, setAmount] = useState<string>('1500');
    const [month, setMonth] = useState<string>(new Date().toLocaleString('default', { month: 'short' }) + ' Fee');
    const [qrLimit, setQrLimit] = useState<number>(-1);
    const [qrDuration, setQrDuration] = useState<number>(1);
    
    const [transactions, setTransactions] = useState<QRTransaction[]>([]);
    const [feeGroups, setFeeGroups] = useState<any[]>([]);
    const [feeTransactions, setFeeTransactions] = useState<any[]>([]);
    const [saasPackage, setSaasPackage] = useState<SaasPackage | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Confirmation Dialog State
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmingTxn, setConfirmingTxn] = useState<QRTransaction | null>(null);
    const [utr, setUtr] = useState('');

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.schoolId) {
                    setSchoolId(user.schoolId);
                    
                    try {
                        // Fetch school info for UPI and Name
                        const schools = await getSchools();
                        const school = schools.find((s: any) => s.id === user.schoolId);
                        if (school) {
                            setSchoolDetails(school);
                            setSchoolName(school.name);
                            if (school.upiId) setUpiId(school.upiId);
                            
                            const packages = await getPackages();
                            const pkg = packages.find((p: any) => p.id === school.packageId);
                            if (pkg) {
                                setQrLimit(pkg.qrTransactionLimit ?? 100);
                                setQrDuration(pkg.duration ?? 1);
                                setSaasPackage(pkg);
                            }
                        }
                        
                        // Fetch Fee Data
                        const [groups, ftns] = await Promise.all([
                            getFeeGroups(user.schoolId),
                            getFeeTransactions(user.schoolId)
                        ]);
                        setFeeGroups(groups);
                        setFeeTransactions(ftns);

                        // Fetch students
                        const students = await getStudents(user.schoolId);
                        setAllStudents(students);
                        
                        // Extract unique classes
                        const uniqueClasses = Array.from(new Set(students.map((s: Student) => s.className).filter(Boolean))) as string[];
                        setClasses(uniqueClasses.sort());
                        
                        // Fetch transactions
                        const txns = await getQRTransactions(user.schoolId);
                        setTransactions(txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    } catch (error) {
                        toast.error('Failed to load data');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        };
        init();
    }, []);

    const filteredStudents = allStudents.filter(s => !selectedClass || s.className === selectedClass);
    const selectedStudent = allStudents.find(s => s.id === selectedStudentId);

    // Auto-calculate dues when student changes
    useEffect(() => {
        if (selectedStudent) {
            let totalDue = 0;
            const applicableGroups = feeGroups.filter(g =>
                g.assignedClasses.some((c: string) => selectedStudent.className?.includes(c) || c.includes(selectedStudent.className || ''))
            );
            
            // Calculate total outstanding for the session
            const startMonth = schoolDetails?.sessionStartMonth || 4;
            const sessionMonths = SESSION_MONTHS.slice(); // Use absolute for iteration as financials handles relative check
            
            sessionMonths.forEach(m => {
                const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, feeTransactions, getStudentType(selectedStudent, schoolDetails?.currentSession), startMonth);
                totalDue += fin.remainingDue;
            });

            const rate = saasPackage?.transactionRate || 0;
            setAmount((totalDue + rate).toString());
            
            // Set month to current month + " Outstanding"
            const currentMonthName = new Date().toLocaleString('default', { month: 'short' });
            setMonth(`${currentMonthName} Fee (Total Due)`);
        }
    }, [selectedStudentId, feeGroups, feeTransactions, saasPackage]);

    // Generate UPI URI
    const generateUpiUri = () => {
        if (!selectedStudent || !amount || parseFloat(amount) <= 0) return '';
        
        // Clean transaction note (remove spaces and special chars, keep it concise)
        const rawNote = `${month.replace(/\s+/g, '')}_${selectedStudent.name?.replace(/\s+/g, '')}`;
        const note = encodeURIComponent(rawNote.substring(0, 50)); // UPI limit is usually 50 chars for TN
        const encodedName = encodeURIComponent(schoolName.substring(0, 50));
        
        return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${note}`;
    };

    const upiUri = generateUpiUri();

    const handlePrint = () => {
        if (!selectedStudent || !upiUri) {
            toast.error('Please select a student and configure the fee first.');
            return;
        }

        const printContent = printRef.current;
        if (!printContent) return;

        const originalContents = document.body.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=800');
        
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print QR Fee Slip - ${selectedStudent.name}</title>
                        <style>
                            body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
                            .slip { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; border: 2px solid #e2e8f0; }
                            .school-name { font-size: 24px; font-weight: 900; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
                            .divider { height: 2px; background: #f1f5f9; margin: 24px 0; }
                            .student-name { font-size: 20px; font-weight: 700; color: #334155; margin-bottom: 8px; }
                            .student-class { font-size: 14px; color: #64748b; margin-bottom: 24px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                            .qr-container { background: white; padding: 24px; border-radius: 24px; display: inline-block; margin-bottom: 24px; border: 2px dashed #cbd5e1; }
                            .amount-box { background: #eff6ff; padding: 16px; border-radius: 16px; margin-bottom: 24px; }
                            .amount-label { font-size: 12px; color: #3b82f6; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                            .amount-value { font-size: 36px; font-weight: 900; color: #1e40af; }
                            .note { font-size: 14px; color: #64748b; font-weight: 500; }
                            .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; font-weight: 600; }
                        </style>
                    </head>
                    <body>
                        <div class="slip">
                            <div class="school-name">${schoolName}</div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Fee Collection</div>
                            
                            <div class="divider"></div>
                            
                            <div class="student-name">${selectedStudent.name}</div>
                            <div class="student-class">Class: ${selectedStudent.className || 'N/A'} | Roll: ${selectedStudent.rollNumber || 'N/A'}</div>
                            
                            <div class="amount-box">
                                <div class="amount-label">Scan to Pay</div>
                                <div class="amount-value">₹${amount}</div>
                            </div>
                            
                            <div class="qr-container">
                                ${printContent.innerHTML}
                            </div>
                            
                            <div class="note">Purpose: ${month}</div>
                            <div class="footer">Scan using any UPI App (GPay, PhonePe, Paytm)<br>Amount & Details are locked securely.</div>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(async () => {
                printWindow.print();
                printWindow.close();
                
                // Log the transaction as Pending
                const newTxn: QRTransaction = {
                    id: `txn_${Date.now()}`,
                    schoolId: schoolId,
                    studentId: selectedStudent.id,
                    studentName: selectedStudent.name || 'Unknown',
                    className: selectedStudent.className,
                    amount: parseFloat(amount),
                    month: month,
                    status: 'Pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    monthIndex: new Date().getMonth(), // current month index
                    baseAmount: parseFloat(amount) - (saasPackage?.transactionRate || 0)
                };
                
                await addQRTransaction(newTxn);
                setTransactions([newTxn, ...transactions]);
                toast.success('Fee slip printed and logged in history.');
            }, 500);
        }
    };

    const handleConfirmPayment = async () => {
        if (!confirmingTxn || !utr.trim()) {
            toast.error('Please enter the Transaction ID / UTR');
            return;
        }

        try {
            const res = await updateQRTransaction(confirmingTxn.id, {
                status: 'Paid',
                transactionId: utr,
            });

            if (res.success) {
                setTransactions(transactions.map(t => t.id === confirmingTxn.id ? { ...t, status: 'Paid', transactionId: utr } : t));
                toast.success('Payment confirmed successfully!');
                setIsConfirmDialogOpen(false);
                setUtr('');
                setConfirmingTxn(null);
            }
        } catch (error) {
            toast.error('Failed to update payment status');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 font-medium">Loading Student Data...</div>;
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <Button variant="ghost" className="mb-2 -ml-4 text-slate-500 hover:text-slate-900" onClick={() => router.back()}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3 font-serif">
                        <QrCode className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        Dynamic QR Fees
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-slate-500 font-medium">Generate precise UPI payment QR codes for students instantly.</p>
                        <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-bold">
                            My Package Limit: {qrLimit === -1 ? 'Unlimited' : `${qrLimit} / ${qrDuration === 12 ? 'Year' : 'Month'}`} QR Trans.
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="p-6 md:p-8 rounded-[2rem] border-slate-100 shadow-sm bg-white">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-indigo-500" />
                            1. Select Student
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Filter by Class</label>
                                <select 
                                    className="w-full flex h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus-visible:outline-none"
                                    value={selectedClass}
                                    onChange={(e) => {
                                        setSelectedClass(e.target.value);
                                        setSelectedStudentId('');
                                    }}
                                >
                                    <option value="">All Classes</option>
                                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Student Name</label>
                                <select 
                                    className="w-full flex h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus-visible:outline-none"
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                >
                                    <option value="">-- Select Student --</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(Roll: ${s.rollNumber})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 md:p-8 rounded-[2rem] border-slate-100 shadow-sm bg-white opacity-100 transition-opacity" style={{ opacity: selectedStudentId ? 1 : 0.5 }}>
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-500" />
                            2. Fee Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-slate-400" /> Total Amount (Due + Svc)
                                </label>
                                <Input 
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 1500"
                                    disabled={!selectedStudentId}
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 text-xl font-black text-indigo-900 focus:bg-white"
                                />
                                {saasPackage?.transactionRate ? (
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest pl-1">
                                        Includes ₹{saasPackage.transactionRate} Service Charge
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" /> Fee Month / Description
                                </label>
                                <Input 
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    placeholder="e.g. January Fee"
                                    disabled={!selectedStudentId}
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold focus:bg-white"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: QR Output */}
                <div className="lg:col-span-5">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-indigo-900/5 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white overflow-hidden relative h-full flex flex-col">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                        
                        <div className="p-8 relative z-10 flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <span className="font-black tracking-widest uppercase text-indigo-200 text-sm">UPI Payment</span>
                                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                                    <span className="text-xs font-bold text-white tracking-widest uppercase">Verified</span>
                                </div>
                            </div>
                            
                            {selectedStudent ? (
                                <div className="flex flex-col items-center flex-1">
                                    <div className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md w-full mb-8">
                                        <div className="text-center mb-6">
                                            <h4 className="font-bold text-indigo-100 text-sm mb-1 uppercase tracking-widest">{schoolName}</h4>
                                            <div className="text-5xl font-black text-white tracking-tight">₹{amount || '0'}</div>
                                            <p className="text-indigo-200 font-medium text-sm mt-3">{month}</p>
                                        </div>
                                        
                                        <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-2xl relative">
                                            <div className="absolute inset-x-0 -top-3 flex justify-center">
                                                <div className="bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
                                                    Scan to Pay
                                                </div>
                                            </div>
                                            {/* We hide the actual QR here to grab it for printing securely, but we display it here too */}
                                            <div ref={printRef}>
                                                <QRCode 
                                                    value={upiUri || 'upi://pay?pa='} 
                                                    size={200} 
                                                    level="H"
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    viewBox={`0 0 256 256`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full space-y-3 mt-auto">
                                        <div className="grid grid-cols-2 gap-2 text-sm text-indigo-100 mb-6">
                                            <div>
                                                <span className="opacity-60 block text-xs">Student</span>
                                                <span className="font-bold truncate block">{selectedStudent.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="opacity-60 block text-xs">UPI ID</span>
                                                <span className="font-bold truncate block">{upiId}</span>
                                            </div>
                                        </div>

                                        <Button 
                                            size="lg" 
                                            onClick={handlePrint}
                                            disabled={!upiUri}
                                            className="w-full bg-white text-indigo-900 hover:bg-slate-50 font-black tracking-wide shadow-xl h-14 rounded-2xl"
                                        >
                                            <Printer className="w-5 h-5 mr-3" />
                                            Print Fee Slip
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                        <QrCode className="w-12 h-12 text-indigo-300/50" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Configure QR Code</h3>
                                    <p className="text-sm font-medium text-indigo-200/80 max-w-[250px]">
                                        Select a student to automatically generate a dedicated UPI QR payment slip.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* History Toggle */}
                    <Button 
                        variant="outline" 
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full mt-6 h-14 rounded-2xl border-indigo-100 bg-indigo-50/50 text-indigo-700 font-bold hover:bg-indigo-100"
                    >
                        <History className="w-5 h-5 mr-3" />
                        {showHistory ? 'Hide Transaction History' : 'View Transaction History'}
                    </Button>
                </div>
            </div>

            {/* Transaction History Section */}
            {showHistory && (
                <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm bg-white animate-in slide-in-from-top-4 duration-500 mt-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Transaction History</h3>
                            <p className="text-slate-500 font-medium font-serif">Track generated QR slips and confirm successful payments.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input placeholder="Search ID or Name..." className="bg-transparent border-none text-xs font-bold outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Student / Month</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ref ID</th>
                                    <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-400 font-bold italic">No transactions recorded yet.</td>
                                    </tr>
                                ) : (
                                    transactions.map(txn => (
                                        <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700 text-sm">{new Date(txn.createdAt).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-400 font-black">{new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{txn.studentName}</div>
                                                <div className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">{txn.month}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-black text-slate-900">₹{txn.amount}</div>
                                            </td>
                                            <td className="p-4">
                                                {txn.status === 'Paid' ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px] px-3">
                                                        <Check className="w-3 h-3 mr-1" /> Paid
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[10px] px-3">
                                                        <Info className="w-3 h-3 mr-1" /> Pending
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs font-mono font-bold text-slate-500">{txn.transactionId || '--'}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {txn.status === 'Pending' && (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => { setConfirmingTxn(txn); setIsConfirmDialogOpen(true); }}
                                                        className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold px-4"
                                                    >
                                                        Confirm Payment
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Confirm Payment Dialog */}
            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3 font-serif">
                            <CheckCircle2 className="text-emerald-500" />
                            Confirm Payment
                        </DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Verify the transaction in your bank statement and enter the UTR / Ref ID.
                        </DialogDescription>
                    </DialogHeader>
                    {confirmingTxn && (
                        <div className="py-6 space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Student Amount</div>
                                <div className="text-xl font-black text-slate-900">{confirmingTxn.studentName} - ₹{confirmingTxn.amount}</div>
                                <div className="text-xs font-bold text-indigo-500">{confirmingTxn.month}</div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="utr" className="text-sm font-bold text-slate-700">Transaction ID / UTR Number</Label>
                                <Input 
                                    id="utr"
                                    placeholder="Enter 12-digit UTR or Ref No."
                                    value={utr}
                                    onChange={(e) => setUtr(e.target.value)}
                                    className="h-12 rounded-xl border-slate-200 font-mono text-lg font-bold"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsConfirmDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 shadow-lg shadow-emerald-100">
                            Confirm Successful
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
