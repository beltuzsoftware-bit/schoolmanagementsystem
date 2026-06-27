'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPurchaseInvoices, updatePurchaseInvoicePayment } from '@/app/actions/inventory';
import { getSchool } from '@/app/actions';
import { Receipt, CreditCard, Clock, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { PurchaseReceiptModal } from './purchase-receipt-modal';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PurchaseInvoicesModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    schoolId: string;
    standalone?: boolean;
    onSuccess?: () => void;
}

export function PurchaseInvoicesModal({ isOpen, onClose, schoolId, standalone = false, onSuccess }: PurchaseInvoicesModalProps) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [payAmount, setPayAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<any>(null);

    const loadInvoices = async () => {
        if (!schoolId) return;
        setIsLoading(true);
        try {
            const data = await getPurchaseInvoices(schoolId);
            setInvoices(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || standalone) {
            loadInvoices();
            if (schoolId) {
                getSchool(schoolId).then(setSchoolDetails);
            }
        }
    }, [isOpen, schoolId, standalone]);

    const handleUpdatePayment = async (invoiceId: string) => {
        if (!payAmount || parseFloat(payAmount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsUpdating(true);
        try {
            const result = await updatePurchaseInvoicePayment(invoiceId, {
                schoolId,
                paidAmount: parseFloat(payAmount)
            });

            if (result.success) {
                toast.success("Payment successful");
                setPayAmount('');
                
                // Refresh list and prepare receipt
                const data = await getPurchaseInvoices(schoolId);
                setInvoices(data);
                
                const updatedInvoice = data.find((inv: any) => inv.id === invoiceId);
                if (updatedInvoice) {
                    setInvoiceToPrint(updatedInvoice);
                    setShowReceipt(true);
                }
                
                setSelectedInvoice(null);
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            toast.error("Failed to update payment");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
            case 'Partial':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Partial</Badge>;
            case 'Due':
                return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Due</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const modalContent = (
        <div className={cn("flex flex-col h-full bg-white", standalone ? "rounded-2xl border border-slate-100 shadow-sm" : "")}>
            {!standalone && (
                <div className="p-6 bg-slate-50 border-b border-slate-100">
                    <DialogHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                                        Vendor Purchase Invoices
                                    </DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-slate-500">
                                        Manage your procurement records and vendor payment schedules.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length > 0 ? (
                                    invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium text-xs">{invoice.invoiceNumber}</TableCell>
                                            <TableCell className="text-sm">{invoice.vendorName}</TableCell>
                                            <TableCell className="text-[10px] font-bold text-slate-600 max-w-[200px] truncate">
                                                {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 
                                                    ? invoice.items.map((item: any) => `${item.name} (${item.quantity}${item.unit || ''})`).join(', ')
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {new Date(invoice.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-bold">₹{invoice.totalAmount}</TableCell>
                                            <TableCell className="text-emerald-600">₹{invoice.paidAmount}</TableCell>
                                            <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                                            <TableCell className="font-black text-red-600">
                                                {invoice.totalAmount - invoice.paidAmount > 0 
                                                    ? `₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString()}` 
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                                                        onClick={() => {
                                                            setInvoiceToPrint(invoice);
                                                            setShowReceipt(true);
                                                        }}
                                                    >
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {invoice.paymentStatus !== 'Paid' && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                            onClick={() => setSelectedInvoice(invoice)}
                                                        >
                                                            Pay
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                                            No invoices found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {!standalone ? (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
                        {modalContent}
                    </DialogContent>
                </Dialog>
            ) : modalContent}

            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="max-w-md rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
                    <div className="p-6 bg-slate-900 text-white">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-xl font-black tracking-tight">Update Payment</DialogTitle>
                                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                        INV: {selectedInvoice?.invoiceNumber}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Total Bill</div>
                                <div className="text-lg font-black text-slate-900">₹{selectedInvoice?.totalAmount?.toLocaleString()}</div>
                            </div>
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="text-[9px] text-red-400 uppercase tracking-widest font-black mb-1">Total Due</div>
                                <div className="text-lg font-black text-red-600">₹{(selectedInvoice?.totalAmount - selectedInvoice?.paidAmount).toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="payAmount" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount to Pay Now (₹)</Label>
                            <div className="relative">
                                <Input 
                                    id="payAmount"
                                    type="number"
                                    placeholder="0.00"
                                    className="h-12 bg-white border-slate-200 text-xl font-black focus-visible:ring-indigo-600 rounded-xl"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    autoFocus
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">₹</div>
                            </div>
                            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-indigo-900 leading-normal font-medium">
                                    Entering an amount will increase the total paid from **₹{selectedInvoice?.paidAmount}** to **₹{(parseFloat(payAmount || '0') + selectedInvoice?.paidAmount).toLocaleString()}**.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
                            <Button 
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 gap-2"
                                onClick={() => handleUpdatePayment(selectedInvoice.id)}
                                disabled={isUpdating || !payAmount || parseFloat(payAmount) <= 0}
                            >
                                {isUpdating ? "Processing..." : "Update Payment"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {showReceipt && invoiceToPrint && (
                <PurchaseReceiptModal 
                    invoice={invoiceToPrint}
                    schoolDetails={schoolDetails}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </>
    );
}
