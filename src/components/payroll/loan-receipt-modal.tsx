'use client';

import React from 'react';
import { X, Printer, Landmark, CheckCircle2, ShieldCheck, ArrowUpRight, ArrowDownLeft, UserCheck, MessageSquareQuote } from 'lucide-react';
import { User, School } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';

export interface LoanTransactionReceipt {
    type: 'DISBURSEMENT' | 'REPAYMENT';
    amount: number;
    date: string;
    remainingBalance: number;
    emi?: number;
    loanId?: string;
    approvedBy?: string;
    note?: string;
}

interface LoanReceiptModalProps {
    receipt: LoanTransactionReceipt;
    user: User;
    school: School;
    onClose: () => void;
}

const LoanReceiptModal: React.FC<LoanReceiptModalProps> = ({ receipt, user, school, onClose }) => {
    React.useEffect(() => {
        const originalTitle = document.title;
        const safeDate = receipt.date.replace(/\//g, '-');
        document.title = `Receipt_${user.name.replace(/\s+/g, '_')}_${receipt.type}_${safeDate}`;

        return () => {
            document.title = originalTitle;
        };
    }, [user.name, receipt.type, receipt.date]);

    const handlePrint = () => {
        window.print();
    };

    const isDisbursement = receipt.type === 'DISBURSEMENT';
    const currencySymbol = getCurrencySymbol(school.currency);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">
                            {isDisbursement ? 'Loan Disbursement' : 'Repayment Receipt'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition-all shadow-md shadow-amber-100"
                        >
                            <Printer size={16} /> Print Voucher
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Printable Area */}
                <div className="flex-1 overflow-y-auto p-10 bg-white" id="printable-loan-receipt">
                    <div className="border-2 border-slate-200 p-8 rounded-xl relative overflow-hidden print:border-slate-300">
                        {/* Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03] select-none">
                            <Landmark size={300} />
                        </div>

                        {/* School Header */}
                        <div className="flex justify-between items-start mb-8 pb-6 border-b border-dashed border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl font-black">
                                    {school.logo ? (
                                        <img src={school.logo} alt="Logo" className="w-8 h-8 object-contain invert" />
                                    ) : (
                                        school.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{school.name}</h1>
                                    <p className="text-slate-500 text-[10px] font-medium">FINANCE DEPARTMENT - STAFF WELFARE</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isDisbursement ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isDisbursement ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                    {receipt.type}
                                </div>
                                <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase">No: {receipt.loanId || 'ADV-' + Date.now().toString().slice(-6)}</p>
                            </div>
                        </div>

                        {/* Voucher Body */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Employee Details</p>
                                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                    <p className="text-xs text-slate-500">Staff ID: {user.id}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Transaction Date</p>
                                    <p className="text-sm font-bold text-slate-800">{receipt.date}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 font-medium">
                                        {isDisbursement ? 'Advance Amount Issued:' : 'Repayment Amount Received:'}
                                    </span>
                                    <span className="text-2xl font-black text-slate-900">{currencySymbol}{receipt.amount.toLocaleString()}</span>
                                </div>

                                {receipt.emi && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Agreed Monthly EMI:</span>
                                        <span className="font-bold text-slate-800">{currencySymbol}{receipt.emi.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">Remaining Loan Balance:</span>
                                    <span className="text-lg font-black text-indigo-600">{currencySymbol}{receipt.remainingBalance.toLocaleString()}</span>
                                </div>
                            </div>

                            {receipt.approvedBy && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                    <UserCheck size={14} className="text-indigo-600" />
                                    <p className="text-[10px] text-slate-600 font-medium">
                                        <span className="font-bold uppercase text-indigo-700">Approved By:</span> {receipt.approvedBy}
                                    </p>
                                </div>
                            )}

                            {receipt.note && (
                                <div className="flex gap-2 items-start bg-slate-50/50 p-3 rounded-lg border border-slate-100 italic">
                                    <MessageSquareQuote size={16} className="text-slate-300 shrink-0" />
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        <span className="font-bold uppercase text-[9px] block mb-1 text-slate-400 not-italic">Note:</span>
                                        {receipt.note}
                                    </p>
                                </div>
                            )}

                            <div className="text-[10px] text-slate-400 italic">
                                {isDisbursement
                                    ? "Note: This advance is subject to monthly payroll deductions as per the agreed EMI. Interest-free staff benefit."
                                    : "Note: This is a manual repayment receipt. The balance has been updated in the staff ledger."}
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-10 mt-12 pt-8">
                                <div className="border-t border-slate-200 text-center pt-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Recipient Signature</p>
                                </div>
                                <div className="border-t border-slate-200 text-center pt-3">
                                    <div className="flex justify-center items-center gap-1 text-indigo-600 mb-1">
                                        <ShieldCheck size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Authorized</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Finance Officer</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #printable-loan-receipt { padding: 0 !important; }
        }
      `}</style>
        </div>
    );
};

export default LoanReceiptModal;
