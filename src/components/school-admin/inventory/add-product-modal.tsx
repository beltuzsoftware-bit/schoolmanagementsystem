'use client';

import React, { useState } from 'react';
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
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addInventoryProduct, getInventorySettings } from '@/app/actions/inventory';
import { VendorSelect } from './vendor-select';
import { AlertCircle, Zap, PenLine } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    onSuccess: () => void;
}

export function AddProductModal({ isOpen, onClose, schoolId, onSuccess }: AddProductModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        sku: '',
        hsnCode: '',
        description: '',
        unit: 'Pcs',
        buyPrice: '',
        sellPrice: '',
        taxRate: '0',
        minStockThreshold: '5',
        openingStock: '0',
        vendorName: '',
        // New Purchase Heads
        invoiceNumber: '',
        internalReceiptNo: '',
        paidAmount: '',
        paymentMode: 'Cash',
        paymentTiming: 'Later',
        date: new Date().toISOString().split('T')[0]
    });
    const [invSettings, setInvSettings] = useState<any>(null);

    React.useEffect(() => {
        if (isOpen && schoolId) {
            getInventorySettings(schoolId).then(settings => {
                setInvSettings(settings);
                if (settings?.voucherNoMode === 'auto') {
                    // Replicate generation logic
                    const s = settings.voucherNoSettings;
                    const num = s.startFrom + s.currentCounter;
                    const serial = num.toString().padStart(s.padding, '0');
                    const parts = [s.prefix, serial].filter(Boolean);
                    const base = parts.join(s.separator);
                    const autoVoucher = s.suffix ? `${base}${s.separator}${s.suffix}` : base;
                    setFormData(prev => ({ ...prev, internalReceiptNo: autoVoucher }));
                }
            });
        }
    }, [isOpen, schoolId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.category) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsLoading(true);
        try {
            const result = await addInventoryProduct({
                ...formData,
                schoolId,
                buyPrice: parseFloat(formData.buyPrice) || 0,
                sellPrice: parseFloat(formData.sellPrice) || 0,
                taxRate: parseFloat(formData.taxRate) || 0,
                minStockThreshold: parseInt(formData.minStockThreshold) || 5,
                openingStock: parseInt(formData.openingStock) || 0,
                vendorName: formData.vendorName,
                invoiceNumber: formData.invoiceNumber,
                internalReceiptNo: formData.internalReceiptNo,
                paidAmount: parseFloat(formData.paidAmount) || 0,
                paymentMode: formData.paymentMode,
                date: formData.date,
                recordedBy: typeof window !== 'undefined' ? (localStorage.getItem('kummi_user') || 'Admin') : 'Admin'
            });

            if (result.success) {
                toast.success("Product added successfully");
                onSuccess();
                onClose();
            }
        } catch (error) {
            toast.error("Failed to add product");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                        <DialogDescription>
                            Create a new item in your inventory catalog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name *</Label>
                                <Input 
                                    id="name" 
                                    placeholder="e.g. Exercise Book (120 pgs)" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(v) => setFormData({...formData, category: v})}
                                >
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(invSettings?.categories && Array.isArray(invSettings.categories) ? invSettings.categories : ['Books', 'Uniforms', 'Stationery', 'Accessories']).map((cat: string) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU / Item Code</Label>
                                <Input 
                                    id="sku" 
                                    placeholder="e.g. BK-EX-120" 
                                    value={formData.sku}
                                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hsnCode">HSN Code</Label>
                                <Input 
                                    id="hsnCode" 
                                    placeholder="8-digit code" 
                                    value={formData.hsnCode}
                                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                                />
                            </div>
                        </div>


                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="buyPrice">Buy Price (₹)</Label>
                                <Input 
                                    id="buyPrice" 
                                    type="number" 
                                    step="0.01"
                                    value={formData.buyPrice}
                                    onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sellPrice">Sell Price (₹)</Label>
                                <Input 
                                    id="sellPrice" 
                                    type="number" 
                                    step="0.01"
                                    value={formData.sellPrice}
                                    onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                <Input 
                                    id="taxRate" 
                                    type="number"
                                    value={formData.taxRate}
                                    onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit</Label>
                                <Select 
                                    value={formData.unit} 
                                    onValueChange={(v) => setFormData({...formData, unit: v})}
                                >
                                    <SelectTrigger id="unit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pcs">Pieces (Pcs)</SelectItem>
                                        <SelectItem value="Set">Set</SelectItem>
                                        <SelectItem value="Pkt">Packet (Pkt)</SelectItem>
                                        <SelectItem value="Dzn">Dozen (Dzn)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="openingStock">Opening Stock</Label>
                                <Input 
                                    id="openingStock" 
                                    type="number"
                                    value={formData.openingStock}
                                    onChange={(e) => setFormData({...formData, openingStock: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minStock">Min Stock Alert</Label>
                                <Input 
                                    id="minStock" 
                                    type="number"
                                    value={formData.minStockThreshold}
                                    onChange={(e) => setFormData({...formData, minStockThreshold: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea 
                                id="description" 
                                placeholder="Additional details..." 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="h-20"
                            />
                        </div>

                        {/* Opening Stock Purchase Heads - Only show if stock > 0 */}
                        {(parseInt(formData.openingStock) || 0) > 0 && (
                            <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-1 w-8 bg-indigo-600 rounded-full" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Purchase Header (Heads)</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="invoiceDate" className="text-[10px] font-bold text-slate-500 uppercase">Purchase Date</Label>
                                        <Input 
                                            id="invoiceDate" 
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            className="h-9 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="invoiceNumber" className="text-[10px] font-bold text-slate-500 uppercase">Vendor Invoice #</Label>
                                        <Input 
                                            id="invoiceNumber" 
                                            placeholder="Bill Number"
                                            value={formData.invoiceNumber}
                                            onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                                            className="h-9 bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="internalReceiptNo" className="text-[10px] font-bold text-slate-500 uppercase">School Voucher #</Label>
                                        <div className="relative">
                                            <Input 
                                                id="internalReceiptNo" 
                                                value={formData.internalReceiptNo}
                                                onChange={(e) => setFormData({...formData, internalReceiptNo: e.target.value})}
                                                className={cn("h-9 bg-white pr-8", invSettings?.voucherNoMode === 'auto' && "bg-indigo-50 font-bold text-indigo-700")}
                                                readOnly={invSettings?.voucherNoMode === 'auto'}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                {invSettings?.voucherNoMode === 'auto' ? <Zap className="h-3 w-3 text-indigo-400" /> : <PenLine className="h-3 w-3 text-slate-400" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentTiming" className="text-[10px] font-bold text-slate-500 uppercase">Payment Timing</Label>
                                        <Select 
                                            value={formData.paymentTiming} 
                                            onValueChange={(v) => {
                                                const total = (parseInt(formData.openingStock) || 0) * (parseFloat(formData.buyPrice) || 0);
                                                setFormData({
                                                    ...formData, 
                                                    paymentTiming: v, 
                                                    paidAmount: v === 'Now' ? total.toString() : '0'
                                                });
                                            }}
                                        >
                                            <SelectTrigger id="paymentTiming" className="h-9 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Now">Paid Now</SelectItem>
                                                <SelectItem value="Later">Pay Later (Due)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {formData.paymentTiming === 'Now' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-2">
                                            <Label htmlFor="paidAmount" className="text-[10px] font-bold text-slate-500 uppercase">Paid Amount (₹)</Label>
                                            <Input 
                                                id="paidAmount" 
                                                type="number"
                                                value={formData.paidAmount}
                                                onChange={(e) => setFormData({...formData, paidAmount: e.target.value})}
                                                className="h-9 bg-white font-bold text-emerald-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="paymentMode" className="text-[10px] font-bold text-slate-500 uppercase">Payment Mode</Label>
                                            <Select 
                                                value={formData.paymentMode} 
                                                onValueChange={(v) => setFormData({...formData, paymentMode: v})}
                                            >
                                                <SelectTrigger id="paymentMode" className="h-9 bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                    <SelectItem value="Online / UPI">Online / UPI</SelectItem>
                                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 mt-2">
                            <Label htmlFor="vendor" className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vendor / Supplier (for Opening Stock)</Label>
                            <VendorSelect 
                                schoolId={schoolId}
                                value={formData.vendorName}
                                onChange={(v) => setFormData({...formData, vendorName: v})}
                                placeholder="Select or add vendor"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Add Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
