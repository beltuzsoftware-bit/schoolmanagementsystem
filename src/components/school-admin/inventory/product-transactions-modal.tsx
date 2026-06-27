'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
    Pencil, 
    Trash2, 
    Check, 
    X, 
    ArrowUpCircle, 
    ArrowDownCircle,
    Calendar,
    User,
    Tag,
    ArrowUpDown,
    Filter,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    AlertCircle,
    FileSpreadsheet,
    FileText,
    FileDown
} from 'lucide-react';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProductTransactions, updateStockTransaction, deleteStockTransaction } from '@/app/actions/inventory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VendorSelect } from './vendor-select';

interface ProductTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    schoolId: string;
}

export function ProductTransactionsModal({ isOpen, onClose, product, schoolId }: ProductTransactionsModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [sortColumn, setSortColumn] = useState<'date' | 'type' | 'entity' | 'qty' | 'rate' | 'total'>('date');
    const [dateFilter, setDateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'INWARD' | 'OUTWARD'>('all');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // --- ANALYTICS CALCULATION (LIFETIME) ---
    const stats = React.useMemo(() => {
        const lifetimeInward = transactions.filter(t => t.type === 'INWARD');
        const lifetimeOutward = transactions.filter(t => t.type === 'OUTWARD');

        const totalInQty = lifetimeInward.reduce((sum, t) => sum + t.quantity, 0);
        const totalOutQty = lifetimeOutward.reduce((sum, t) => sum + t.quantity, 0);
        
        const totalInAmt = lifetimeInward.reduce((sum, t) => sum + (t.totalAmount || (t.quantity * t.rate)), 0);
        const totalOutAmt = lifetimeOutward.reduce((sum, t) => sum + (t.totalAmount || (t.quantity * t.rate)), 0);

        const avgBuy = totalInQty > 0 ? totalInAmt / totalInQty : 0;
        const avgSell = totalOutQty > 0 ? totalOutAmt / totalOutQty : 0;

        // Gross Profit Calculation: (Avg Sell - Avg Buy) * Total Sold
        const grossProfit = (avgSell - avgBuy) * totalOutQty;
        const profitMargin = avgSell > 0 ? ((avgSell - avgBuy) / avgSell) * 100 : 0;

        return {
            totalInQty,
            totalOutQty,
            totalInAmt,
            totalOutAmt,
            avgBuy,
            avgSell,
            grossProfit,
            profitMargin
        };
    }, [transactions]);

    const fetchTransactions = async () => {
        if (!product?.id) return;
        setLoading(true);
        try {
            const data = await getProductTransactions(product.id);
            setTransactions(data);
        } catch (error) {
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && product) {
            fetchTransactions();
        }
    }, [isOpen, product]);

    const handleStartEdit = (tx: any) => {
        setEditingId(tx.id);
        setEditData({
            quantity: tx.quantity,
            rate: tx.rate,
            entityName: tx.entityName || '',
            referenceId: tx.referenceId || '',
            notes: tx.notes || ''
        });
    };

    const handleSaveEdit = async (id: string) => {
        try {
            const result = await updateStockTransaction(id, {
                quantity: parseInt(editData.quantity),
                rate: parseFloat(editData.rate),
                entityName: editData.entityName,
                referenceId: editData.referenceId,
                notes: editData.notes
            });

            if (result.success) {
                toast.success("Transaction updated");
                setEditingId(null);
                fetchTransactions();
            }
        } catch (error) {
            toast.error("Failed to update transaction");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will also adjust the current stock level.")) return;
        try {
            const result = await deleteStockTransaction(id);
            if (result.success) {
                toast.success("Transaction deleted");
                fetchTransactions();
            }
        } catch (error) {
            toast.error("Failed to delete transaction");
        }
    };

    const handleExportPDF = () => {
        const filtered = getFilteredTransactions();
        if (filtered.length === 0) {
            toast.error("No data to export");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>${product.name} - Stock Ledger</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #334155; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; color: #1e293b; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; }
                    .stat-item { display: flex; flex-col; }
                    .stat-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; }
                    .stat-value { font-size: 16px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; border: 1px solid #cbd5e1; }
                    td { padding: 10px; font-size: 11px; border: 1px solid #cbd5e1; }
                    .flow-in { color: #059669; font-weight: bold; }
                    .flow-out { color: #d97706; font-weight: bold; }
                    .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">${product.name} Ledger</div>
                        <div style="font-size: 12px; margin-top: 4px;">School Inventory Audit Report</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold;">Current Stock: ${product.currentStock} ${product.unit}</div>
                        <div style="font-size: 10px;">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-label">Total Inward</div>
                        <div class="stat-value">${stats.totalInQty} ${product.unit}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Sales</div>
                        <div class="stat-value">${stats.totalOutQty} ${product.unit}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg. Purchase</div>
                        <div class="stat-value">₹${stats.avgBuy.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Est. Profit</div>
                        <div class="stat-value">₹${stats.grossProfit.toLocaleString()}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Flow</th>
                            <th>Entity / Particulars</th>
                            <th>Qty</th>
                            <th>Unit Rate</th>
                            <th>Amount</th>
                            <th>Recorded By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(tx => `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                <td class="${tx.type === 'INWARD' ? 'flow-in' : 'flow-out'}">${tx.type}</td>
                                <td>${tx.entityName || (tx.type === 'OUTWARD' ? 'Student Sale' : 'Direct Inward')}</td>
                                <td>${tx.quantity} ${product.unit}</td>
                                <td>₹${tx.rate}</td>
                                <td>₹${tx.totalAmount}</td>
                                <td>${tx.recordedBy || 'Admin'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    This is an official computer-generated audit log. No modification or deletion allowed.
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };
    const handleExportExcel = () => {
        const filtered = getFilteredTransactions();
        if (filtered.length === 0) {
            toast.error("No data to export");
            return;
        }

        // CSV Header with BOM for UTF-8 support (fixes 'garbage' characters in Excel)
        let csv = "\uFEFF"; 
        csv += `Product,${product.name}\n`;
        csv += `Current Stock,${product.currentStock} ${product.unit}\n`;
        csv += `Report Generated,${new Date().toLocaleString()}\n\n`;
        csv += `Date,Flow,Particulars/Entity,Qty In ${product.unit},Unit Rate (₹),Amount (₹),Recorded By\n`;

        // CSV Rows
        filtered.forEach(tx => {
            const date = new Date(tx.date).toLocaleDateString('en-GB');
            const flow = tx.type;
            const entity = (tx.entityName || (tx.type === 'OUTWARD' ? 'Student Sale' : 'Direct Inward')).replace(/,/g, ' ');
            // Keep quantity as a raw number so Excel can sum it
            const qty = tx.quantity;
            // Remove ₹ symbol from data rows to keep them as clean numbers for Excel formulas
            const rate = tx.rate;
            const amount = tx.totalAmount;
            const user = tx.recordedBy || 'Admin';
            
            csv += `${date},${flow},${entity},${qty},${rate},${amount},${user}\n`;
        });

        // Download Trigger
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${product.name.replace(/\s+/g, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel report downloaded");
    };

    const getFilteredTransactions = () => {
        let filtered = [...transactions];
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        
        if (dateFilter !== 'all') {
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.date);
                if (dateFilter === 'today') {
                    return txDate >= todayStart;
                }
                if (dateFilter === 'yesterday') {
                    const yesterday = new Date(todayStart);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return txDate >= yesterday && txDate < todayStart;
                }
                if (dateFilter === 'this_week') {
                    const weekStart = new Date(todayStart);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    return txDate >= weekStart;
                }
                if (dateFilter === 'last_week') {
                    const lastWeekStart = new Date(todayStart);
                    lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
                    const lastWeekEnd = new Date(lastWeekStart);
                    lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
                    return txDate >= lastWeekStart && txDate < lastWeekEnd;
                }
                if (dateFilter === 'this_month') {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return txDate >= monthStart;
                }
                if (dateFilter === 'last_month') {
                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
                }
                if (dateFilter === 'custom' && customRange.start && customRange.end) {
                    const start = new Date(customRange.start);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(customRange.end);
                    end.setHours(23, 59, 59, 999);
                    return txDate >= start && txDate <= end;
                }
                return true;
            });
        }

        // Apply Type Filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(tx => tx.type === typeFilter);
        }

        // Apply Sorting
        filtered.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortColumn === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            } else if (sortColumn === 'type') {
                valA = a.type || '';
                valB = b.type || '';
            } else if (sortColumn === 'entity') {
                valA = a.entityName?.toLowerCase() || '';
                valB = b.entityName?.toLowerCase() || '';
            } else if (sortColumn === 'qty') {
                valA = Number(a.quantity) || 0;
                valB = Number(b.quantity) || 0;
            } else if (sortColumn === 'rate') {
                valA = Number(a.rate) || 0;
                valB = Number(b.rate) || 0;
            } else if (sortColumn === 'total') {
                valA = Number(a.totalAmount) || 0;
                valB = Number(b.totalAmount) || 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const handleSort = (col: 'date' | 'type' | 'entity' | 'qty' | 'rate' | 'total') => {
        if (sortColumn === col) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortOrder('asc');
        }
    };

    const filteredTransactions = getFilteredTransactions();

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
                <div className="p-4 bg-white border-b border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                                    <Tag className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900">
                                        {product.name} - Ledger Record
                                    </DialogTitle>
                                    <DialogDescription className="text-xs font-medium text-slate-500">
                                        Official stock movement history and audit trail.
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded border border-slate-200">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider gap-2">
                                                <Filter className="h-3 w-3 text-emerald-600" />
                                                {dateFilter.replace('_', ' ')}
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setDateFilter('all')}>All Transactions</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('today')}>Today</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('yesterday')}>Yesterday</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('this_week')}>This Week</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('last_week')}>Last Week</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('this_month')}>This Month</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('last_month')}>Last Month</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDateFilter('custom')}>Custom Range...</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div className="w-[1px] h-4 bg-slate-200"></div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider gap-2">
                                                <Filter className="h-3 w-3 text-emerald-600" />
                                                {typeFilter === 'all' ? 'All Types' : typeFilter}
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setTypeFilter('all')}>All Types</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTypeFilter('INWARD')}>Inward (Purchases)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTypeFilter('OUTWARD')}>Outward (Sales)</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                                        onClick={handleExportExcel}
                                    >
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        CSV
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        onClick={handleExportExcel}
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        EXCEL
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                                        onClick={handleExportPDF}
                                    >
                                        <FileDown className="h-4 w-4 text-rose-600" />
                                        PDF
                                    </Button>
                                </div>

                                <div className="bg-slate-900 px-4 py-1.5 rounded text-white border border-slate-800">
                                    <div className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Balance Stock</div>
                                    <div className="text-sm font-bold">{product.currentStock} {product.unit}</div>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-6 overflow-x-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Inward (Lifetime)</span>
                            <span className="text-sm font-bold text-slate-700">{stats.totalInQty} {product.unit}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Sales (Till Date)</span>
                            <span className="text-sm font-bold text-slate-700">{stats.totalOutQty} {product.unit}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg. Purchase Cost</span>
                            <span className="text-sm font-bold text-slate-700">₹{stats.avgBuy.toFixed(2)}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg. Selling Cost</span>
                            <span className="text-sm font-bold text-slate-700">₹{stats.avgSell.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gross Profit (Est.)</span>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-base font-black", stats.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    ₹{stats.grossProfit.toLocaleString()}
                                </span>
                                <span className={cn("text-[10px] font-bold px-1 rounded", stats.profitMargin >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                    {stats.profitMargin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-100 p-4">
                    <div className="bg-white border border-slate-300 shadow-sm overflow-hidden rounded-none">
                        {loading ? (
                            <div className="flex items-center justify-center h-64 bg-white">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 bg-white text-slate-400 space-y-2">
                                <Filter className="h-12 w-12 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-[10px]">No records found for current filters</p>
                                <Button variant="link" onClick={() => {setDateFilter('all'); setTypeFilter('all');}} className="text-emerald-600 text-xs">Clear all filters</Button>
                            </div>
                        ) : (
                            <Table className="border-collapse">
                                <TableHeader className="bg-slate-50 border-b border-slate-300">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('date')}
                                        >
                                            <div className="flex items-center justify-between px-1">
                                                Date
                                                {sortColumn === 'date' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('type')}
                                        >
                                            <div className="flex items-center justify-between px-1">
                                                Flow
                                                {sortColumn === 'type' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('entity')}
                                        >
                                            <div className="flex items-center justify-between px-1">
                                                Particulars / Entity
                                                {sortColumn === 'entity' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('qty')}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                Qty
                                                {sortColumn === 'qty' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('rate')}
                                        >
                                            <div className="flex items-center justify-end gap-2 pr-1">
                                                Unit Rate
                                                {sortColumn === 'rate' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="h-10 border-r border-slate-200 font-bold uppercase text-[10px] tracking-tight text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => handleSort('total')}
                                        >
                                            <div className="flex items-center justify-end gap-2 pr-1">
                                                Amount
                                                {sortColumn === 'total' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-20" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="h-10 font-bold uppercase text-[10px] tracking-tight text-slate-700 text-center px-2">Recorded By</TableHead>
                                        <TableHead className="h-10 font-bold uppercase text-[10px] tracking-tight text-slate-700 text-center w-24 px-2">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.map((tx, idx) => (
                                        <TableRow key={tx.id} className={cn(
                                            "h-9 border-b border-slate-200 hover:bg-emerald-50/30 transition-colors group",
                                            idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                                        )}>
                                            <TableCell className="border-r border-slate-200 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                {new Date(tx.date).toLocaleDateString('en-GB')}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200">
                                                <span className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-sm border",
                                                    tx.type === 'INWARD' 
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                                )}>
                                                    {tx.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 max-w-[250px]">
                                                <div className="flex flex-col truncate px-1">
                                                    <span className="font-semibold text-slate-800 text-[11px]">
                                                        {tx.entityName || (tx.type === 'OUTWARD' ? 'Student Sale' : 'Direct Inward')}
                                                    </span>
                                                    {tx.referenceId && <span className="text-[9px] text-slate-400 font-medium">REF: {tx.referenceId}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-center font-bold text-slate-900 text-[11px]">
                                                {tx.quantity} {product.unit}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-right font-medium text-slate-600 text-[11px] px-2">
                                                ₹{tx.rate.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-right font-bold text-slate-900 text-[11px] px-2">
                                                ₹{tx.totalAmount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="border-r border-slate-200 text-center px-2">
                                                <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-600">
                                                    <User className="h-3 w-3 text-slate-300" />
                                                    {tx.recordedBy || 'Admin'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center px-2">
                                                <div className="flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                    <span className="text-[9px] font-bold text-emerald-600 ml-1">VERIFIED</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-medium px-1">
                        <div className="flex items-center gap-4">
                            <span>Total Records: {filteredTransactions.length}</span>
                            <span>Generated: {new Date().toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 italic">
                            <AlertCircle className="h-3 w-3" />
                            Note: Official Audit records cannot be modified or deleted to preserve financial integrity.
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
