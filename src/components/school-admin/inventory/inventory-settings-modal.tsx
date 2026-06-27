'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Settings2,
    Save,
    CreditCard,
    Hash,
    FileCheck,
    AlertCircle,
    CheckCircle2,
    Zap,
    PenLine,
    Clock,
    Plus,
    Trash2,
    Package,
    ShoppingCart
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getInventorySettings, saveInventorySettings } from '@/app/actions/inventory';

interface InventorySettingsModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    schoolId: string;
    standalone?: boolean;
}

const PAYMENT_MODES = ['Cash', 'Online / UPI', 'PhonePe', 'Google Pay', 'Bank Transfer', 'Check', 'Debit (Ledger)', 'Credit (Ledger)'];

const DEFAULT_SETTINGS = {
    defaultPaymentMode: '__select__',   // "__select__" means no default — user must always choose
    defaultPaymentTiming: 'Select',    // Now, Later, Select
    vendorInvoiceRequired: true,
    voucherNoRequired: true,
    voucherNoMode: 'auto' as 'auto' | 'manual',
    voucherNoSettings: {
        prefix: 'PV',
        separator: '-',
        startFrom: 1,
        padding: 4,
        suffix: '',
        currentCounter: 0,
    },
    studentInvoiceRequired: true,
    studentInvoiceMode: 'auto' as 'auto' | 'manual',
    studentInvoiceSettings: {
        prefix: 'INV',
        separator: '-',
        startFrom: 1,
        padding: 6,
        suffix: '',
        currentCounter: 0,
    },
    categories: ['Books', 'Uniforms', 'Stationery', 'Accessories']
};

function generateVoucherPreview(s: typeof DEFAULT_SETTINGS.voucherNoSettings) {
    const serial = (s.startFrom + s.currentCounter).toString().padStart(s.padding, '0');
    const parts = [s.prefix, serial].filter(Boolean);
    const base = parts.join(s.separator);
    return s.suffix ? `${base}${s.separator}${s.suffix}` : base;
}

function generateStudentInvoicePreview(s: typeof DEFAULT_SETTINGS.studentInvoiceSettings) {
    const serial = (s.startFrom + s.currentCounter).toString().padStart(s.padding, '0');
    const parts = [s.prefix, serial].filter(Boolean);
    const base = parts.join(s.separator);
    return s.suffix ? `${base}${s.separator}${s.suffix}` : base;
}

// Segmented toggle button
function SegmentedToggle({
    value,
    onChange,
    options
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
    return (
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 gap-0.5 w-fit">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all",
                        value === opt.value
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    {opt.icon}
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// A professional row for each setting
function SettingRow({
    icon,
    title,
    description,
    children,
    danger
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div className={cn(
            "flex flex-col md:flex-row md:items-start gap-4 p-4 rounded-xl border",
            danger ? "bg-red-50/30 border-red-100" : "bg-white border-slate-200"
        )}>
            <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                danger ? "bg-red-100 text-red-600" : "bg-indigo-50 text-indigo-600"
            )}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">{description}</div>
            </div>
            <div className="shrink-0 flex items-center">
                {children}
            </div>
        </div>
    );
}

export function InventorySettingsModal({ isOpen, onClose, schoolId, standalone = false }: InventorySettingsModalProps) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<{ index: number, value: string } | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!schoolId) return;
        setIsLoading(true);
        getInventorySettings(schoolId)
            .then((saved) => {
                if (saved) {
                    setSettings({ ...DEFAULT_SETTINGS, ...saved });
                }
            })
            .finally(() => setIsLoading(false));
    }, [schoolId]);

    const update = (path: string, value: any) => {
        setSettings(prev => {
            const clone = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let obj = clone;
            for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
            obj[keys[keys.length - 1]] = value;
            return clone;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveInventorySettings(schoolId, settings);
        setIsSaving(false);
        if (result.success) {
            toast.success("Inventory settings saved successfully!");
        } else {
            toast.error("Failed to save settings. Please try again.");
        }
    };

    const preview = generateVoucherPreview(settings.voucherNoSettings);
    const studentPreview = generateStudentInvoicePreview(settings.studentInvoiceSettings);

    const content = (
        <div className={cn("flex flex-col bg-white", standalone ? "rounded-2xl border border-slate-200 shadow-sm overflow-hidden" : "h-full")}>
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Settings2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventory Settings</h2>
                            <p className="text-xs font-medium text-slate-500">Configure purchase workflow, mandatory fields, and voucher numbering.</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 h-9 px-5 rounded-xl font-bold text-xs gap-2 shadow-md shadow-indigo-100"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-slate-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                        <span className="text-sm font-bold">Loading configuration...</span>
                    </div>
                ) : (
                    <Tabs defaultValue="purchase" className="w-full">
                        <TabsList className="bg-slate-100 border p-1 h-auto flex gap-1 w-fit rounded-xl mb-6">
                            <TabsTrigger value="purchase" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold transition-all">
                                <CreditCard className="w-3 h-3 mr-1.5" /> Purchase Controls
                            </TabsTrigger>
                            <TabsTrigger value="sales" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold transition-all">
                                <ShoppingCart className="w-3 h-3 mr-1.5" /> Sales Controls
                            </TabsTrigger>
                            <TabsTrigger value="catalog" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold transition-all">
                                <Settings2 className="w-3 h-3 mr-1.5" /> Product Catalog
                            </TabsTrigger>
                            <TabsTrigger value="voucher" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold transition-all">
                                <Hash className="w-3 h-3 mr-1.5" /> Voucher Numbering
                            </TabsTrigger>
                        </TabsList>

                        {/* ── TAB 1: PURCHASE CONTROLS ── */}
                        <TabsContent value="purchase" className="space-y-3 outline-none">

                            {/* 1. Default Payment Mode */}
                            <SettingRow
                                icon={<CreditCard className="h-4 w-4" />}
                                title="Default Payment Mode"
                                description="Pre-select a payment method when the Stock Inward form opens. Choose 'Select' to always require a manual choice."
                            >
                                    <Select
                                        value={settings.defaultPaymentMode}
                                        onValueChange={(v) => update('defaultPaymentMode', v)}
                                    >
                                        <SelectTrigger className="h-9 w-48 text-xs font-bold border-slate-200 bg-slate-50 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__select__" className="text-xs font-bold text-slate-400 italic">
                                                — No Default (Always Ask) —
                                            </SelectItem>
                                            {PAYMENT_MODES.map(m => (
                                                <SelectItem key={m} value={m} className="text-xs font-bold">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                            </SettingRow>

                            {/* 1.5. Default Payment (Pay) */}
                            <SettingRow
                                icon={<Clock className="h-4 w-4" />}
                                title="Default Payment Setting (Pay)"
                                description="Choose if purchases should default to 'Now' (Full Payment) or 'Later' (Credit) by default."
                            >
                                <Select
                                    value={settings.defaultPaymentTiming}
                                    onValueChange={(v) => update('defaultPaymentTiming', v)}
                                >
                                    <SelectTrigger className="h-9 w-48 text-xs font-bold border-slate-200 bg-slate-50 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Select" className="text-xs font-bold text-slate-400 italic">Select</SelectItem>
                                        <SelectItem value="Now" className="text-xs font-bold">Now</SelectItem>
                                        <SelectItem value="Later" className="text-xs font-bold">Later</SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingRow>

                            {/* 2. Vendor Invoice Required */}
                            <SettingRow
                                icon={<FileCheck className="h-4 w-4" />}
                                title="Vendor Invoice Number — Mandatory"
                                description="When enabled, the vendor's bill/invoice number must be entered before recording a stock purchase."
                                danger={settings.vendorInvoiceRequired}
                            >
                                <SegmentedToggle
                                    value={settings.vendorInvoiceRequired ? 'required' : 'optional'}
                                    onChange={(v) => update('vendorInvoiceRequired', v === 'required')}
                                    options={[
                                        { value: 'optional', label: 'Optional', icon: <CheckCircle2 className="h-3 w-3" /> },
                                        { value: 'required', label: 'Required', icon: <AlertCircle className="h-3 w-3" /> },
                                    ]}
                                />
                            </SettingRow>

                            {/* 3. School Voucher Required */}
                            <SettingRow
                                icon={<Hash className="h-4 w-4" />}
                                title="School Voucher / Receipt # — Mandatory"
                                description="When enabled, a voucher number is required. In Auto mode it is generated automatically from the format configured in the Voucher Numbering tab."
                                danger={settings.voucherNoRequired}
                            >
                                <SegmentedToggle
                                    value={settings.voucherNoRequired ? 'required' : 'optional'}
                                    onChange={(v) => update('voucherNoRequired', v === 'required')}
                                    options={[
                                        { value: 'optional', label: 'Optional', icon: <CheckCircle2 className="h-3 w-3" /> },
                                        { value: 'required', label: 'Required', icon: <AlertCircle className="h-3 w-3" /> },
                                    ]}
                                />
                            </SettingRow>

                            {/* 4. Voucher Mode Auto / Manual */}
                            <SettingRow
                                icon={<Zap className="h-4 w-4" />}
                                title="School Voucher # Entry Mode"
                                description="Auto: System generates the number (configure format in 'Voucher Numbering' tab). Manual: User types the voucher number each time."
                            >
                                <SegmentedToggle
                                    value={settings.voucherNoMode}
                                    onChange={(v) => update('voucherNoMode', v)}
                                    options={[
                                        { value: 'auto', label: 'Auto', icon: <Zap className="h-3 w-3" /> },
                                        { value: 'manual', label: 'Manual', icon: <PenLine className="h-3 w-3" /> },
                                    ]}
                                />
                            </SettingRow>

                            {/* Summary Banner */}
                            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Configuration</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Default Payment', value: settings.defaultPaymentMode === '__select__' ? 'No Default' : settings.defaultPaymentMode },
                                        { label: 'Default Timing', value: settings.defaultPaymentTiming },
                                        { label: 'Vendor Invoice', value: settings.vendorInvoiceRequired ? 'Required ⚠' : 'Optional' },
                                        { label: 'Voucher No.', value: settings.voucherNoRequired ? 'Required ⚠' : 'Optional' },
                                        { label: 'Voucher Mode', value: settings.voucherNoMode === 'auto' ? `Auto (${preview})` : 'Manual Entry' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{item.label}</div>
                                            <div className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="sales" className="space-y-3 outline-none">
                            {/* 1. Student Invoice Mandatory */}
                            <SettingRow
                                icon={<FileCheck className="h-4 w-4" />}
                                title="Student Invoice / Receipt # — Mandatory"
                                description="When enabled, an invoice number is required for student sales. In Auto mode, it is generated based on your Student Invoice format."
                                danger={settings.studentInvoiceRequired}
                            >
                                <SegmentedToggle
                                    value={settings.studentInvoiceRequired ? 'required' : 'optional'}
                                    onChange={(v) => update('studentInvoiceRequired', v === 'required')}
                                    options={[
                                        { value: 'optional', label: 'Optional', icon: <CheckCircle2 className="h-3 w-3" /> },
                                        { value: 'required', label: 'Required', icon: <AlertCircle className="h-3 w-3" /> },
                                    ]}
                                />
                            </SettingRow>

                            {/* 2. Student Invoice Mode */}
                            <SettingRow
                                icon={<Zap className="h-4 w-4" />}
                                title="Student Invoice # Entry Mode"
                                description="Auto: System generates the number using the Student Invoice prefix. Manual: Cashier types the invoice number manually."
                            >
                                <SegmentedToggle
                                    value={settings.studentInvoiceMode}
                                    onChange={(v) => update('studentInvoiceMode', v)}
                                    options={[
                                        { value: 'auto', label: 'Auto', icon: <Zap className="h-3 w-3" /> },
                                        { value: 'manual', label: 'Manual', icon: <PenLine className="h-3 w-3" /> },
                                    ]}
                                />
                            </SettingRow>

                            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Sale Configuration</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Invoice No.', value: settings.studentInvoiceRequired ? 'Required ⚠' : 'Optional' },
                                        { label: 'Entry Mode', value: settings.studentInvoiceMode === 'auto' ? `Auto (Starts with ${settings.studentInvoiceSettings.prefix})` : 'Manual Entry' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{item.label}</div>
                                            <div className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── TAB: CATALOG (CATEGORIES) ── */}
                        <TabsContent value="catalog" className="space-y-6 outline-none">
                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                        <Package className="h-4 w-4 text-indigo-600" />
                                        Manage Product Categories
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Define the categories used for grouping your products. These will appear in the "Add Product" dropdown.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Enter new category name..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="h-10 text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const cat = newCategory.trim();
                                                if (cat && !settings.categories?.includes(cat)) {
                                                    const updated = [...(settings.categories || []), cat];
                                                    update('categories', updated);
                                                    setNewCategory('');
                                                }
                                            }
                                        }}
                                    />
                                    <Button 
                                        type="button"
                                        onClick={() => {
                                            const cat = newCategory.trim();
                                            if (cat && !settings.categories?.includes(cat)) {
                                                const updated = [...(settings.categories || []), cat];
                                                update('categories', updated);
                                                setNewCategory('');
                                            }
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 h-10 px-4 shrink-0"
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Categories</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {(settings.categories || []).map((cat: string, idx: number) => (
                                            <div 
                                                key={`${cat}-${idx}`} 
                                                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-indigo-200 transition-colors"
                                            >
                                                {editingCategory?.index === idx ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <Input 
                                                            value={editingCategory.value}
                                                            onChange={(e) => setEditingCategory({ ...editingCategory, value: e.target.value })}
                                                            className="h-8 text-sm py-0"
                                                            autoFocus
                                                        />
                                                        <Button 
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => {
                                                                const updated = [...settings.categories];
                                                                updated[idx] = editingCategory.value;
                                                                update('categories', updated);
                                                                setEditingCategory(null);
                                                            }}
                                                            className="h-8 bg-green-600 hover:bg-green-700 text-[10px]"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button 
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingCategory(null)}
                                                            className="h-8 text-[10px]"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-700">{cat}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button 
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingCategory({ index: idx, value: cat })}
                                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                            >
                                                                <PenLine className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setCategoryToDelete(cat)}
                                                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {(settings.categories || []).length === 0 && (
                                            <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed rounded-xl">
                                                <Package className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase">No categories defined yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                                    <strong>Pro Tip:</strong> Removing a category here will not delete existing products, but that category will no longer be available for selection when adding new items.
                                </p>
                            </div>
                        </TabsContent>

                        {/* ── TAB 2: VOUCHER NUMBERING ── */}
                        <TabsContent value="voucher" className="space-y-6 outline-none">
                            <Tabs defaultValue="vendor_voucher" className="w-full">
                                <TabsList className="bg-slate-50 p-1 h-auto flex gap-1 w-fit rounded-lg mb-4 border border-slate-100">
                                    <TabsTrigger value="vendor_voucher" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all">
                                        Vendor Voucher (Purchase)
                                    </TabsTrigger>
                                    <TabsTrigger value="student_invoice" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all">
                                        Student Invoice (Sales)
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="vendor_voucher" className="space-y-6 outline-none animate-in fade-in duration-300">
                                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Live Preview (Vendor Voucher)</p>
                                        <div className="text-3xl font-black text-indigo-800 tracking-widest font-mono bg-white px-6 py-4 rounded-xl border border-indigo-100 text-center shadow-inner">
                                            {preview}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format Builder</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Prefix</Label>
                                                <Input value={settings.voucherNoSettings.prefix} onChange={(e) => update('voucherNoSettings.prefix', e.target.value.toUpperCase())} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Separator</Label>
                                                <Input value={settings.voucherNoSettings.separator} onChange={(e) => update('voucherNoSettings.separator', e.target.value)} className="h-9 font-mono text-sm font-bold" maxLength={2} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Suffix</Label>
                                                <Input value={settings.voucherNoSettings.suffix} onChange={(e) => update('voucherNoSettings.suffix', e.target.value.toUpperCase())} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Start From</Label>
                                                <Input type="number" value={settings.voucherNoSettings.startFrom} onChange={(e) => update('voucherNoSettings.startFrom', parseInt(e.target.value) || 1)} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Padding</Label>
                                                <Input type="number" value={settings.voucherNoSettings.padding} onChange={(e) => update('voucherNoSettings.padding', parseInt(e.target.value) || 4)} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Counter: {settings.voucherNoSettings.currentCounter}</p>
                                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase text-red-600 border-red-100" onClick={() => update('voucherNoSettings.currentCounter', 0)}>Reset Counter</Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="student_invoice" className="space-y-6 outline-none animate-in fade-in duration-300">
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Live Preview (Student Invoice)</p>
                                        <div className="text-3xl font-black text-emerald-800 tracking-widest font-mono bg-white px-6 py-4 rounded-xl border border-emerald-100 text-center shadow-inner">
                                            {studentPreview}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format Builder</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Prefix</Label>
                                                <Input value={settings.studentInvoiceSettings.prefix} onChange={(e) => update('studentInvoiceSettings.prefix', e.target.value.toUpperCase())} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Separator</Label>
                                                <Input value={settings.studentInvoiceSettings.separator} onChange={(e) => update('studentInvoiceSettings.separator', e.target.value)} className="h-9 font-mono text-sm font-bold" maxLength={2} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Suffix</Label>
                                                <Input value={settings.studentInvoiceSettings.suffix} onChange={(e) => update('studentInvoiceSettings.suffix', e.target.value.toUpperCase())} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Start From</Label>
                                                <Input type="number" value={settings.studentInvoiceSettings.startFrom} onChange={(e) => update('studentInvoiceSettings.startFrom', parseInt(e.target.value) || 1)} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase">Padding</Label>
                                                <Input type="number" value={settings.studentInvoiceSettings.padding} onChange={(e) => update('studentInvoiceSettings.padding', parseInt(e.target.value) || 6)} className="h-9 font-mono text-sm font-bold" />
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Counter: {settings.studentInvoiceSettings.currentCounter}</p>
                                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase text-red-600 border-red-100" onClick={() => update('studentInvoiceSettings.currentCounter', 0)}>Reset Counter</Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                    <strong>How it works:</strong> Use the <em>Entry Mode</em> in Purchase/Sales tabs to toggle between Auto and Manual. Auto mode increments the counter after each transaction.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );

    return (
        <>
            {!standalone ? (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="max-w-[95vw] w-full lg:max-w-[800px] h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
                        {content}
                    </DialogContent>
                </Dialog>
            ) : content}
            <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-xl font-black text-slate-900">Delete Category</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-slate-500">
                            Are you sure you want to delete the category <span className="font-bold text-slate-900">"{categoryToDelete}"</span>? 
                            This will not delete existing products but will remove it from future selection. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="rounded-xl font-bold text-xs border-slate-200 h-10 px-6">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                if (categoryToDelete) {
                                    const updated = settings.categories.filter((c: string) => c !== categoryToDelete);
                                    update('categories', updated);
                                    setCategoryToDelete(null);
                                    toast.success(`Category "${categoryToDelete}" removed`);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs h-10 px-6"
                        >
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
