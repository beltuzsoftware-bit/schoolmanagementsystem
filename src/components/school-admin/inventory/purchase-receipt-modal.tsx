'use client';

import React from 'react';
import { X, Printer, Scissors, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';

interface PurchaseReceiptModalProps {
    invoice: any;
    schoolDetails: any;
    onClose: () => void;
}

const SingleReceipt = ({
    schoolDetails,
    invoice,
    copyType
}: {
    schoolDetails: any;
    invoice: any;
    copyType: 'Office Copy' | 'Vendor Copy';
}) => {
    const receiptDateISO = new Date(invoice.date || invoice.createdAt).toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    }).replace(/ /g, '-').replace('--', '-').replace(',', ' ');

    return (
        <div className="w-full h-full flex flex-col bg-white text-black p-4 font-sans tracking-tight">
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
                <div className="text-[8px] text-black font-semibold mt-1 py-1 border-y border-black uppercase tracking-widest">
                    {invoice.isInstallment ? 'Payment Voucher / Installment Receipt' : 'Purchase Voucher / Stock Inward Receipt'}
                </div>
            </div>

            <div className="border border-black rounded-lg p-3 mb-4 text-[10px] leading-relaxed">
                <div className="grid grid-cols-2 gap-y-1">
                    <div>Voucher No: <span className="font-bold">{invoice.invoiceNumber}</span></div>
                    <div className="text-right">Date: <span className="font-bold">{receiptDateISO}</span></div>
                    {invoice.vendorInvoiceNumber && (
                        <div className="col-span-2">Vendor Invoice: <span className="font-bold">{invoice.vendorInvoiceNumber}</span></div>
                    )}
                    <div className="col-span-2 mt-1">
                        Vendor: <span className="font-bold text-[11px]">{invoice.vendorName.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 mb-6">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="border-b border-black bg-slate-50">
                            <th className="border-r border-black p-2 text-left font-semibold">Description</th>
                            <th className="p-2 text-right font-semibold">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-black align-top h-12">
                            <td className="border-r border-black p-2">
                                <div className="font-medium">Stock Purchase Inward / Procurement</div>
                                {invoice.notes && <div className="text-[9px] text-gray-500 mt-1">Note: {invoice.notes}</div>}
                                {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {invoice.items.map((item: any, i: number) => (
                                            <div key={i} className="text-[9px]">
                                                • {item.name}: {item.quantity} × ₹{item.rate}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </td>
                            <td className="p-2 text-right font-bold text-base">₹{Number(invoice.totalAmount).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-2 w-[25%] font-semibold">Payment Mode:</td>
                            <td className="border-r border-black p-2 text-center font-bold w-[25%] uppercase">{invoice.paymentMode || 'N/A'}</td>
                            <td className="border-r border-black p-2 w-[25%] font-semibold">Amount Paid:</td>
                            <td className="p-2 text-right font-bold w-[25%]">₹{Number(invoice.paidAmount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td className="border-r border-black p-2" colSpan={2}>
                                <div className="text-[8px] text-gray-400 italic">Status: <span className="font-bold uppercase text-black">{invoice.paymentStatus}</span></div>
                            </td>
                            <td className="border-r border-black p-2 font-bold text-lg bg-slate-50">Balance Due</td>
                            <td className="p-2 text-right font-bold text-lg bg-slate-50 text-red-600">₹{(Number(invoice.totalAmount) - Number(invoice.paidAmount || 0)).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-[10px] font-bold italic block">
                (In Words - Rs. {numberToWords(Number(invoice.totalAmount)).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Only)
            </div>
            
            <div className="mt-16 mb-4 flex justify-between items-end text-[10px]">
                <div className="text-center font-bold border-t border-black w-40 pt-1 uppercase tracking-wider">
                    Vendor Signature
                </div>
                <div className="text-center font-bold border-t border-black w-40 pt-1 uppercase tracking-wider">
                    Authorized Sign
                </div>
            </div>
        </div>
    );
};

export function PurchaseReceiptModal({ invoice, schoolDetails, onClose }: PurchaseReceiptModalProps) {
    if (!invoice) return null;

    // Handle batch printing of installments
    const paymentsToPrint = (() => {
        if (invoice.isInstallment && !invoice.allPayments) {
            return [invoice]; // Print single installment
        }
        
        if (invoice.allPayments) {
            return invoice.allPayments.map((p: any) => ({
                ...invoice,
                paidAmount: p.amount,
                paymentMode: p.mode,
                date: p.date,
                notes: p.notes,
                isInstallment: true
            }));
        }

        return [invoice]; // Default single invoice
    })();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                
                <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 shrink-0 no-print">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {invoice.isInstallment ? (invoice.allPayments ? 'Batch Payment Vouchers' : 'Payment Receipt Preview') : 'Purchase Recorded Successfully'}
                            </h2>
                            <p className="text-sm text-gray-500">Invoice #{invoice.invoiceNumber} ({paymentsToPrint.length} voucher{paymentsToPrint.length > 1 ? 's' : ''})</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            onClick={() => window.print()} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        >
                            <Printer size={16} className="mr-2" /> Print {paymentsToPrint.length > 1 ? 'All' : ''}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X size={20} className="text-gray-500" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-200/50 hide-scroll">
                    
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            body * { visibility: hidden !important; }
                            #purchase-receipt-print, #purchase-receipt-print * { visibility: visible !important; }
                            #purchase-receipt-print {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                box-shadow: none !important;
                            }
                            .no-print { display: none !important; }
                            @page { size: portrait; margin: 0; }
                            .page-break { page-break-after: always; }
                        }
                    `}} />

                    <div id="purchase-receipt-print" className="w-[210mm] mx-auto">
                        {paymentsToPrint.map((pInv: any, idx: number) => (
                            <div key={idx} className={cn("bg-white text-black shadow-xl p-8 rounded-sm mb-8 print:shadow-none print:p-0 print:mb-0", idx < paymentsToPrint.length - 1 && "page-break")}>
                                <SingleReceipt
                                    schoolDetails={schoolDetails}
                                    invoice={pInv}
                                    copyType="Office Copy"
                                />
                                
                                <div className="my-8 border-t border-dashed border-gray-400 no-print relative">
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-gray-400">
                                        <Scissors size={14} className="rotate-90" />
                                    </div>
                                </div>

                                <SingleReceipt
                                    schoolDetails={schoolDetails}
                                    invoice={pInv}
                                    copyType="Vendor Copy"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end no-print">
                    <Button variant="outline" onClick={onClose}>
                        Close Preview
                    </Button>
                </div>
            </div>
        </div>
    );
}
