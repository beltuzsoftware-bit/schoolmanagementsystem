'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    ShoppingBag, 
    Package, 
    History, 
    Plus, 
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Edit3,
    MoreVertical,
    Save,
    X,
    Settings,
    Eye,
    EyeOff,
    Copy,
    Trash2,
    FileSpreadsheet,
    FileJson,
    FileText,
    Printer,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    PlusCircle,
    AlertCircle,
    PackagePlus,
    Tags,
    ListChecks,
    RotateCcw,
    CreditCard,
    UserCircle,
    CalendarDays
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSchool } from '@/app/actions';
import { updateSchoolAccessories, updateSchoolAccessorySettings, updateSchoolAccessoryCategories, getAccessoryTemplates, assignAccessoryTemplateToSchool } from '@/app/actions/accessories';
import { AccessoryCategory, AccessoryItem, School, AccessoryFieldConfig, AccessorySessionStats } from '@/types';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export default function AccessoriesPage() {
    const [school, setSchool] = useState<School | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<AccessoryFieldConfig[]>([]);
    
    // Sort
    const [sortConfig, setSortConfig] = useState<{ key: keyof AccessoryItem | 'availableQuantity'; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

    // Delete State
    const [itemToDelete, setItemToDelete] = useState<AccessoryItem | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Category Manager State
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [tempCategories, setTempCategories] = useState<AccessoryCategory[]>([]);

    // Expansion & Entry Logs State
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [itemForEntry, setItemForEntry] = useState<AccessoryItem | null>(null);
    const [newEntryData, setNewEntryData] = useState({
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        quantity: 0,
        buyRate: 0,
        sellRate: 0
    });

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    const DEFAULT_FIELDS = [
        { fieldName: 'hsnCode', label: 'HSN Code', isVisible: true, isRequired: false },
        { fieldName: 'vendorDetails', label: 'Vendor Name', isVisible: true, isRequired: false },
        { fieldName: 'description', label: 'Description', isVisible: true, isRequired: false },
        { fieldName: 'entryDate', label: 'Entry Date', isVisible: true, isRequired: false },
        { fieldName: 'entryQuantity', label: 'Entry Quantity', isVisible: true, isRequired: false },
        { fieldName: 'totalQuantity', label: 'Total Quantity', isVisible: true, isRequired: false },
        { fieldName: 'availableQuantity', label: 'Available Quantity', isVisible: true, isRequired: false },
        { fieldName: 'thresholdQuantity', label: 'Threshold', isVisible: true, isRequired: false },
        { fieldName: 'buyPrice', label: 'Buy Rate', isVisible: true, isRequired: false },
        { fieldName: 'sellPrice', label: 'Sell Rate', isVisible: true, isRequired: false },
        { fieldName: 'carryForward', label: 'Carry Forward', isVisible: true, isRequired: false }
    ];

    useEffect(() => {
        const loadData = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (!storedUser) {
                setIsLoading(false);
                return;
            }
            const user = JSON.parse(storedUser);
            const schoolId = user.schoolId;
            if (!schoolId) {
                setIsLoading(false);
                return;
            }
            const data = await getSchool(schoolId);
            if (data) {
                setSchool(data);
                
                // Ensure fieldConfig has defaults if empty
                const currentConfig = data.accessories?.fieldConfig || [];
                if (currentConfig.length === 0) {
                    setTempConfig(DEFAULT_FIELDS);
                } else {
                    setTempConfig(currentConfig);
                }
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleInitializeCatalog = async () => {
        if (!school) return;
        setIsLoading(true);
        try {
            // Try to use a global template first; if none available, initialize with blank defaults
            const templates = await getAccessoryTemplates();
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];

            let res;
            if (defaultTemplate) {
                res = await assignAccessoryTemplateToSchool(school.id, defaultTemplate.id);
            } else {
                // No global templates — initialize a fresh blank catalog with all default fields
                const blankAccessories = {
                    categories: [
                        { id: `cat_${Date.now()}_1`, name: 'Uniforms' },
                        { id: `cat_${Date.now()}_2`, name: 'Books & Stationery' },
                        { id: `cat_${Date.now()}_3`, name: 'General' },
                    ],
                    items: [],
                    fieldConfig: DEFAULT_FIELDS,
                };
                res = await updateSchoolAccessories(school.id, blankAccessories);
            }

            if (res.success) {
                const data = await getSchool(school.id);
                if (data) {
                    setSchool(data);
                    const currentConfig = data.accessories?.fieldConfig || [];
                    setTempConfig(currentConfig.length === 0 ? DEFAULT_FIELDS : currentConfig);
                }
                toast.success("Inventory catalog initialized! You can now add items.");
            } else {
                toast.error((res as any).error || "Failed to initialize catalog");
            }
        } catch (error) {
            toast.error("An error occurred during initialization.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (updatedItem: AccessoryItem) => {
        if (!school || !school.accessories) return;

        const sessionId = school.currentSession;
        if (!sessionId) {
            toast.error("Active academic session not identified");
            return;
        }

        // Validation
        const config = school.accessories.fieldConfig || [];
        for (const field of config) {
            if (field.isVisible && field.isRequired) {
                if (!updatedItem[field.fieldName as keyof AccessoryItem]) {
                    toast.error(`${field.label} is required`);
                    return;
                }
            }
        }

        // Update sessionData with latest quantities
        const currentStats: AccessorySessionStats = {
            entryQuantity: updatedItem.entryQuantity || 0,
            totalQuantity: updatedItem.totalQuantity || 0,
            availableQuantity: updatedItem.availableQuantity || 0
        };

        const itemToSave = {
            ...updatedItem,
            id: updatedItem.id || `acc_sh_${Date.now()}`,
            sessionData: {
                ...(updatedItem.sessionData || {}),
                [sessionId]: currentStats
            }
        };

        const newItems = school.accessories.items.map(item => 
            item.id === itemToSave.id ? itemToSave : item
        );

        if (!school.accessories.items.find(i => i.id === itemToSave.id)) {
            newItems.push(itemToSave);
        }

        const updatedAccessories = {
            ...school.accessories,
            items: newItems
        };

        const result = await updateSchoolAccessories(school.id, updatedAccessories);
        if (result.success) {
            setSchool({ ...school, accessories: updatedAccessories });
            toast.success("Item updated successfully");
            setIsEditDialogOpen(false);
            setEditingItem(null);
        } else {
            toast.error("Failed to update item");
        }
    };

    const handleDuplicateItem = (item: AccessoryItem) => {
        const sessionStats = getSessionStats(item);
        setEditingItem({
            ...item,
            id: '', // Clear ID for new creation
            name: `${item.name} (Copy)`,
            sku: item.sku ? `${item.sku}-COPY` : '',
            entryQuantity: sessionStats.entryQuantity,
            totalQuantity: sessionStats.totalQuantity,
            availableQuantity: sessionStats.availableQuantity
        });
        setIsEditDialogOpen(true);
    };

    const handleDeleteItem = async (item: AccessoryItem) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!school || !school.accessories || !itemToDelete) return;

        const updatedItems = (school.accessories.items || []).filter(i => i.id !== itemToDelete.id);
        const res = await updateSchoolAccessories(school.id, { ...school.accessories, items: updatedItems });
        
        if (res.success) {
            toast.success("Item deleted successfully");
            setSchool({ ...school, accessories: { ...school.accessories, items: updatedItems } });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        } else {
            toast.error("Failed to delete item");
        }
    };

    const handleOpenCategoryManager = () => {
        setTempCategories(school?.accessories?.categories || []);
        setIsCategoryManagerOpen(true);
    };

    const handleSaveCategories = async () => {
        if (!school) return;
        const res = await updateSchoolAccessoryCategories(school.id, tempCategories);
        if (res.success) {
            toast.success("Categories updated successfully");
            setSchool({ ...school, accessories: { ...school.accessories!, categories: tempCategories } });
            setIsCategoryManagerOpen(false);
        } else {
            toast.error("Failed to update categories");
        }
    };

    const handleNewAccessory = () => {
        setEditingItem({
            id: '',
            name: '',
            categoryId: school?.accessories?.categories[0]?.id || '',
            entryQuantity: 0,
            totalQuantity: 0,
            availableQuantity: 0,
            thresholdQuantity: 5,
            carryForward: true,
            attributes: { gender: 'Unisex', size: '' }
        } as AccessoryItem);
        setIsEditDialogOpen(true);
    };

    /**
     * Helper to get stats for current session. 
     * Handles the new logs array to calculate totals.
     */
    const getSessionStats = (item: AccessoryItem): AccessorySessionStats => {
        const sessionId = school?.currentSession;
        if (!sessionId) return { entryQuantity: 0, totalQuantity: 0, availableQuantity: 0, logs: [] };

        // 1. Direct hit
        let stats = item.sessionData?.[sessionId];

        // 2. Not found, check for rollover candidates
        if (!stats && item.carryForward && school?.sessions) {
            const sortedSessions = [...school.sessions].sort((a, b) => 
                new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime()
            );
            const currentIndex = sortedSessions.findIndex(s => s.id === sessionId);
            
            if (currentIndex > 0) {
                const prevSession = sortedSessions[currentIndex - 1];
                const prevStats = item.sessionData?.[prevSession.id];
                
                if (prevStats) {
                    stats = {
                        entryQuantity: prevStats.availableQuantity,
                        totalQuantity: prevStats.availableQuantity,
                        availableQuantity: prevStats.availableQuantity,
                        logs: [] // Rollover starts fresh with 0 logs but carried-over available qty
                    };
                }
            }
        }

        // 3. Fallback to legacy flat fields
        if (!stats) {
            stats = {
                entryQuantity: item.entryQuantity || 0,
                totalQuantity: item.totalQuantity || 0,
                availableQuantity: item.availableQuantity || 0,
                logs: []
            };
        }

        // If logs exist, recalc totals based on logs (this ensures consistency)
        if (stats.logs && stats.logs.length > 0) {
            const logTotal = stats.logs.reduce((sum, log) => sum + log.quantity, 0);
            // entryQuantity remains the first/original entry, or we sum them? 
            // Usually "Total Qty" is the sum of logs in this session.
            return {
                ...stats,
                totalQuantity: stats.entryQuantity + logTotal,
                availableQuantity: stats.availableQuantity + logTotal // Assuming available is also updated
            };
        }

        return stats;
    };

    const handleOpenQuickEntry = (item: AccessoryItem) => {
        const stats = getSessionStats(item);
        const lastLog = stats.logs && stats.logs.length > 0 ? stats.logs[stats.logs.length - 1] : null;
        
        setItemForEntry(item);
        setNewEntryData({
            vendor: '',
            date: new Date().toISOString().split('T')[0],
            quantity: 0,
            buyRate: lastLog?.buyRate || item.buyPrice || 0,
            sellRate: lastLog?.sellRate || item.sellPrice || 0
        });
        setIsEntryDialogOpen(true);
    };

    const handleSaveStockEntry = async () => {
        if (!school || !school.accessories || !itemForEntry) return;

        const sessionId = school.currentSession;
        if (!sessionId) return;

        const currentStats = getSessionStats(itemForEntry);
        const newLogEntry: any = {
            id: `log_${Date.now()}`,
            vendor: newEntryData.vendor,
            date: newEntryData.date,
            quantity: Number(newEntryData.quantity),
            buyRate: Number(newEntryData.buyRate),
            sellRate: Number(newEntryData.sellRate)
        };

        const updatedStats: AccessorySessionStats = {
            ...currentStats,
            totalQuantity: currentStats.totalQuantity + newLogEntry.quantity,
            availableQuantity: currentStats.availableQuantity + newLogEntry.quantity,
            logs: [...(currentStats.logs || []), newLogEntry]
        };

        const updatedItem = {
            ...itemForEntry,
            sessionData: {
                ...(itemForEntry.sessionData || {}),
                [sessionId]: updatedStats
            }
        };

        const newItems = school.accessories.items.map(i => i.id === updatedItem.id ? updatedItem : i);
        const res = await updateSchoolAccessories(school.id, { ...school.accessories, items: newItems });

        if (res.success) {
            toast.success(`Stock added for ${itemForEntry.name}`);
            setSchool({ ...school, accessories: { ...school.accessories, items: newItems } });
            setIsEntryDialogOpen(false);
        } else {
            toast.error("Failed to add stock entry");
        }
    };

    const handleSaveSettings = async () => {
        if (!school) return;
        const result = await updateSchoolAccessorySettings(school.id, tempConfig);
        if (result.success) {
            setSchool({
                ...school,
                accessories: school.accessories ? { ...school.accessories, fieldConfig: tempConfig } : undefined
            } as School);
            toast.success("Settings updated successfully");
            setIsSettingsOpen(false);
        } else {
            toast.error("Failed to update settings");
        }
    };

    const handleSort = (key: any) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (format === 'pdf') {
            window.print();
            return;
        }

        const headers = ["Name", "SKU", "Category", "Total Stock", "Available", "Price"];
        const csvRows = [headers.join(",")];

        sortedItems.forEach(item => {
            const stats = getSessionStats(item);
            const category = school?.accessories?.categories.find(c => c.id === item.categoryId);
            const row = [
                `"${item.name}"`,
                `"${item.sku || ''}"`,
                `"${category?.name || 'Uncategorized'}"`,
                `"${stats.totalQuantity}"`,
                `"${stats.availableQuantity}"`,
                `"${item.sellPrice || 0}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_list_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exporting to ${format.toUpperCase()}...`);
    };

    const SortIcon = ({ columnKey }: { columnKey: any }) => {
        if (sortConfig?.key !== columnKey) {
            return <svg className="ml-1.5 inline-block w-3.5 h-3.5 text-slate-400 opacity-50 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 16-3 3-3-3"/><path d="m9 8 3-3 3 3"/></svg>;
        }
        if (sortConfig?.direction === 'asc') {
            return <ChevronUp className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
        }
        return <ChevronDown className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
    };

    if (isLoading) {
        return <div className="p-8 text-center animate-pulse">Loading Accessories Catalog...</div>;
    }

    if (!school?.accessories) {
        return (
            <div className="p-12 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center rounded-3xl mb-6 mx-auto shadow-inner">
                    <ShoppingBag className="h-12 w-12 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Catalog Not Set Up</h2>
                <p className="text-slate-500 font-medium max-w-md mt-3 mb-2 mx-auto leading-relaxed">
                    Your school's inventory catalog hasn't been initialized yet. Click below to set up your catalog — it takes just one click.
                </p>
                <p className="text-slate-400 text-sm font-medium mb-8 mx-auto max-w-sm">
                    This will create default categories (Uniforms, Books & Stationery, General) so you can immediately start adding items.
                </p>
                <Button 
                    onClick={handleInitializeCatalog}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 h-auto rounded-2xl shadow-lg shadow-indigo-100 text-base"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Initializing...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Initialize & Start Adding Items
                        </span>
                    )}
                </Button>
            </div>
        );
    }

    const filteredItems = (school?.accessories?.items || []).filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        let aVal: any;
        let bVal: any;

        if (key === 'availableQuantity') {
            aVal = getSessionStats(a).availableQuantity;
            bVal = getSessionStats(b).availableQuantity;
        } else {
            aVal = (a[key as keyof AccessoryItem] || '').toString();
            bVal = (b[key as keyof AccessoryItem] || '').toString();
        }

        const comparison = (aVal as string).toString().localeCompare((bVal as string).toString(), undefined, { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? comparison : -comparison;
    });

    const stats = [
        { title: 'Total Items', value: school.accessories.items.length.toString(), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Revenue Today', value: '₹0', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Low Stock', value: school.accessories.items.filter(i => (getSessionStats(i).availableQuantity) < (i.thresholdQuantity || 5)).length.toString(), icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50' },
        { title: 'Categories', value: school.accessories.categories.length.toString(), icon: Filter, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    const visibleFields = (school.accessories.fieldConfig || []).filter(f => f.isVisible);

    return (
        <div className="bg-[#f4f7f6] min-h-screen font-sans pb-10 w-full animate-in fade-in duration-700">
            <style>{`
                @media print {
                    .no-print, button, input { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                }
            `}</style>
            
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header section with Utility Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory List</h1>
                        <p className="text-slate-500 font-medium text-sm mt-0.5">Manage school-level accessories and catalog.</p>
                    </div>
                    
                    <div className="bg-slate-100 border border-slate-200 p-1.5 flex flex-wrap gap-1 w-full md:w-fit justify-start rounded-xl">
                        <button onClick={handleNewAccessory} className="text-slate-600 hover:text-slate-900 hover:bg-white transition-all px-4 py-1.5 rounded-lg font-semibold text-sm flex items-center justify-center">
                            Add Items
                        </button>

                        <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                            <DialogTrigger asChild>
                                <button className="text-slate-600 hover:text-slate-900 hover:bg-white transition-all px-4 py-1.5 rounded-lg font-semibold text-sm flex items-center justify-center">
                                    Categories
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem]">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-600">Category Manager</DialogTitle>
                                    <DialogDescription>Add or edit item categories for your inventory.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                    {tempCategories.map((cat, idx) => (
                                        <div key={cat.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                            <Input 
                                                value={cat.name}
                                                onChange={(e) => {
                                                    const newCats = [...tempCategories];
                                                    newCats[idx].name = e.target.value;
                                                    setTempCategories(newCats);
                                                }}
                                                className="flex-1 bg-white border-slate-200 rounded-xl font-bold h-10"
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-rose-500 hover:bg-rose-50 rounded-xl"
                                                onClick={() => setTempCategories(tempCategories.filter(c => c.id !== cat.id))}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="ghost" 
                                        className="w-full border-2 border-dashed border-slate-200 rounded-2xl h-12 text-slate-400 hover:text-indigo-600 hover:border-indigo-200"
                                        onClick={() => setTempCategories([...tempCategories, { id: `cat_${Date.now()}`, name: 'New Category' }])}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Category
                                    </Button>
                                </div>
                                <DialogFooter>
                                    <Button className="w-full bg-slate-900 rounded-2xl h-12 font-bold" onClick={handleSaveCategories}>Update Inventory Groups</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                            <DialogTrigger asChild>
                                <button className="text-slate-600 hover:text-slate-900 hover:bg-white transition-all px-4 py-1.5 rounded-lg font-semibold text-sm flex items-center justify-center">
                                    Settings
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem]">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">Field Requirements</DialogTitle>
                                    <DialogDescription>Decide which fields are mandatory for your school.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {tempConfig.filter(f => f.isVisible).map((field, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 truncate max-w-[200px]">{field.label}</p>
                                                <p className="text-[10px] text-slate-400 font-medium tracking-tight whitespace-nowrap">Template field</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Label className="text-xs font-bold text-slate-500">Mandatory</Label>
                                                <Switch 
                                                    checked={field.isRequired}
                                                    onCheckedChange={(checked) => {
                                                        const newConfig = [...tempConfig];
                                                        newConfig[tempConfig.findIndex(c => c.fieldName === field.fieldName)].isRequired = checked;
                                                        setTempConfig(newConfig);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <DialogFooter>
                                    <Button className="w-full bg-slate-900 rounded-2xl h-12 font-bold" onClick={handleSaveSettings}>Save Rule Settings</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <Card key={i} className="border-none shadow-sm bg-white ring-1 ring-slate-100 rounded-xl overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                        <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bg} shadow-sm`}>
                                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search Bar - Separate Row */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex items-center justify-between">
                    <div className="relative w-full max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by student name, SKU, or category..."
                            className="pl-10 h-10 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 rounded-md font-medium text-slate-700 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center border border-slate-300 rounded-md overflow-hidden h-10 bg-white shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Excel" 
                            className="h-full w-10 rounded-none hover:bg-slate-50 border-r border-slate-200 group"
                            onClick={() => handleExport('excel')}
                        >
                            <FileSpreadsheet className="w-4 h-4 text-slate-800 group-hover:text-indigo-600 stroke-[2px]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="CSV" 
                            className="h-full w-10 rounded-none hover:bg-slate-50 border-r border-slate-200 group"
                            onClick={() => handleExport('csv')}
                        >
                            <FileText className="w-4 h-4 text-slate-800 group-hover:text-indigo-600 stroke-[2px]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="PDF" 
                            className="h-full w-10 rounded-none hover:bg-slate-50 border-r border-slate-200 group"
                            onClick={() => handleExport('pdf')}
                        >
                            <FileJson className="w-4 h-4 text-slate-800 group-hover:text-indigo-600 stroke-[2px]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Print" 
                            className="h-full w-10 rounded-none hover:bg-slate-50 group"
                            onClick={() => window.print()}
                        >
                            <Printer className="w-4 h-4 text-slate-800 group-hover:text-indigo-600 stroke-[2px]" />
                        </Button>
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto w-full">
                    <Table className="text-xs sm:text-sm">
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-10 px-2"></TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">Item <SortIcon columnKey="name" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none" onClick={() => handleSort('vendorDetails')}>
                                    <div className="flex items-center">Vendor <SortIcon columnKey="vendorDetails" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 select-none">
                                    Description
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none" onClick={() => handleSort('entryDate')}>
                                    <div className="flex items-center">Entry Date <SortIcon columnKey="entryDate" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none text-center" onClick={() => handleSort('totalQuantity')}>
                                    <div className="flex items-center justify-center">Entry Qty <SortIcon columnKey="totalQuantity" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none text-center" onClick={() => handleSort('availableQuantity')}>
                                    <div className="flex items-center justify-center">Total QTY <SortIcon columnKey="availableQuantity" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none text-center" onClick={() => handleSort('thresholdQuantity')}>
                                    <div className="flex items-center justify-center text-rose-500">Threshold <SortIcon columnKey="thresholdQuantity" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none text-right" onClick={() => handleSort('buyPrice')}>
                                    <div className="flex items-center justify-end">Buy Rate <SortIcon columnKey="buyPrice" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-2 py-3 cursor-pointer select-none text-right" onClick={() => handleSort('sellPrice')}>
                                    <div className="flex items-center justify-end">Sell Rate <SortIcon columnKey="sellPrice" /></div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-600 px-4 py-3 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.map((item) => {
                                    const sessionStats = getSessionStats(item);
                                    const isLow = sessionStats.availableQuantity < (item.thresholdQuantity || 5);
                                    
                                    return (
                                        <Fragment key={item.id}>
                                            <TableRow className={`cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100 ${expandedRows.has(item.id) ? 'bg-indigo-50/50' : ''}`}>
                                                <TableCell className="px-2 py-3 w-10">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-full hover:bg-slate-100"
                                                        onClick={() => toggleRow(item.id)}
                                                    >
                                                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${expandedRows.has(item.id) ? 'rotate-90' : ''}`} />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="px-2 py-3 w-[120px] max-w-[150px] truncate">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-indigo-700 text-[13px] leading-tight tracking-tight truncate">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.hsnCode && (
                                                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">HSN: {item.hsnCode}</span>
                                                    )}
                                                    {item.attributes?.size && (
                                                        <span className="text-[10px] text-indigo-500 font-bold border-l border-slate-200 pl-2 tracking-wide uppercase">SIZE: {item.attributes.size}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-slate-600 max-w-[100px] truncate">
                                            <span className="text-[11px] font-semibold">
                                                {item.vendorDetails || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-2 py-3">
                                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-[80px]" title={item.description}>
                                                {item.description || '—'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[11px] font-bold text-slate-600">
                                                {item.entryDate ? new Date(item.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-slate-700 text-[13px]">
                                            {sessionStats.entryQuantity}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold text-[14px] ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                                                {sessionStats.availableQuantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-slate-400 text-[12px]">
                                            {item.thresholdQuantity || 5}
                                        </TableCell>
                                        <TableCell className="text-right text-[13px] font-bold text-slate-500">
                                            ₹{item.buyPrice?.toLocaleString() || '0'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-[14px] text-indigo-600">
                                                ₹{item.sellPrice?.toLocaleString() || '0'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right px-4 print:hidden">
                                            <div className="flex items-center justify-end">
                                                <div className="flex overflow-hidden border border-slate-200 rounded-lg shadow-sm">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Add Stock Entry"
                                                        className="h-9 w-9 bg-white hover:bg-slate-50 text-indigo-600 rounded-none border-r border-slate-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenQuickEntry(item);
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4 stroke-[3px]" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-9 w-9 bg-white hover:bg-indigo-50 text-slate-600 rounded-none border-r border-slate-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const stats = getSessionStats(item);
                                                            setEditingItem({ ...item, ...stats });
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit3 className="h-4 w-4 stroke-[2.5px]" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-9 w-9 bg-white hover:bg-rose-50 text-rose-500 rounded-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setItemToDelete(item);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 stroke-[2.5px]" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded Log History View */}
                                    {expandedRows.has(item.id) && (
                                        <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-none">
                                            <TableCell colSpan={11} className="p-0">
                                                <div className="px-10 py-8 space-y-2 animate-in slide-in-from-top duration-300">
                                                    {(sessionStats.logs && sessionStats.logs.length > 0) ? (
                                                        <div className="space-y-[1px] bg-slate-200/50 rounded-3xl overflow-hidden border border-slate-200">
                                                            {sessionStats.logs.map((log: any, idx) => (
                                                                <div key={log.id} className="bg-white flex items-center px-8 py-5 group/log relative transition-colors hover:bg-slate-50">
                                                                    <div className="flex items-center flex-1">
                                                                        {/* Indicator bar */}
                                                                        <div className={`w-1.5 h-10 rounded-full mr-10 ${idx === sessionStats.logs!.length - 1 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                                                        
                                                                        {/* Log Entry Content */}
                                                                        <div className="flex items-center flex-1 gap-10">
                                                                                <div className="min-w-[120px]">
                                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                                    <CreditCard className="w-3.5 h-3.5 text-slate-300" />
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Entry ID</p>
                                                                                </div>
                                                                                <p className="font-bold text-slate-900 text-[13px] tracking-tight">{log.id.slice(-6).toUpperCase()}</p>
                                                                            </div>

                                                                            <div className="h-10 border-l border-slate-100" />

                                                                            <div className="min-w-[150px]">
                                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                                    <UserCircle className="w-3.5 h-3.5 text-slate-300" />
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Vendor</p>
                                                                                </div>
                                                                                <span className="inline-flex text-[11px] bg-slate-100/70 text-slate-700 py-1 px-3 rounded-md font-bold uppercase tracking-tight">
                                                                                    {log.vendor || 'DIRECT'}
                                                                                </span>
                                                                            </div>

                                                                            <div className="h-10 border-l border-slate-100" />

                                                                            <div className="min-w-[120px]">
                                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                                    <CalendarDays className="w-3.5 h-3.5 text-slate-300" />
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</p>
                                                                                </div>
                                                                                <p className="font-bold text-slate-800 text-[14px] tracking-tight">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                                            </div>

                                                                            <div className="h-10 border-l border-slate-100" />

                                                                            <div className="flex-1 grid grid-cols-3 gap-10">
                                                                                <div>
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Quantity</p>
                                                                                    <p className="font-bold text-slate-900 text-[15px] tracking-tight">+{log.quantity}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-widest mb-1.5">Buy Rate</p>
                                                                                    <p className="font-bold text-emerald-600 text-[15px] tracking-tight">₹{log.buyRate.toLocaleString()}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-semibold text-indigo-500/80 uppercase tracking-widest mb-1.5">Sell Rate</p>
                                                                                    <p className="font-bold text-indigo-600 text-[15px] tracking-tight">₹{log.sellRate.toLocaleString()}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 ml-8">
                                                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all">
                                                                            <RotateCcw className="w-5 h-5 stroke-[2]" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-200 hover:text-slate-600 hover:bg-slate-100/50 transition-all">
                                                                            <Printer className="w-5 h-5 stroke-[2]" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )).reverse()}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-[2.5rem] border border-slate-200 italic text-slate-400 shadow-sm">
                                                            <History className="w-10 h-10 mb-3 opacity-20 text-indigo-500" />
                                                            <p className="text-xs font-black uppercase tracking-[0.2em]">No detailed entry logs available</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    </Fragment>
                                );
                            })}
                            {sortedItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-48 text-center text-slate-400 font-medium italic">No accessories found matching your search.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[700px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-slate-50/80 border-b border-slate-100 text-black">
                        <DialogTitle className="text-2xl font-black text-slate-800">Item Management</DialogTitle>
                        <DialogDescription className="font-bold text-slate-500">
                            Configure detailed inventory and financial rules for {editingItem?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[70vh] overflow-y-auto p-8 text-black">
                        {editingItem && (
                            <div className="space-y-8">
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 flex items-center">
                                        <Package className="w-3 h-3 mr-2" /> Basic Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Item Name <span className="text-rose-500">*</span></Label>
                                            <Input 
                                                className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Category <span className="text-rose-500">*</span></Label>
                                            <select 
                                                className="w-full rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold px-4 bg-white"
                                                value={editingItem.categoryId}
                                                onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                                            >
                                                <option value="">Select Category</option>
                                                {school?.accessories?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Vendor Name</Label>
                                            <Input 
                                                className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                                value={editingItem.vendorDetails || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, vendorDetails: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">HSN Code</Label>
                                            <Input 
                                                className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                                value={editingItem.hsnCode || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, hsnCode: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Size / Variant</Label>
                                            <Input 
                                                className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                                placeholder="e.g. XL, 32, A4"
                                                value={editingItem.attributes?.size || ''}
                                                onChange={(e) => setEditingItem({ 
                                                    ...editingItem, 
                                                    attributes: { ...(editingItem.attributes || {}), size: e.target.value } 
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Entry Date</Label>
                                            <Input 
                                                type="date"
                                                className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                                value={editingItem.entryDate || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, entryDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Description</Label>
                                        <textarea 
                                            className="w-full rounded-2xl p-4 border border-slate-200 focus:ring-indigo-500 font-medium text-sm min-h-[80px]"
                                            value={editingItem.description || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                            placeholder="Write item details here..."
                                        />
                                    </div>
                                </div>

                                {/* Stock & Finance Section */}
                                <div className="space-y-4 pt-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-2" /> Stock & Financials
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate block">Entry Qty</Label>
                                            <Input 
                                                type="number"
                                                className="bg-white border-slate-200 rounded-xl h-10 font-black text-slate-800"
                                                placeholder="0"
                                                value={editingItem.entryQuantity === 0 ? '' : (editingItem.entryQuantity || '')}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEditingItem({ ...editingItem, entryQuantity: val, totalQuantity: val, availableQuantity: val });
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2 bg-indigo-50/20 p-4 rounded-3xl border border-indigo-50">
                                            <Label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate block">Available Qty</Label>
                                            <div className="h-10 flex items-center px-1 font-black text-indigo-700 text-sm">
                                                {editingItem.availableQuantity || 0}
                                            </div>
                                        </div>
                                        <div className="space-y-2 bg-rose-50/30 p-4 rounded-3xl border border-rose-50">
                                            <Label className="text-[10px] font-black text-rose-400 uppercase tracking-widest truncate block">Threshold</Label>
                                            <Input 
                                                type="number"
                                                className="bg-white border-slate-200 rounded-xl h-10 font-bold"
                                                placeholder="0"
                                                value={editingItem.thresholdQuantity === 0 ? '' : (editingItem.thresholdQuantity || '')}
                                                onChange={(e) => setEditingItem({ ...editingItem, thresholdQuantity: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Buy Rate (Per Unit)</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                                <Input 
                                                    type="number"
                                                    className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-black pl-8 text-indigo-600"
                                                    placeholder="0"
                                                    value={editingItem.buyPrice === 0 ? '' : (editingItem.buyPrice || '')}
                                                    onChange={(e) => setEditingItem({ ...editingItem, buyPrice: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Sell Rate (Per Unit)</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                                <Input 
                                                    type="number"
                                                    className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-black pl-8 text-green-600"
                                                    placeholder="0"
                                                    value={editingItem.sellPrice === 0 ? '' : (editingItem.sellPrice || '')}
                                                    onChange={(e) => setEditingItem({ ...editingItem, sellPrice: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-row gap-3 sm:justify-end text-white">
                        <Button variant="outline" className="rounded-2xl h-12 flex-1 sm:flex-none font-bold text-black" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 flex-1 sm:flex-none px-8 font-black shadow-lg shadow-indigo-100" onClick={() => editingItem && handleSaveItem(editingItem)}>
                            <Save className="mr-2 h-4 w-4" /> Save Details
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Add Stock Entry Dialog */}
            <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-slate-50/80 border-b border-slate-100 text-black">
                        <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center rounded-2xl mb-4">
                            <PlusCircle className="text-indigo-500 w-6 h-6" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Add Stock Entry</DialogTitle>
                        <DialogDescription className="font-bold text-slate-500">
                            Recording new inventory arrival for <span className="text-indigo-600 italic">"{itemForEntry?.name}"</span>. 
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6 text-black">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Vendor Name</Label>
                                <Input 
                                    className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold"
                                    placeholder="Enter Source Vendor..."
                                    value={newEntryData.vendor}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, vendor: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Entry Date</Label>
                                <Input 
                                    type="date"
                                    className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-black"
                                    value={newEntryData.date}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50/50 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">Quantity to Add</Label>
                                <Input 
                                    type="number"
                                    className="rounded-2xl h-14 border-indigo-100 focus:ring-indigo-500 font-black text-xl text-indigo-700"
                                    placeholder="0"
                                    value={newEntryData.quantity || ''}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, quantity: Number(e.target.value) })}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Buy Rate (Inherited)</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                        <Input 
                                            type="number"
                                            className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold pl-8"
                                            value={newEntryData.buyRate || ''}
                                            onChange={(e) => setNewEntryData({ ...newEntryData, buyRate: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Sell Rate (Inherited)</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                        <Input 
                                            type="number"
                                            className="rounded-2xl h-12 border-slate-200 focus:ring-indigo-500 font-bold pl-8"
                                            value={newEntryData.sellRate || ''}
                                            onChange={(e) => setNewEntryData({ ...newEntryData, sellRate: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                            <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed italic">
                                Note: If rates are not changed, the system will use previous rates automatically. 
                                This entry will be appended to the item's history log.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-row gap-3 sm:justify-end text-white">
                        <Button variant="outline" className="rounded-2xl h-12 flex-1 sm:flex-none font-bold text-black" onClick={() => setIsEntryDialogOpen(false)}>
                            Discard
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 flex-1 sm:flex-none px-8 font-black shadow-lg shadow-indigo-100" onClick={handleSaveStockEntry}>
                            Complete Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[3rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6" /> Destructive Action
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-500 pt-2">
                            Are you sure you want to delete <span className="text-slate-900">"{itemToDelete?.name}"</span>? 
                            This action cannot be undone and will remove all session data associated with this item.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row gap-3 sm:justify-end mt-4">
                        <Button 
                            variant="outline" 
                            className="rounded-2xl h-12 flex-1 sm:flex-none border-slate-200 font-bold text-slate-600" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            No, Keep it
                        </Button>
                        <Button 
                            variant="destructive" 
                            className="bg-rose-600 hover:bg-rose-700 rounded-2xl h-12 flex-1 sm:flex-none px-8 font-black shadow-lg shadow-rose-100" 
                            onClick={confirmDeleteItem}
                        >
                            Yes, Delete Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Simple Select components for the dialog
function Select({ children, value, onValueChange }: any) {
    return (
        <div className="relative group">
            <select 
                value={value} 
                onChange={(e) => onValueChange(e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-xl h-10 px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-700 pointer-events-auto cursor-pointer"
            >
                {children}
            </select>
        </div>
    );
}

function SelectItem({ value, children }: any) { return <option value={value}>{children}</option>; }
