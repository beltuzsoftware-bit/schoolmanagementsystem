'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, 
    ShoppingCart, 
    User, 
    ChevronRight, 
    Plus, 
    Minus, 
    Trash2, 
    CreditCard, 
    IndianRupee, 
    Package,
    ArrowLeft,
    Filter,
    CheckCircle2,
    Calendar,
    Loader2,
    FileSpreadsheet,
    FileText,
    Printer,
    ChevronUp,
    ChevronDown,
    History,
    X
} from 'lucide-react';
import { Student, AccessoryItem, AccessorySale, AccessorySaleItem, School } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addAccessorySale, getAccessorySales } from '@/app/actions/accessories';
import { cn } from '@/lib/utils';
import AccessoryReceiptModal from './accessory-receipt-modal';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';

interface StudentSalesSystemProps {
    students: Student[];
    inventory: AccessoryItem[];
    school: School;
    currentSession: string;
}

export default function StudentSalesSystem({ students, inventory, school, currentSession }: StudentSalesSystemProps) {
    // -------------------------------------------------------------------------
    // STATE: Search & Filter (Matches Fees Pattern)
    // -------------------------------------------------------------------------
    const [classFilter, setClassFilter] = useState<string>('Select');
    const [sectionFilter, setSectionFilter] = useState<string>('Select');
    const [keyword, setKeyword] = useState<string>('');
    const [tableKeyword, setTableKeyword] = useState<string>('');
    
    const [appliedFilters, setAppliedFilters] = useState<{
        hasSearched: boolean;
        classString: string;
        sectionString: string;
        keywordString: string;
    }>({ hasSearched: false, classString: 'Select', sectionString: 'Select', keywordString: '' });

    const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

    // active View & Selection
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [cart, setCart] = useState<AccessorySaleItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMode, setPaymentMode] = useState(school?.defaultPaymentMode && school.defaultPaymentMode !== 'None' ? school.defaultPaymentMode : '');

    // Purchase History & Receipt
    const [allSales, setAllSales] = useState<AccessorySale[]>([]);
    const [viewingHistoryStudent, setViewingHistoryStudent] = useState<Student | null>(null);
    const [printSale, setPrintSale] = useState<AccessorySale | null>(null);
    const [lastCompletedSale, setLastCompletedSale] = useState<AccessorySale | null>(null);

    // Load Available Classes dynamically based on school settings
    const availableClasses = useMemo(() => {
        if (school?.useCustomClasses && school.classes && school.classes.length > 0) {
            return school.classes;
        }
        return INITIAL_CLASS_SETUPS;
    }, [school]);

    // Load Available Sections dynamically based on class select
    const availableSections = useMemo(() => {
        if (classFilter === 'Select' || classFilter === 'all') {
            if (school?.useCustomSections && school.sections && school.sections.length > 0) {
                return school.sections;
            }
            return INITIAL_SECTIONS;
        }
        const cls = availableClasses.find(c => c.name === classFilter);
        if (cls && cls.sections && cls.sections.length > 0) {
            return cls.sections;
        }
        if (school?.useCustomSections && school.sections && school.sections.length > 0) {
            return school.sections;
        }
        return INITIAL_SECTIONS;
    }, [classFilter, availableClasses, school]);

    // Reset section filter when class filter changes
    useEffect(() => {
        setSectionFilter('Select');
    }, [classFilter]);

    // Fetch all sales on mount
    useEffect(() => {
        const fetchSales = async () => {
            try {
                const sales = await getAccessorySales(school.id);
                setAllSales(sales || []);
            } catch (e) {
                // fail silently — not critical
            }
        };
        fetchSales();
    }, [school.id]);

    // -------------------------------------------------------------------------
    // LOGIC: Filtering (Matches Fees Collection)
    // -------------------------------------------------------------------------
    const handleClassSectionSearch = () => {
        if (classFilter === 'Select') {
            toast.error("Please select a Class to search");
            return;
        }
        setAppliedFilters({ hasSearched: true, classString: classFilter, sectionString: sectionFilter, keywordString: '' });
        setKeyword('');
        setTableKeyword('');
    };

    const handleKeywordSearch = () => {
        if (!keyword.trim()) {
            toast.error("Please enter a keyword to search");
            return;
        }
        setAppliedFilters({ hasSearched: true, keywordString: keyword.trim(), classString: 'Select', sectionString: 'Select' });
        setClassFilter('Select');
        setSectionFilter('Select');
        setTableKeyword('');
    };

    const filteredStudents = useMemo(() => {
        if (!appliedFilters.hasSearched) return [];

        let result = students;

        if (appliedFilters.classString && appliedFilters.classString !== 'Select' && appliedFilters.classString !== 'all') {
            result = result.filter(s => s.className === appliedFilters.classString);
        }

        if (appliedFilters.sectionString && appliedFilters.sectionString !== 'Select' && appliedFilters.sectionString !== 'all') {
            result = result.filter(s => s.section === appliedFilters.sectionString);
        }

        if (appliedFilters.keywordString) {
            const lower = appliedFilters.keywordString.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lower)) ||
                (s.rollNumber && s.rollNumber.toLowerCase().includes(lower)) ||
                (s.fatherName && s.fatherName.toLowerCase().includes(lower))
            );
        }

        if (tableKeyword) {
            const lowerQuick = tableKeyword.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lowerQuick) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lowerQuick)) ||
                (s.fatherName && s.fatherName.toLowerCase().includes(lowerQuick)) ||
                (s.phone && s.phone.toLowerCase().includes(lowerQuick))
            );
        }

        if (sortConfig) {
             result = [...result].sort((a, b) => {
                 const aVal = (a[sortConfig.key] || '').toString();
                 const bVal = (b[sortConfig.key] || '').toString();
                 const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                 return sortConfig.direction === 'asc' ? comparison : -comparison;
             });
        }

        return result;
    }, [appliedFilters, tableKeyword, students, sortConfig]);

    // All Inventory (sorted so that out-of-stock items are pushed to the bottom)
    const availableInventory = [...inventory].sort((a, b) => {
        const stockA = a.sessionData?.[currentSession]?.availableQuantity ?? a.availableQuantity ?? 0;
        const stockB = b.sessionData?.[currentSession]?.availableQuantity ?? b.availableQuantity ?? 0;
        
        const isOutOfStockA = stockA <= 0;
        const isOutOfStockB = stockB <= 0;
        
        if (isOutOfStockA && !isOutOfStockB) return 1;
        if (!isOutOfStockA && isOutOfStockB) return -1;
        return 0;
    });

    // -------------------------------------------------------------------------
    // HANDLERS: Billing
    // -------------------------------------------------------------------------
    const addToCart = (item: AccessoryItem) => {
        const existing = cart.find(c => c.itemId === item.id);
        const stock = item.sessionData?.[currentSession]?.availableQuantity ?? item.availableQuantity ?? 0;

        if (stock <= 0) {
            toast.error(`Out of stock for ${item.name}`);
            return;
        }

        if (existing) {
            if (existing.quantity >= stock) {
                toast.error(`Only ${stock} units available for ${item.name}`);
                return;
            }
            setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * (item.sellPrice || 0) } : c));
        } else {
            setCart([...cart, {
                itemId: item.id,
                name: item.name,
                quantity: 1,
                sellRate: item.sellPrice || 0,
                total: item.sellPrice || 0
            }]);
        }
        toast.success(`Added ${item.name} to cart`);
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.itemId === itemId) {
                const item = inventory.find(i => i.id === itemId);
                const stats = item?.sessionData?.[currentSession] || { availableQuantity: item?.availableQuantity || 0 };
                const stock = stats.availableQuantity;

                const newQty = Math.max(1, Math.min(stock, c.quantity + delta));
                if (delta > 0 && c.quantity >= stock) {
                    toast.error(`Insufficient stock`);
                    return c;
                }
                return { ...c, quantity: newQty, total: newQty * c.sellRate };
            }
            return c;
        }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(c => c.itemId !== itemId));
    };

    const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);

    const handleProcessSale = async () => {
        if (!selectedStudent || cart.length === 0) return;

        if (!paymentMode || paymentMode === 'None') {
            toast.error('Please select a Payment Mode before completing the sale.');
            return;
        }

        setIsProcessing(true);

        const newSale: AccessorySale = {
            id: `SAL-${Date.now()}`,
            schoolId: school.id,
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            className: selectedStudent.className,
            section: selectedStudent.section,
            items: cart,
            totalAmount,
            paymentMode,
            date: new Date().toISOString(),
            sessionName: currentSession
        };

        try {
            const result = await addAccessorySale(school.id, newSale);
            if (result.success) {
                // persist sale to local state so View Details updates immediately
                setAllSales(prev => [...prev, newSale]);
                // Show print prompt instead of immediately going back
                setLastCompletedSale(newSale);
                setCart([]);
            } else {
                toast.error(result.error || 'Failed to record purchase');
            }
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const requestSort = (key: keyof Student) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Student) => {
        if (sortConfig?.key !== key) {
            return <ChevronUp className="inline-block w-4 h-4 ml-1 opacity-20" />;
        }
        return sortConfig.direction === 'asc' ? <ChevronUp className="inline-block w-4 h-4 ml-1" /> : <ChevronDown className="inline-block w-4 h-4 ml-1" />;
    };

    const handleExport = (format: string) => {
        toast.success(`Exporting to ${format}...`);
    };

    const handlePrint = () => {
        window.print();
    };

    // -------------------------------------------------------------------------
    // RENDERING
    // -------------------------------------------------------------------------
    return (
        <>
        <div className="flex flex-col gap-6 w-full max-w-full font-sans tracking-tight">
            {!selectedStudent ? (
                /* Search View Pattern from Fees Collection */
                <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
                    {/* FILTER BAR - "Select Criteria" Replica */}
                    <Card className="shadow-sm border-t-2 border-t-indigo-600 rounded-2xl overflow-hidden mb-8">
                        <CardContent className="p-5 pt-3">
                            <h2 className="text-lg text-slate-800 font-bold mb-3 mt-0">Select Criteria</h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                {/* Filter by Class & Section (GREEN REPLICA) */}
                                <div className="bg-green-50/70 border border-green-200 rounded-xl p-5 w-full" onKeyDown={(e) => { if (e.key === 'Enter') handleClassSectionSearch(); }}>
                                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Class <span className="text-rose-500">*</span></Label>
                                            <Select value={classFilter} onValueChange={setClassFilter}>
                                                <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Select">Select</SelectItem>
                                                    {availableClasses.map(c => (
                                                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                    ))}
                                                    <SelectItem value="all">All Classes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Section</Label>
                                            <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                                <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Select">Select</SelectItem>
                                                    {availableSections.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                    <SelectItem value="all">All Sections</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            onClick={handleClassSectionSearch} 
                                            className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(37,99,235,0.25)] shrink-0 transition-all w-full sm:w-auto"
                                        >
                                            <Search className="w-4 h-4 mr-2" />
                                            Search
                                        </Button>
                                    </div>
                                </div>

                                {/* Search by Keyword (INDIGO REPLICA) */}
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 w-full">
                                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-sm mb-1.5 block text-indigo-900 font-extrabold h-5">Search By Keyword</Label>
                                            <Input 
                                                placeholder="Name, Roll No, ID etc..." 
                                                value={keyword}
                                                onChange={(e) => setKeyword(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleKeywordSearch();
                                                }}
                                                className="w-full h-12 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-sm font-semibold"
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleKeywordSearch} 
                                            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] shrink-0 transition-all w-full sm:w-auto"
                                        >
                                            <Search className="w-4 h-4 mr-2" />
                                            Search
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* STUDENT LIST TABLE */}
                    <Card className="shadow-sm rounded-2xl overflow-hidden border-slate-200">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b bg-white">
                            <CardTitle className="text-lg text-slate-700 font-bold">Student List</CardTitle>
                            
                            <div className="flex gap-2 mt-4 sm:mt-0">
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="text-slate-600 border-slate-300 hover:bg-slate-50 h-9 font-bold">
                                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                                    CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="text-slate-600 border-slate-300 hover:bg-slate-50 h-9 font-bold">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 mr-1.5" />
                                    Excel
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="text-slate-600 border-slate-300 hover:bg-slate-50 h-9 font-bold">
                                    <FileText className="w-4 h-4 text-red-500 mr-1.5" />
                                    PDF
                                </Button>
                                <Button variant="outline" size="sm" onClick={handlePrint} className="text-slate-600 border-slate-300 hover:bg-slate-50 h-9 font-bold">
                                    <Printer className="w-4 h-4 mr-1.5" />
                                    Print
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex justify-between items-center p-4 border-b bg-slate-50/30">
                                <div className="relative max-w-sm w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Quick search in table..." 
                                        value={tableKeyword}
                                        onChange={(e) => setTableKeyword(e.target.value)}
                                        className="pl-9 h-10 text-sm border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="w-full overflow-x-auto" id="accessory-sales-student-table">
                                <Table className="text-xs sm:text-sm">
                                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('className')}>Class {getSortIcon('className')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none w-[60px] text-center cursor-pointer" onClick={() => requestSort('section')}>Sec {getSortIcon('section')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('rollNumber')}>Roll No. {getSortIcon('rollNumber')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('admissionNumber')}>ID {getSortIcon('admissionNumber')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('name')}>Student Name {getSortIcon('name')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('fatherName')}>Father Name {getSortIcon('fatherName')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('dob')}>DOB {getSortIcon('dob')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('phone')}>Mobile No. {getSortIcon('phone')}</TableHead>
                                            <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!appliedFilters.hasSearched ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-20 text-slate-400">
                                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-10" />
                                                    <p className="font-bold tracking-tight">Select criteria above and click search to view students</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-20 text-slate-400">
                                                    No students found matching the criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStudents.map((student) => (
                                                <TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                                                    <TableCell className="text-slate-600 px-4 py-3 font-medium">{student.className}</TableCell>
                                                    <TableCell className="text-slate-500 px-2 py-3 w-[60px] text-center font-bold">{student.section || '-'}</TableCell>
                                                    <TableCell className="text-slate-600 px-4 py-3 font-bold">{student.rollNumber || '-'}</TableCell>
                                                    <TableCell className="text-slate-500 px-4 py-3 font-medium">{student.admissionNumber || '-'}</TableCell>
                                                    <TableCell className="font-bold text-indigo-700 px-4 py-3 min-w-[150px]">{student.name}</TableCell>
                                                    <TableCell className="text-slate-600 px-4 py-3">{student.fatherName || '-'}</TableCell>
                                                    <TableCell className="text-slate-600 px-4 py-3">{student.dob || '-'}</TableCell>
                                                    <TableCell className="text-slate-600 px-4 py-3">{student.phone || '-'}</TableCell>
                                                    <TableCell className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => setSelectedStudent(student)}
                                                            className="bg-[#1e293b] hover:bg-slate-900 text-white rounded-md px-3 h-8 font-bold text-[11px] shadow-sm transform hover:scale-[1.02] transition-all"
                                                        >
                                                            Buy Now
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => setViewingHistoryStudent(student)}
                                                            className="border-indigo-300 text-indigo-700 bg-indigo-50 rounded-md px-3 h-8 font-bold text-[11px] hover:bg-indigo-100 transition-all"
                                                        >
                                                            <History className="w-3 h-3 mr-1" />
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Billing Interface (Existing System - Optimized) */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto w-full">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Student Profile & Navigation */}
                        <div className="flex items-center justify-between gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => setSelectedStudent(null)}
                                className="h-10 px-4 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-slate-600 font-bold tracking-tight"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Results
                            </Button>
                            <Badge className="rounded-full bg-indigo-600 text-white border-0 py-1.5 px-4 font-bold tracking-wide shadow-lg shadow-indigo-100">
                                NEW PURCHASE ENTRY
                            </Badge>
                        </div>

                        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white border border-slate-100">
                            <CardHeader className="bg-slate-900 text-white p-8">
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0 border border-white/10 shadow-inner">
                                        <User className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-black tracking-tight">{selectedStudent.name}</h2>
                                            <Badge variant="outline" className="rounded-full border-white/20 text-white font-bold bg-white/5 uppercase text-[9px] tracking-widest py-0 px-2">ACTIVE</Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-indigo-400" />
                                                <span className="font-bold text-sm tracking-widest uppercase">ID: {selectedStudent.admissionNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                                <span className="font-medium text-[13px]">Class {selectedStudent.className} ({selectedStudent.section})</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="text-[12px] font-bold text-slate-300">{currentSession}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="mb-6">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Select Items to Add</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-3 h-[450px] overflow-y-auto pr-2 scrollbar-thin content-start">
                                        {availableInventory.length > 0 ? (
                                            availableInventory.map((item, index) => {
                                                const pastels = [
                                                    'bg-[#eef2ff] border-[#e0e7ff] hover:bg-[#e0e7ff]', // indigo
                                                    'bg-[#f0fdf4] border-[#dcfce7] hover:bg-[#dcfce7]', // emerald
                                                    'bg-[#fff1f2] border-[#ffe4e6] hover:bg-[#ffe4e6]', // rose
                                                    'bg-[#fefce8] border-[#fef08a] hover:bg-[#fef08a]', // amber
                                                    'bg-[#fdf4ff] border-[#fae8ff] hover:bg-[#fae8ff]', // fuchsia
                                                    'bg-[#f0f9ff] border-[#e0f2fe] hover:bg-[#e0f2fe]', // sky
                                                ];
                                                const colorClass = pastels[index % pastels.length];
                                                
                                                const stock = item.sessionData?.[currentSession]?.availableQuantity ?? item.availableQuantity ?? 0;
                                                const outOfStock = stock <= 0;
                                                
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => { if (!outOfStock) addToCart(item) }}
                                                        className={cn(
                                                            "group p-3 rounded-2xl relative overflow-hidden shadow-sm transition-colors duration-300 flex flex-col justify-between h-[100px] border",
                                                            outOfStock ? "bg-red-50 border-red-200 cursor-not-allowed" : cn(colorClass, "cursor-pointer")
                                                        )}
                                                    >
                                                        <div className="pr-4">
                                                            <span className={cn("font-bold text-[13px] leading-tight line-clamp-2", outOfStock ? "text-red-700" : "text-slate-800")}>{item.name}</span>
                                                        </div>
                                                        <div className="flex items-end justify-between mt-auto">
                                                            <span className={cn("font-black text-[15px]", outOfStock ? "text-red-400" : "text-slate-900")}>₹{item.sellPrice}</span>
                                                            <div className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter mix-blend-multiply", 
                                                                outOfStock ? "bg-red-200 text-red-900 border border-red-300/50" : "text-slate-600 bg-white/70 shadow-sm border border-black/5"
                                                            )}>
                                                                {outOfStock ? 'NO STOCK' : `QTY: ${stock}`}
                                                            </div>
                                                        </div>
                                                        {!outOfStock && (
                                                            <div className="absolute right-2 top-2 w-6 h-6 bg-white shadow-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 border border-slate-100">
                                                                <Plus className="w-3.5 h-3.5 text-slate-800" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                                <Package className="w-12 h-12 mb-3 opacity-20" />
                                                <p className="font-bold">No items available in stock</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary / Cart Section */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white sticky top-6 border border-slate-100">
                            <CardHeader className="bg-indigo-600 text-white p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <ShoppingCart className="w-5 h-5 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold tracking-tight">Cart Items</CardTitle>
                                    </div>
                                    <Badge className="bg-white/20 text-white border-0 font-black px-2.5 py-1">{cart.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4 max-h-[450px] overflow-y-auto mb-6 pr-2 scrollbar-thin">
                                    {cart.length > 0 ? (
                                        cart.map(item => (
                                            <div key={item.itemId} className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="font-bold text-slate-900 text-[14px] leading-tight flex-1">{item.name}</p>
                                                    <button onClick={() => removeFromCart(item.itemId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                                        <button 
                                                            onClick={() => updateQuantity(item.itemId, -1)}
                                                            className="p-1 hover:bg-slate-50 rounded-md text-slate-500 transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-8 text-center font-black text-sm text-slate-900">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(item.itemId, 1)}
                                                            className="p-1 hover:bg-slate-50 rounded-md text-slate-500 transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUBTOTAL</p>
                                                        <p className="font-black text-slate-900 text-base">₹{item.total.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <ShoppingCart className="w-8 h-8 mb-3 opacity-20" />
                                            <p className="text-sm font-bold opacity-50">Your cart is empty</p>
                                            <p className="text-[10px] uppercase tracking-widest mt-1">Select items to begin</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Payment Mode</span>
                                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                                            <SelectTrigger className="h-9 w-32 rounded-lg border-slate-200 text-[13px] font-bold shadow-sm">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Online">Online</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="QR Code">QR Code</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="DD">DD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-300">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-slate-500 text-lg font-bold">₹</span>
                                                    <span className="text-4xl font-black tracking-tight">{totalAmount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <CheckCircle2 className={cn("w-10 h-10 text-emerald-500 transition-all duration-500", totalAmount > 0 ? "opacity-100 scale-100" : "opacity-20 scale-90")} />
                                        </div>
                                        <Button 
                                            disabled={cart.length === 0 || isProcessing || !paymentMode || paymentMode === 'None'}
                                            onClick={handleProcessSale}
                                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-900/40 border-0 transition-all active:scale-[0.98] disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <IndianRupee className="w-5 h-5 stroke-[2.5px]" />
                                                    Complete Sale
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>

            {/* ============================================================ */}
            {/* PURCHASE HISTORY MODAL */}
            {/* ============================================================ */}
            {viewingHistoryStudent && (() => {
                const studentSales = allSales
                    .filter(s => s.studentId === viewingHistoryStudent.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const totalSpent = studentSales.reduce((acc, s) => acc + s.totalAmount, 0);

                return (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-900 text-white shrink-0">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                        <History className="w-5 h-5 text-indigo-400" />
                                        Purchase History
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-0.5">
                                        {viewingHistoryStudent.name} &bull; Class {viewingHistoryStudent.className} ({viewingHistoryStudent.section}) &bull; Session: {currentSession}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingHistoryStudent(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Summary Strip */}
                            <div className="px-6 py-3 bg-indigo-50 border-b flex items-center gap-6 shrink-0">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Total Purchases</p>
                                    <p className="text-2xl font-black text-slate-900">{studentSales.length}</p>
                                </div>
                                <div className="w-px h-10 bg-indigo-200" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Total Spent</p>
                                    <p className="text-2xl font-black text-indigo-700">₹{totalSpent.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Sales List */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {studentSales.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                        <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="font-bold text-slate-500">No purchases recorded yet</p>
                                        <p className="text-[12px] text-slate-400 mt-1">Click "Buy Now" to record the first purchase for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {studentSales.map((sale) => (
                                            <div
                                                key={sale.id}
                                                className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                {/* Sale Header */}
                                                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Receipt</span>
                                                            <span className="font-bold text-slate-800 font-mono text-sm">{sale.id}</span>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-200" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Date</span>
                                                            <span className="font-semibold text-slate-700 text-sm">
                                                                {new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-200" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Mode</span>
                                                            <span className="font-semibold text-slate-700 text-sm uppercase">{sale.paymentMode}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                                                            <p className="text-lg font-black text-emerald-700 font-mono">₹{sale.totalAmount.toLocaleString()}</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-8 px-3 text-[11px] font-bold"
                                                            onClick={() => {
                                                                setViewingHistoryStudent(null);
                                                                setPrintSale(sale);
                                                            }}
                                                        >
                                                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                                                            Reprint
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div className="p-4">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-100">
                                                                <th className="text-left font-bold text-slate-500 uppercase tracking-widest pb-2 text-[10px]">Item</th>
                                                                <th className="text-center font-bold text-slate-500 uppercase tracking-widest pb-2 text-[10px]">Qty</th>
                                                                <th className="text-right font-bold text-slate-500 uppercase tracking-widest pb-2 text-[10px]">Rate</th>
                                                                <th className="text-right font-bold text-slate-500 uppercase tracking-widest pb-2 text-[10px] text-indigo-600">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sale.items.map((item, idx) => (
                                                                <tr key={idx} className="border-b border-slate-50 last:border-0">
                                                                    <td className="py-2 font-semibold text-slate-700">{item.name}</td>
                                                                    <td className="py-2 text-center font-bold text-slate-600">{item.quantity}</td>
                                                                    <td className="py-2 text-right font-mono text-slate-600">₹{item.sellRate.toFixed(2)}</td>
                                                                    <td className="py-2 text-right font-bold font-mono text-indigo-700">₹{item.total.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3 bg-slate-50 border-t shrink-0 flex justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => setViewingHistoryStudent(null)}
                                    className="text-slate-600 font-bold"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ============================================================ */}
            {/* ACCESSORY RECEIPT MODAL */}
            {/* ============================================================ */}
            {printSale && (
                <AccessoryReceiptModal
                    sale={printSale}
                    student={students.find(s => s.id === printSale.studentId) || ({
                        id: printSale.studentId,
                        name: printSale.studentName,
                        className: printSale.className,
                        section: printSale.section,
                        admissionNumber: '',
                        rollNumber: '',
                    } as any)}
                    schoolDetails={school}
                    onClose={() => setPrintSale(null)}
                />
            )}

            {/* ============================================================ */}
            {/* POST-SALE PRINT PROMPT */}
            {/* ============================================================ */}
            {lastCompletedSale && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Success Header */}
                        <div className="bg-emerald-600 p-8 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-9 h-9 text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Sale Complete!</h2>
                            <p className="text-emerald-100 text-sm mt-1">Receipt ID: <span className="font-mono font-bold">{lastCompletedSale.id}</span></p>
                        </div>

                        {/* Summary */}
                        <div className="p-6">
                            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500">Student</span>
                                    <span className="font-bold text-slate-800">{lastCompletedSale.studentName}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500">Items</span>
                                    <span className="font-bold text-slate-800">{lastCompletedSale.items.length} item{lastCompletedSale.items.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500">Mode</span>
                                    <span className="font-bold text-slate-800 uppercase">{lastCompletedSale.paymentMode}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Total Paid</span>
                                    <span className="text-xl font-black text-emerald-700">₹{lastCompletedSale.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <p className="text-center text-slate-500 text-sm mb-5">Would you like to print the receipt?</p>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="h-12 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                                    onClick={() => {
                                        setLastCompletedSale(null);
                                        setSelectedStudent(null);
                                        setAppliedFilters(prev => ({ ...prev, hasSearched: false }));
                                    }}
                                >
                                    Skip
                                </Button>
                                <Button
                                    className="h-12 font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2"
                                    onClick={() => {
                                        setPrintSale(lastCompletedSale);
                                        setLastCompletedSale(null);
                                        setSelectedStudent(null);
                                        setAppliedFilters(prev => ({ ...prev, hasSearched: false }));
                                    }}
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Receipt
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
