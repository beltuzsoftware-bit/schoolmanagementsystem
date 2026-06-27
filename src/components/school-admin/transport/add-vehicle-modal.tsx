'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Bus, Save } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TransportVehicle } from '@/types';

interface AddVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (vehicle: TransportVehicle) => void;
    editingVehicle: TransportVehicle | null;
}

export function AddVehicleModal({
    isOpen,
    onClose,
    onSave,
    editingVehicle
}: AddVehicleModalProps) {
    const [formData, setFormData] = useState<Partial<TransportVehicle>>({
        vehicleNumber: '',
        model: '',
        yearMade: '',
        registrationNumber: '',
        chassisNumber: '',
        capacity: 0,
        driverName: '',
        driverLicense: '',
        driverPhone: '',
        notes: '',
        photo: ''
    });

    useEffect(() => {
        if (editingVehicle) {
            setFormData(editingVehicle);
        } else {
            setFormData({
                vehicleNumber: '',
                model: '',
                yearMade: '',
                registrationNumber: '',
                chassisNumber: '',
                capacity: 0,
                driverName: '',
                driverLicense: '',
                driverPhone: '',
                notes: '',
                photo: ''
            });
        }
    }, [editingVehicle, isOpen]);

    const handleChange = (field: keyof TransportVehicle, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: editingVehicle?.id || `vh_${Date.now()}`,
            vehicleType: 'Bus', // Default or handle if needed
        } as TransportVehicle);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('photo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleChange('photo', '');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                showCloseButton={false}
                className="max-w-4xl p-0 overflow-hidden rounded-xl border-none shadow-2xl flex flex-col max-h-[95vh]"
            >
                <DialogHeader className="bg-white px-8 py-5 border-b flex flex-row items-center justify-between shrink-0">
                    <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                        {editingVehicle ? 'Edit Vehicle Registry' : 'Add New Vehicle'}
                    </DialogTitle>
                    <button 
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600 hover:rotate-90 duration-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="bg-white p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            {/* Row 1 */}
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Vehicle Number <span className="text-rose-500">*</span>
                                </Label>
                                <Input 
                                    required
                                    value={formData.vehicleNumber || ''}
                                    onChange={(e) => handleChange('vehicleNumber', e.target.value)}
                                    placeholder="e.g. KA-01-MG-1234"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Model</Label>
                                <Input 
                                    value={formData.model || ''}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    placeholder="e.g. Tata Starbus"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Year Made</Label>
                                <Input 
                                    value={formData.yearMade || ''}
                                    onChange={(e) => handleChange('yearMade', e.target.value)}
                                    placeholder="e.g. 2022"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registration Number</Label>
                                <Input 
                                    value={formData.registrationNumber || ''}
                                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                                    placeholder="REG-8827-X"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chasis Number</Label>
                                <Input 
                                    value={formData.chassisNumber || ''}
                                    onChange={(e) => handleChange('chassisNumber', e.target.value)}
                                    placeholder="CH-9928371-Z"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Seating Capacity</Label>
                                <Input 
                                    type="number"
                                    value={formData.capacity || 0}
                                    onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
                                    placeholder="40"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>

                            {/* Row 3 */}
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Name</Label>
                                <Input 
                                    value={formData.driverName || ''}
                                    onChange={(e) => handleChange('driverName', e.target.value)}
                                    placeholder="John Doe"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Licence</Label>
                                <Input 
                                    value={formData.driverLicense || ''}
                                    onChange={(e) => handleChange('driverLicense', e.target.value)}
                                    placeholder="LIC-9928-ABC"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Contact</Label>
                                <Input 
                                    value={formData.driverPhone || ''}
                                    onChange={(e) => handleChange('driverPhone', e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="h-11 border-slate-200 rounded-lg bg-slate-50/50 focus-visible:ring-slate-900 transition-all"
                                />
                            </div>
                        </div>

                        {/* Vehicle Photo */}
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Photo</Label>
                            <div 
                                onClick={() => document.getElementById('vehicle-photo-input')?.click()}
                                className="relative border-2 border-dashed border-slate-200 rounded-xl min-h-[180px] flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group overflow-hidden"
                            >
                                <input 
                                    type="file"
                                    id="vehicle-photo-input"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                
                                {formData.photo ? (
                                    <div className="absolute inset-0 w-full h-full">
                                        <img 
                                            src={formData.photo} 
                                            alt="Vehicle preview" 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={removePhoto}
                                                className="rounded-full px-4 h-9 font-bold"
                                            >
                                                <X className="h-4 w-4 mr-1.5" /> Remove Photo
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Upload className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-600">Drag and drop a file here or click</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">JPG, PNG or WEBP (Max 5MB)</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Note */}
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Special Notes / Remarks</Label>
                            <Textarea 
                                value={formData.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add any additional details about the vehicle state or driver..."
                                className="min-h-[120px] border-slate-200 rounded-xl bg-slate-50/50 focus-visible:ring-slate-900 transition-all resize-none p-4"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white">
                            <Button 
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-11 px-8 rounded-lg font-bold text-slate-400 hover:text-slate-600"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit"
                                className="bg-slate-900 hover:bg-black text-white px-10 h-11 rounded-lg font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" /> Save Vehicle Details
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
