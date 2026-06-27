'use client';

import React, { useState } from 'react';
import { X, Printer, Scissors } from 'lucide-react';
import { Student, School } from '@/types';
import { Transaction, FeeGroup } from '@/types/fees';
import { numberToWords } from '@/lib/number-to-words';
import { SESSION_MONTHS, calculateMonthFinancials, isFeeApplicableForMonth, calculateFineAmount, getStudentType } from '@/lib/fees-helper';
import { cn } from '@/lib/utils';

interface FeeReceiptModalProps {
    transactions: Transaction[]; // Transactions being printed on this receipt
    allTransactions: Transaction[]; // All transactions for this student to calculate balance accurately
    student: Student;
    schoolDetails: School | null;
    feeGroups: FeeGroup[];
    lineDiscounts?: Record<string, string>;
    studentTransportInfo?: any;
    onClose: () => void;
}

const SingleReceipt = ({
    student,
    schoolDetails,
    flatFees,
    paymentMode,
    remarks,
    totalPaid,
    totalDue,
    transactionId,
    totalOverallDiscount,
    collectedBy,
    copyType
}: {
    student: Student;
    schoolDetails: School | null;
    flatFees: any[];
    paymentMode: string;
    remarks: string;
    totalPaid: number;
    totalDue: number;
    totalOverallDiscount?: number;
    transactionId: string;
    collectedBy?: string;
    copyType: 'Student Copy' | 'Office Copy';
}) => {
    const receiptDateISO = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ /g, '-').replace('--', '-').replace(',', ' ');
    const receiptNo = transactionId === '-----' ? 'INV/-----' : transactionId.startsWith('TXN-') ? "INV/000" + transactionId.split('-').pop() : transactionId;
    
    const uniqueMonths = Array.from(new Set(flatFees.map(f => f.monthLongName)));
    const monthsHeaderString = uniqueMonths.length > 0 ? `For ${uniqueMonths.join(', ')}` : 'Fees Details';

    return (
        <div className="w-full h-full flex flex-col bg-white text-black p-2 font-sans tracking-tight">
            {/* Header Area */}
            <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] italic text-gray-500">{copyType}</div>
                <div className="text-[10px] font-bold">Contact: {schoolDetails?.contactNumber || '9800781031'}</div>
            </div>
            
            <div className="text-center mb-4">
                <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-900">
                    {schoolDetails?.name || 'HERITAGE MODEL SCHOOL'}
                </h1>
                <p className="text-[9px] uppercase font-semibold text-slate-800">
                    {schoolDetails?.address || 'BARDHANBERIA, GOPALNAGAR, DIST-NORTH 24 PARGANAS, PIN-743262'}
                </p>
                <div className="text-[8px] text-black font-semibold">Email: {schoolDetails?.email || 'N/A'}</div>
            </div>

            {/* Info Box */}
            <div className="border border-black rounded-xl p-3 mb-4 text-[10px] leading-relaxed flex justify-between items-start">
                <div>
                    <div>
                        Student Name: <span className="font-bold text-[11px]">{student.name.toUpperCase()}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4">
                        <span>Student ID: <span className="font-medium text-gray-700">{student.admissionNumber}</span></span>
                        <span>Class: <span className="font-medium text-gray-700">{student.className} {student.section ? `(${student.section})` : ''}</span></span>
                        {student.rollNumber && <span>Roll: <span className="font-medium text-gray-700">{student.rollNumber}</span></span>}
                    </div>
                </div>
                <div className="text-right font-bold">
                    <div>Date: <span className="font-bold">{receiptDateISO}</span></div>
                    <div className="mt-1">Receipt No: <span className="font-bold">{receiptNo}</span></div>
                </div>
            </div>

            {/* Main Flat Table */}
            <div className="flex-1 mb-6">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-1.5 text-left font-semibold w-[46%]">{monthsHeaderString}</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[10%]">Amount</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[10%]">Fine</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[10%]">Discount applicable</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[12%]">Paid</th>
                            <th className="p-1.5 text-center font-semibold w-[12%]">Due</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            let tempOverallDiscountForDues = totalOverallDiscount || 0;
                            let tempOverallDiscountForPaid = totalOverallDiscount || 0;
                            return flatFees.map((fee, idx) => {
                                return (
                                <tr key={idx} className="border-b border-black align-top h-6">
                                    <td className="border-r border-black p-1.5 font-medium">
                                        <span className="inline-block">{fee.name} ({fee.monthShortName})</span>
                                        {fee.previousPaid > 0 && (
                                            <span className="ml-1.5 text-[8px] text-slate-500 font-bold">
                                                {fee.amount + fee.fine <= fee.previousPaid + fee.discount 
                                                    ? ((fee.currentPaid || 0) > 0 ? null : `[✓ Paid${fee.previousPaidDate ? ` on ${new Date(fee.previousPaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}]`)
                                                    : `[• Prev. Paid: ₹${fee.previousPaid.toFixed(0)}${fee.previousPaidDate ? ` on ${new Date(fee.previousPaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}]`}
                                            </span>
                                        )}
                                    </td>
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.amount > 0 ? fee.amount.toFixed(0) : ''}</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.fine > 0 ? fee.fine.toFixed(0) : ''}</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.discount > 0 ? fee.discount.toFixed(0) : ''}</td>
                                    <td className="border-r border-black p-1.5 text-center font-bold bg-slate-50/50">
                                        {(() => {
                                            const netBeforeOverall = Math.max(0, (fee.amount + fee.fine) - (fee.previousPaid + fee.discount));
                                            const remainingAfterCash = Math.max(0, netBeforeOverall - (fee.currentPaid || 0));
                                            const appliedOverall = Math.min(tempOverallDiscountForPaid, remainingAfterCash);
                                            tempOverallDiscountForPaid -= appliedOverall;
                                            const displayPaid = (fee.currentPaid || 0) + appliedOverall;
                                            return displayPaid > 0 ? displayPaid.toFixed(0) : '';
                                        })()}
                                    </td>
                                    <td className="p-1.5 text-center font-bold bg-rose-50/30">
                                        {(() => {
                                            const netBeforeOverall = Math.max(0, (fee.amount + fee.fine) - (fee.previousPaid + fee.discount));
                                            const remainingAfterCash = Math.max(0, netBeforeOverall - (fee.currentPaid || 0));
                                            const appliedOverall = Math.min(tempOverallDiscountForDues, remainingAfterCash);
                                            tempOverallDiscountForDues -= appliedOverall;
                                            const finalDue = Math.max(0, remainingAfterCash - appliedOverall);
                                            return finalDue > 0 ? finalDue.toFixed(0) : '0';
                                        })()}
                                    </td>
                                </tr>
                            );
                        })})()}
                        {/* Total Summary Row */}
                        <tr className="border-b border-black font-bold h-7 bg-slate-50">
                            <td className="border-r border-black p-1.5 text-right uppercase tracking-wider text-[9px]">Total</td>
                            <td className="border-r border-black p-1.5 text-center">{flatFees.reduce((s, f) => s + (f.amount || 0), 0).toFixed(0)}</td>
                            <td className="border-r border-black p-1.5 text-center">{flatFees.reduce((s, f) => s + (f.fine || 0), 0).toFixed(0)}</td>
                            <td className="border-r border-black p-1.5 text-center">{flatFees.reduce((s, f) => s + (f.discount || 0), 0).toFixed(0)}</td>
                            <td className="border-r border-black p-1.5 text-center bg-slate-100 font-black">
                                {(totalPaid + (totalOverallDiscount || 0)).toFixed(0)}
                            </td>
                            <td className="p-1.5 text-center bg-rose-100 font-black">
                                {Math.max(0, totalDue - (totalOverallDiscount || 0)).toFixed(0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Block */}
            <div className="mb-4">
                {(() => {
                    // For a professional receipt, Gross Amount is the total settled value (Cash + Overall Discount)
                    // This matches the "Total Paid" row in the table above
                    const totalOverallDiscountAmount = totalOverallDiscount || 0;
                    const grossAmount = totalPaid + totalOverallDiscountAmount;
                    const netPayable = totalPaid;
                    
                    // Balance Due should be the actual remaining balance for these months
                    const balanceDue = Math.max(0, totalDue - totalOverallDiscountAmount); 

                    return (
                        <table className="w-full border-collapse border border-black text-[10px]">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="border-r border-black p-1.5 w-[15%]">Mode:</td>
                                    <td className="border-r border-black p-1.5 text-center font-bold w-[41%] uppercase">{paymentMode}</td>
                                    <td className="border-r border-black p-1.5 w-[30%]">Gross Amount</td>
                                    <td className="p-1.5 text-center font-bold w-[14%]">{grossAmount.toFixed(0)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="border-r border-black p-1.5">Note:</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium italic">{remarks}</td>
                                    <td className="border-r border-black p-1.5">Over All Discount (-)</td>
                                    <td className="p-1.5 text-center font-bold text-emerald-700">{(totalOverallDiscount || 0).toFixed(0)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td colSpan={2} className="border-r border-black p-1.5 text-center text-[8px] text-gray-400 italic">
                                        Total Payable (Net) = Gross Amount - Total Discount
                                    </td>
                                    <td className="border-r border-black p-1.5 font-bold bg-slate-50">Net Payable</td>
                                    <td className="p-1.5 text-center font-bold bg-slate-50">{netPayable.toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    );
                })()}
            </div>

            {/* Footer */}
            <div className="mt-3 text-[10px] font-bold italic block">
                {(() => {
                    const words = numberToWords(totalPaid);
                    const formatted = words.split(' ').map((w, i) => {
                        if (w.toLowerCase() === 'and') return 'and';
                        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                    }).join(' ');
                    return `(In Words - Rs. ${formatted} Only)`;
                })()}
            </div>
            
            <div className="mt-12 mb-2 flex justify-between items-end text-[8px]">
                <div className="text-black font-bold uppercase text-[7px] leading-none">
                    (GENERATED BY - {collectedBy?.toUpperCase() || 'SYSTEM ADMIN'})
                </div>
                <div className="text-center font-bold border-t border-black w-40 pt-1 uppercase tracking-wider text-[10px]">
                    AUTHORIZED SIGN
                </div>
            </div>
        </div>
    );
};

const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({ transactions, allTransactions, student, schoolDetails, feeGroups, lineDiscounts = {}, studentTransportInfo, onClose }) => {
    const getFlattenedInvoiceDataForGroup = (groupTxns: Transaction[]) => {
        const startMonth = (schoolDetails as any)?.sessionStartMonth || 1;
        const monthGroups: Record<number, Transaction[]> = {};
        groupTxns.forEach(t => {
            if (!monthGroups[t.monthIndex]) monthGroups[t.monthIndex] = [];
            monthGroups[t.monthIndex].push(t);
        });

        const allMonthTransactions: Record<number, Transaction[]> = {};
        allTransactions.forEach(t => {
            if (t.studentId === student.id) {
                if (!allMonthTransactions[t.monthIndex]) allMonthTransactions[t.monthIndex] = [];
                allMonthTransactions[t.monthIndex].push(t);
            }
        });

        const flatFees: any[] = [];
        let grandTotalPaid = 0;
        let grandTotalDue = 0;
        let invoiceMode = 'N/A';
        let invoiceRemarks = 'N/A';
        let invoiceTransactionId = '-----';
        let invoiceCollectedBy = 'SYSTEM ADMIN';

        const totalOverallDiscountAmount = groupTxns.reduce((sum, t) => sum + (t.overallDiscount || 0), 0);
        const studentType = getStudentType(student);

        Object.entries(monthGroups).forEach(([mIdx, currentTxns]) => {
            const index = parseInt(mIdx);
            
            if (invoiceMode === 'N/A') {
                invoiceMode = currentTxns[0]?.mode || 'N/A';
                invoiceRemarks = currentTxns[0]?.remarks || currentTxns[0]?.reference || 'N/A';
                invoiceTransactionId = currentTxns[0]?.invoiceNo || currentTxns[0]?.id || '-----';
                invoiceCollectedBy = currentTxns[0]?.collectedBy || 'SYSTEM ADMIN';
            }

            const monthInfo = SESSION_MONTHS.find(m => m.index === index);
            const monthLongName = monthInfo?.full || `Month ${index + 1}`;
            const monthShortName = monthInfo?.name || `M${index + 1}`;

            const allMonthTxns = allMonthTransactions[index] || [];
            let remainingCurrentPaid = currentTxns.filter(t => !t.feeName).reduce((sum, t) => sum + t.amount, 0);
            let remainingCurrentDiscount = currentTxns.filter(t => !t.feeName).reduce((sum, t) => sum + (t.discount || 0), 0);
            const currentTxnIds = new Set(currentTxns.map(t => t.id));
            const firstCurrentTxnIndex = allMonthTxns.findIndex(t => currentTxnIds.has(t.id));
            const pastTxns = firstCurrentTxnIndex >= 0 ? allMonthTxns.slice(0, firstCurrentTxnIndex) : [];
            
            const pastMatched: Record<string, number> = {};
            const pastMatchedDate: Record<string, string> = {};
            let pastPool = 0;
            let pastPoolDate = '';

            pastTxns.forEach(t => {
                if (t.feeName) {
                    pastMatched[t.feeName] = (pastMatched[t.feeName] || 0) + t.amount + (t.discount || 0);
                    pastMatchedDate[t.feeName] = t.date;
                } else {
                    pastPool += t.amount + (t.discount || 0);
                    pastPoolDate = t.date;
                }
            });

            let monthNetDue = 0;

            feeGroups.forEach(group => {
                const sortedFees = [...group.fees].sort((a, b) => {
                    const priority: Record<string, number> = {
                        "Admission Fee": 1,
                        "Examination Fee": 2,
                        "Tuition Fee": 3,
                        "Library Fee": 4,
                        "Sports Fee": 5,
                        "Transportation Fee": 6,
                        "Miscellaneous Fee": 7
                    };
                    return (priority[a.feeName] || 99) - (priority[b.feeName] || 99);
                });

                sortedFees.forEach(fee => {
                    if (isFeeApplicableForMonth(fee, index, startMonth, studentType)) {
                        const fineAmt = calculateFineAmount(fee, index, startMonth, new Date());
                        const baseAmt = fee.amount;
                        const itemGross = baseAmt + fineAmt;

                        const matchingTxns = currentTxns.filter(t => t.feeName === fee.feeName);
                        const matchedPaid = matchingTxns.reduce((sum, t) => sum + t.amount, 0);
                        const matchedDiscount = matchingTxns.reduce((sum, t) => sum + (t.discount || 0), 0);

                        const assignedPastMatched = Math.min(pastMatched[fee.feeName] || 0, itemGross);
                        const matchedDate = pastMatchedDate[fee.feeName];
                        if (pastMatched[fee.feeName]) pastMatched[fee.feeName] -= assignedPastMatched;

                        let itemRemaining = Math.max(0, itemGross - assignedPastMatched);

                        const assignedPastPool = Math.min(pastPool, itemRemaining);
                        const poolDate = pastPoolDate;
                        pastPool -= assignedPastPool;
                        itemRemaining = Math.max(0, itemRemaining - assignedPastPool);

                        const totalAssignedPast = assignedPastMatched + assignedPastPool;
                        const displayPastDate = assignedPastMatched > 0 ? matchedDate : (assignedPastPool > 0 ? poolDate : undefined);
                        
                        const usedMatchedDiscount = Math.min(matchedDiscount, itemRemaining);
                        const takenFromPoolDiscount = Math.min(remainingCurrentDiscount, itemRemaining - usedMatchedDiscount);
                        
                        const assignedCurrentDiscount = usedMatchedDiscount + takenFromPoolDiscount;
                        remainingCurrentDiscount -= takenFromPoolDiscount;
                        itemRemaining = Math.max(0, itemRemaining - assignedCurrentDiscount);

                        const usedMatchedPaid = Math.min(matchedPaid, itemRemaining);
                        const takenFromPoolPaid = Math.min(remainingCurrentPaid, itemRemaining - usedMatchedPaid);

                        const assignedCurrentPaid = usedMatchedPaid + takenFromPoolPaid;
                        remainingCurrentPaid -= takenFromPoolPaid;
                        itemRemaining = Math.max(0, itemRemaining - assignedCurrentPaid);

                        monthNetDue += itemRemaining;

                        if (assignedCurrentPaid > 0 || assignedCurrentDiscount > 0 || totalAssignedPast > 0) {
                            flatFees.push({
                                monthIndex: index,
                                monthLongName,
                                monthShortName,
                                name: fee.feeName,
                                amount: baseAmt,
                                fine: fineAmt,
                                discount: assignedCurrentDiscount,
                                previousPaid: totalAssignedPast,
                                previousPaidDate: displayPastDate,
                                currentPaid: assignedCurrentPaid
                            });
                        }
                    }
                });
            });

            if (studentTransportInfo && studentTransportInfo.monthlyFee > 0) {
                const transportTxns = allMonthTransactions[index] || [];
                const pastTransportTxns = transportTxns.filter(t => t.feeName === 'Transport Fee' && !currentTxns.some(ct => ct.id === t.id));
                const currentTransportTxns = currentTxns.filter(t => t.feeName === 'Transport Fee');

                const pastPaid = pastTransportTxns.reduce((sum, t) => sum + t.amount, 0);
                const pastDiscount = pastTransportTxns.reduce((sum, t) => sum + (t.discount || 0), 0);
                const currentPaid = currentTransportTxns.reduce((sum, t) => sum + t.amount, 0);
                const currentDiscount = currentTransportTxns.reduce((sum, t) => sum + (t.discount || 0), 0);
                const pastTransportDate = pastTransportTxns.length > 0 ? pastTransportTxns[pastTransportTxns.length - 1].date : undefined;
                const currentFine = currentTransportTxns.reduce((sum, t) => sum + ((t as any).fine || 0), 0);
                const baseAmount = currentTransportTxns.length > 0
                    ? currentTransportTxns[0].baseAmount || studentTransportInfo.monthlyFee
                    : studentTransportInfo.monthlyFee;

                const itemRemaining = Math.max(0, baseAmount + currentFine - (pastPaid + pastDiscount + currentPaid + currentDiscount));
                monthNetDue += itemRemaining;

                flatFees.push({
                    monthIndex: index,
                    monthLongName,
                    monthShortName,
                    name: 'Transport Fee',
                    amount: baseAmount,
                    fine: currentFine,
                    discount: currentDiscount,
                    previousPaid: pastPaid + pastDiscount,
                    previousPaidDate: pastTransportDate,
                    currentPaid: currentPaid,
                    isTransport: true
                });
            }

            const allGroupFeeNames = new Set(feeGroups.flatMap(g => g.fees.map(f => f.feeName)));
            const orphanNamedTxns = currentTxns.filter(t => t.feeName && t.feeName !== 'Transport Fee' && !allGroupFeeNames.has(t.feeName));
            if (orphanNamedTxns.length > 0) {
                const orphanByName: Record<string, typeof orphanNamedTxns> = {};
                orphanNamedTxns.forEach(t => {
                    const name = t.feeName!;
                    if (!orphanByName[name]) orphanByName[name] = [];
                    orphanByName[name].push(t);
                });
                Object.entries(orphanByName).forEach(([feeName, txns]) => {
                    const paid = txns.reduce((sum, t) => sum + t.amount, 0);
                    const discount = txns.reduce((sum, t) => sum + ((t as any).discount || 0), 0);
                    flatFees.push({
                        monthIndex: index,
                        monthLongName,
                        monthShortName,
                        name: feeName,
                        amount: paid + discount,
                        fine: 0,
                        discount,
                        previousPaid: 0,
                        currentPaid: paid
                    });
                });
            }

            grandTotalPaid += currentTxns.reduce((sum, t) => sum + t.amount, 0);
            grandTotalDue += monthNetDue;
        });

        flatFees.sort((a, b) => {
            const relA = (a.monthIndex - (startMonth - 1) + 12) % 12;
            const relB = (b.monthIndex - (startMonth - 1) + 12) % 12;
            return relA - relB;
        });

        return { flatFees, grandTotalPaid, grandTotalDue, grandOverallDiscount: totalOverallDiscountAmount, invoiceMode, invoiceRemarks, invoiceTransactionId, invoiceCollectedBy };
    };

    const invoiceGroups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
        const key = t.invoiceNo || t.id;
        if (!invoiceGroups[key]) invoiceGroups[key] = [];
        invoiceGroups[key].push(t);
    });

    const groupList = Object.values(invoiceGroups).sort((a, b) => new Date(a[0].date).getTime() - new Date(b[0].date).getTime());

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0 no-print">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span>Receipt Preview</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                            {groupList.length > 1 ? `Batch Print: ${groupList.length} Receipts` : 'Landscape A4 / Portrait A5'}
                        </span>
                    </h2>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold transition shadow-sm"
                        >
                            <Printer size={16} /> Print {groupList.length > 1 ? 'All Selected' : 'Receipt'}
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full flex items-start justify-center p-4 sm:p-10 hide-scroll bg-slate-100">
                    <style jsx global>{`
                        @media print {
                            body * { visibility: hidden; }
                            #printable-dual {
                                visibility: visible !important;
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            #printable-dual * { visibility: visible; }
                            .no-print { display: none !important; }
                            @page { size: auto; margin: 5mm; }
                            .print-break-inside-avoid { break-inside: avoid; }
                        }
                    `}</style>

                    <div id="printable-dual" className="w-full max-w-[297mm] flex flex-col gap-8 print:gap-0 bg-transparent text-black mx-auto print:shadow-none">
                        {groupList.map((groupTxns, groupIdx) => {
                            const { flatFees, grandTotalPaid, grandTotalDue, grandOverallDiscount, invoiceMode, invoiceRemarks, invoiceTransactionId, invoiceCollectedBy } = getFlattenedInvoiceDataForGroup(groupTxns);
                            return (
                                <div 
                                    key={groupIdx} 
                                    className={cn(
                                        "flex flex-col lg:flex-row print:flex-row flex-wrap lg:flex-nowrap print:flex-nowrap w-full bg-white shadow-lg print:shadow-none p-6 print:p-0 relative rounded-2xl print:rounded-none",
                                        groupIdx < groupList.length - 1 ? "print:break-after-page" : ""
                                    )}
                                    style={groupIdx < groupList.length - 1 ? { pageBreakAfter: 'always' } : undefined}
                                >
                                    <div className="w-full lg:w-1/2 print:w-1/2 p-4 lg:p-6 lg:border-r border-dashed border-gray-400 print:border-r border-b lg:border-b-0 print:border-b-0 print-break-inside-avoid">
                                        <SingleReceipt
                                            student={student}
                                            schoolDetails={schoolDetails}
                                            flatFees={flatFees}
                                            paymentMode={invoiceMode}
                                            remarks={invoiceRemarks}
                                            totalPaid={grandTotalPaid}
                                            totalDue={grandTotalDue}
                                            totalOverallDiscount={grandOverallDiscount}
                                            transactionId={invoiceTransactionId}
                                            collectedBy={invoiceCollectedBy}
                                            copyType="Office Copy"
                                        />
                                    </div>
                                    <div className="hidden lg:flex print:flex absolute left-1/2 top-4 bottom-4 -translate-x-1/2 flex-col justify-center items-center gap-8 opacity-40 z-10 no-print">
                                        <Scissors size={14} className="rotate-90 text-gray-500" />
                                    </div>
                                    <div className="w-full lg:w-1/2 print:w-1/2 p-4 lg:p-6 print-break-inside-avoid shadow-inner lg:shadow-none print:shadow-none">
                                        <SingleReceipt
                                            student={student}
                                            schoolDetails={schoolDetails}
                                            flatFees={flatFees}
                                            paymentMode={invoiceMode}
                                            remarks={invoiceRemarks}
                                            totalPaid={grandTotalPaid}
                                            totalDue={grandTotalDue}
                                            totalOverallDiscount={grandOverallDiscount}
                                            transactionId={invoiceTransactionId}
                                            collectedBy={invoiceCollectedBy}
                                            copyType="Student Copy"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeReceiptModal;
