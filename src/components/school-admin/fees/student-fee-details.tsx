'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    ArrowLeft, 
    Printer, 
    IndianRupee, 
    Calendar, 
    User, 
    Phone, 
    CreditCard, 
    ChevronDown, 
    ChevronUp, 
    Plus, 
    History, 
    Undo2, 
    MoreVertical,
    FileText,
    BadgeCheck,
    AlertCircle,
    Clock,
    Tag
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Student, School } from '@/types';
import { Transaction, FeeGroup, FeeInGroup } from '@/types/fees';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { 
    SESSION_MONTHS, 
    getOrderedSessionMonths, 
    isFeeApplicableForMonth, 
    calculateMonthFinancials,
    calculateFineAmount,
    getStudentType
} from '@/lib/fees-helper';
import { toast } from 'sonner';
import FeeReceiptModal from './fee-receipt-modal';
import { revertFeeTransaction, addFeeTransactionsBatch } from '@/app/actions';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StudentFeeDetailsProps {
    student: Student;
    allGroups: FeeGroup[];
    allTransactions: Transaction[];
    schoolDetails: School | null;
}

interface MonthRow {
    monthIndex: number;
    monthName: string;
    monthFull: string;
    status: 'paid' | 'partial' | 'unpaid' | 'no_fees';
    feeCode: string;
    feeGroupName: string;
    dueDate: string;
    amount: number;
    fine: number;
    discount: number;
    paid: number;
    balance: number;
    transactions: Transaction[];
}

export default function StudentFeeDetails({ 
    student, 
    allGroups, 
    allTransactions: initialTransactions, 
    schoolDetails 
}: StudentFeeDetailsProps) {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
    const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
    const [selectedPrintTxns, setSelectedPrintTxns] = useState<Set<string>>(new Set());
    
    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentRemarks, setPaymentRemarks] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Revert Modal State
    const [revertTxn, setRevertTxn] = useState<Transaction | null>(null);

    // Receipt Modal State
    const [activeReceiptTxns, setActiveReceiptTxns] = useState<Transaction[] | null>(null);

    const startMonth = (schoolDetails as any)?.sessionStartMonth || 4;
    const sessionMonths = getOrderedSessionMonths(startMonth);
    const applicableGroups = allGroups.filter(g => g.assignedClasses.includes(student.className));

    // Map data to table rows
    const feeRows = useMemo(() => {
        return sessionMonths.map(month => {
            const financials = calculateMonthFinancials(
                student.id, 
                month.index, 
                applicableGroups, 
                transactions, 
                getStudentType(student, schoolDetails?.currentSession),
                startMonth
            );

            const monthTxns = transactions.filter(t => t.studentId === student.id && t.monthIndex === month.index);
            
            // Get detailed breakdown for fee codes/groups
            const group = applicableGroups[0]; // Simplified: use first applicable group name
            const fees = group?.fees.filter(f => isFeeApplicableForMonth(f, month.index, startMonth)) || [];
            const feeCode = fees.map(f => f.feeName).join(', ') || 'N/A';

            return {
                monthIndex: month.index,
                monthName: month.name,
                monthFull: month.full,
                status: financials.status as any,
                feeCode: feeCode,
                feeGroupName: group?.name || 'N/A',
                dueDate: '10-' + month.name + '-2024', // Simplified due date
                amount: financials.totalDue - financials.fineTotal,
                fine: financials.fineTotal,
                discount: financials.totalDiscount || 0,
                paid: financials.totalPaid,
                balance: financials.remainingDue,
                transactions: monthTxns
            };
        });
    }, [student.id, applicableGroups, transactions, sessionMonths, startMonth]);

    const toggleExpand = (mIdx: number) => {
        const next = new Set(expandedMonths);
        if (next.has(mIdx)) next.delete(mIdx);
        else next.add(mIdx);
        setExpandedMonths(next);
    };

    const toggleSelect = (mIdx: number) => {
        const next = new Set(selectedMonths);
        if (next.has(mIdx)) next.delete(mIdx);
        else next.add(mIdx);
        setSelectedMonths(next);
    };

    const toggleSelectPrintTxn = (txnKey: string) => {
        const next = new Set(selectedPrintTxns);
        if (next.has(txnKey)) next.delete(txnKey);
        else next.add(txnKey);
        setSelectedPrintTxns(next);
    };

    const handlePrintSelectedTxns = () => {
        const txnsToPrint = transactions.filter(t => selectedPrintTxns.has(`${t.id}-${t.monthIndex}`));
        if (txnsToPrint.length > 0) {
            setActiveReceiptTxns(txnsToPrint);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedMonths(new Set(feeRows.filter(r => r.status !== 'paid' && r.status !== 'no_fees').map(r => r.monthIndex)));
        } else {
            setSelectedMonths(new Set());
        }
    };

    const handleCollectSelected = () => {
        if (selectedMonths.size === 0) {
            toast.error("Please select at least one month to collect fees");
            return;
        }
        
        let totalToPay = 0;
        feeRows.forEach(row => {
            if (selectedMonths.has(row.monthIndex)) {
                totalToPay += row.balance;
            }
        });

        setPaymentAmount(totalToPay.toString());
        setIsPaymentModalOpen(true);
    };

    const processPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsProcessing(true);
        try {
            let remaining = parseFloat(paymentAmount);
            const sortedSelected = Array.from(selectedMonths).sort((a, b) => {
                const relA = (a - (startMonth - 1) + 12) % 12;
                const relB = (b - (startMonth - 1) + 12) % 12;
                return relA - relB;
            });

            const newTxnBatch: Transaction[] = [];
            const timestamp = Date.now();
            const baseId = `TXN-${timestamp}`;

            for (const mIdx of sortedSelected) {
                if (remaining <= 0) break;
                const row = feeRows.find(r => r.monthIndex === mIdx);
                if (row && row.balance > 0) {
                    const alloc = Math.min(remaining, row.balance);
                    const txn: Transaction = {
                        id: baseId,
                        schoolId: student.schoolId,
                        studentId: student.id,
                        monthIndex: mIdx,
                        year: 2024,
                        amount: alloc,
                        date: paymentDate,
                        mode: paymentMode,
                        reference: paymentRemarks
                    };
                    newTxnBatch.push(txn);
                    remaining -= alloc;
                }
            }

            if (newTxnBatch.length > 0) {
                const res = await addFeeTransactionsBatch(newTxnBatch);
                if (res.success && res.transactions) {
                    setTransactions(prev => [...prev, ...res.transactions]);
                } else {
                    throw new Error(res.error || "Failed to process payment");
                }
            }

            toast.success("Fees collected successfully!");
            setIsPaymentModalOpen(false);
            setSelectedMonths(new Set());
            setPaymentAmount('');
            setPaymentRemarks('');
            
            // Auto open receipt for the print
            if (newTxnBatch.length > 0) {
                setActiveReceiptTxns(newTxnBatch);
            }

        } catch (error) {
            toast.error("Failed to process payment");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRevert = async () => {
        if (!revertTxn) return;
        try {
            await revertFeeTransaction(revertTxn.id);
            setTransactions(prev => prev.filter(t => t.id !== revertTxn.id));
            toast.success("Transaction reverted successfully");
            setRevertTxn(null);
        } catch (error) {
            toast.error("Failed to revert transaction");
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header: Navigation & Identity */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Fees Summary
                            <Badge variant="outline" className="text-xs py-0 h-5 font-medium border-slate-200 text-slate-500">Academic: 2024-25</Badge>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Manage student financial records and collection</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="shadow-sm border-slate-200 font-semibold" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Print Summary
                    </Button>
                    {selectedPrintTxns.size > 0 && (
                        <Button variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm font-semibold hover:bg-emerald-100" onClick={handlePrintSelectedTxns}>
                            <FileText className="w-4 h-4 mr-2" /> Print Receipts ({selectedPrintTxns.size})
                        </Button>
                    )}
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md font-semibold" onClick={handleCollectSelected}>
                        <IndianRupee className="w-4 h-4 mr-2" /> Collect Selected
                    </Button>
                </div>
            </div>

            {/* Student Identity Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                        {/* Profile Section */}
                        <div className="p-8 flex items-center gap-6 border-r border-white/10 flex-1">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl font-bold overflow-hidden shadow-2xl transition-transform group-hover:scale-105 duration-300">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
                                    <BadgeCheck className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-3xl font-extrabold tracking-tight uppercase">{student.name}</h2>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="flex items-center text-indigo-100/80 text-xs font-semibold uppercase tracking-wider">
                                        <Tag className="w-3 h-3 mr-1.5 opacity-60" /> ID: {student.admissionNumber}
                                    </span>
                                    <span className="flex items-center text-indigo-100/80 text-xs font-semibold uppercase tracking-wider">
                                        <Calendar className="w-3 h-3 mr-1.5 opacity-60" /> Class: {student.className} {student.section ? `(${student.section})` : ''}
                                    </span>
                                    {student.rollNumber && (
                                        <span className="flex items-center text-indigo-100/80 text-xs font-semibold uppercase tracking-wider">
                                            <Badge variant="outline" className="ml-1 border-white/20 text-white text-[10px] h-4">Roll: {student.rollNumber}</Badge>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Section */}
                        <div className="bg-white/5 backdrop-blur-sm p-8 grid grid-cols-2 gap-x-8 gap-y-4 min-w-[320px]">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest flex items-center">
                                    <Phone className="w-3 h-3 mr-1" /> Contact No
                                </p>
                                <p className="text-lg font-bold text-white leading-tight">8233366613</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest flex items-center">
                                    <User className="w-3 h-3 mr-1" /> Father Name
                                </p>
                                <p className="text-lg font-bold text-white leading-tight uppercase truncate max-w-[120px]">Rajesh K.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest">Category</p>
                                <Badge className="bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border-indigo-400/20 text-[10px] font-bold h-5 px-1.5">GENERAL</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest">RTE Status</p>
                                <Badge className="bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border-rose-400/20 text-[10px] font-bold h-5 px-1.5">NO</Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Fee Table */}
            <Card className="border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-100">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px] p-4">
                                    <Checkbox 
                                        onCheckedChange={handleSelectAll} 
                                        checked={selectedMonths.size === feeRows.filter(r => r.status !== 'paid' && r.status !== 'no_fees').length && selectedMonths.size > 0} 
                                    />
                                </TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fees Group</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fees Code</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-center">Due Date</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-center">Status</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right px-4">Amount</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right">Discount</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right">Fine</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right">Paid</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right">Balance</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right px-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {feeRows.map((row) => (
                                <React.Fragment key={row.monthIndex}>
                                    <TableRow className={cn(
                                        "group border-b border-slate-50 transition-colors",
                                        row.status === 'paid' ? "bg-green-50/20" : 
                                        row.status === 'partial' ? "bg-amber-50/20" : "bg-white",
                                        selectedMonths.has(row.monthIndex) && "bg-indigo-50/50"
                                    )}>
                                        <TableCell className="p-4">
                                            {row.status !== 'no_fees' && row.status !== 'paid' && (
                                                <Checkbox 
                                                    checked={selectedMonths.has(row.monthIndex)}
                                                    onCheckedChange={() => toggleSelect(row.monthIndex)}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-bold text-slate-900 text-sm">{row.feeGroupName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Academic Year 2024-25</p>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <span className="font-medium text-slate-600 text-xs">{row.feeCode}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded tracking-tight">{row.dueDate}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "text-[10px] font-extrabold px-2 py-0.5 border shadow-sm",
                                                row.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                row.status === 'partial' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                row.status === 'no_fees' ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                            )}>
                                                {row.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right px-4">
                                            <span className="font-bold text-slate-900 text-sm">₹{row.amount}</span>
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-bold text-emerald-600">
                                            {row.discount > 0 ? `-₹${row.discount}` : '0.00'}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-bold text-rose-600">
                                            {row.fine > 0 ? `+₹${row.fine}` : '0.00'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-900 text-sm">
                                            ₹{row.paid}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "font-extrabold text-sm",
                                                row.balance > 0 ? "text-rose-600" : "text-emerald-600"
                                            )}>₹{row.balance}</span>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                {row.transactions.length > 0 && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 hover:bg-slate-100 rounded-full"
                                                        onClick={() => toggleExpand(row.monthIndex)}
                                                    >
                                                        {expandedMonths.has(row.monthIndex) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                )}
                                                {row.balance > 0 && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-full">
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {row.status !== 'unpaid' && (
                                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-full">
                                                        <Printer className="w-4 h-4" />
                                                   </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* Nested Transaction Sub-Rows */}
                                    {expandedMonths.has(row.monthIndex) && row.transactions.map((txn, tIdx) => (
                                        <TableRow key={txn.id + tIdx} className="bg-slate-50/50 border-b border-white hover:bg-slate-100/50">
                                            <TableCell className="py-2 pl-4">
                                                <Checkbox
                                                    checked={selectedPrintTxns.has(`${txn.id}-${txn.monthIndex}`)}
                                                    onCheckedChange={() => toggleSelectPrintTxn(`${txn.id}-${txn.monthIndex}`)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 pl-8 lg:pl-12" colSpan={4}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-slate-300 rounded-full" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-bold text-slate-500 flex items-center">
                                                            <CreditCard className="w-3 h-3 mr-1" /> PAYMENT ID
                                                        </p>
                                                        <p className="text-xs font-mono font-bold text-slate-800">{txn.id.split('-').pop()}/{tIdx + 1}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-200 mx-2" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Mode</p>
                                                        <Badge variant="outline" className="text-[9px] py-0 h-4 bg-white font-bold">{txn.mode.toUpperCase()}</Badge>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-200 mx-2" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Date</p>
                                                        <span className="text-[11px] font-bold text-slate-700">{txn.date}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Discount</p>
                                                <p className="text-xs font-bold text-slate-700">₹{(txn.discount || 0).toFixed(2)}</p>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <p className="text-[10px] font-bold text-rose-600 uppercase">Fine</p>
                                                <p className="text-xs font-bold text-slate-700">₹0.00</p>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <p className="text-[10px] font-bold text-indigo-600 uppercase">Paid</p>
                                                <p className="text-xs font-bold text-slate-900">₹{txn.amount.toFixed(2)}</p>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Balance</p>
                                                <p className="text-xs font-bold text-slate-400">₹0.00</p>
                                            </TableCell>
                                            <TableCell className="py-2 text-right px-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full"
                                                        onClick={() => setRevertTxn(txn)}
                                                    >
                                                        <Undo2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-slate-500 hover:bg-slate-200 rounded-full"
                                                        onClick={() => setActiveReceiptTxns(transactions.filter(t => t.id === txn.id))}
                                                        title="Print Combined Receipt"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modals & Dialogs */}
            
            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IndianRupee className="w-5 h-5 text-indigo-600" />
                            Collect Fees
                        </DialogTitle>
                        <DialogDescription>
                            Enter payment details for the selected months.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right font-bold text-slate-700">Amount</Label>
                            <Input
                                id="amount"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="col-span-3 font-bold text-indigo-600"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="mode" className="text-right font-bold text-slate-700">Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Payment Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI / Online</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right font-bold text-slate-700">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="remarks" className="text-right font-bold text-slate-700">Remarks</Label>
                            <Textarea
                                id="remarks"
                                value={paymentRemarks}
                                onChange={(e) => setPaymentRemarks(e.target.value)}
                                placeholder="Any notes (e.g. Reference No)"
                                className="col-span-3 h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 shadow-md min-w-[100px]" 
                            onClick={processPayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Collect Now"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Confirmation */}
            <Dialog open={!!revertTxn} onOpenChange={(open) => !open && setRevertTxn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Confirm Revert
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to revert this payment of ₹{revertTxn?.amount}? This action cannot be undone and will restore the student's dues for this month.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setRevertTxn(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRevert} className="bg-rose-600 font-bold">Yes, Revert Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Modal Integration */}
            {activeReceiptTxns && (
                <FeeReceiptModal 
                    transactions={activeReceiptTxns}
                    allTransactions={transactions}
                    student={student}
                    schoolDetails={schoolDetails}
                    feeGroups={applicableGroups}
                    onClose={() => setActiveReceiptTxns(null)}
                />
            )}

        </div>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
