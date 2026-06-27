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
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateInventoryProduct, getInventorySettings } from '@/app/actions/inventory';
import { VendorSelect } from './vendor-select';
import { useParams } from 'next/navigation';

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    onSuccess: () => void;
}

export function EditProductModal({ isOpen, onClose, product, onSuccess }: EditProductModalProps) {
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
        vendorName: ''
    });

    const [invSettings, setInvSettings] = useState<any>(null);

    useEffect(() => {
        if (isOpen && product?.schoolId) {
            getInventorySettings(product.schoolId).then(setInvSettings);
        }
    }, [isOpen, product?.schoolId]);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                category: product.category || '',
                sku: product.sku || '',
                hsnCode: product.hsnCode || '',
                description: product.description || '',
                unit: product.unit || 'Pcs',
                buyPrice: product.buyPrice?.toString() || '0',
                sellPrice: product.sellPrice?.toString() || '0',
                taxRate: product.taxRate?.toString() || '0',
                minStockThreshold: product.minStockThreshold?.toString() || '5',
                vendorName: product.vendorName || ''
            });
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setIsLoading(true);
        try {
            const result = await updateInventoryProduct(product.id, {
                ...formData,
                buyPrice: parseFloat(formData.buyPrice) || 0,
                sellPrice: parseFloat(formData.sellPrice) || 0,
                taxRate: parseFloat(formData.taxRate) || 0,
                minStockThreshold: parseInt(formData.minStockThreshold) || 5,
            });

            if (result.success) {
                toast.success("Product updated successfully");
                onSuccess();
                onClose();
            }
        } catch (error) {
            toast.error("Failed to update product");
        } finally {
            setIsLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Product: {product.name}</DialogTitle>
                        <DialogDescription>
                            Update the details for this inventory item.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Product Name *</Label>
                                <Input 
                                    id="edit-name" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category *</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(v) => setFormData({...formData, category: v})}
                                >
                                    <SelectTrigger id="edit-category">
                                        <SelectValue />
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
                                <Label htmlFor="edit-sku">SKU / Item Code</Label>
                                <Input 
                                    id="edit-sku" 
                                    value={formData.sku}
                                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-hsnCode">HSN Code</Label>
                                <Input 
                                    id="edit-hsnCode" 
                                    value={formData.hsnCode}
                                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-vendor">Vendor / Supplier</Label>
                            {product && (
                                <VendorSelect 
                                    schoolId={product.schoolId}
                                    value={formData.vendorName}
                                    onChange={(v) => setFormData({...formData, vendorName: v})}
                                    placeholder="Select or add vendor"
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-buyPrice">Buy Price (₹)</Label>
                                <Input 
                                    id="edit-buyPrice" 
                                    type="number" 
                                    step="0.01"
                                    value={formData.buyPrice}
                                    onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-sellPrice">Sell Price (₹)</Label>
                                <Input 
                                    id="edit-sellPrice" 
                                    type="number" 
                                    step="0.01"
                                    value={formData.sellPrice}
                                    onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-taxRate">Tax Rate (%)</Label>
                                <Input 
                                    id="edit-taxRate" 
                                    type="number"
                                    value={formData.taxRate}
                                    onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-unit">Unit</Label>
                                <Select 
                                    value={formData.unit} 
                                    onValueChange={(v) => setFormData({...formData, unit: v})}
                                >
                                    <SelectTrigger id="edit-unit">
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
                                <Label htmlFor="edit-minStock">Min Stock Alert</Label>
                                <Input 
                                    id="edit-minStock" 
                                    type="number"
                                    value={formData.minStockThreshold}
                                    onChange={(e) => setFormData({...formData, minStockThreshold: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea 
                                id="edit-description" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Update Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
