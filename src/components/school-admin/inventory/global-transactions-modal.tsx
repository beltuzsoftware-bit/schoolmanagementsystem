'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    ArrowUpCircle, 
    ArrowDownCircle,
    Calendar,
    User,
    History,
    Filter,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    Package,
    Search,
    ArrowUpDown,
    Download,
    Printer,
    FileText,
    FileSpreadsheet,
    ChevronRight,
    CreditCard,
    Trash2,
    X
} from 'lucide-react';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSchoolStockTransactions, updatePurchaseInvoicePayment, revertPurchasePayment } from '@/app/actions/inventory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InventoryReceiptModal } from './inventory-receipt-modal';
import { PurchaseReceiptModal } from './purchase-receipt-modal';
import {
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

function RevertConfirmModal({ isOpen, onClose, onConfirm, payment, submitting }: any) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                        <Trash2 className="h-4 w-4" /> Revert Payment
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        Are you sure you want to revert this payment of <span className="font-black text-slate-900">₹{payment?.amount?.toLocaleString()}</span>?
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium italic">
                        This will remove the installment record and restore the balance due. This action cannot be undone.
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px]">
                        <div className="flex justify-between mb-1">
                            <span className="text-slate-500 font-bold uppercase">Date</span>
                            <span className="text-slate-900 font-black">{payment?.date && new Date(payment.date).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase">Mode</span>
                            <span className="text-slate-900 font-black">{payment?.mode}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-widest h-10">Cancel</Button>
                    <Button 
                        onClick={onConfirm} 
                        disabled={submitting}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest h-10 px-6 gap-2"
                    >
                        {submitting ? 'Reverting...' : 'Confirm Revert'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PayNowModal({ isOpen, onClose, invoice, schoolId, onPaid }: any) {
    const [amount, setAmount] = useState(invoice?.totalAmount - invoice?.paidAmount || 0);
    const [mode, setMode] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handlePay = async () => {
        if (!amount || amount <= 0) return toast.error("Please enter a valid amount");
        setSubmitting(true);
        try {
            const res = await updatePurchaseInvoicePayment(invoice.id, {
                schoolId,
                paidAmount: Number(amount),
                paymentMode: mode,
                notes
            });
            if (res.success) {
                toast.success("Payment recorded successfully");
                onPaid();
                onClose();
            } else {
                toast.error("Failed to record payment");
            }
        } catch (e) {
            toast.error("Error recording payment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Settle Vendor Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Vendor</span>
                        <span className="text-xs font-black text-slate-900">{invoice?.vendorName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <span className="text-[9px] font-bold text-indigo-600 uppercase block mb-1">Total Bill</span>
                            <span className="text-sm font-black text-indigo-900">₹{invoice?.totalAmount?.toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                            <span className="text-[9px] font-bold text-rose-600 uppercase block mb-1">Current Due</span>
                            <span className="text-sm font-black text-rose-900">₹{(invoice?.totalAmount - invoice?.paidAmount)?.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Amount to Pay (₹)</label>
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="h-10 text-sm font-bold border-slate-200 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Payment Mode</label>
                        <select 
                            value={mode} 
                            onChange={(e) => setMode(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option>Cash</option>
                            <option>Bank Transfer</option>
                            <option>Cheque</option>
                            <option>UPI</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Notes</label>
                        <Input 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional payment notes..."
                            className="h-10 text-xs border-slate-200 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-widest h-10">Cancel</Button>
                    <Button 
                        onClick={handlePay} 
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest h-10 px-6 gap-2"
                    >
                        {submitting && <div className="h-3 w-3 animate-spin border-b-2 border-white rounded-full" />}
                        Record Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface GlobalTransactionsModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    schoolId: string;
    standalone?: boolean;
}

export function GlobalTransactionsModal({ isOpen, onClose, schoolId, standalone = false }: GlobalTransactionsModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [sortColumn, setSortColumn] = useState<'date' | 'txId' | 'type' | 'product' | 'entity' | 'qty' | 'inward' | 'sale' | 'discount' | 'recvAmt' | 'paidToVendor' | 'balance' | 'payment'>('date');
    const [dateFilter, setDateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'INWARD' | 'OUTWARD'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showPurchaseReceipt, setShowPurchaseReceipt] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [revertConfirm, setRevertConfirm] = useState<{ isOpen: boolean; payment: any; invoiceId: string } | null>(null);
    const [reverting, setReverting] = useState(false);
    const [school, setSchool] = useState<any>(null);

    const fetchTransactions = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const data = await getSchoolStockTransactions(schoolId);
            setTransactions(data);
        } catch (error) {
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || standalone) {
            fetchTransactions();
            import('@/app/actions').then((mod) => mod.getSchool(schoolId).then(setSchool).catch(() => {}));
        }
    }, [isOpen, standalone]);

    const handleRevert = async () => {
        if (!revertConfirm) return;
        setReverting(true);
        try {
            const res = await revertPurchasePayment(revertConfirm.invoiceId, revertConfirm.payment.id, schoolId);
            if (res.success) {
                toast.success("Payment reverted successfully");
                setRevertConfirm(null);
                fetchTransactions();
            } else {
                toast.error(res.error || "Failed to revert payment");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setReverting(false);
        }
    };

    const handleSort = (col: typeof sortColumn) => {
        if (sortColumn === col) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortOrder('asc');
        }
    };

    const getFilteredTransactions = () => {
        let filtered = [...transactions];
        
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            filtered = filtered.filter(tx => 
                tx.product?.name?.toLowerCase().includes(s) ||
                tx.entityName?.toLowerCase().includes(s) ||
                tx.referenceId?.toLowerCase().includes(s) ||
                tx.student?.name?.toLowerCase().includes(s)
            );
        }

        if (dateFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.date);
                if (dateFilter === 'today') return txDate.toDateString() === now.toDateString();
                if (dateFilter === 'this_week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return txDate >= weekAgo;
                }
                if (dateFilter === 'this_month') {
                    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
                }
                return true;
            });
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(tx => tx.type === typeFilter);
        }

        filtered.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortColumn === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
            else if (sortColumn === 'txId') { valA = a.invoice?.invoiceNumber || a.referenceId || ''; valB = b.invoice?.invoiceNumber || b.referenceId || ''; }
            else if (sortColumn === 'qty') { valA = a.quantity; valB = b.quantity; }
            else if (sortColumn === 'inward') { valA = a.type === 'INWARD' ? a.totalAmount : 0; valB = b.type === 'INWARD' ? b.totalAmount : 0; }
            else if (sortColumn === 'sale') { valA = a.type === 'OUTWARD' ? a.totalAmount : 0; valB = b.type === 'OUTWARD' ? b.totalAmount : 0; }
            else if (sortColumn === 'discount') { valA = a.discount || 0; valB = b.discount || 0; }
            else if (sortColumn === 'recvAmt') { valA = a.type === 'OUTWARD' ? (a.totalAmount - (a.discount || 0)) : 0; valB = b.type === 'OUTWARD' ? (b.totalAmount - (b.discount || 0)) : 0; }
            else if (sortColumn === 'paidToVendor') { valA = a.type === 'INWARD' ? (a.invoice?.paidAmount || 0) : 0; valB = b.type === 'INWARD' ? (b.invoice?.paidAmount || 0) : 0; }
            else if (sortColumn === 'balance') { 
                const getBal = (t: any) => {
                    const total = t.type === 'OUTWARD' ? (t.totalAmount - (t.discount || 0)) : (t.invoice?.totalAmount || t.totalAmount);
                    const paid = t.type === 'OUTWARD' ? (t.totalAmount - (t.discount || 0)) : (t.invoice?.paidAmount || 0);
                    return total - paid;
                };
                valA = getBal(a); valB = getBal(b);
            }
            else if (sortColumn === 'payment') { valA = a.paymentMode || ''; valB = b.paymentMode || ''; }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const filteredTransactions = getFilteredTransactions();

    const totals = filteredTransactions.reduce((acc, tx) => {
        if (tx.type === 'INWARD') {
            const total = tx.totalAmount || 0;
            const paid = tx.invoice?.paidAmount || 0;
            const due = Math.max(0, total - paid);
            acc.paid += due;
        }
        else if (tx.type === 'OUTWARD') acc.received += tx.totalAmount || 0;
        return acc;
    }, { paid: 0, received: 0 });
    const totalBalance = totals.received - totals.paid;

    const SortIcon = ({ col }: { col: any }) => {
        if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />;
    };

    const handleRowClick = (tx: any) => {
        setSelectedTx(selectedTx?.id === tx.id ? null : tx);
    };

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (format === 'pdf') {
            window.print();
            return;
        }

        const headers = [
            "Date", "Tx ID", "Type", "Product", "Entity/Student", "Qty", 
            "Amount To Be Paid", "Paid to Vendor", "Item Cost", "Discount", 
            "Recv Amt", "Final Balance", "Payment Mode", "Notes"
        ];

        const rows = filteredTransactions.map(tx => {
            const disc = tx.discount || 0;
            const recv = tx.type === 'OUTWARD' ? (tx.totalAmount - disc) : 0;
            const paidVendor = tx.type === 'INWARD' ? (tx.invoice?.paidAmount || 0) : 0;
            const balance = tx.type === 'OUTWARD' ? (tx.totalAmount - disc - (tx.invoice?.paidAmount || 0)) : ((tx.invoice?.totalAmount || tx.totalAmount) - paidVendor);

            return [
                new Date(tx.date).toLocaleDateString(),
                tx.invoice?.invoiceNumber || tx.referenceId || tx.id,
                tx.type,
                tx.product?.name || 'N/A',
                tx.entityName || 'N/A',
                tx.quantity,
                tx.type === 'INWARD' ? tx.totalAmount : 0,
                paidVendor,
                tx.type === 'OUTWARD' ? tx.totalAmount : 0,
                disc,
                recv,
                balance,
                tx.paymentMode || 'N/A',
                (tx.notes || '').replace(/\n/g, ' ')
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Inventory_Ledger_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xls' : 'csv'}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const content = (
        <div className={cn("flex flex-col bg-white print:p-0", standalone ? "rounded-xl border border-slate-200 shadow-sm overflow-hidden" : "h-full")}>
            {/* Global Styles for Print */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                    }
                    .no-print { display: none !important; }
                    .print-title { display: block !important; margin-bottom: 20px; }
                    table { font-size: 8px !important; width: 100% !important; border-collapse: collapse !important; }
                    th, td { border: 1px solid #e2e8f0 !important; padding: 4px !important; }
                    .print-only { display: block !important; }
                }
                .print-only { display: none; }
            ` }} />
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-slate-50 border-b border-slate-200 no-print">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 px-2">
                        <History className="h-3.5 w-3.5 text-indigo-600" />
                        Transaction Ledger
                    </h3>
                    <div className="relative w-56">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input 
                            placeholder="Filter transactions..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-7 pl-7 text-[10px] bg-white border-slate-200 rounded-md focus-visible:ring-1"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white px-1 rounded-md border border-slate-200 h-7">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 text-[9px] font-black uppercase tracking-wider gap-1 px-2">
                                    <Filter className="h-2.5 w-2.5 text-blue-600" />
                                    {dateFilter.replace('_', ' ')}
                                    <ChevronDown className="h-2.5 w-2.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuLabel className="text-[10px] uppercase font-black">Filter by Date</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {['all', 'today', 'this_week', 'this_month'].map(f => (
                                    <DropdownMenuItem key={f} className="text-xs" onClick={() => setDateFilter(f)}>
                                        {f === 'all' ? 'All Transactions' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="w-px h-3 bg-slate-200" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 text-[9px] font-black uppercase tracking-wider gap-1 px-2">
                                    <Filter className="h-2.5 w-2.5 text-blue-600" />
                                    {typeFilter === 'all' ? 'All Types' : typeFilter}
                                    <ChevronDown className="h-2.5 w-2.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuLabel className="text-[10px] uppercase font-black">Filter by Type</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs" onClick={() => setTypeFilter('all')}>All Types</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => setTypeFilter('INWARD')}>Stock Inward (IN)</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => setTypeFilter('OUTWARD')}>Stock Outward (OUT)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-2">
                        {filteredTransactions.length} records
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExport('csv')} 
                            title="Export as CSV"
                            className="h-6 w-6 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-3 bg-slate-200" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExport('excel')} 
                            title="Export as Excel"
                            className="h-6 w-6 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-3 bg-slate-200" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExport('pdf')} 
                            title="Save as PDF"
                            className="h-6 w-6 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {!standalone && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="print-only p-8">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{school?.name || 'School Inventory Management'}</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Financial Transaction Ledger Report</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-900 uppercase">Generated On</p>
                        <p className="text-sm font-bold text-slate-600">{new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto print-area">
                <Table className="border-collapse">
                    <TableHeader className="bg-slate-100/50">
                        <TableRow className="h-8 hover:bg-transparent border-slate-200">
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-2 h-8 w-8"></TableHead>
                            {[
                                { label: 'Date', col: 'date' },
                                { label: 'Tx ID', col: 'txId' },
                                { label: 'Type', col: 'type' },
                                { label: 'Product', col: 'product' },
                                { label: 'Entity / Student', col: 'entity' },
                                { label: 'Qty', col: 'qty' },
                                { label: 'Amount to be Paid', col: 'inward' },
                                { label: 'Paid to Vendor', col: 'paidToVendor' },
                                { label: 'Item Cost', col: 'sale' },
                                { label: 'Discount', col: 'discount' },
                                { label: 'Recv Amt', col: 'recvAmt' },
                                { label: 'Final Bal.', col: 'balance' },
                                { label: 'Payment', col: 'payment' },
                            ].map(({ label, col }) => (
                                <TableHead 
                                    key={col}
                                    className={cn(
                                        "text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap",
                                        ['qty', 'inward', 'sale', 'discount', 'recvAmt', 'paidToVendor', 'balance'].includes(col) ? 'text-right' : ''
                                    )}
                                    onClick={() => col !== 'type' && handleSort(col as any)}
                                >
                                    <div className={cn("flex items-center gap-1.5", ['qty', 'inward', 'sale', 'discount', 'recvAmt', 'paidToVendor', 'balance'].includes(col) ? 'justify-end' : '')}>
                                        {label}
                                        {col !== 'type' && <SortIcon col={col} />}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={14} className="h-20 text-center border border-slate-200">
                                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                                        Synchronizing Ledger...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredTransactions.length > 0 ? filteredTransactions.map((tx) => (
                            <React.Fragment key={tx.id}>
                                <TableRow 
                                    className={cn(
                                        "h-8 hover:bg-indigo-50/40 transition-colors border-slate-200 cursor-pointer group",
                                        selectedTx?.id === tx.id ? "bg-indigo-50/60" : ""
                                    )}
                                    onClick={() => handleRowClick(tx)}
                                >
                                    {/* Expand chevron */}
                                    <TableCell className="border border-slate-200 p-0 text-center">
                                        <ChevronRight className={cn(
                                            "h-3 w-3 text-slate-300 mx-auto transition-transform",
                                            selectedTx?.id === tx.id ? "rotate-90 text-indigo-600" : "group-hover:text-indigo-400"
                                        )} />
                                    </TableCell>
                                    <TableCell className="text-[11px] font-mono text-slate-600 border border-slate-200 px-3 py-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3 text-slate-300" />
                                            {new Date(tx.date).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-mono text-slate-500 border border-slate-200 px-3 py-1">
                                        <div className="truncate max-w-[80px]" title={tx.invoice?.invoiceNumber || tx.referenceId || tx.id}>
                                            {tx.invoice?.invoiceNumber || tx.referenceId || tx.id.slice(0, 8)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border border-slate-200 px-3 py-1">
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 w-fit",
                                            tx.type === 'INWARD' 
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                                : "bg-rose-50 text-rose-600 border border-rose-100"
                                        )}>
                                            {tx.type === 'INWARD' ? <ArrowUpCircle className="h-2.5 w-2.5" /> : <ArrowDownCircle className="h-2.5 w-2.5" />}
                                            {tx.type === 'INWARD' ? 'IN' : 'OUT'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-slate-900 border border-slate-200 px-3 py-1">
                                        <div className="flex items-center gap-1.5">
                                            <Package className="h-3 w-3 text-slate-300" />
                                            {tx.product?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-medium text-slate-700 border border-slate-200 px-3 py-1">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3 w-3 text-slate-300" />
                                            {tx.student?.name || tx.entityName || '—'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black text-slate-900 border border-slate-200 px-3 py-1 text-right">
                                        {tx.quantity}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-[11px] font-black border border-slate-200 px-3 py-1 text-right",
                                        tx.type === 'INWARD' && (tx.invoice?.paidAmount || 0) < (tx.invoice?.totalAmount || tx.totalAmount || 0) ? "text-red-600" : "text-slate-900"
                                    )}>
                                        {tx.type === 'INWARD' ? (
                                            (tx.invoice?.paidAmount || 0) >= (tx.invoice?.totalAmount || tx.totalAmount || 0) ? (
                                                <span className="inline-flex items-center bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Paid</span>
                                            ) : (
                                                `₹${((tx.invoice?.totalAmount || tx.totalAmount || 0) - (tx.invoice?.paidAmount || 0)).toLocaleString()}`
                                            )
                                        ) : <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-[11px] font-black border border-slate-200 px-3 py-1 text-right",
                                        tx.type === 'INWARD' && (tx.invoice?.paidAmount || 0) < (tx.totalAmount || 0) ? "text-red-600" : "text-emerald-600"
                                    )}>
                                        {tx.type === 'INWARD' ? `₹${(tx.invoice?.paidAmount || 0)?.toLocaleString()}` : <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black text-indigo-700 border border-slate-200 px-3 py-1 text-right">
                                        {tx.type === 'OUTWARD' ? `₹${tx.totalAmount?.toLocaleString()}` : <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black border border-slate-200 px-3 py-1 text-right">
                                        {(tx.discount && tx.discount > 0) 
                                            ? <span className="text-emerald-600">-₹{tx.discount}</span>
                                            : <span className="text-slate-300">—</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black text-indigo-700 border border-slate-200 px-3 py-1 text-right">
                                        {tx.type === 'OUTWARD' ? `₹${(tx.totalAmount - (tx.discount || 0))?.toLocaleString()}` : <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black border border-slate-200 px-3 py-1 text-right">
                                        {(() => {
                                            const total = tx.type === 'OUTWARD' ? (tx.totalAmount - (tx.discount || 0)) : (tx.invoice?.totalAmount || tx.totalAmount);
                                            const paid = tx.type === 'OUTWARD' ? (tx.totalAmount - (tx.discount || 0)) : (tx.invoice?.paidAmount || 0);
                                            const bal = total - paid;
                                            return bal > 0 ? <span className="text-red-600">₹{bal.toLocaleString()}</span> : <span className="text-slate-300">0</span>;
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-[11px] border border-slate-200 px-3 py-1">
                                        {tx.paymentMode 
                                            ? <span className="flex items-center gap-1 font-bold text-slate-700"><CreditCard className="h-3 w-3 text-slate-300" />{tx.paymentMode}</span>
                                            : <span className="text-slate-300 font-medium">—</span>
                                        }
                                    </TableCell>
                                </TableRow>

                                {/* Expanded Detail Row */}
                                {selectedTx?.id === tx.id && (
                                    <TableRow className="bg-indigo-50/30 border-slate-200">
                                        <TableCell colSpan={14} className="border border-indigo-100 px-4 py-3">
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Transaction Type</div>
                                                        <div className="text-xs font-bold text-slate-900">{tx.type === 'INWARD' ? 'Purchase / Stock In' : 'Sale / Stock Out'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment Mode</div>
                                                        <div className="text-xs font-bold text-slate-900">{tx.paymentMode || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Discount Applied</div>
                                                        <div className="text-xs font-bold text-slate-900">{tx.discount ? `₹${tx.discount}` : 'None'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Unit Price</div>
                                                        <div className="text-xs font-black text-indigo-600">₹{(tx.rate || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Reference / Invoice</div>
                                                        <div className="text-xs font-bold text-slate-900">{tx.invoice?.invoiceNumber || tx.referenceId || tx.id}</div>
                                                    </div>
                                                    {tx.student && (
                                                        <div className="col-span-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Student</div>
                                                            <div className="text-xs font-bold text-slate-900">{tx.student.name} <span className="font-normal text-slate-500">({tx.student.admissionNumber} • {tx.student.className})</span></div>
                                                        </div>
                                                    )}
                                                    {tx.type === 'INWARD' && (
                                                        <div className="col-span-4 mt-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2 border-b border-indigo-100 pb-1">Payment History (Installments)</div>
                                                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                                <table className="w-full text-[10px]">
                                                                    <thead>
                                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                                            <th className="px-3 py-1.5 text-left font-black text-slate-400 uppercase tracking-tighter">Date</th>
                                                                            <th className="px-3 py-1.5 text-left font-black text-slate-400 uppercase tracking-tighter">Mode</th>
                                                                            <th className="px-3 py-1.5 text-right font-black text-slate-400 uppercase tracking-tighter">Amount</th>
                                                                            <th className="px-3 py-1.5 text-right font-black text-slate-400 uppercase tracking-tighter w-10"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(() => {
                                                                            let payments = [];
                                                                            try {
                                                                                const notes = tx.invoice?.notes || '';
                                                                                const match = notes.match(/PAYMENTS: (\[.*\])/);
                                                                                if (match) payments = JSON.parse(match[1]);
                                                                                else if (tx.invoice?.paymentHistory) payments = tx.invoice.paymentHistory;
                                                                                
                                                                                if (payments.length === 0 && tx.invoice?.paidAmount > 0) {
                                                                                    payments = [{
                                                                                        id: 'initial',
                                                                                        amount: tx.invoice.paidAmount,
                                                                                        date: tx.invoice.date || tx.date,
                                                                                        mode: tx.invoice.paymentMode || 'Cash',
                                                                                        notes: 'Initial Payment'
                                                                                    }];
                                                                                }
                                                                            } catch (e) {}
                                                                            
                                                                            if (payments.length === 0) return (
                                                                                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">No payment records found</td></tr>
                                                                            );

                                                                            return (
                                                                                <>
                                                                                    {payments.map((p: any, i: number) => (
                                                                                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                                                            <td className="px-3 py-1.5 font-bold text-slate-600">{new Date(p.date).toLocaleString()}</td>
                                                                                            <td className="px-3 py-1.5 font-bold text-slate-600 uppercase tracking-widest text-[9px]">{p.mode}</td>
                                                                                            <td className="px-3 py-1.5 font-black text-slate-900 text-right">₹{p.amount.toLocaleString()}</td>
                                                                                            <td className="px-3 py-1.5 text-right flex items-center justify-end gap-1">
                                                                                                <Button 
                                                                                                    variant="ghost" 
                                                                                                    size="icon" 
                                                                                                    className="h-5 w-5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                                                    title="Print Receipt"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setSelectedInstallment(p);
                                                                                                        setShowPurchaseReceipt(true);
                                                                                                    }}
                                                                                                >
                                                                                                    <Printer className="h-3 w-3" />
                                                                                                </Button>
                                                                                                <Button 
                                                                                                    variant="ghost" 
                                                                                                    size="icon" 
                                                                                                    className="h-5 w-5 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                                                                    title="Revert Payment"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setRevertConfirm({
                                                                                                            isOpen: true,
                                                                                                            payment: p,
                                                                                                            invoiceId: tx.invoice.id
                                                                                                        });
                                                                                                    }}
                                                                                                >
                                                                                                    <Trash2 className="h-3 w-3" />
                                                                                                </Button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                    {payments.length > 1 && (
                                                                                        <tr className="bg-indigo-50/50">
                                                                                            <td colSpan={4} className="px-3 py-2 text-right">
                                                                                                <Button 
                                                                                                    variant="outline" 
                                                                                                    size="sm" 
                                                                                                    className="h-6 text-[9px] font-black uppercase tracking-widest gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setSelectedInstallment({ allPayments: payments });
                                                                                                        setShowPurchaseReceipt(true);
                                                                                                    }}
                                                                                                >
                                                                                                    <Printer className="h-3 w-3" /> Print All Vouchers
                                                                                                </Button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {tx.notes && tx.type !== 'INWARD' && (
                                                        <div className="col-span-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes</div>
                                                            <div className="text-xs text-slate-600">{tx.notes}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {/* Pay Now Button (Only for INWARD with balance) */}
                                                    {tx.type === 'INWARD' && (
                                                        (() => {
                                                            const total = tx.invoice?.totalAmount || tx.totalAmount || 0;
                                                            const paid = tx.invoice?.paidAmount || 0;
                                                            const balance = total - paid;
                                                            
                                                            if (balance > 0) {
                                                                return (
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-emerald-600 hover:bg-emerald-700 h-8 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider gap-2 shadow-md shadow-emerald-100"
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            // Ensure we have an invoice-like object
                                                                            const invoiceToUse = tx.invoice || {
                                                                                id: tx.id,
                                                                                invoiceNumber: tx.referenceId || `TX-${tx.id.slice(0, 8)}`,
                                                                                vendorName: tx.entityName || 'General Vendor',
                                                                                totalAmount: tx.totalAmount,
                                                                                paidAmount: 0,
                                                                                items: [{ name: tx.product?.name, quantity: tx.quantity, rate: tx.rate }],
                                                                                notes: tx.notes,
                                                                                isSynthesized: true
                                                                            };
                                                                            setSelectedTx({ ...tx, invoice: invoiceToUse });
                                                                            setShowPayModal(true); 
                                                                        }}
                                                                    >
                                                                        <CreditCard className="h-3.5 w-3.5" /> Settle Payment
                                                                    </Button>
                                                                );
                                                            }
                                                            return null;
                                                        })()
                                                    )}

                                                    {/* Print Button — only for OUTWARD/sales with full invoice */}
                                                    {tx.type === 'OUTWARD' && tx.invoice && tx.student && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-indigo-600 hover:bg-indigo-700 h-8 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider gap-2 shadow-md shadow-indigo-100"
                                                            onClick={(e) => { e.stopPropagation(); setShowReceipt(true); }}
                                                        >
                                                            <Printer className="h-3.5 w-3.5" /> Print Invoice
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={14} className="h-24 text-center border border-slate-200 bg-slate-50/30">
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <History className="h-6 w-6 text-slate-200 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No ledger entries found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    
                    {/* Table Footer with Totals */}
                    {!loading && filteredTransactions.length > 0 && (
                        <tfoot>
                            <TableRow className="bg-slate-50 font-black border-t-2 border-slate-200">
                                <TableCell colSpan={7} className="text-right text-[10px] uppercase tracking-widest text-slate-500 py-3 px-4 border-r border-slate-200">
                                    Ledger Summary
                                </TableCell>
                                <TableCell className="text-right text-[11px] text-red-600 border-r border-slate-200 px-3 py-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] uppercase opacity-50 mb-0.5">Total Dues</span>
                                        ₹{totals.paid.toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-[11px] text-emerald-600 border-r border-slate-200 px-3 py-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] uppercase opacity-50 mb-0.5">Total Paid</span>
                                        ₹{(() => {
                                            return filteredTransactions.filter(t => t.type === 'INWARD').reduce((sum, t) => sum + (t.invoice?.paidAmount || 0), 0);
                                        })().toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-[11px] text-slate-700 border-r border-slate-200 px-3 py-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] uppercase opacity-50 mb-0.5">Gross Sales</span>
                                        ₹{totals.received.toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-[11px] text-red-500 border-r border-slate-200 px-3 py-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] uppercase opacity-50 mb-0.5">Discount</span>
                                        ₹{filteredTransactions.reduce((sum, t) => sum + (t.discount || 0), 0).toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-[11px] text-indigo-700 border-r border-slate-200 px-3 py-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] uppercase opacity-50 mb-0.5">Recv Amt</span>
                                        ₹{filteredTransactions.filter(t => t.type === 'OUTWARD').reduce((sum, t) => sum + (t.totalAmount - (t.discount || 0)), 0).toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell colSpan={2} className={cn(
                                    "text-right text-[11px] px-3 py-3",
                                    totalBalance >= 0 ? "text-emerald-600" : "text-red-600"
                                )}>
                                    <div className="flex flex-col items-end whitespace-nowrap">
                                        <span className="text-[8px] uppercase font-black tracking-widest opacity-60 mb-0.5">Net Position</span>
                                        ₹{totalBalance.toLocaleString()}
                                    </div>
                                </TableCell>
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </div>

            {/* Revert Confirm Modal */}
            {revertConfirm && (
                <RevertConfirmModal
                    isOpen={revertConfirm.isOpen}
                    onClose={() => setRevertConfirm(null)}
                    onConfirm={handleRevert}
                    payment={revertConfirm.payment}
                    submitting={reverting}
                />
            )}

            {/* Pay Modal */}
            {showPayModal && selectedTx?.invoice && (
                <PayNowModal
                    isOpen={showPayModal}
                    onClose={() => setShowPayModal(false)}
                    invoice={selectedTx.invoice}
                    schoolId={schoolId}
                    onPaid={fetchTransactions}
                />
            )}

            {/* Purchase/Installment Receipt Modal */}
            {showPurchaseReceipt && selectedTx?.invoice && (
                <PurchaseReceiptModal
                    invoice={selectedInstallment ? {
                        ...selectedTx.invoice,
                        paidAmount: selectedInstallment.amount,
                        paymentMode: selectedInstallment.mode,
                        date: selectedInstallment.date,
                        notes: selectedInstallment.notes || selectedTx.invoice.notes,
                        isInstallment: true
                    } : selectedTx.invoice}
                    schoolDetails={school}
                    onClose={() => {
                        setShowPurchaseReceipt(false);
                        setSelectedInstallment(null);
                    }}
                />
            )}

            {/* Receipt modal */}
            {showReceipt && selectedTx?.invoice && selectedTx?.student && (
                <InventoryReceiptModal
                    invoice={selectedTx.invoice}
                    student={selectedTx.student}
                    schoolDetails={school}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );

    return (
        <>
            {!standalone ? (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] h-[90vh] overflow-auto flex flex-col p-0 border-none shadow-2xl rounded-2xl">
                        {content}
                    </DialogContent>
                </Dialog>
            ) : content}
        </>
    );
}
