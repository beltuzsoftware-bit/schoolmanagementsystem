'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Plus, Search, Check } from 'lucide-react';
import { getVendors } from '@/app/actions/inventory';
import { AddVendorModal } from './add-vendor-modal';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface VendorSelectProps {
    schoolId: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function VendorSelect({ schoolId, value, onChange, placeholder = "Search or add vendor..." }: VendorSelectProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);

    const loadVendors = async () => {
        if (schoolId) {
            const data = await getVendors(schoolId);
            setVendors(data);
        }
    };

    useEffect(() => {
        loadVendors();
    }, [schoolId]);

    useEffect(() => {
        setSearchQuery(value || '');
    }, [value]);

    const filteredVendors = vendors.filter(v => 
        v.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exactMatch = vendors.find(v => v.name?.toLowerCase() === searchQuery.toLowerCase());

    const handleVendorAdded = (vendor: any) => {
        setVendors(prev => [...prev, vendor]);
        onChange(vendor.name);
        setSearchQuery(vendor.name);
        setIsAddModalOpen(false);
        setIsOpen(false);
    };

    const handleSelect = (name: string) => {
        onChange(name);
        setSearchQuery(name);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div className="relative w-full cursor-text">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder={placeholder}
                            value={searchQuery}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setSearchQuery(newVal);
                                onChange(newVal); // Propagate value as they type
                                if (!isOpen) setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            className="pl-9 pr-4 h-10 w-full bg-white border-slate-200 focus:ring-indigo-500"
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto shadow-xl border-slate-200" 
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col py-1">
                        {filteredVendors.length > 0 ? (
                            filteredVendors.map((vendor) => (
                                <button
                                    key={vendor.id}
                                    type="button"
                                    className={cn(
                                        "flex flex-col items-start px-4 py-2 text-sm hover:bg-slate-50 transition-colors w-full",
                                        value === vendor.name && "bg-indigo-50 text-indigo-700"
                                    )}
                                    onClick={() => handleSelect(vendor.name)}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{vendor.name}</span>
                                        {value === vendor.name && <Check className="h-4 w-4" />}
                                    </div>
                                    {vendor.phone && <span className="text-[10px] text-slate-400">{vendor.phone}</span>}
                                </button>
                            ))
                        ) : searchQuery && (
                            <div className="px-4 py-3 text-sm text-slate-500 italic">
                                No matching vendors found
                            </div>
                        )}

                        {searchQuery && !exactMatch && (
                            <button
                                type="button"
                                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-slate-100 w-full"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Add "{searchQuery}" with Contact Details
                            </button>
                        )}
                        
                        {!searchQuery && vendors.length === 0 && (
                            <button
                                type="button"
                                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors w-full"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Create First Vendor
                            </button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            <AddVendorModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                schoolId={schoolId}
                onSuccess={handleVendorAdded}
                initialName={searchQuery}
            />
        </div>
    );
}
