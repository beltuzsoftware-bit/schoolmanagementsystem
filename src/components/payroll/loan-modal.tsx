'use client';

import React, { useState } from 'react';
import {
    X,
    HandCoins,
    Landmark,
    CheckCircle2,
    ArrowRightCircle,
    Printer,
    DollarSign,
    Plus,
    Info,
    UserCheck,
    MessageSquareQuote
} from 'lucide-react';
import { StaffProfile, Loan } from '@/types/staff';
import { User, School } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import LoanReceiptModal, { LoanTransactionReceipt } from '@/components/payroll/loan-receipt-modal';

interface LoanModalProps {
    staff: StaffProfile;
    user: User;
    school: School;
    onClose: () => void;
    onAddLoan: (staffId: string, loan: Omit<Loan, 'id' | 'remainingAmount'>) => Promise<any>;
    onSettleLoan: (staffId: string, loanId: string) => Promise<any>;
    onRepayLoan: (staffId: string, loanId: string, amount: number) => Promise<any>;
}

const LoanModal: React.FC<LoanModalProps> = ({ staff, user, school, onClose, onAddLoan, onSettleLoan, onRepayLoan }) => {
    const [amount, setAmount] = useState('');
    const [emi, setEmi] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [approvedBy, setApprovedBy] = useState('');
    const [note, setNote] = useState('');
    const [repaymentAmounts, setRepaymentAmounts] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for printable receipt
    const [receiptData, setReceiptData] = useState<LoanTransactionReceipt | null>(null);
    const [showSuccessAction, setShowSuccessAction] = useState<{ type: 'DISBURSEMENT' | 'REPAYMENT', amount: number } | null>(null);

    const currencySymbol = getCurrencySymbol(school.currency);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !emi || !startDate || !approvedBy || isSubmitting) return;

        setIsSubmitting(true);
        const val = parseFloat(amount);
        const emiVal = parseFloat(emi);

        const res = await onAddLoan(staff.id, {
            amount: val,
            emi: emiVal,
            startDate: startDate,
            approvedBy: approvedBy,
            note: note
        });

        if (res?.success) {
            // Prepare data for immediate printing
            setReceiptData({
                type: 'DISBURSEMENT',
                amount: val,
                emi: emiVal,
                date: startDate,
                remainingBalance: (activeLoans.reduce((acc, l) => acc + l.remainingAmount, 0)) + val,
                approvedBy: approvedBy,
                note: note
            });

            setShowSuccessAction({ type: 'DISBURSEMENT', amount: val });

            setAmount('');
            setEmi('');
            setApprovedBy('');
            setNote('');
        }
        setIsSubmitting(false);
    };

    const handleManualRepay = async (loanId: string) => {
        const val = parseFloat(repaymentAmounts[loanId]);
        if (isNaN(val) || val <= 0 || isSubmitting) return;

        const targetLoan = staff.loans.find(l => l.id === loanId);
        if (!targetLoan) return;

        setIsSubmitting(true);
        const res = await onRepayLoan(staff.id, loanId, val);

        if (res?.success) {
            setReceiptData({
                type: 'REPAYMENT',
                amount: val,
                date: new Date().toISOString().split('T')[0],
                remainingBalance: Math.max(0, targetLoan.remainingAmount - val),
                loanId: loanId,
                approvedBy: targetLoan.approvedBy
            });

            setShowSuccessAction({ type: 'REPAYMENT', amount: val });
            setRepaymentAmounts(prev => ({ ...prev, [loanId]: '' }));
        }
        setIsSubmitting(false);
    };

    const handleSettleFull = async (loanId: string) => {
        const targetLoan = staff.loans.find(l => l.id === loanId);
        if (!targetLoan || isSubmitting) return;

        setIsSubmitting(true);
        const val = targetLoan.remainingAmount;
        const res = await onSettleLoan(staff.id, loanId);

        if (res?.success) {
            setReceiptData({
                type: 'REPAYMENT',
                amount: val,
                date: new Date().toISOString().split('T')[0],
                remainingBalance: 0,
                loanId: loanId,
                approvedBy: targetLoan.approvedBy
            });

            setShowSuccessAction({ type: 'REPAYMENT', amount: val });
        }
        setIsSubmitting(false);
    };

    const activeLoans = staff.loans?.filter(l => l.remainingAmount > 0) || [];
    const settledLoans = staff.loans?.filter(l => l.remainingAmount <= 0) || [];

    const totalOutstanding = activeLoans.reduce((acc, l) => acc + l.remainingAmount, 0);
    const totalMonthlyEmi = activeLoans.reduce((acc, l) => acc + l.emi, 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            {receiptData && (
                <LoanReceiptModal
                    receipt={receiptData}
                    user={user}
                    school={school}
                    onClose={() => setReceiptData(null)}
                />
            )}

            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                            <HandCoins size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Loan & Advance Ledger</h2>
                            <p className="text-xs text-slate-500 font-medium">Employee: {user.name} ({staff.staffId || user.id})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-50" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
                    {showSuccessAction && (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-emerald-600" size={20} />
                                <span className="text-sm font-bold text-emerald-800">
                                    {showSuccessAction.type === 'DISBURSEMENT' ? 'Advance Disbursed' : 'Repayment Received'}: {currencySymbol}{showSuccessAction.amount.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setReceiptData(receiptData)}
                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5"
                                >
                                    <Printer size={14} /> Print Receipt
                                </button>
                                <button onClick={() => setShowSuccessAction(null)} className="text-emerald-400 hover:text-emerald-600">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Combined Outstanding</p>
                            <h4 className="text-3xl font-black text-slate-800">{currencySymbol}{totalOutstanding.toLocaleString()}</h4>
                            <p className="text-[10px] text-slate-400 mt-2">Sum of all active advances</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Monthly Payroll Deduction</p>
                            <h4 className="text-3xl font-black text-indigo-700">{currencySymbol}{totalMonthlyEmi.toLocaleString()}</h4>
                            <p className="text-[10px] text-indigo-400/60 mt-2">Combined EMI from all active loans</p>
                        </div>
                    </div>

                    {/* Active Loans Section */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Landmark size={14} /> Active Advances ({activeLoans.length})
                        </h3>
                        {activeLoans.length > 0 ? (
                            <div className="space-y-4">
                                {activeLoans.map((loan) => (
                                    <div key={loan.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                                    <ArrowRightCircle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Issued: {loan.startDate}</p>
                                                    <p className="text-xs text-slate-500">Original Amount: {currencySymbol}{loan.amount.toLocaleString()}</p>
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase mt-1">By: {loan.approvedBy}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-800">{currencySymbol}{loan.remainingAmount.toLocaleString()}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Remaining Balance</p>
                                            </div>
                                        </div>

                                        {loan.note && (
                                            <div className="px-3 py-2 bg-slate-50 border-l-4 border-slate-200 rounded text-[11px] text-slate-500 italic">
                                                "{loan.note}"
                                            </div>
                                        )}

                                        <div className="flex flex-col md:flex-row gap-4 items-end pt-2 border-t border-slate-50">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Manual Payback (Cash/Bank)</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold">{currencySymbol}</span>
                                                        <input
                                                            type="number"
                                                            value={repaymentAmounts[loan.id] || ''}
                                                            onChange={(e) => setRepaymentAmounts(prev => ({ ...prev, [loan.id]: e.target.value }))}
                                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            placeholder="Amount to repay"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleManualRepay(loan.id)}
                                                        disabled={isSubmitting}
                                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                                                    >
                                                        Pay
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setReceiptData({
                                                            type: 'DISBURSEMENT',
                                                            amount: loan.amount,
                                                            date: loan.startDate,
                                                            remainingBalance: loan.remainingAmount,
                                                            emi: loan.emi,
                                                            loanId: loan.id,
                                                            approvedBy: loan.approvedBy,
                                                            note: loan.note
                                                        })
                                                    }}
                                                    title="Print Original Voucher"
                                                    className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleSettleFull(loan.id)}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2 rounded-lg border border-emerald-200 text-emerald-600 text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Settle Full
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                <p className="text-sm text-slate-400">No active advances currently.</p>
                            </div>
                        )}
                    </section>

                    {/* New Loan Form */}
                    <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                        <h3 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
                            <Plus size={16} /> Issue Additional Advance
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-700 uppercase">Principal Amount ({currencySymbol})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm font-bold">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                                            placeholder="e.g. 2000"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-700 uppercase">Monthly EMI Deduction ({currencySymbol})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm font-bold">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={emi}
                                            onChange={(e) => setEmi(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                                            placeholder="e.g. 200"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-700 uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 space-y-1">
                                    <label className="text-[10px] font-bold text-amber-700 uppercase">Approved By (Official Name)</label>
                                    <div className="relative">
                                        <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                                        <input
                                            type="text"
                                            value={approvedBy}
                                            onChange={(e) => setApprovedBy(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                                            placeholder="Admin Name"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-amber-700 uppercase">Note / Reason</label>
                                    <div className="relative">
                                        <MessageSquareQuote size={14} className="absolute left-3 top-3 text-amber-400" />
                                        <textarea
                                            rows={1}
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white min-h-[40px]"
                                            placeholder="Reason for advance..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <HandCoins size={18} /> Authorize & Issue Advance
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Settled / History Section */}
                    {settledLoans.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Repayment History</h3>
                            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                                {settledLoans.map(loan => (
                                    <div key={loan.id} className="p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">Advance of {currencySymbol}{loan.amount.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-400">Issued by {loan.approvedBy} on {loan.startDate}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded">Fully Settled</span>
                                            <button
                                                onClick={() => {
                                                    setReceiptData({
                                                        type: 'REPAYMENT',
                                                        amount: loan.amount,
                                                        date: new Date().toISOString().split('T')[0],
                                                        remainingBalance: 0,
                                                        loanId: loan.id,
                                                        approvedBy: loan.approvedBy,
                                                        note: loan.note
                                                    })
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"
                                            >
                                                <Printer size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Info size={14} />
                        Advances are auto-deducted during payroll unless settled manually.
                    </div>
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanModal;
