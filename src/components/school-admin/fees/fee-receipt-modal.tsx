'use client';

import React from 'react';
import { X, Printer, Scissors } from 'lucide-react';
import { Student, School } from '@/types';
import { Transaction, FeeGroup } from '@/types/fees';
import { numberToWords } from '@/lib/number-to-words';
import { SESSION_MONTHS, isFeeApplicableForMonth, calculateFineAmount } from '@/lib/fees-helper';
import { StudentTransportFeeInfo } from '@/app/actions/transport';

interface FeeReceiptModalProps {
    transactions: Transaction[]; // Transactions being printed on this receipt
    allTransactions: Transaction[]; // All transactions for this student to calculate balance accurately
    student: Student;
    schoolDetails: School | null;
    feeGroups: FeeGroup[];
    lineDiscounts?: Record<string, string>;
    excludedFees?: Record<string, boolean>;
    studentTransportInfo?: StudentTransportFeeInfo | null;
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
    totalLineDiscount,
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
    totalLineDiscount?: number;
    transactionId: string;
    copyType: 'Student Copy' | 'Office Copy';
}) => {
    const receiptDateISO = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ /g, '-').replace('--', '-').replace(',', ' ');
    const receiptNo = transactionId === '-----' ? 'INV/-----' : transactionId.startsWith('TXN-') ? "INV/000" + transactionId.split('-').pop() : transactionId;
    
    const uniqueMonths = Array.from(new Set(flatFees.map(f => f.monthLongName)));
    const monthsHeaderString = uniqueMonths.length > 0 ? `For ${uniqueMonths.join(', ')}` : 'Fees Details';
    const showPreviousDue = flatFees.some(fee => fee.previousDue > 0);

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
            <div className="border border-black rounded-xl p-3 mb-4 text-[10px] leading-relaxed">
                <div className="flex justify-between font-bold">
                    <div>Receipt No: <span className="font-bold">{receiptNo}</span></div>
                    <div>Date: <span className="font-bold">{receiptDateISO}</span></div>
                </div>
                <div className="mt-1">
                    Student Name: <span className="font-bold text-[11px]">{student.name.toUpperCase()}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-4">
                    <span>Student ID: <span className="font-medium text-gray-700">{student.admissionNumber}</span></span>
                    <span>Class: <span className="font-medium text-gray-700">{student.className} {student.section ? `(${student.section})` : ''}</span></span>
                    {student.rollNumber && <span>Roll: <span className="font-medium text-gray-700">{student.rollNumber}</span></span>}
                </div>
            </div>

            {/* Main Flat Table */}
            <div className="flex-1 mb-6">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-1.5 text-left font-semibold w-[35%]">{monthsHeaderString}</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold">Amount</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold">Fine</th>
                            {showPreviousDue && (
                                <th className="border-r border-black p-1.5 text-center font-semibold">P. Due</th>
                            )}
                            <th className="border-r border-black p-1.5 text-center font-semibold">Discount</th>
                            <th className="p-1.5 text-center font-semibold">Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flatFees.map((fee, idx) => {
                            return (
                                <tr key={idx} className="border-b border-black align-top h-6">
                                    <td className="border-r border-black p-1.5 font-medium">{fee.name} ({fee.monthShortName})</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.amount > 0 ? fee.amount.toFixed(0) : ''}</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.fine > 0 ? fee.fine.toFixed(0) : ''}</td>
                                    {showPreviousDue && (
                                        <td className="border-r border-black p-1.5 text-center font-medium bg-slate-50/30 font-semibold">{fee.previousDue > 0 ? fee.previousDue.toFixed(0) : ''}</td>
                                    )}
                                    <td className="border-r border-black p-1.5 text-center font-medium">{fee.discount > 0 ? fee.discount.toFixed(0) : ''}</td>
                                    <td className="p-1.5 text-center font-bold bg-slate-50/50">{fee.currentPaid > 0 ? fee.currentPaid.toFixed(0) : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Block */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-1.5 w-[15%]">Mode:</td>
                            <td className="border-r border-black p-1.5 text-center font-bold w-[35%] uppercase">{paymentMode}</td>
                            <td className="border-r border-black p-1.5 w-[35%]">Paid Amount</td>
                            <td className="p-1.5 text-center font-bold bg-green-50 w-[15%]">{totalPaid > 0 ? totalPaid.toFixed(0) : '0'}</td>
                        </tr>
                        {(totalLineDiscount || 0) > 0 && (
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1.5">Note:</td>
                                <td className="border-r border-black p-1.5 text-center font-medium italic">{remarks}</td>
                                <td className="border-r border-black p-1.5 font-bold text-green-700 italic">Discount (-)</td>
                                <td className="p-1.5 text-center font-bold bg-green-50 text-green-700 italic">{(totalLineDiscount || 0).toFixed(0)}</td>
                            </tr>
                        )}
                        {totalOverallDiscount ? (
                            <tr className="border-b border-black">
                                {(totalLineDiscount || 0) > 0 ? (
                                    <td colSpan={2} className="border-r border-black p-1.5 text-center text-[8px] text-gray-400 italic">
                                        Additional manual discount applied.
                                    </td>
                                ) : (
                                    <>
                                        <td className="border-r border-black p-1.5">Note:</td>
                                        <td className="border-r border-black p-1.5 text-center font-medium italic">{remarks}</td>
                                    </>
                                )}
                                <td className="border-r border-black p-1.5 font-bold text-green-700 italic">Over All Discount (-)</td>
                                <td className="p-1.5 text-center font-bold bg-green-50 text-green-700 italic">{totalOverallDiscount.toFixed(0)}</td>
                            </tr>
                        ) : null}
                        <tr>
                            {!(totalLineDiscount || 0) && !totalOverallDiscount && (
                                <>
                                    <td className="border-r border-black p-1.5">Note:</td>
                                    <td className="border-r border-black p-1.5 text-center font-medium italic">{remarks}</td>
                                </>
                            )}
                            {((totalLineDiscount || 0) > 0 || !!totalOverallDiscount) && (
                                <td colSpan={2} className="border-r border-black p-1.5 text-center text-[8px] text-gray-400 italic">
                                    Total Payable reduced by discount.
                                </td>
                            )}
                            <td className="border-r border-black p-1.5">Due Amount</td>
                            <td className="p-1.5 text-center font-bold bg-red-50">{totalDue > 0 ? totalDue.toFixed(0) : '0'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-3 text-[10px] font-bold italic block">
                (In Words - Rs. {numberToWords(totalPaid).toLowerCase()} only)
            </div>
            
            <div className="mt-12 mb-2 flex justify-between items-end text-[8px]">
                <div className="text-black font-bold uppercase text-[7px] leading-none">
                    (GENERATED BY - SUPER USER)
                </div>
                <div className="text-center font-bold border-t border-black w-40 pt-1 uppercase tracking-wider text-[10px]">
                    AUTHORIZED SIGN
                </div>
            </div>
        </div>
    );
};

const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({ transactions, allTransactions, student, schoolDetails, feeGroups, lineDiscounts = {}, excludedFees = {}, studentTransportInfo, onClose }) => {
    const getFlattenedInvoiceData = () => {
        const startMonth = (schoolDetails as any)?.sessionStartMonth || 4;
        const monthGroups: Record<number, Transaction[]> = {};
        transactions.forEach(t => {
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
        let grandOverallDiscount = 0;
        let grandTotalLineDiscount = 0;
        let invoiceMode = 'N/A';
        let invoiceRemarks = 'N/A';
        let invoiceTransactionId = '-----';


        Object.entries(monthGroups).forEach(([mIdx, currentTxns]) => {
            const index = parseInt(mIdx);

            if (invoiceMode === 'N/A') {
                invoiceMode = currentTxns[0]?.mode || 'N/A';
                invoiceRemarks = currentTxns[0]?.remarks || (currentTxns[0] as any)?.reference || 'N/A';
                invoiceTransactionId = currentTxns[0]?.invoiceNo || currentTxns[0]?.id || '-----';
            }
            grandOverallDiscount += currentTxns.reduce((sum, t) => sum + ((t as any).overallDiscount || 0), 0);

            const monthInfo = SESSION_MONTHS.find(m => m.index === index);
            const monthLongName = monthInfo?.full || `Month ${index + 1}`;
            const monthShortName = monthInfo?.name || `M${index + 1}`;

            const allMonthTxns = allMonthTransactions[index] || [];
            const currentTxnIds = new Set(currentTxns.map(t => t.id));

            // --- TRANSACTION-DRIVEN RECEIPT ---
            // Only show fee rows that appear in the current receipt transactions
            // This prevents showing fees not collected in this payment

            // Build per-feeName aggregates from current receipt transactions
            const perFeeTxnData: Record<string, {
                amount: number;
                discount: number;
                overallDiscount: number;
                baseAmount: number;
                fine: number;
            }> = {};

            currentTxns.forEach(t => {
                const key = t.feeName || 'Unknown Fee';
                if (!perFeeTxnData[key]) {
                    perFeeTxnData[key] = { amount: 0, discount: 0, overallDiscount: 0, baseAmount: 0, fine: 0 };
                }
                perFeeTxnData[key].amount += t.amount;
                perFeeTxnData[key].discount += (t.discount || 0);
                perFeeTxnData[key].overallDiscount += ((t as any).overallDiscount || 0);
                // Use max of stored baseAmount (in case of multiple txns for same fee)
                if ((t as any).baseAmount > perFeeTxnData[key].baseAmount) {
                    perFeeTxnData[key].baseAmount = (t as any).baseAmount;
                }
                if ((t as any).fine > perFeeTxnData[key].fine) {
                    perFeeTxnData[key].fine = (t as any).fine;
                }
            });

            // Build past settled amounts per fee (transactions NOT in this receipt)
            const pastTxns = allMonthTxns.filter(t => !currentTxnIds.has(t.id));
            const perFeePastSettled: Record<string, number> = {};
            pastTxns.forEach(t => {
                const key = t.feeName || 'Unknown Fee';
                perFeePastSettled[key] = (perFeePastSettled[key] || 0) + t.amount + (t.discount || 0) + ((t as any).overallDiscount || 0);
            });

            // Process each fee that appears in current receipt transactions
            Object.entries(perFeeTxnData).forEach(([feeName, txnData]) => {
                // Determine the display amount for this fee
                let displayAmount = txnData.baseAmount;
                let displayFine = txnData.fine;

                if (feeName !== 'Transport Fee') {
                    // Try to get the canonical fee amount from the fee groups
                    for (const group of feeGroups) {
                        if (group.assignedClasses && !group.assignedClasses.includes(student.className)) continue;
                        for (const fee of group.fees) {
                            if (fee.feeName === feeName && isFeeApplicableForMonth(fee, index, startMonth)) {
                                displayAmount = fee.amount || txnData.baseAmount;
                                displayFine = calculateFineAmount(fee, index, startMonth);
                                break;
                            }
                        }
                    }
                } else if (studentTransportInfo && studentTransportInfo.monthlyFee > 0) {
                    // For transport fee, compute pro-rata amount
                    const getOverlappingDaysInMonth = (monthIdx: number, startStr?: string, endStr?: string) => {
                        const currentYear = new Date().getFullYear();
                        const year = (monthIdx < startMonth - 1) ? currentYear + 1 : currentYear;
                        const monthStart = new Date(year, monthIdx, 1);
                        const monthEnd = new Date(year, monthIdx + 1, 0);
                        const totalDaysInMonth = monthEnd.getDate();
                        if (!startStr && !endStr) return 30;
                        const rangeStart = startStr ? new Date(startStr) : new Date(year - 5, 0, 1);
                        const rangeEnd = endStr ? new Date(endStr) : new Date(year + 5, 0, 1);
                        const intersectStart = new Date(Math.max(monthStart.getTime(), rangeStart.getTime()));
                        const intersectEnd = new Date(Math.min(monthEnd.getTime(), rangeEnd.getTime()));
                        if (intersectStart > intersectEnd) return 0;
                        const diffTime = intersectEnd.getTime() - intersectStart.getTime();
                        const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return actualDays >= totalDaysInMonth ? 30 : actualDays;
                    };
                    const daysUsed = getOverlappingDaysInMonth(index, studentTransportInfo.effectiveFrom, studentTransportInfo.effectiveUntil);
                    displayAmount = (studentTransportInfo.monthlyFee / 30) * daysUsed;
                }

                const grossAmount = displayAmount + displayFine;
                const pastSettled = perFeePastSettled[feeName] || 0;
                const remainingAfterPast = Math.max(0, grossAmount - pastSettled);

                // Total discount for this fee in this receipt
                const totalFeeDiscount = txnData.discount; // line-level discount
                const paidThisReceipt = txnData.amount;
                const overallDiscThisFee = txnData.overallDiscount;

                // Due = remaining balance after discounts and cash paid
                const itemDue = Math.max(0, remainingAfterPast - totalFeeDiscount - overallDiscThisFee - paidThisReceipt);
                grandTotalDue += itemDue;
                grandTotalPaid += paidThisReceipt;
                grandTotalLineDiscount += totalFeeDiscount;

                flatFees.push({
                    monthIndex: index,
                    monthLongName,
                    monthShortName,
                    name: feeName,
                    amount: displayAmount,
                    fine: displayFine,
                    previousDue: pastSettled > 0 ? remainingAfterPast : 0,
                    discount: totalFeeDiscount + overallDiscThisFee,
                    previousPaid: pastSettled,
                    currentPaid: paidThisReceipt
                });
            });
        });

        flatFees.sort((a, b) => {
            const relA = (a.monthIndex - (startMonth - 1) + 12) % 12;
            const relB = (b.monthIndex - (startMonth - 1) + 12) % 12;
            return relA - relB;
        });

        return { flatFees, grandTotalPaid, grandTotalDue, grandOverallDiscount, grandTotalLineDiscount, invoiceMode, invoiceRemarks, invoiceTransactionId };
    };

    const { flatFees, grandTotalPaid, grandTotalDue, grandOverallDiscount, grandTotalLineDiscount, invoiceMode, invoiceRemarks, invoiceTransactionId } = getFlattenedInvoiceData();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
                
                {/* Application Header Actions */}
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0 no-print">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span>Receipt Preview</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Landscape A4 / Portrait A5</span>
                    </h2>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold transition shadow-sm"
                        >
                            <Printer size={16} /> Print Receipt
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full flex items-start justify-center p-4 sm:p-10 hide-scroll">
                    
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
                            
                            /* Flexible Print Logic */
                            @page {
                                size: auto; /* Browser decides or user sets via print dialog */
                                margin: 5mm; 
                            }
                            
                            /* Side-by-side break rules */
                            .print-break-inside-avoid {
                                page-break-inside: avoid;
                                break-inside: avoid;
                            }
                        }
                    `}</style>

                    <div id="printable-dual" className="w-full max-w-[297mm] bg-white text-black shadow-lg mx-auto print:shadow-none">
                        
                        <div className="flex flex-col lg:flex-row print:flex-row flex-wrap lg:flex-nowrap print:flex-nowrap w-full">
                            
                            {/* OFFICE COPY */}
                            <div className="w-full lg:w-1/2 print:w-1/2 p-6 lg:border-r border-dashed border-gray-400 print:border-r border-b lg:border-b-0 print:border-b-0 print-break-inside-avoid">
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    flatFees={flatFees}
                                    paymentMode={invoiceMode}
                                    remarks={invoiceRemarks}
                                    totalPaid={grandTotalPaid}
                                    totalDue={grandTotalDue}
                                    totalOverallDiscount={grandOverallDiscount}
                                    totalLineDiscount={grandTotalLineDiscount}
                                    transactionId={invoiceTransactionId}
                                    copyType="Office Copy"
                                />
                            </div>

                            {/* Center scissor line for web-view clarity */}
                            <div className="hidden lg:flex print:flex absolute left-1/2 top-4 bottom-4 -translate-x-1/2 flex-col justify-center items-center gap-8 opacity-40 z-10 no-print">
                                <Scissors size={14} className="rotate-90 text-gray-500" />
                            </div>
                            
                            {/* STUDENT COPY */}
                            <div className="w-full lg:w-1/2 print:w-1/2 p-6 print-break-inside-avoid shadow-inner lg:shadow-none print:shadow-none">
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    flatFees={flatFees}
                                    paymentMode={invoiceMode}
                                    remarks={invoiceRemarks}
                                    totalPaid={grandTotalPaid}
                                    totalDue={grandTotalDue}
                                    totalOverallDiscount={grandOverallDiscount}
                                    totalLineDiscount={grandTotalLineDiscount}
                                    transactionId={invoiceTransactionId}
                                    copyType="Student Copy"
                                />
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeReceiptModal;
