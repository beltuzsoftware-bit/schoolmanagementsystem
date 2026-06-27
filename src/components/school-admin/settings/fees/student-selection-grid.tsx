'use client';

import React from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Student } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudentSelectionGridProps {
    students: Student[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onToggleAll: (ids: string[]) => void;
}

export default function StudentSelectionGrid({
    students,
    selectedIds,
    onToggle,
    onToggleAll
}: StudentSelectionGridProps) {
    const isAllSelected = students.length > 0 && selectedIds.length === students.length;

    return (
        <Card className="shadow-sm border border-slate-200 mt-6 rounded-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-bold text-slate-700">Student Selection</CardTitle>
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-bold">
                        {selectedIds.length} Selected
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox 
                        id="select-all-students"
                        checked={isAllSelected}
                        onCheckedChange={() => {
                            if (isAllSelected) onToggleAll([]);
                            else onToggleAll(students.map(s => s.id));
                        }}
                    />
                    <label htmlFor="select-all-students" className="text-xs font-bold text-slate-500 cursor-pointer">
                        Select All
                    </label>
                </div>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                        <TableHead className="w-[50px] px-4 py-3"></TableHead>
                        <TableHead className="text-xs font-bold text-slate-800 uppercase px-4 py-3">Admission No</TableHead>
                        <TableHead className="text-xs font-bold text-slate-800 uppercase px-4 py-3">Student Name</TableHead>
                        <TableHead className="text-xs font-bold text-slate-800 uppercase px-4 py-3">Class/Section</TableHead>
                        <TableHead className="text-xs font-bold text-slate-800 uppercase px-4 py-3">Gender</TableHead>
                        <TableHead className="text-xs font-bold text-slate-800 uppercase px-4 py-3">Category/RTE</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic font-medium">
                                No students found matching your search.
                            </TableCell>
                        </TableRow>
                    ) : (
                        students.map((s) => (
                            <TableRow 
                                key={s.id} 
                                className={`hover:bg-indigo-50/30 transition-colors ${selectedIds.includes(s.id) ? 'bg-indigo-50/50' : ''}`}
                            >
                                <TableCell className="px-4 py-3">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox 
                                            checked={selectedIds.includes(s.id)} 
                                            onCheckedChange={() => onToggle(s.id)}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell 
                                    className="px-4 py-3 font-medium text-slate-600 cursor-pointer"
                                    onClick={() => onToggle(s.id)}
                                >
                                    {s.admissionNumber}
                                </TableCell>
                                <TableCell 
                                    className="px-4 py-3 font-bold text-slate-800 cursor-pointer"
                                    onClick={() => onToggle(s.id)}
                                >
                                    {s.name}
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border-indigo-100">
                                        {s.className} - {s.section || 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                    <span className={`text-xs font-bold ${s.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>
                                        {s.gender || 'Unknown'}
                                    </span>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {s.category && (
                                            <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 uppercase font-bold">
                                                {s.category}
                                            </Badge>
                                        )}
                                        {s.rte === 'Yes' && (
                                            <Badge className="text-[9px] bg-emerald-500 text-white uppercase font-black">RTE</Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    );
}
