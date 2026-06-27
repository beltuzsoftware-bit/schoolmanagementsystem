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
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { recordBulkStockInward, getInventorySettings, saveInventorySettings } from '@/app/actions/inventory';
import { getSchool } from '@/app/actions';
import { VendorSelect } from './vendor-select';
import { PurchaseReceiptModal } from './purchase-receipt-modal';
import { cn } from "@/lib/utils";
import { AlertCircle, Zap, PenLine, Plus, Trash2, Package } from 'lucide-react';

interface BulkStockInwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    products: any[];
    onSuccess: () => void;
}

const PAYMENT_MODES = ['Cash', 'Online / UPI', 'Bank Transfer', 'Cheque'];

export function BulkStockInwardModal({ isOpen, onClose, schoolId, products, onSuccess }: BulkStockInwardModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [invSettings, setInvSettings] = useState<any>(null);
    const [formData, setFormData] = useState({
        vendorName: '',
        referenceId: '',       // Vendor Bill #
        internalReceiptNo: '', // School Voucher #
        notes: '',
        paidAmount: '0',
        paymentTiming: 'Later',
        paymentMode: 'Cash',
        date: new Date().toISOString().split('T')[0]
    });

    const [items, setItems] = useState<any[]>([
        { productId: '', quantity: '', rate: '', name: '', unit: '' }
    ]);

    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<any>(null);

    useEffect(() => {
        if (isOpen && schoolId) {
            getInventorySettings(schoolId).then(settings => {
                setInvSettings(settings);
                if (settings?.voucherNoMode === 'auto') {
                    const s = settings.voucherNoSettings;
                    const num = s.startFrom + s.currentCounter;
                    const serial = num.toString().padStart(s.padding, '0');
                    const parts = [s.prefix, serial].filter(Boolean);
                    const base = parts.join(s.separator);
                    const autoVoucher = s.suffix ? `${base}${s.separator}${s.suffix}` : base;
                    setFormData(prev => ({ ...prev, internalReceiptNo: autoVoucher }));
                }
            });
            getSchool(schoolId).then(setSchoolDetails);
        }
    }, [isOpen, schoolId]);

    const addItem = () => {
        setItems([...items, { productId: '', quantity: '', rate: '', name: '', unit: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'productId') {
            const prod = products.find(p => p.id === value);
            newItems[index] = { 
                ...newItems[index], 
                productId: value, 
                name: prod?.name || '', 
                unit: prod?.unit || 'Pcs',
                rate: prod?.buyPrice?.toString() || ''
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.vendorName) {
            toast.error("Please select a Vendor");
            return;
        }

        const validItems = items.filter(i => i.productId && i.quantity && i.rate);
        if (validItems.length === 0) {
            toast.error("Please add at least one valid item");
            return;
        }

        setIsLoading(true);
        try {
            const result = await recordBulkStockInward({
                schoolId,
                items: validItems.map(i => ({
                    productId: i.productId,
                    quantity: parseInt(i.quantity),
                    rate: parseFloat(i.rate),
                    name: i.name,
                    unit: i.unit
                })),
                entityName: formData.vendorName,
                referenceId: formData.referenceId,
                internalReceiptNo: formData.internalReceiptNo,
                notes: formData.notes,
                paidAmount: parseFloat(formData.paidAmount) || 0,
                paymentMode: formData.paymentMode,
                date: formData.date,
                recordedBy: typeof window !== 'undefined' ? (localStorage.getItem('kummi_user') || 'Admin') : 'Admin'
            });

            if (result.success) {
                toast.success("Bulk purchase recorded successfully!");
                setLastInvoice(result.invoice);
                setShowReceipt(true);
                onSuccess();

                // Increment counter
                if (invSettings?.voucherNoMode === 'auto') {
                    const updated = {
                        ...invSettings,
                        voucherNoSettings: {
                            ...invSettings.voucherNoSettings,
                            currentCounter: invSettings.voucherNoSettings.currentCounter + 1
                        }
                    };
                    saveInventorySettings(schoolId, updated);
                }
            } else {
                toast.error(result.error || "Failed to record purchase");
            }
        } catch (error) {
            toast.error("Failed to record purchase");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Package className="h-5 w-5 text-indigo-600" />
                            </div>
                            Record Multi-Item Purchase
                        </DialogTitle>
                        <DialogDescription>
                            Add multiple products to a single vendor bill.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Header Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Purchase Date</Label>
                            <Input 
                                type="date" 
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="h-9 bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Vendor Bill #</Label>
                            <Input 
                                placeholder="Bill No"
                                value={formData.referenceId}
                                onChange={(e) => setFormData({...formData, referenceId: e.target.value})}
                                className="h-9 bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Voucher #</Label>
                            <Input 
                                value={formData.internalReceiptNo}
                                onChange={(e) => setFormData({...formData, internalReceiptNo: e.target.value})}
                                readOnly={invSettings?.voucherNoMode === 'auto'}
                                className={cn("h-9 bg-white", invSettings?.voucherNoMode === 'auto' && "bg-indigo-50 font-bold text-indigo-700")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Vendor</Label>
                            <VendorSelect 
                                schoolId={schoolId}
                                value={formData.vendorName}
                                onChange={(v) => setFormData({...formData, vendorName: v})}
                                placeholder="Vendor"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[40%] text-[10px] font-black uppercase">Product</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Qty</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Rate (₹)</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <Select 
                                                value={item.productId}
                                                onValueChange={(v) => updateItem(index, 'productId', v)}
                                            >
                                                <SelectTrigger className="h-9 border-none shadow-none focus:ring-0">
                                                    <SelectValue placeholder="Select Product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                className="h-8 border-none shadow-none focus:ring-0 text-center font-bold"
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                                className="h-8 border-none shadow-none focus:ring-0 text-right"
                                                placeholder="0.00"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700">
                                            ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-3 bg-slate-50/50 flex justify-center">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 text-[10px] font-black uppercase tracking-widest border-dashed"
                                onClick={addItem}
                            >
                                <Plus className="h-3 w-3" /> Add More Row
                            </Button>
                        </div>
                    </div>

                    {/* Summary & Payment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Payment Status</Label>
                                <Select 
                                    value={formData.paymentTiming}
                                    onValueChange={(v) => {
                                        setFormData({
                                            ...formData, 
                                            paymentTiming: v, 
                                            paidAmount: v === 'Now' ? totalAmount.toString() : '0'
                                        });
                                    }}
                                >
                                    <SelectTrigger className="h-10 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Now">Paid Full / Partial</SelectItem>
                                        <SelectItem value="Later">Pay Later (Due)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {formData.paymentTiming === 'Now' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Paid Amount</Label>
                                        <Input 
                                            type="number"
                                            value={formData.paidAmount}
                                            onChange={(e) => setFormData({...formData, paidAmount: e.target.value})}
                                            className="h-10 bg-white font-bold text-emerald-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Payment Mode</Label>
                                        <Select 
                                            value={formData.paymentMode}
                                            onValueChange={(v) => setFormData({...formData, paymentMode: v})}
                                        >
                                            <SelectTrigger className="h-10 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_MODES.map(m => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Notes</Label>
                                <Textarea 
                                    placeholder="Bill notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    className="h-16 bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-between p-6 bg-white rounded-xl shadow-sm border border-indigo-100">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                                    <span className="font-bold text-slate-600">₹{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Amount Paid</span>
                                    <span className="font-bold text-emerald-600">₹{(parseFloat(formData.paidAmount) || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">Total Bill Amount</span>
                                        <span className="text-2xl font-black text-indigo-700 leading-none">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Balance Due</span>
                                        <span className={cn(
                                            "text-lg font-black leading-none",
                                            totalAmount - (parseFloat(formData.paidAmount) || 0) > 0 ? "text-red-500" : "text-emerald-500"
                                        )}>
                                            ₹{(totalAmount - (parseFloat(formData.paidAmount) || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-xs" disabled={isLoading}>
                            {isLoading ? "Processing..." : "Submit Purchase Bill"}
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
