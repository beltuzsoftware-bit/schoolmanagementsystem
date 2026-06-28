'use client';

import React, { useState, useEffect } from 'react';
import { 
    Package, 
    Plus, 
    Search, 
    Filter, 
    AlertCircle, 
    TrendingUp, 
    TrendingDown,
    MoreHorizontal,
    ArrowDownLeft,
    ShoppingCart,
    Clock,
    LayoutDashboard,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Edit,
    Trash2,
    History,
    Users,
    Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getInventoryProducts, deleteInventoryProduct, syncSimpleCatalogToInventory } from '@/app/actions/inventory';
import { AddProductModal } from '@/components/school-admin/inventory/add-product-modal';
import { EditProductModal } from '@/components/school-admin/inventory/edit-product-modal';
import { StockInwardModal } from '@/components/school-admin/inventory/stock-inward-modal';
import { PurchaseInvoicesModal } from '@/components/school-admin/inventory/purchase-invoices-modal';
import { InventorySettingsModal } from '@/components/school-admin/inventory/inventory-settings-modal';
import { SalesTerminal } from '@/components/school-admin/inventory/sales-terminal';
import { SaleInvoicesTable } from '@/components/school-admin/inventory/sale-invoices-table';
import { VendorManagement } from '@/components/school-admin/inventory/vendor-management';
import { GlobalTransactionsModal } from '@/components/school-admin/inventory/global-transactions-modal';
import { BulkStockInwardModal } from '@/components/school-admin/inventory/bulk-stock-inward-modal';
import { ProductTransactionsModal } from '@/components/school-admin/inventory/product-transactions-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Link from 'next/link';

type SortKey = 'name' | 'category' | 'currentStock' | 'sellPrice' | 'sku';
type SortOrder = 'asc' | 'desc';

export default function InventoryDashboard() {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('sales');
    
    // Sort State
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStockInwardModalOpen, setIsStockInwardModalOpen] = useState(false);
    const [isBulkInwardModalOpen, setIsBulkInwardModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [school, setSchool] = useState<any>(null);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
    
    // Edit Invoice State
    const [editInvoiceData, setEditInvoiceData] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncSimpleCatalog = async () => {
        if (!school?.id) return;
        setIsSyncing(true);
        try {
            const res = await syncSimpleCatalogToInventory(school.id);
            if (res.success) {
                if (res.importedCount! > 0) {
                    toast.success(`Successfully synchronized ${res.importedCount} items and ${res.importedVendorsCount} suppliers from the simple catalog!`);
                    loadData();
                } else {
                    toast.info("All items from the simple catalog are already present in the advanced inventory database.");
                }
            } else {
                toast.error(res.error || "Synchronization failed");
            }
        } catch (err) {
            toast.error("An unexpected error occurred during sync");
        } finally {
            setIsSyncing(false);
        }
    };

    const loadData = async () => {
        const storedUser = localStorage.getItem('kummi_user');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        
        setIsLoading(true);
        try {
            const [productsData, invoicesData, purchasesData, schoolData] = await Promise.all([
                getInventoryProducts(user.schoolId),
                import('@/app/actions/inventory').then(mod => mod.getAccessoryInvoices(user.schoolId)),
                import('@/app/actions/inventory').then(mod => mod.getPurchaseInvoices(user.schoolId)),
                import('@/app/actions').then(mod => mod.getSchool(user.schoolId))
            ]);

            setProducts(productsData);
            setInvoices(invoicesData);
            setPurchaseInvoices(purchasesData);
            setSchool(schoolData);
        } catch (error) {
            toast.error("Failed to load inventory data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Are you sure? This will delete the product permanently.")) return;
        try {
            const res = await deleteInventoryProduct(school.id, id);
            if (res.success) {
                toast.success("Product deleted");
                loadData();
            }
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Stats
    const lowStockItems = products.filter(p => p.currentStock <= p.minStockThreshold);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.currentStock * (p.buyPrice || 0)), 0);
    
    // Helper to check if a date (string or object) matches a target date string (YYYY-MM-DD)
    const matchesDate = (dateVal: any, target: string) => {
        if (!dateVal) return false;
        try {
            const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
            return dateStr.startsWith(target);
        } catch (e) {
            return false;
        }
    };

    // Calculate Today's Sales
    const today = new Date().toISOString().split('T')[0];
    const salesToday = invoices
        .filter(inv => matchesDate(inv.createdAt, today) || matchesDate(inv.date, today))
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Calculate Growth (vs Yesterday)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const salesYesterday = invoices
        .filter(inv => matchesDate(inv.createdAt, yesterday) || matchesDate(inv.date, yesterday))
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const salesGrowth = salesYesterday === 0 ? (salesToday > 0 ? 100 : 0) : ((salesToday - salesYesterday) / salesYesterday) * 100;
    const handleEditInvoice = (invoice: any) => {
        setEditInvoiceData(invoice);
        setActiveTab('sales');
    };

    // Calculate Payables (Vendor Balance)
    const vendorBalance = purchaseInvoices.reduce((sum, inv) => sum + ((inv.totalAmount || 0) - (inv.paidAmount || 0)), 0);

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />;
    };

    return (
        <div className="space-y-4 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight font-serif">Inventory Management</h1>
                        <p className="text-sm font-medium text-slate-500">Track and manage school accessories, books, and uniforms.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-indigo-100 gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Product
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1.5 h-auto flex flex-wrap gap-1.5 w-full md:w-fit justify-start bg-muted/50 rounded-xl mb-4">
                    <TabsTrigger value="sales" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Sale
                    </TabsTrigger>
                    <TabsTrigger value="sale-invoices" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <History className="w-4 h-4 mr-2" />
                        Invoice
                    </TabsTrigger>
                    <TabsTrigger value="catalog" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <Package className="w-4 h-4 mr-2" />
                        Items
                    </TabsTrigger>
                    <TabsTrigger value="vendors" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <Users className="w-4 h-4 mr-2" />
                        Suppliers
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <Clock className="w-4 h-4 mr-2" />
                        Purchase
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <History className="w-4 h-4 mr-2" />
                        All Transactions
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <SalesTerminal 
                        schoolId={school?.id} 
                        standalone={true} 
                        onSuccess={() => {
                            loadData();
                            setEditInvoiceData(null);
                        }}
                        initialData={editInvoiceData}
                    />
                </TabsContent>

                <TabsContent value="sale-invoices" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <SaleInvoicesTable 
                        schoolId={school?.id} 
                        standalone={true} 
                        onEdit={handleEditInvoice}
                    />
                </TabsContent>

                <TabsContent value="catalog" className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Package className="h-5 w-5 text-indigo-600" />
                            Items
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSyncSimpleCatalog}
                                disabled={isSyncing}
                                className="text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 flex items-center gap-1.5"
                            >
                                {isSyncing ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
                                ) : "⚡"}
                                Sync from Simple Catalog
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsAddModalOpen(true)}
                                className="text-xs font-bold text-indigo-600"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add New Product
                            </Button>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-indigo-600 text-white rounded-xl p-3 shadow-sm relative overflow-hidden h-20 flex flex-col justify-center group transition-all hover:scale-[1.02]">
                            <Package className="absolute right-2 top-2 h-5 w-5 opacity-20 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-wider">Total Products</span>
                            <div className="text-lg font-black">{products.length}</div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm h-20 flex flex-col justify-center transition-all hover:border-orange-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                Low Stock
                            </span>
                            <div className="text-lg font-black text-orange-600">{lowStockItems.length}</div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm h-20 flex flex-col justify-center transition-all hover:border-emerald-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sales Today</span>
                            <div className="flex items-center gap-2">
                                <div className="text-lg font-black text-emerald-600">₹{salesToday.toLocaleString()}</div>
                                <span className={cn("text-[9px] font-bold", salesGrowth >= 0 ? "text-emerald-500" : "text-red-500")}>
                                    {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm h-20 flex flex-col justify-center transition-all hover:border-red-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="h-3 w-3 text-red-400" />
                                Payables
                            </span>
                            <div className="text-lg font-black text-red-600">₹{vendorBalance.toLocaleString()}</div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm h-20 flex flex-col justify-center transition-all hover:border-indigo-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3 text-indigo-400" />
                                Asset Value
                            </span>
                            <div className="text-lg font-black text-indigo-600">₹{totalInventoryValue.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Table Toolbar */}
                    <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="relative w-72">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input 
                                    placeholder="Filter catalog..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-white border-slate-200 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 w-full"
                                />
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-slate-200">
                            Export Excel
                        </Button>
                    </div>

                    {/* Excel-like Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <Table className="border-collapse">
                            <TableHeader className="bg-slate-100/50">
                                <TableRow className="h-8 hover:bg-transparent border-slate-200">
                                    <TableHead 
                                        className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Product Name <SortIcon col="name" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('category')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Category <SortIcon col="category" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('sku')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            SKU/Code <SortIcon col="sku" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('currentStock')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Stock <SortIcon col="currentStock" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('sellPrice')}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            Sell Price <SortIcon col="sellPrice" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-center">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center border border-slate-200">
                                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                                                Syncing Catalog...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredProducts.length > 0 ? filteredProducts.map((product) => (
                                    <TableRow key={product.id} className="h-8 hover:bg-indigo-50/30 transition-colors border-slate-200 group">
                                        <TableCell className="text-[11px] font-bold text-slate-900 border border-slate-200 px-3 py-1">
                                            {product.name}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-slate-600 border border-slate-200 px-3 py-1">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 bg-slate-50 h-5 px-1.5">
                                                {product.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-mono text-slate-500 border border-slate-200 px-3 py-1 text-center">
                                            {product.sku || '—'}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-black border border-slate-200 px-3 py-1 text-center">
                                            <span className={product.currentStock <= product.minStockThreshold ? 'text-orange-600' : 'text-slate-900'}>
                                                {product.currentStock} <span className="text-[9px] font-bold opacity-40">{product.unit}</span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-black text-slate-900 border border-slate-200 px-3 py-1 text-right">
                                            ₹{product.sellPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="border border-slate-200 px-2 py-1">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setIsHistoryModalOpen(true);
                                                    }}
                                                    title="View History"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setIsStockInwardModalOpen(true);
                                                    }}
                                                    title="Add Stock"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-slate-400 hover:text-blue-600 transition-colors"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    title="Edit Product"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-slate-400 hover:text-red-600 transition-colors"
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center border border-slate-200 bg-slate-50/30">
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <Package className="h-6 w-6 text-slate-200 mb-2" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No items found in catalog</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="vendors" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <VendorManagement schoolId={school?.id} standalone={true} />
                </TabsContent>

                <TabsContent value="invoices" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Procurement Invoices</h2>
                        </div>
                        <Button 
                            onClick={() => setIsBulkInwardModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 h-9 px-4 rounded-xl font-bold shadow-lg shadow-indigo-100 gap-2 text-xs"
                        >
                            <Plus className="h-4 w-4" />
                            Record Bulk Purchase (Multi-Item Bill)
                        </Button>
                    </div>
                    <PurchaseInvoicesModal schoolId={school?.id} standalone={true} onSuccess={loadData} />
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <GlobalTransactionsModal schoolId={school?.id} standalone={true} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 animate-in fade-in duration-500 outline-none">
                    <InventorySettingsModal schoolId={school?.id} standalone={true} />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <AddProductModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                schoolId={school?.id} 
                onSuccess={loadData} 
            />
            <EditProductModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                product={selectedProduct} 
                onSuccess={loadData} 
            />
            <StockInwardModal 
                isOpen={isStockInwardModalOpen} 
                onClose={() => setIsStockInwardModalOpen(false)} 
                schoolId={school?.id} 
                product={selectedProduct} 
                onSuccess={loadData} 
            />
            <BulkStockInwardModal 
                isOpen={isBulkInwardModalOpen}
                onClose={() => setIsBulkInwardModalOpen(false)}
                schoolId={school?.id}
                products={products}
                onSuccess={loadData}
            />
            <ProductTransactionsModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                product={selectedProduct}
                schoolId={school?.id}
            />
        </div>
    );
}
