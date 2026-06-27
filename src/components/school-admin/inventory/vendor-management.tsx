'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { getVendors, deleteVendor } from '@/app/actions/inventory';
import { 
    Users, 
    Trash2, 
    Plus, 
    Building2,
    Phone,
    Mail,
    MapPin,
    Search,
    Edit,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AddVendorModal } from './add-vendor-modal';
import { EditVendorModal } from './edit-vendor-modal';
import { cn } from "@/lib/utils";

interface VendorManagementProps {
    schoolId: string;
    standalone?: boolean;
}

type SortKey = 'name' | 'contactPerson' | 'phone' | 'email' | 'address' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function VendorManagement({ schoolId, standalone = false }: VendorManagementProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Default: Sort by newest first
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const loadVendors = async () => {
        setIsLoading(true);
        try {
            const data = await getVendors(schoolId);
            setVendors(data);
        } catch (error) {
            toast.error("Failed to load vendors");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) {
            loadVendors();
        }
    }, [schoolId]);

    const handleDeleteVendor = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this supplier?")) {
            try {
                const result = await deleteVendor(schoolId, id);
                if (result.success) {
                    toast.success("Supplier deleted successfully");
                    loadVendors();
                } else {
                    toast.error((result as any).error || "Failed to delete supplier");
                }
            } catch (error) {
                toast.error("An error occurred");
            }
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const getSortedVendors = () => {
        let filtered = vendors.filter(v => 
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.phone?.includes(searchTerm)
        );

        return filtered.sort((a, b) => {
            let valA = a[sortKey] || '';
            let valB = b[sortKey] || '';

            if (sortKey === 'createdAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedVendors = getSortedVendors();

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />;
    };

    return (
        <div className={cn("flex flex-col space-y-2", standalone ? "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" : "")}>
            {/* Minimal Header/Actions */}
            <div className="flex items-center justify-between p-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 px-2">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        Supplier Database
                    </h3>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input 
                            placeholder="Filter suppliers..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-7 pl-7 text-[10px] bg-white border-slate-200 rounded-md focus-visible:ring-1"
                        />
                    </div>
                </div>
                <Button 
                    size="sm" 
                    onClick={() => setIsAddVendorOpen(true)} 
                    className="bg-indigo-600 hover:bg-indigo-700 h-7 px-3 rounded-md font-bold text-[10px] uppercase tracking-wider shadow-sm"
                >
                    <Plus className="h-3 w-3 mr-1" /> Add Supplier
                </Button>
            </div>

            {/* Excel-like Table */}
            <div className="overflow-x-auto">
                <Table className="border-collapse">
                    <TableHeader className="bg-slate-100/50">
                        <TableRow className="h-8 hover:bg-transparent border-slate-200">
                            <TableHead 
                                className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-2">
                                    Supplier Name
                                    <SortIcon col="name" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('contactPerson')}
                            >
                                <div className="flex items-center gap-2">
                                    Contact Person
                                    <SortIcon col="contactPerson" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('phone')}
                            >
                                <div className="flex items-center gap-2">
                                    Phone Number
                                    <SortIcon col="phone" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('email')}
                            >
                                <div className="flex items-center gap-2">
                                    Email Address
                                    <SortIcon col="email" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('address')}
                            >
                                <div className="flex items-center gap-2">
                                    Office Address
                                    <SortIcon col="address" />
                                </div>
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-3 h-8 w-[60px] text-center">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-20 text-center border border-slate-200">
                                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                                        Synchronizing Data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sortedVendors.length > 0 ? sortedVendors.map((vendor) => (
                            <TableRow key={vendor.id} className="h-8 hover:bg-indigo-50/30 transition-colors border-slate-200 group">
                                <TableCell className="text-[11px] font-bold text-slate-900 border border-slate-200 px-3 py-1">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-3 w-3 text-slate-400" />
                                        {vendor.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-medium text-slate-600 border border-slate-200 px-3 py-1">
                                    {vendor.contactPerson || '-'}
                                </TableCell>
                                <TableCell className="text-[11px] font-mono text-slate-600 border border-slate-200 px-3 py-1">
                                    {vendor.phone || '-'}
                                </TableCell>
                                <TableCell className="text-[11px] font-medium text-slate-600 border border-slate-200 px-3 py-1">
                                    {vendor.email || '-'}
                                </TableCell>
                                <TableCell className="text-[11px] text-slate-500 border border-slate-200 px-3 py-1 max-w-[200px] truncate">
                                    {vendor.address || '-'}
                                </TableCell>
                                <TableCell className="border border-slate-200 p-0 text-center">
                                    <div className="flex items-center justify-center">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                                            onClick={() => {
                                                setSelectedVendor(vendor);
                                                setIsEditVendorOpen(true);
                                            }}
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-slate-300 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteVendor(vendor.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center border border-slate-200 bg-slate-50/30">
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <Users className="h-6 w-6 text-slate-200 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No matching records found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddVendorModal 
                isOpen={isAddVendorOpen}
                onClose={() => setIsAddVendorOpen(false)}
                schoolId={schoolId}
                onSuccess={() => {
                    loadVendors();
                    setIsAddVendorOpen(false);
                }}
            />
            <EditVendorModal 
                isOpen={isEditVendorOpen}
                onClose={() => setIsEditVendorOpen(false)}
                schoolId={schoolId}
                vendor={selectedVendor}
                onSuccess={() => {
                    loadVendors();
                    setIsEditVendorOpen(false);
                }}
            />
        </div>
    );
}
