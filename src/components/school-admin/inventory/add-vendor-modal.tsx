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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addVendor } from '@/app/actions/inventory';

interface AddVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    onSuccess: (vendor: any) => void;
    initialName?: string;
}

export function AddVendorModal({ isOpen, onClose, schoolId, onSuccess, initialName = '' }: AddVendorModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialName,
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNo: '',
        notes: ''
    });

    React.useEffect(() => {
        if (initialName) {
            setFormData(prev => ({ ...prev, name: initialName }));
        }
    }, [initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Vendor name is required");
            return;
        }

        setIsLoading(true);
        try {
            const result = await addVendor({
                ...formData,
                schoolId
            });

            if (result.success) {
                toast.success("Vendor added successfully");
                onSuccess(result.vendor);
                onClose();
            }
        } catch (error) {
            toast.error("Failed to add vendor");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                        <DialogDescription>
                            Enter contact details for your supplier.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor-name">Vendor Name *</Label>
                                <Input 
                                    id="vendor-name" 
                                    placeholder="e.g. Acme Stationery" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-person">Contact Person</Label>
                                <Input 
                                    id="contact-person" 
                                    placeholder="e.g. John Doe" 
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor-phone">Phone Number</Label>
                                <Input 
                                    id="vendor-phone" 
                                    placeholder="e.g. +91 9876543210" 
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vendor-email">Email Address</Label>
                                <Input 
                                    id="vendor-email" 
                                    type="email"
                                    placeholder="e.g. sales@acme.com" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vendor-gst">GST Number</Label>
                            <Input 
                                id="vendor-gst" 
                                placeholder="15-digit GSTIN" 
                                value={formData.gstNo}
                                onChange={(e) => setFormData({...formData, gstNo: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vendor-address">Address</Label>
                            <Textarea 
                                id="vendor-address" 
                                placeholder="Full business address..." 
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
                            {isLoading ? "Saving..." : "Add Vendor"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
