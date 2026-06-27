'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

interface SelectCriteriaFilterProps {
    classes: { name: string }[];
    sections: string[];
    onSearch: (criteria: any) => void;
}

export default function SelectCriteriaFilter({
    classes,
    sections,
    onSearch
}: SelectCriteriaFilterProps) {
    const [classVal, setClassVal] = React.useState('Select');
    const [sectionVal, setSectionVal] = React.useState('Select');
    const [categoryVal, setCategoryVal] = React.useState('Select');
    const [genderVal, setGenderVal] = React.useState('Select');
    const [rteVal, setRteVal] = React.useState('Select');

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        onSearch({
            className: classVal,
            section: sectionVal,
            category: categoryVal,
            gender: genderVal,
            rte: rteVal
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="space-y-4">
            <Card className="shadow-md border-t-2 border-t-red-600 rounded-xl overflow-hidden bg-white">
                <CardContent className="p-5">
                    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                        <div className="flex flex-col gap-6">
                            {/* Select Parameters Section */}
                            <div className="w-full">
                                <h4 className="text-[11px] font-black uppercase text-slate-800 mb-4 tracking-wider">Select Criteria</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end text-left">
                                    <div className="space-y-1.5 w-full">
                                        <Label className="text-[10px] font-bold text-red-800 ml-1">Class</Label>
                                        <Select value={classVal} onValueChange={setClassVal}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:ring-red-500 transition-all hover:bg-white text-left">
                                                <SelectValue placeholder="Select Class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select Class</SelectItem>
                                                {classes.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 w-full">
                                        <Label className="text-[10px] font-bold text-red-800 ml-1">Section</Label>
                                        <Select value={sectionVal} onValueChange={setSectionVal}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:ring-red-500 transition-all hover:bg-white text-left">
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select Section</SelectItem>
                                                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 w-full">
                                        <Label className="text-[10px] font-bold text-red-800 ml-1">Category</Label>
                                        <Select value={categoryVal} onValueChange={setCategoryVal}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:ring-red-500 transition-all hover:bg-white text-left">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select Category</SelectItem>
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="OBC">OBC</SelectItem>
                                                <SelectItem value="SC">SC</SelectItem>
                                                <SelectItem value="ST">ST</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 w-full">
                                        <Label className="text-[10px] font-bold text-red-800 ml-1">Gender</Label>
                                        <Select value={genderVal} onValueChange={setGenderVal}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:ring-red-500 transition-all hover:bg-white text-left">
                                                <SelectValue placeholder="Select Gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select Gender</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 w-full">
                                        <Label className="text-[10px] font-bold text-red-800 ml-1">RTE</Label>
                                        <Select value={rteVal} onValueChange={setRteVal}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:ring-red-500 transition-all hover:bg-white text-left">
                                                <SelectValue placeholder="Select RTE" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select RTE</SelectItem>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-end w-full">
                                        <Button type="submit" className="h-10 w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 flex gap-2 font-bold shadow-lg shadow-red-100 uppercase text-[10px] tracking-widest transition-all active:scale-95">
                                            <Search className="w-4 h-4" />
                                            Search
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
