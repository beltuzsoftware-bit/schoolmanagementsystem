'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Copy, 
    FileSpreadsheet, 
    FileText, 
    FileDown, 
    Printer, 
    Columns, 
    Tag, 
    Pencil, 
    X,
    Plus,
    ChevronLeft,
    ChevronRight,
    Users
} from 'lucide-react';
import { FeeDiscount } from '@/types/fees';
import { toast } from 'sonner';
import ConfirmationModal from '../../confirmation-modal';

interface FeesDiscountManagerProps {
    items: FeeDiscount[];
    onUpdate: (items: FeeDiscount[]) => void;
    onAssign: (item: FeeDiscount) => void;
    onViewStudents?: (item: FeeDiscount) => void;
    onEdit?: (item: FeeDiscount) => void;
}

export default function FeesDiscountManager({
    items,
    onUpdate,
    onAssign,
    onViewStudents,
    onEdit
}: FeesDiscountManagerProps) {
    const [search, setSearch] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    );

    const confirmDelete = () => {
        if (!itemToDeleteId) return;
        onUpdate(items.filter(i => i.id !== itemToDeleteId));
        setDeleteModalOpen(false);
        setItemToDeleteId(null);
        toast.success('Discount deleted successfully.');
    };

    const handleActionIcon = (action: string) => {
        toast.info(`${action} action triggered. Feature coming soon!`);
    };

    return (
        <Card className="shadow-none border border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-3.5 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wider">Fees Records List</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {/* Search and Action Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="relative w-full md:w-64">
                        <Input 
                            placeholder="Search records..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 px-4 border-slate-200 focus:ring-red-500 focus:border-red-500 rounded-xl bg-slate-50/50"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 border-slate-200 rounded-lg hover:bg-slate-50" onClick={() => handleActionIcon('Copy')}>
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 border-slate-200 rounded-lg hover:bg-slate-50" onClick={() => handleActionIcon('Excel')}>
                            <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 border-slate-200 rounded-lg hover:bg-slate-50" onClick={() => handleActionIcon('Print')}>
                            <Printer className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                <TableHead className="font-bold text-slate-800 py-4 px-6 h-12">Name</TableHead>
                                <TableHead className="font-bold text-slate-800 py-4 h-12">Code</TableHead>
                                <TableHead className="font-bold text-slate-800 py-4 text-right pr-12 h-12">Amount</TableHead>
                                <TableHead className="font-bold text-slate-800 py-4 text-right px-6 h-12">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-slate-400 font-medium italic">No records found matching search.</TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-red-50/30 transition-colors group">
                                        <TableCell className="font-bold text-slate-700 py-4 px-6">{item.name}</TableCell>
                                        <TableCell className="text-slate-500 font-bold uppercase text-[11px] tracking-wider py-4">{item.code}</TableCell>
                                        <TableCell className="text-right pr-12 font-black text-slate-900 py-4">
                                            {(item.value ?? 0).toFixed(2)} {item.type === 'PERCENTAGE' ? '%' : ''}
                                        </TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Assign Students"
                                                    onClick={() => onAssign(item)}
                                                >
                                                    <Tag className="w-4.5 h-4.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="View Assigned Students"
                                                    onClick={() => onViewStudents?.(item)}
                                                >
                                                    <Users className="w-4.5 h-4.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                    title="Edit Record"
                                                    onClick={() => onEdit?.(item)}
                                                >
                                                    <Pencil className="w-4.5 h-4.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete Record"
                                                    onClick={() => {
                                                        setItemToDeleteId(item.id);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <X className="w-4.5 h-4.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer Tracker & Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <div className="text-xs font-bold text-slate-400">
                        Records: 1 to {filteredItems.length} of {filteredItems.length}
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-30" disabled>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold shadow-md">1</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-30" disabled>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Discount"
                message="Are you sure you want to delete this discount record? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                confirmButtonClasses="bg-rose-600 hover:bg-rose-700"
            />
        </Card>
    );
}
