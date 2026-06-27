'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { recordStockInward, getInventorySettings, saveInventorySettings } from '@/app/actions/inventory';
import { getSchool } from '@/app/actions';
import { VendorSelect } from './vendor-select';
import { PurchaseReceiptModal } from './purchase-receipt-modal';
import { cn } from "@/lib/utils";
import { AlertCircle, Zap, PenLine } from 'lucide-react';

interface StockInwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    product: any | null;
    onSuccess: () => void;
}

const PAYMENT_MODES = ['Cash', 'Online / UPI', 'PhonePe', 'Google Pay', 'Bank Transfer', 'Check', 'Debit (Ledger)', 'Credit (Ledger)'];

const DEFAULT_INV_SETTINGS = {
    defaultPaymentMode: 'Select',
    defaultPaymentTiming: 'Select',
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
    }
};

function generateNextVoucher(s: typeof DEFAULT_INV_SETTINGS.voucherNoSettings) {
    const num = s.startFrom + s.currentCounter;
    const serial = num.toString().padStart(s.padding, '0');
    const parts = [s.prefix, serial].filter(Boolean);
    const base = parts.join(s.separator);
    return s.suffix ? `${base}${s.separator}${s.suffix}` : base;
}

export function StockInwardModal({ isOpen, onClose, schoolId, product, onSuccess }: StockInwardModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [invSettings, setInvSettings] = useState(DEFAULT_INV_SETTINGS);
    const [formData, setFormData] = useState({
        quantity: '',
        rate: '',
        entityName: '',
        referenceId: '',       // Vendor Invoice #
        internalReceiptNo: '', // School Voucher #
        notes: '',
        paidAmount: '',
        paymentTiming: 'Select',
        paymentMode: 'Cash'
    });
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<any>(null);

    // Load inventory settings once (schoolId changes)
    useEffect(() => {
        if (!schoolId) return;
        getInventorySettings(schoolId).then((saved) => {
            if (saved) setInvSettings({ ...DEFAULT_INV_SETTINGS, ...saved });
        });
    }, [schoolId]);

    // Reset form when product opens
    useEffect(() => {
        if (product && isOpen) {
            const settings = invSettings;
            const isNoDefault = settings.defaultPaymentMode === '__select__' || settings.defaultPaymentMode === 'Select';
            const defaultPayment = isNoDefault ? '__select__' : settings.defaultPaymentMode;
            const autoVoucher = settings.voucherNoMode === 'auto'
                ? generateNextVoucher(settings.voucherNoSettings)
                : '';

            setFormData({
                quantity: '',
                rate: product.buyPrice.toString(),
                entityName: '',
                referenceId: '',
                internalReceiptNo: autoVoucher,
                notes: '',
                paidAmount: '',
                paymentTiming: settings.defaultPaymentTiming || 'Select',
                paymentMode: defaultPayment,
            });
            setShowReceipt(false);

            if (schoolId) {
                getSchool(schoolId).then(setSchoolDetails);
            }
        }
    }, [product?.id, isOpen]);

    const totalAmount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Core required
        if (!product || !formData.quantity || !formData.rate || !formData.entityName) {
            toast.error("Please fill in Quantity, Rate, and Vendor.");
            return;
        }

        // Settings-driven mandatory checks
        if (invSettings.vendorInvoiceRequired && !formData.referenceId.trim()) {
            toast.error("Vendor Invoice Number is mandatory. Please enter it from the vendor's bill.");
            return;
        }

        if (invSettings.voucherNoRequired && !formData.internalReceiptNo.trim()) {
            toast.error("School Voucher / Receipt # is mandatory.");
            return;
        }

        if (formData.paymentTiming === 'Select') {
            toast.error("Please select if you are paying 'Now' or 'Later'.");
            return;
        }

        if (formData.paymentTiming === 'Now' && (formData.paymentMode === '__select__' || !formData.paymentMode)) {
            toast.error("Please select a Payment Mode.");
            return;
        }

        const paidAmt = parseFloat(formData.paidAmount) || 0;
        if (paidAmt > totalAmount) {
            toast.error(`Paid amount cannot exceed total (₹${totalAmount.toFixed(2)})`);
            return;
        }

        setIsLoading(true);
        try {
            const result = await recordStockInward({
                schoolId,
                productId: product.id,
                quantity: parseInt(formData.quantity),
                rate: parseFloat(formData.rate),
                entityName: formData.entityName,
                referenceId: formData.referenceId,
                internalReceiptNo: formData.internalReceiptNo,
                notes: formData.notes,
                paidAmount: paidAmt,
                paymentMode: formData.paymentMode,
                recordedBy: typeof window !== 'undefined' ? (localStorage.getItem('kummi_user') || 'Admin') : 'Admin'
            });

            if (result.success) {
                toast.success("Stock recorded successfully!");
                setLastInvoice(result.invoice);
                setShowReceipt(true);
                onSuccess();

                // Increment the counter in saved settings if auto mode
                if (invSettings.voucherNoMode === 'auto') {
                    const updated = {
                        ...invSettings,
                        voucherNoSettings: {
                            ...invSettings.voucherNoSettings,
                            currentCounter: invSettings.voucherNoSettings.currentCounter + 1
                        }
                    };
                    setInvSettings(updated);
                    saveInventorySettings(schoolId, updated); // fire and forget
                }
            }
        } catch (error) {
            toast.error("Failed to record stock.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!product) return null;

    const isAutoVoucher = invSettings.voucherNoMode === 'auto';
    const vendorInvRequired = invSettings.vendorInvoiceRequired;
    const voucherRequired = invSettings.voucherNoRequired;

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] overflow-hidden">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Stock Inward (Purchase)</DialogTitle>
                        <DialogDescription>
                            Record new stock arrival for <span className="font-bold text-slate-900">{product.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2.5 py-2">
                        {/* Qty & Rate */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity ({product.unit}) *</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    placeholder="e.g. 50"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate">Purchase Rate (₹) *</Label>
                                <Input
                                    id="rate"
                                    type="number"
                                    step="0.01"
                                    value={formData.rate}
                                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Invoice Numbers */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="ref">
                                    Vendor Invoice #
                                    {vendorInvRequired && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                <Input
                                    id="ref"
                                    placeholder="From vendor bill"
                                    value={formData.referenceId}
                                    onChange={(e) => setFormData({...formData, referenceId: e.target.value})}
                                    className={cn(vendorInvRequired && !formData.referenceId ? "border-orange-300" : "")}
                                />
                                {vendorInvRequired && (
                                    <p className="text-[9px] text-orange-500 flex items-center gap-1 font-bold">
                                        <AlertCircle className="h-2.5 w-2.5" /> Required by school settings
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="internalNo">
                                    School Voucher #
                                    {voucherRequired && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="internalNo"
                                        placeholder={isAutoVoucher ? "Auto-generated" : "Enter voucher #"}
                                        value={formData.internalReceiptNo}
                                        onChange={(e) => setFormData({...formData, internalReceiptNo: e.target.value})}
                                        readOnly={isAutoVoucher}
                                        className={cn(
                                            "pr-8",
                                            isAutoVoucher ? "bg-indigo-50 text-indigo-700 font-bold" : "",
                                            voucherRequired && !formData.internalReceiptNo ? "border-orange-300" : ""
                                        )}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        {isAutoVoucher ? (
                                            <span title="Auto mode"><Zap className="h-3 w-3 text-indigo-400" /></span>
                                        ) : (
                                            <span title="Manual mode"><PenLine className="h-3 w-3 text-slate-400" /></span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold">
                                    {isAutoVoucher ? "Auto-generated from Settings" : "Manual entry mode"}
                                </p>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-indigo-900">Total Purchase Value:</span>
                                <span className="text-xl font-black text-indigo-700">₹{totalAmount.toLocaleString()}</span>
                            </div>

                            <div className={cn(
                                "grid gap-3 mb-3 w-full",
                                formData.paymentTiming === 'Now' ? "grid-cols-3" : "grid-cols-2"
                            )}>
                                <div className="space-y-1.5 min-w-0">
                                    <Label htmlFor="paidAmount" className="text-[10px] uppercase font-bold text-slate-500 block truncate">Amount Paid</Label>
                                    <Input
                                        id="paidAmount"
                                        type="number"
                                        placeholder="0.00"
                                        className="h-9 text-sm font-bold bg-white border-indigo-200 w-full"
                                        value={formData.paidAmount}
                                        onChange={(e) => setFormData({...formData, paidAmount: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                    <Label htmlFor="paymentTiming" className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                                        Pay <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.paymentTiming}
                                        onValueChange={(v) => {
                                            let newPaid = formData.paidAmount;
                                            if (v === 'Now') newPaid = totalAmount.toString();
                                            else if (v === 'Later') newPaid = '0';
                                            setFormData({...formData, paymentTiming: v, paidAmount: newPaid});
                                        }}
                                    >
                                        <SelectTrigger id="paymentTiming" className="h-9 text-sm bg-white border-indigo-200 w-full">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select" className="text-slate-400 italic text-xs">Select</SelectItem>
                                            <SelectItem value="Now">Now</SelectItem>
                                            <SelectItem value="Later">Later</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.paymentTiming === 'Now' && (
                                    <div className="space-y-1.5 min-w-0 animate-in slide-in-from-right-2 duration-200">
                                        <Label htmlFor="paymentMode" className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                                            Mode <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.paymentMode}
                                            onValueChange={(v) => setFormData({...formData, paymentMode: v})}
                                        >
                                            <SelectTrigger id="paymentMode" className="h-9 text-sm bg-white border-indigo-200 w-full">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(invSettings.defaultPaymentMode === 'Select' || formData.paymentMode === '__select__') && (
                                                    <SelectItem value="__select__" className="text-slate-400 italic text-xs">
                                                        — Mode —
                                                    </SelectItem>
                                                )}
                                                {PAYMENT_MODES.map(m => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between px-2 py-1.5 bg-white/50 rounded-md border border-indigo-50/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Balance Due</span>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        totalAmount - (parseFloat(formData.paidAmount) || 0) > 0 ? "text-red-600" : "text-emerald-600"
                                    )}>
                                        ₹{(totalAmount - (parseFloat(formData.paidAmount) || 0)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                        (parseFloat(formData.paidAmount) || 0) >= totalAmount ? "bg-emerald-100 text-emerald-700" :
                                        (parseFloat(formData.paidAmount) || 0) > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {(parseFloat(formData.paidAmount) || 0) >= totalAmount ? "Paid" :
                                         (parseFloat(formData.paidAmount) || 0) > 0 ? "Partial" : "Due"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Vendor (mandatory) */}
                        <div className="space-y-1">
                            <Label htmlFor="vendor">Vendor / Supplier Name *</Label>
                            <VendorSelect
                                schoolId={schoolId}
                                value={formData.entityName}
                                onChange={(v) => setFormData({...formData, entityName: v})}
                                placeholder="Select or add vendor"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Any additional details..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                            {isLoading ? "Recording..." : "Record Purchase"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {showReceipt && lastInvoice && (
            <PurchaseReceiptModal
                invoice={lastInvoice}
                schoolDetails={schoolDetails}
                onClose={() => {
                    setShowReceipt(false);
                    onClose();
                }}
            />
        )}
        </>
    );
}
