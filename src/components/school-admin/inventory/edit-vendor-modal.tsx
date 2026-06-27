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
import { toast } from "sonner";
import { updateVendor } from '@/app/actions/inventory';

interface EditVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    vendor: any;
    onSuccess: () => void;
}

export function EditVendorModal({ isOpen, onClose, schoolId, vendor, onSuccess }: EditVendorModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNo: '',
        notes: ''
    });

    useEffect(() => {
        if (vendor) {
            setFormData({
                name: vendor.name || '',
                contactPerson: vendor.contactPerson || '',
                phone: vendor.phone || '',
                email: vendor.email || '',
                address: vendor.address || '',
                gstNo: vendor.gstNo || '',
                notes: vendor.notes || ''
            });
        }
    }, [vendor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Supplier name is required");
            return;
        }

        setIsLoading(true);
        try {
            const result = await updateVendor(schoolId, vendor.id, formData);

            if (result.success) {
                toast.success("Supplier updated successfully");
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || "Failed to update supplier");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                        <DialogDescription>
                            Update contact details for {vendor?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor-name">Supplier Name *</Label>
                                <Input 
                                    id="edit-vendor-name" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-contact-person">Contact Person</Label>
                                <Input 
                                    id="edit-contact-person" 
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor-phone">Phone Number</Label>
                                <Input 
                                    id="edit-vendor-phone" 
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor-email">Email Address</Label>
                                <Input 
                                    id="edit-vendor-email" 
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-vendor-gst">GST Number</Label>
                            <Input 
                                id="edit-vendor-gst" 
                                value={formData.gstNo}
                                onChange={(e) => setFormData({...formData, gstNo: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-vendor-address">Address</Label>
                            <Textarea 
                                id="edit-vendor-address" 
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Update Supplier"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
