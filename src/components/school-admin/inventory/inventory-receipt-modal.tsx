'use client';

import React from 'react';
import { X, Printer, Scissors, CheckCircle2 } from 'lucide-react';
import { Student, School } from '@/types';
import { numberToWords } from '@/lib/number-to-words';

interface InventoryReceiptModalProps {
    invoice: any;
    student: Student;
    schoolDetails: School | null;
    onClose: () => void;
}

const SingleReceipt = ({
    student,
    schoolDetails,
    invoice,
    copyType
}: {
    student: Student;
    schoolDetails: School | null;
    invoice: any;
    copyType: 'Student Copy' | 'Office Copy';
}) => {
    const receiptDateISO = new Date(invoice.date).toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    }).replace(/ /g, '-').replace('--', '-').replace(',', ' ');

    return (
        <div className="w-full h-full flex flex-col bg-white text-black p-2 font-sans tracking-tight">
            <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] italic text-gray-500">{copyType}</div>
                <div className="text-[10px] font-bold">Contact: {schoolDetails?.contactNumber || 'N/A'}</div>
            </div>
            
            <div className="text-center mb-4">
                <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-900">
                    {schoolDetails?.name || 'SCHOOL NAME'}
                </h1>
                <p className="text-[9px] uppercase font-semibold text-slate-800">
                    {schoolDetails?.address || 'SCHOOL ADDRESS'}
                </p>
                <div className="text-[8px] text-black font-semibold">Inventory & Sales Division</div>
            </div>

            <div className="border border-black rounded-xl p-3 mb-4 text-[10px] leading-relaxed">
                <div className="flex justify-between font-bold">
                    <div>Invoice No: <span className="font-bold">{invoice.invoiceNumber}</span></div>
                    <div>Date: <span className="font-bold">{receiptDateISO}</span></div>
                </div>
                <div className="mt-1">
                    {student.admissionNumber === 'DIRECT-SALE' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Customer Type:</span>
                            <span className="font-bold text-[11px] text-indigo-700 uppercase tracking-wider">Counter Sale / Direct Customer</span>
                        </div>
                    ) : (
                        <>
                            <div>
                                Student Name: <span className="font-bold text-[11px]">{student.name.toUpperCase()}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-4">
                                <span>Student ID: <span className="font-medium text-gray-700">{student.admissionNumber}</span></span>
                                <span>Class: <span className="font-medium text-gray-700">{student.className}</span></span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 mb-6">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50">
                            <th className="border-r border-black p-1.5 text-left font-semibold w-[60%]">Item Description</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[10%]">Qty</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold w-[15%]">Rate</th>
                            <th className="p-1.5 text-center font-semibold w-[15%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-black align-top h-6">
                                <td className="border-r border-black p-1.5 font-medium">{item.name}</td>
                                <td className="border-r border-black p-1.5 text-center font-medium">{item.quantity}</td>
                                <td className="border-r border-black p-1.5 text-center font-medium">₹{item.rate}</td>
                                <td className="p-1.5 text-center font-bold">₹{(item.quantity * item.rate - (item.discount || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Empty rows to maintain height */}
                        {[...Array(Math.max(0, 5 - invoice.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black h-6">
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-1.5 w-[15%]">Mode:</td>
                            <td className="border-r border-black p-1.5 text-center font-bold w-[41%] uppercase">{invoice.paymentMode}</td>
                            <td className="border-r border-black p-1.5 w-[30%] font-bold">Subtotal</td>
                            <td className="p-1.5 text-center font-bold w-[14%]">₹{invoice.subtotal.toFixed(2)}</td>
                        </tr>
                        {/* Use effective discount since the DB field might be missing/unsynced */}
                        {(invoice.subtotal - invoice.totalAmount) > 0 && (
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1.5" colSpan={2}></td>
                                <td className="border-r border-black p-1.5 font-bold text-emerald-700 uppercase tracking-tighter text-[9px]">Discount / Adjustment (-)</td>
                                <td className="p-1.5 text-center font-bold text-emerald-700">₹{(invoice.subtotal - invoice.totalAmount).toFixed(2)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="border-r border-black p-1.5" colSpan={2}>
                                <div className="text-[8px] text-gray-400 italic">Items once sold are generally non-returnable.</div>
                            </td>
                            <td className="border-r border-black p-1.5 w-[30%] font-bold text-lg bg-slate-50">Grand Total</td>
                            <td className="p-1.5 text-center font-bold text-lg bg-slate-50">₹{invoice.totalAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-[10px] font-bold italic block">
                (In Words - Rs. {numberToWords(invoice.totalAmount).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Only)
            </div>
            
            <div className="mt-12 mb-2 flex justify-between items-end text-[8px]">
                <div className="text-black font-bold uppercase text-[7px] leading-none">
                    (ISSUED BY - INVENTORY ADMIN)
                </div>
                <div className="text-center font-bold border-t border-black w-40 pt-1 uppercase tracking-wider text-[10px]">
                    AUTHORIZED SIGN
                </div>
            </div>
        </div>
    );
};

export function InventoryReceiptModal({ invoice, student, schoolDetails, onClose }: InventoryReceiptModalProps) {
    if (!invoice || !student) return null;

    const isHuge = invoice.items.length > 3;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 print-modal-wrapper">
            <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
                 
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0 no-print">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                        <span>Sales Invoice Preview</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded ml-2">
                            {isHuge ? 'A5 Portrait (2 Pages)' : 'A5 Landscape (Dual Copy)'}
                        </span>
                    </h2>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold transition shadow-sm"
                        >
                            <Printer size={16} /> Print Invoice
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full flex items-start justify-center p-4 sm:p-10 hide-scroll">
                    
                    <style jsx global>{`
                        @media print {
                            html, body {
                                margin: 0 !important;
                                padding: 0 !important;
                                height: auto !important;
                            }
                            body * { 
                                visibility: hidden; 
                            }
                            body > * {
                                height: 0 !important;
                                min-height: 0 !important;
                            }
                            .print-modal-wrapper,
                            .print-modal-wrapper * { 
                                visibility: visible !important; 
                            }
                            .print-modal-wrapper {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                display: block !important;
                                background: white !important;
                            }
                            #inventory-receipt-print {
                                position: relative !important;
                                width: ${isHuge ? '148.5mm' : '210mm'} !important;
                                max-width: ${isHuge ? '148.5mm' : '210mm'} !important;
                                height: auto !important;
                                background: white !important;
                            }
                            .no-print { display: none !important; }
                            @page { size: ${isHuge ? 'A5 portrait' : 'A5 landscape'}; margin: 3mm; }

                            /* Page break rule for huge layouts */
                            .print-page-break {
                                page-break-after: always;
                                break-after: page;
                            }
                        }
                    `}</style>

                    <div id="inventory-receipt-print" className="w-full bg-white text-black shadow-lg mx-auto print:shadow-none" style={{ maxWidth: isHuge ? '148.5mm' : '210mm' }}>
                        <div className={cn(
                            "flex w-full flex-col",
                            isHuge 
                                ? "print:flex-col" 
                                : "lg:flex-row print:flex-row flex-wrap lg:flex-nowrap print:flex-nowrap"
                        )}>
                            
                            {/* OFFICE COPY */}
                            <div className={isHuge 
                                ? "w-full lg:w-1/2 print:w-full p-6 print:p-4 print-page-break lg:border-r border-dashed border-gray-400 print:border-none"
                                : "w-full lg:w-1/2 print:w-1/2 p-6 print:p-2 lg:border-r border-dashed border-gray-400 print:border-r border-b lg:border-b-0 print:border-b-0"
                            }>
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    invoice={invoice}
                                    copyType="Office Copy"
                                />
                            </div>

                            <div className={cn(
                                "hidden lg:flex print:flex absolute left-1/2 top-2 bottom-2 -translate-x-1/2 flex-col justify-center items-center gap-8 opacity-40 z-10 no-print",
                                isHuge && "print:hidden"
                            )}>
                                <Scissors size={14} className="rotate-90 text-gray-500" />
                            </div>
                            
                            {/* STUDENT COPY */}
                            <div className={isHuge
                                ? "w-full lg:w-1/2 print:w-full p-6 print:p-4"
                                : "w-full lg:w-1/2 print:w-1/2 p-6 print:p-2"
                            }>
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    invoice={invoice}
                                    copyType="Student Copy"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}
