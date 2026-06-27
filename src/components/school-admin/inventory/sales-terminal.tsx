'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    ChevronRight,
    CheckCircle2,
    Printer,
    ArrowRight,
    X,
    Package,
    User,
    PenLine,
    Zap,
    AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getInventoryProducts, recordAccessorySale, getInventorySettings, saveInventorySettings, deleteAccessoryInvoice } from '@/app/actions/inventory';
import { getStudents, getSchool, searchStudents } from '@/app/actions';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import { InventoryReceiptModal } from '@/components/school-admin/inventory/inventory-receipt-modal';
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SalesTerminalProps {
    schoolId: string;
    standalone?: boolean;
    onSuccess?: () => void;
    initialData?: any;
}

export function SalesTerminal({ schoolId, standalone = false, onSuccess, initialData }: SalesTerminalProps) {
    const [step, setStep] = useState(2); // 2: Select Items, 3: Payment/Confirm
    const [isLoading, setIsLoading] = useState(true);
    
    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    
    // Data
    const [students, setStudents] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [school, setSchool] = useState<any>(null);
    
    // Selection
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    
    // Transaction
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [discount, setDiscount] = useState(0);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invSettings, setInvSettings] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<any>(null);

    // Advanced Filters (Fees Port)
    const [statusFilter, setStatusFilter] = useState('Active');
    const [selectedClassFilter, setSelectedClassFilter] = useState('');
    const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
    const [foundStudents, setFoundStudents] = useState<any[]>([]);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [schoolData, studentsData, productsData, settingsData] = await Promise.all([
                    getSchool(schoolId),
                    getStudents(schoolId),
                    getInventoryProducts(schoolId),
                    getInventorySettings(schoolId)
                ]);

                // Load Available Classes
                const ms = schoolData as any;
                const classes = ms?.useCustomClasses && ms.classes
                    ? ms.classes.map((c: any) => c.name)
                    : INITIAL_CLASS_SETUPS.map(c => c.name);
                setAvailableClasses(classes);
                
                const defaultInvSettings = {
                    studentInvoiceRequired: true,
                    studentInvoiceMode: 'auto',
                    studentInvoiceSettings: {
                        prefix: 'INV',
                        separator: '-',
                        startFrom: 1,
                        padding: 6,
                        suffix: '',
                        currentCounter: 0,
                    }
                };

                const finalSettings = { ...defaultInvSettings, ...settingsData };

                setSchool(schoolData);
                setStudents(studentsData);
                setProducts(productsData);
                setInvSettings(finalSettings);
                
                // Populate if editing
                if (initialData) {
                    setSelectedStudent(initialData.student);
                    setPaymentMode(initialData.paymentMode || 'Cash');
                    setDiscount(initialData.discount || (initialData.subtotal - initialData.totalAmount) || 0);
                    setInvoiceNumber(initialData.invoiceNumber || '');
                    
                    // Map items back to cart format
                    const mappedCart = initialData.items.map((item: any) => {
                        const product = productsData.find((p: any) => p.id === item.productId);
                        return {
                            ...product,
                            id: item.productId,
                            name: item.name,
                            quantity: item.quantity,
                            sellPrice: item.rate,
                            discount: item.discount || 0
                        };
                    });
                    setCart(mappedCart);
                    setStep(3); // Go straight to checkout summary
                }

                // Initial auto-generate if settings exist
                if (!initialData && finalSettings.studentInvoiceMode === 'auto') {
                    const s = finalSettings.studentInvoiceSettings || defaultInvSettings.studentInvoiceSettings;
                    const num = (s.startFrom || 1) + (s.currentCounter || 0);
                    const serial = num.toString().padStart(s.padding || 6, '0');
                    const parts = [s.prefix, serial].filter(Boolean);
                    const base = parts.join(s.separator || '-');
                    const generated = s.suffix ? `${base}${s.separator || '-'}${s.suffix}` : base;
                    setInvoiceNumber(generated);
                }
            } catch (error) {
                toast.error("Failed to load terminal data");
            } finally {
                setIsLoading(false);
            }
        };
        if (schoolId) loadData();
    }, [schoolId]);

    // Update sections when class changes
    useEffect(() => {
        if (!selectedClassFilter || selectedClassFilter === 'Select') {
            setSelectedSectionFilter('');
            setAvailableSections([]);
            return;
        }
        const ms = school as any;
        if (ms?.useCustomClasses && ms.classes) {
            const cls = ms.classes.find((c: any) => c.name === selectedClassFilter);
            setAvailableSections(cls && cls.sections && cls.sections.length > 0 ? cls.sections : (ms?.useCustomSections && ms.sections ? ms.sections : INITIAL_SECTIONS));
        } else {
            const cls = INITIAL_CLASS_SETUPS.find(c => c.name === selectedClassFilter);
            setAvailableSections(cls && cls.sections && cls.sections.length > 0 ? cls.sections : INITIAL_SECTIONS);
        }
        setSelectedSectionFilter('');
    }, [selectedClassFilter, school]);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const addToCart = (product: any) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => 
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                // Check stock
                if (delta > 0 && newQty > item.currentStock) {
                    toast.error(`Only ${item.currentStock} units in stock`);
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateItemDiscount = (productId: string, discount: number) => {
        setCart(cart.map(item => 
            item.id === productId ? { ...item, discount: Math.max(0, discount) } : item
        ));
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
    const itemDiscounts = cart.reduce((acc, item) => acc + (item.discount || 0), 0);
    const total = subtotal - itemDiscounts - discount;

    const handleCompleteSale = async () => {
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        // Validate Invoice Number if Mandatory
        if (invSettings?.studentInvoiceRequired && !invoiceNumber) {
            toast.error("Invoice Number is mandatory");
            return;
        }

        setIsProcessing(true);
        try {
            // If editing, delete the old invoice first (reverts stock automatically)
            if (initialData?.id) {
                const revertRes = await deleteAccessoryInvoice(initialData.id);
                if (!revertRes.success) {
                    throw new Error("Failed to revert original invoice: " + revertRes.error);
                }
            }

            const saleData = {
                schoolId,
                studentId: selectedStudent?.id || null,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    rate: item.sellPrice,
                    name: item.name,
                    discount: item.discount || 0
                })),
                paymentMode,
                discount,
                invoiceNumber,
                recordedBy: "Admin"
            };

            const result = await recordAccessorySale(saleData);

            if (result.success) {
                toast.success(initialData ? "Invoice updated successfully" : "Sale recorded successfully");
                setLastInvoice(result.invoice);
                
                // Increment counter only if NEW sale (not editing)
                if (!initialData && invSettings?.studentInvoiceMode === 'auto') {
                    const updatedSettings = {
                        ...invSettings,
                        studentInvoiceSettings: {
                            ...invSettings.studentInvoiceSettings,
                            currentCounter: invSettings.studentInvoiceSettings.currentCounter + 1
                        }
                    };
                    await saveInventorySettings(schoolId, updatedSettings);
                }

                setStep(4);
                if (onSuccess) onSuccess();
            } else {
                toast.error(result.error || "Failed to record sale");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-sm font-bold text-slate-400">LOADING SALES TERMINAL...</div>;

    return (
        <div className={cn("flex flex-col", standalone ? "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]" : "")}>
            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
                
                {/* Left Side: Selection / Workflow */}
                <div className="lg:col-span-2 p-6 border-r border-slate-100 bg-slate-50/30">
                    
                    {step === 2 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            {/* ADVANCED STUDENT/CLASS FILTER (Ported from Fees Collection) */}
                            {/* Selected Student Status Bar */}
                            <div className={cn(
                                "mb-4 p-3 rounded-xl border flex items-center justify-between transition-all duration-300",
                                selectedStudent 
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-100" 
                                    : "bg-slate-50 border-slate-200 text-slate-500"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-black",
                                        selectedStudent ? "bg-white text-indigo-600" : "bg-slate-200 text-slate-400"
                                    )}>
                                        {selectedStudent ? selectedStudent.name.charAt(0) : <User className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">
                                            Billing Context
                                        </p>
                                        <p className="text-sm font-black uppercase tracking-tight">
                                            {selectedStudent ? selectedStudent.name : "Direct Sale (No student linked)"}
                                        </p>
                                    </div>
                                </div>
                                {selectedStudent ? (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSelectedStudent(null)}
                                        className="h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[9px] font-black uppercase tracking-widest px-3 rounded-lg"
                                    >
                                        <X className="w-3.5 h-3.5 mr-1" /> Remove Link
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-40">
                                        <AlertCircle className="h-3.5 w-3.5" /> Use filters above to link a student
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
                                {/* Filter by Class & Section (Green/Emerald Theme) */}
                                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 xl:col-span-2 shadow-sm">
                                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                                        <div className="flex-1 min-w-0 w-full">
                                            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                                                <SelectTrigger className="w-full h-10 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-[10px] font-black uppercase transition-all">
                                                    <SelectValue placeholder="Select Class" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Select">Select Class</SelectItem>
                                                    {availableClasses.map(c => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full">
                                            <Select value={selectedSectionFilter} onValueChange={setSelectedSectionFilter} disabled={!selectedClassFilter || selectedClassFilter === 'Select'}>
                                                <SelectTrigger className="w-full h-10 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-[10px] font-black uppercase disabled:opacity-50 transition-all">
                                                    <SelectValue placeholder={!selectedClassFilter || selectedClassFilter === 'Select' ? "Select Class First" : "Select Section"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Select">Select Section</SelectItem>
                                                    {availableSections.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            onClick={async () => {
                                                const results = await searchStudents(schoolId, {
                                                    classFilter: selectedClassFilter || 'Select',
                                                    sectionFilter: selectedSectionFilter || 'Select',
                                                    status: 'Active'
                                                });
                                                setFoundStudents(results || []);
                                            }} 
                                            className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-blue-100 shrink-0 w-full sm:w-auto"
                                        >
                                            <Search className="w-3.5 h-3.5 mr-1.5" /> 
                                            Search
                                        </Button>
                                    </div>
                                </div>

                                {/* Search by Keyword (Indigo Theme) */}
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 w-full shadow-sm">
                                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                                        <div className="flex-1 min-w-0 w-full">
                                            <Input 
                                                placeholder="Search by Name, Roll No..." 
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                className="w-full h-10 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-[11px] font-bold"
                                            />
                                        </div>
                                        <Button 
                                            onClick={async () => {
                                                const results = await searchStudents(schoolId, {
                                                    keyword: studentSearch,
                                                    status: 'Active'
                                                });
                                                setFoundStudents(results || []);
                                            }} 
                                            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-100 shrink-0 w-full sm:w-auto"
                                        >
                                            <Search className="w-3.5 h-3.5 mr-1.5" /> 
                                            Search
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Search Results / Selected Card */}
                            <div className="mb-8">
                                {selectedStudent ? (
                                    <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl text-white shadow-2xl border-2 border-indigo-500 animate-in zoom-in-95">
                                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-black backdrop-blur-md">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black tracking-tight">{selectedStudent.name}</div>
                                            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                                {selectedStudent.className} • {selectedStudent.section} • {selectedStudent.admissionNumber}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-500 text-white border-none text-[9px] font-black uppercase tracking-widest">LINKED</Badge>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                                                onClick={() => setSelectedStudent(null)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : foundStudents.length > 0 ? (
                                    <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Student to Link</span>
                                            <Button variant="ghost" size="sm" onClick={() => setFoundStudents([])} className="h-5 text-[9px] font-black uppercase text-slate-400">Clear Results</Button>
                                        </div>
                                        <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto">
                                            {foundStudents.map(s => (
                                                <div 
                                                    key={s.id}
                                                    className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between group"
                                                    onClick={() => {
                                                        setSelectedStudent(s);
                                                        setFoundStudents([]);
                                                        setStudentSearch('');
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-white group-hover:text-indigo-600">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-slate-700">{s.name}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase">{s.className} • {s.section}</div>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" className="h-7 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black text-[9px] uppercase tracking-widest px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        Link Student
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Catalog</h2>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search catalog..." 
                                    className="pl-10 h-10 bg-white border-slate-200 shadow-sm"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* EXCEL-STYLE PRODUCT TABLE */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <Table className="border-collapse">
                                    <TableHeader className="bg-slate-100/50">
                                        <TableRow className="h-8 hover:bg-transparent border-slate-200">
                                            <TableHead className="w-[40px] border border-slate-200 p-0 text-center">
                                                <Checkbox 
                                                    checked={filteredProducts.length > 0 && filteredProducts.every(p => cart.find(item => item.id === p.id))}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            const newItems = filteredProducts.filter(p => !cart.find(item => item.id === p.id) && p.currentStock > 0);
                                                            setCart([...cart, ...newItems.map(p => ({ ...p, quantity: 1 }))]);
                                                        } else {
                                                            setCart(cart.filter(item => !filteredProducts.find(p => p.id === item.id)));
                                                        }
                                                    }}
                                                    className="translate-y-0.5 border-slate-300 data-[state=checked]:bg-indigo-600"
                                                />
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8">Item</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8">Category</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-center">Stock</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 text-right">Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                                            const isInCart = cart.find(item => item.id === product.id);
                                            return (
                                                <TableRow key={product.id} className={`h-8 hover:bg-indigo-50/50 transition-colors border-slate-200 group ${isInCart ? 'bg-indigo-50/30' : ''}`}>
                                                    <TableCell className="border border-slate-200 p-0 text-center">
                                                        <Checkbox 
                                                            checked={!!isInCart}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) addToCart(product);
                                                                else removeFromCart(product.id);
                                                            }}
                                                            disabled={product.currentStock <= 0}
                                                            className="translate-y-0.5 border-slate-300 data-[state=checked]:bg-indigo-600"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-[11px] font-bold text-slate-900 border border-slate-200 px-3 py-1">
                                                        {product.name}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] font-medium text-slate-600 border border-slate-200 px-3 py-1">
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 bg-slate-50 h-5 px-1.5">
                                                            {product.category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] font-black border border-slate-200 px-3 py-1 text-center">
                                                        <span className={product.currentStock <= product.minStockThreshold ? 'text-orange-600' : 'text-slate-900'}>
                                                            {product.currentStock}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] font-black text-slate-900 border border-slate-200 px-3 py-1 text-right">
                                                        ₹{product.sellPrice}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center border border-slate-200 bg-slate-50/30">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">No items found</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Payment Configuration</h3>
                                        <span className="text-[10px] font-bold text-indigo-400">Step 2 of 2</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Checkout Active</span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                                            onClick={() => setStep(2)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Linked Student Info (Verification) */}
                                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Billing To</p>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">
                                                {selectedStudent?.name || "Counter Sale / Walk-in"}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedStudent && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-white/20 text-white/60">
                                            {selectedStudent.className}
                                        </Badge>
                                    )}
                                </div>
                                
                                {/* Invoice Number Logic */}
                                <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                            {invSettings?.studentInvoiceMode === 'auto' ? <Zap className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
                                            Invoice Number {invSettings?.studentInvoiceRequired && <span className="text-red-400">*</span>}
                                        </label>
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                            Mode: {invSettings?.studentInvoiceMode === 'auto' ? 'Automatic' : 'Manual Entry'}
                                        </span>
                                    </div>
                                    <div className="relative group">
                                        <Input 
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                                            disabled={invSettings?.studentInvoiceMode === 'auto'}
                                            placeholder="ENTER INVOICE #"
                                            className={`h-12 bg-slate-800 border-none text-white font-black text-xl tracking-widest focus-visible:ring-1 focus-visible:ring-white/20 transition-all ${invSettings?.studentInvoiceMode === 'auto' ? 'opacity-80' : 'hover:bg-slate-700'}`}
                                        />
                                        {invSettings?.studentInvoiceMode === 'auto' && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20 text-[9px] font-black">LOCKED</Badge>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-white/40 font-medium italic">
                                        {invSettings?.studentInvoiceMode === 'auto' 
                                            ? "System generated based on your School Settings." 
                                            : "Please enter the physical receipt/invoice number."}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Payment Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Cash', 'Online', 'Wallet', 'Cheque'].map(mode => (
                                                <button
                                                    key={mode}
                                                    className={`py-2 rounded-lg border-2 font-black text-xs transition-all ${paymentMode === mode ? 'border-white bg-white text-slate-900' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                                    onClick={() => setPaymentMode(mode)}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Additional Discount (₹)</label>
                                        <Input 
                                            type="number" 
                                            className="h-10 bg-slate-800 border-none text-white font-black text-lg focus-visible:ring-1 focus-visible:ring-white/20" 
                                            value={discount}
                                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Final Billing Amount</p>
                                        <p className="text-4xl font-black tracking-tighter">₹{total.toFixed(2)}</p>
                                    </div>
                                    <Button 
                                        className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 font-black text-lg rounded-xl transition-transform active:scale-95" 
                                        onClick={handleCompleteSale}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? "PROCESSING..." : "FINISH SALE"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">SALE COMPLETED!</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Invoice #{lastInvoice?.invoiceNumber}</p>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-4">
                                <Button className="bg-indigo-600 h-11 px-6 font-black rounded-xl shadow-lg shadow-indigo-100" onClick={() => setShowReceipt(true)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    PRINT INVOICE
                                </Button>
                                <Button variant="outline" className="h-11 px-6 font-black border-slate-200 rounded-xl" onClick={() => {
                                    setCart([]);
                                    setSelectedStudent(null);
                                    setStep(2);
                                    setLastInvoice(null);
                                }}>
                                    NEW SALE
                                </Button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Side: Cart Summary */}
                <div className="lg:col-span-1 flex flex-col h-full bg-white">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-indigo-600" />
                            Current Order
                        </h3>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-900 font-black text-[10px] px-2 h-5">{cart.length}</Badge>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[450px]">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                                <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex flex-col animate-in slide-in-from-right-2 border-b border-slate-50 pb-3 last:border-0 gap-2">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-black text-slate-900 text-xs truncate uppercase tracking-tighter">{item.name}</div>
                                            <div className="text-[10px] text-indigo-600 font-black">₹{item.sellPrice} × {item.quantity}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-100 rounded-lg h-7 px-1">
                                                <button 
                                                    className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-white text-slate-500 transition-colors"
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-6 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
                                                <button 
                                                    className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-white text-slate-500 transition-colors"
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <button 
                                                className="text-slate-300 hover:text-red-600 transition-colors"
                                                onClick={() => removeFromCart(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pl-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Discount:</span>
                                            <div className="relative">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold">₹</span>
                                                <input 
                                                    type="number" 
                                                    className="w-16 h-6 pl-4 pr-1 text-[10px] font-bold border border-slate-200 rounded bg-slate-50 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    value={item.discount || ''}
                                                    placeholder="0"
                                                    onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-black text-slate-900">
                                            ₹{(item.sellPrice * item.quantity - (item.discount || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Discount</span>
                                <span className="text-emerald-600">-₹{discount.toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
                                <span className="text-2xl font-black text-indigo-600 tracking-tighter">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {step === 2 && cart.length > 0 && (
                            <Button className="w-full h-12 bg-indigo-600 font-black rounded-xl shadow-lg shadow-indigo-100 text-sm tracking-widest" onClick={() => setStep(3)}>
                                PROCEED TO CHECKOUT
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <InventoryReceiptModal 
                    invoice={lastInvoice} 
                    student={selectedStudent} 
                    schoolDetails={school} 
                    onClose={() => setShowReceipt(false)} 
                />
            )}
        </div>
    );
}
