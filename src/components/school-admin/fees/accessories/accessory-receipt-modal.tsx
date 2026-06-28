'use client';

import React from 'react';
import { X, Printer, Scissors } from 'lucide-react';
import { Student, School, AccessorySale } from '@/types';
import { numberToWords } from '@/lib/number-to-words';
import { cn } from '@/lib/utils';

interface AccessoryReceiptModalProps {
    sale: AccessorySale;
    student: Student;
    schoolDetails: School | null;
    onClose: () => void;
}

const SingleReceipt = ({
    sale,
    student,
    schoolDetails,
    copyType
}: {
    sale: AccessorySale;
    student: Student;
    schoolDetails: School | null;
    copyType: 'Student Copy' | 'Office Copy';
}) => {
    // Format Date from sale.date or fallback
    let receiptDateISO = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    try {
        if (sale.date) {
            receiptDateISO = new Date(sale.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        }
    } catch (e) {
        // use fallback string manipulation if valid Date parsing fails
        receiptDateISO = sale.date;
    }

    receiptDateISO = receiptDateISO.replace(/ /g, '-').replace('--', '-').replace(',', ' ');
    const receiptNo = sale.id;

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

            {/* Items Table */}
            <div className="flex-1 mb-6">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-1.5 text-left font-semibold w-[50%]">Item Description</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold">Qty</th>
                            <th className="border-r border-black p-1.5 text-center font-semibold">Rate</th>
                            <th className="p-1.5 text-center font-semibold">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-black align-top h-6">
                                <td className="border-r border-black p-1.5 font-medium">{item.name}</td>
                                <td className="border-r border-black p-1.5 text-center font-medium">{item.quantity}</td>
                                <td className="border-r border-black p-1.5 text-center font-medium">{item.sellRate.toFixed(2)}</td>
                                <td className="p-1.5 text-center font-bold bg-slate-50/50">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary Block */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-1.5 w-[15%]">Mode:</td>
                            <td className="border-r border-black p-1.5 text-center font-bold w-[35%] uppercase">{sale.paymentMode}</td>
                            <td className="border-r border-black p-1.5 w-[35%] font-bold text-slate-700">Net Payable</td>
                            <td className="p-1.5 text-center font-bold bg-green-50 w-[15%] text-green-800">{sale.totalAmount > 0 ? sale.totalAmount.toFixed(0) : '0'}</td>
                        </tr>
                        {sale.remarks && (
                            <tr>
                                <td className="border-r border-black p-1.5">Note:</td>
                                <td colSpan={3} className="border-r border-black p-1.5 font-medium italic">{sale.remarks}</td>
                            </tr>
                        )}
                        {sale.referenceNo && (
                            <tr>
                                <td className="border-r border-black p-1.5">Ref No:</td>
                                <td colSpan={3} className="border-r border-black p-1.5 font-medium italic">{sale.referenceNo}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-3 text-[10px] font-bold italic block">
                (In Words - Rs. {numberToWords(sale.totalAmount).toLowerCase()} only)
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

const AccessoryReceiptModal: React.FC<AccessoryReceiptModalProps> = ({ sale, student, schoolDetails, onClose }) => {
    const isHuge = sale.items.length > 3;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 print-modal-wrapper">
            <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
                
                {/* Application Header Actions */}
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0 no-print">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span>Sale Receipt Preview</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                            {isHuge ? 'A5 Portrait (2 Pages)' : 'A5 Landscape (Dual Copy)'}
                        </span>
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
                    
                    <style dangerouslySetInnerHTML={{ __html: `
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
                            #printable-dual {
                                position: relative !important;
                                width: ${isHuge ? '148.5mm' : '210mm'} !important;
                                max-width: ${isHuge ? '148.5mm' : '210mm'} !important;
                                height: auto !important;
                                background: white !important;
                            }
                            
                            .no-print { display: none !important; }
                            
                            /* Flexible Print Logic */
                            @media print {
                                @page {
                                    size: ${isHuge ? 'A5 portrait' : 'A5 landscape'};
                                    margin: 3mm; 
                                }
                            }
                            
                            /* Side-by-side break rules */
                            .print-break-inside-avoid {
                                page-break-inside: avoid;
                                break-inside: avoid;
                            }

                            /* Page break rule for huge layouts */
                            .print-page-break {
                                page-break-after: always;
                                break-after: page;
                            }
                        }
                    ` }} />

                    <div id="printable-dual" className="w-full bg-white text-black shadow-lg mx-auto print:shadow-none" style={{ maxWidth: isHuge ? '148.5mm' : '210mm' }}>
                        
                        <div className={cn(
                            "flex w-full flex-col",
                            isHuge 
                                ? "print:flex-col" 
                                : "lg:flex-row print:flex-row flex-wrap lg:flex-nowrap print:flex-nowrap"
                        )}>
                            
                            {/* OFFICE COPY */}
                            <div className={isHuge 
                                ? "w-full lg:w-1/2 print:w-full p-6 print:p-4 print-page-break lg:border-r border-dashed border-gray-400 print:border-none"
                                : "w-full lg:w-1/2 print:w-1/2 p-6 print:p-2 lg:border-r border-dashed border-gray-400 print:border-r border-b lg:border-b-0 print:border-b-0 print-break-inside-avoid"
                            }>
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    sale={sale}
                                    copyType="Office Copy"
                                />
                            </div>

                            {/* Center scissor line for web-view clarity */}
                            <div className={cn(
                                "hidden lg:flex print:flex absolute left-1/2 top-2 bottom-2 -translate-x-1/2 flex-col justify-center items-center gap-8 opacity-40 z-10 no-print",
                                isHuge && "print:hidden"
                            )}>
                                <Scissors size={14} className="rotate-90 text-gray-500" />
                            </div>
                            
                            {/* STUDENT COPY */}
                            <div className={isHuge
                                ? "w-full lg:w-1/2 print:w-full p-6 print:p-4"
                                : "w-full lg:w-1/2 print:w-1/2 p-6 print:p-2 print-break-inside-avoid shadow-inner lg:shadow-none print:shadow-none"
                            }>
                                <SingleReceipt
                                    student={student}
                                    schoolDetails={schoolDetails}
                                    sale={sale}
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

export default AccessoryReceiptModal;
