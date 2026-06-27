'use client';

import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Search, 
    Printer, 
    FileText, 
    ChevronRight,
    User,
    Calendar,
    Receipt,
    ShoppingCart,
    Percent,
    Trash2,
    Edit
} from 'lucide-react';
import { getAccessoryInvoices, deleteAccessoryInvoice } from '@/app/actions/inventory';
import { InventoryReceiptModal } from './inventory-receipt-modal';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SaleInvoicesTableProps {
    schoolId: string;
    standalone?: boolean;
    onEdit?: (invoice: any) => void;
}

export function SaleInvoicesTable({ schoolId, standalone = false, onEdit }: SaleInvoicesTableProps) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const loadInvoices = async () => {
        setIsLoading(true);
        try {
            const data = await getAccessoryInvoices(schoolId);
            setInvoices(data);
        } catch (error) {
            console.error("Failed to load invoices", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) {
            loadInvoices();
        }
    }, [schoolId]);

    const filteredInvoices = invoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.student?.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Summary Calculations
    const stats = React.useMemo(() => {
        return filteredInvoices.reduce((acc, inv) => {
            acc.total += inv.totalAmount;
            // Calculate effective discount
            const effectiveDiscount = inv.discount || (inv.subtotal - inv.totalAmount) || 0;
            acc.discount += Math.max(0, effectiveDiscount);
            const items = Array.isArray(inv.items) ? inv.items : [];
            acc.qty += items.reduce((q: number, item: any) => q + (item.quantity || 0), 0);
            return acc;
        }, { total: 0, discount: 0, qty: 0 });
    }, [filteredInvoices]);

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!window.confirm("Are you sure you want to delete this invoice? This will restore the stock items and cannot be undone.")) return;
        
        try {
            const res = await deleteAccessoryInvoice(invoiceId);
            if (res.success) {
                toast.success("Invoice deleted and stock restored");
                loadInvoices();
            } else {
                toast.error(res.error || "Failed to delete invoice");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    return (
        <div className={cn("flex flex-col space-y-4", standalone ? "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" : "")}>
            <div className="flex flex-col p-4 bg-slate-50 border-b border-slate-200 gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-indigo-600" />
                        Student Invoices
                    </h3>
                    <div className="relative w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input 
                            placeholder="Search by invoice or student..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs bg-white border-slate-200 rounded-md focus-visible:ring-1"
                        />
                    </div>
                </div>

                {/* Sales Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Received', value: `₹${stats.total.toLocaleString()}`, icon: <Receipt className="h-3 w-3" />, color: 'bg-indigo-600 text-white' },
                        { label: 'Total Discount', value: `₹${stats.discount.toLocaleString()}`, icon: <Percent className="h-3 w-3" />, color: 'bg-white border-slate-200 text-emerald-600' },
                        { label: 'Units Sold', value: `${stats.qty} Items`, icon: <ShoppingCart className="h-3 w-3" />, color: 'bg-white border-slate-200 text-slate-600' },
                        { label: 'Invoices', value: filteredInvoices.length, icon: <FileText className="h-3 w-3" />, color: 'bg-white border-slate-200 text-slate-600' },
                    ].map((s, i) => (
                        <div key={i} className={cn("p-2.5 rounded-xl flex flex-col justify-center", s.color)}>
                            <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
                                {s.icon}
                                <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                            </div>
                            <div className="text-sm font-black">{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Invoice #</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Student</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Qty</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Sales Price</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Discount</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Total</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mode</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recorded By</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 uppercase">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                        Fetching Billing Records...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length > 0 ? filteredInvoices.map((inv) => {
                            const itemQty = (Array.isArray(inv.items) ? inv.items : []).reduce((q: number, item: any) => q + (item.quantity || 0), 0);
                            const balance = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                            return (
                                <TableRow key={inv.id} className="group hover:bg-slate-50/50 transition-colors text-[11px]">
                                    <TableCell className="font-mono font-bold text-slate-600">
                                        {inv.invoiceNumber}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{inv.student?.name}</span>
                                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                                                {inv.student?.admissionNumber} • {inv.student?.className}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-700">{itemQty} Items</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-600">
                                        ₹{(inv.subtotal || 0).toLocaleString()}
                                    </TableCell>
                                     <TableCell className="text-right font-bold text-emerald-600">
                                         {(() => {
                                             const effectiveDiscount = inv.discount || (inv.subtotal - inv.totalAmount) || 0;
                                             return effectiveDiscount > 0 ? `₹${effectiveDiscount.toLocaleString()}` : '—';
                                         })()}
                                     </TableCell>
                                    <TableCell className="text-right font-black text-slate-900">
                                        ₹{(inv.totalAmount || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "text-[8px] font-black uppercase px-1 h-4",
                                            inv.paymentStatus === 'Paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                        )}>
                                            {inv.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[8px] font-black uppercase px-1 h-4 bg-slate-50 text-slate-500 border-slate-200">
                                            {inv.paymentMode}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{inv.recordedBy?.split(' ')[0] || 'Admin'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => onEdit?.(inv)}
                                                title="Edit Invoice"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                onClick={() => {
                                                    setSelectedInvoice(inv);
                                                    setShowReceipt(true);
                                                }}
                                                title="Print Invoice"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteInvoice(inv.id)}
                                                title="Revert Sale (Delete)"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No invoices found</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {showReceipt && selectedInvoice && (
                <InventoryReceiptModal 
                    invoice={selectedInvoice}
                    student={selectedInvoice.student}
                    schoolDetails={null} // Will be fetched inside or passed if available
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
}
