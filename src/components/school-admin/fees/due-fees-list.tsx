'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    ArrowRight, 
    FileSpreadsheet, 
    FileText, 
    Printer, 
    Download, 
    ChevronUp, 
    ChevronDown, 
    BellRing,
    Loader2
} from 'lucide-react';
import { Student, School } from '@/types';
import {
    FeeGroup,
    Transaction,
    INITIAL_FEES_MASTER_ITEMS
} from '@/types/fees';
import { calculateTotalOutstandingDues, SESSION_MONTHS, getOrderedSessionMonths, calculateMonthFinancials, getStudentType } from '@/lib/fees-helper';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { getFeeGroups, getFeeTransactions, getSchools, getStudents } from '@/app/actions';
import Link from 'next/link';
import { toast } from 'sonner';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import { cn } from '@/lib/utils';

interface DueFeesListProps {
    students: Student[];
}

export default function DueFeesList({ students }: DueFeesListProps) {
    const [localStudents, setLocalStudents] = useState<Student[]>(students);
    const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Filters State
    const [classFilter, setClassFilter] = useState<string>('Select');
    const [sectionFilter, setSectionFilter] = useState<string>('Select');
    const [keyword, setKeyword] = useState<string>('');
    const [tableKeyword, setTableKeyword] = useState<string>('');
    const [feeTypeFilter, setFeeTypeFilter] = useState<string>('Select');
    const [masterFeeTypes, setMasterFeeTypes] = useState<string[]>([]);
    const [monthFilter, setMonthFilter] = useState<string>('Select');
    const [feeGroupFilter, setFeeGroupFilter] = useState<string>('Select');
    
    // Ordered Months based on session start
    const startMonth = useMemo(() => (schoolDetails as any)?.sessionStartMonth ?? 4, [schoolDetails]);
    const sessionMonths = useMemo(() => getOrderedSessionMonths(startMonth), [startMonth]);
    
    // Results State
    const [appliedFilters, setAppliedFilters] = useState<{
        hasSearched: boolean;
        classString: string;
        sectionString: string;
        keywordString: string;
        feeType: string;
        feeGroup: string;
        month: string;
    }>({ hasSearched: false, classString: 'Select', sectionString: 'Select', keywordString: '', feeType: 'Select', feeGroup: 'Select', month: 'Select' });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'totalDue', direction: 'desc' });

    // Dynamic class and section lists
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(false);

    // Load Initial Data
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const storedUser = localStorage.getItem('kummi_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.schoolId) {
                        const sid = user.schoolId;
                        const [groups, txns, schools, fetchedStudents] = await Promise.all([
                            getFeeGroups(sid),
                            getFeeTransactions(sid),
                            getSchools(),
                            getStudents(sid)
                        ]);
                        setFeeGroups(groups);
                        setTransactions(txns);
                        
                        const school = schools.find((s: School) => s.id === sid);
                        if (school) setSchoolDetails(school);

                        if (fetchedStudents) {
                            setLocalStudents(fetchedStudents.filter((s: Student) => (s.status || 'Active') === 'Active'));
                        }
                    }
                }
            } catch (error) {
                console.error("Initialization Failed:", error);
                toast.error("Failed to load fee configuration");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Effect to update classes/sections based on school details
    useEffect(() => {
        if (schoolDetails) {
            const ms = schoolDetails as any;
            let classes: string[] = [];
            if (ms.useCustomClasses && ms.classes) {
                classes = ms.classes.map((c: any) => c.name);
            } else {
                classes = INITIAL_CLASS_SETUPS.map(c => c.name);
            }
            setAvailableClasses(classes);

            // Update Master Fee Types
            if (ms.feeTypes && ms.feeTypes.length > 0) {
                setMasterFeeTypes(ms.feeTypes);
            } else {
                setMasterFeeTypes(INITIAL_FEES_MASTER_ITEMS);
            }
        } else {
            setAvailableClasses(INITIAL_CLASS_SETUPS.map(c => c.name));
            setMasterFeeTypes(INITIAL_FEES_MASTER_ITEMS);
        }
    }, [schoolDetails]);

    // Effect to update sections based on class filter
    useEffect(() => {
        if (classFilter && classFilter !== 'Select') {
            let hasSections = false;
            let classSections: string[] = [];
            
            const ms = schoolDetails as any;
            if (ms?.useCustomClasses && ms.classes) {
                const selectedClass = ms.classes.find((c: any) => c.name === classFilter);
                if (selectedClass) {
                    hasSections = !!(selectedClass.sections && selectedClass.sections.length > 0);
                    classSections = selectedClass.sections || [];
                }
            } else {
                const selectedClass = INITIAL_CLASS_SETUPS.find(c => c.name === classFilter);
                if (selectedClass) {
                    hasSections = !!(selectedClass.sections && selectedClass.sections.length > 0);
                    classSections = selectedClass.sections || [];
                }
            }
            
            setSelectedClassHasSections(hasSections);
            if (hasSections) {
                setAvailableSections(classSections);
            } else {
                const fullSections = ms?.useCustomSections && ms.sections ? ms.sections : INITIAL_SECTIONS;
                setAvailableSections(fullSections);
            }
             
            if (!hasSections || (sectionFilter !== 'Select' && !classSections.includes(sectionFilter))) {
                setSectionFilter('Select');
            }
        } else {
            setSelectedClassHasSections(false);
            const ms = schoolDetails as any;
            setAvailableSections(ms?.useCustomSections && ms.sections ? ms.sections : INITIAL_SECTIONS);
            setSectionFilter('Select');
        }
    }, [classFilter, schoolDetails]);

    const handleSearch = () => {
        if (classFilter === 'Select' && !keyword.trim()) {
            toast.error("Please select a Class or enter a Keyword to search");
            return;
        }
        if (classFilter !== 'Select' && selectedClassHasSections && sectionFilter === 'Select') {
            toast.error("Please select a Section, or choose 'All Sections'");
            return;
        }
        setIsSearching(true);
        // Small delay to show loader and keep UI responsive
        setTimeout(() => {
            setAppliedFilters({ 
                hasSearched: true, 
                classString: classFilter, 
                sectionString: sectionFilter, 
                keywordString: keyword.trim(),
                feeType: feeTypeFilter,
                feeGroup: feeGroupFilter,
                month: monthFilter
            });
            setIsSearching(false);
        }, 300);
    };

    // Calculate Dues for Filtered Students
    const studentDues = useMemo(() => {
        if (!appliedFilters.hasSearched) return [];

        let baseStudents = localStudents;

        // Apply Primary Filters
        if (appliedFilters.classString !== 'Select' && appliedFilters.classString !== 'all') {
            const filterClass = appliedFilters.classString.toLowerCase().trim();
            baseStudents = baseStudents.filter(s => 
                s.className?.toLowerCase().trim() === filterClass
            );
        }
        if (appliedFilters.sectionString !== 'Select' && appliedFilters.sectionString !== 'all' && selectedClassHasSections) {
            const filterSection = appliedFilters.sectionString.toLowerCase().trim();
            baseStudents = baseStudents.filter(s => 
                s.section?.toLowerCase().trim() === filterSection
            );
        }
        if (appliedFilters.keywordString) {
            const lower = appliedFilters.keywordString.toLowerCase().trim();
            baseStudents = baseStudents.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lower)) ||
                (s.phone && (s.phone || '').includes(lower))
            );
        }

        const currentSess = schoolDetails?.currentSession;

        // Calculate Dues
        const now = new Date();
        const curMonthIdx = now.getMonth();

        return baseStudents.map(student => {
            // Robust class matching for fee groups
            const studClass = student.className?.toLowerCase().trim() || '___';
            const applicableGroups = feeGroups.filter(g =>
                g.assignedClasses.some(c => {
                    const groupClass = c.toLowerCase().trim();
                    return studClass.includes(groupClass) || groupClass.includes(studClass);
                })
            );

            // Determine if student is New or Old for this session
            const studentType: 'new' | 'old' = getStudentType(student, currentSess);

            // Filter calculations by month/group if specific filters are active
            let filteredGroups = applicableGroups;
            if (appliedFilters.feeGroup && appliedFilters.feeGroup !== 'all' && appliedFilters.feeGroup !== 'Select') {
                filteredGroups = filteredGroups.filter(g => g.id === appliedFilters.feeGroup);
            }

            if (appliedFilters.feeType && appliedFilters.feeType !== 'all' && appliedFilters.feeType !== 'Select') {
                filteredGroups = filteredGroups
                    .map(g => ({
                        ...g,
                        fees: g.fees.filter(f => f.feeName === appliedFilters.feeType)
                    }))
                    .filter(g => g.fees.length > 0);
            }

            // 1. Session Total (Existing)
            const sessionTotal = calculateTotalOutstandingDues(student.id, filteredGroups, transactions, studentType, startMonth);

            // 2. Breakdown for the UI
            let pastDues = 0;
            let currentMonthDue = 0;
            let nextMonthDue = 0;

            const sessionMonthsOrdered = getOrderedSessionMonths(startMonth);
            const curMonthOrderIdx = sessionMonthsOrdered.findIndex(m => m.index === curMonthIdx);
            
            // Calculate specific month for the "Start Month" requested by user
            const firstMonthFin = calculateMonthFinancials(student.id, sessionMonthsOrdered[0].index, filteredGroups, transactions, studentType, startMonth);
            const firstMonthDue = firstMonthFin.remainingDue;

            sessionMonthsOrdered.forEach((m, idx) => {
                const fin = calculateMonthFinancials(student.id, m.index, filteredGroups, transactions, studentType, startMonth);
                
                if (idx < curMonthOrderIdx) {
                    pastDues += fin.remainingDue;
                } else if (idx === curMonthOrderIdx) {
                    currentMonthDue = fin.remainingDue;
                } else if (idx === curMonthOrderIdx + 1) {
                    nextMonthDue = fin.remainingDue;
                }
            });

            // Filter logic based on the Search Filter "Month"
            let displayDue = sessionTotal;
            if (appliedFilters.month && appliedFilters.month !== 'all' && appliedFilters.month !== 'Select') {
                const targetIdx = parseInt(appliedFilters.month);
                const financials = calculateMonthFinancials(student.id, targetIdx, filteredGroups, transactions, studentType, startMonth);
                displayDue = financials.remainingDue;
            }

            return {
                ...student,
                totalDue: displayDue, // Compatibility with existing sort/filter
                firstMonthDue,
                pastDues,
                currentMonthDue,
                nextMonthDue,
                sessionTotal
            };
        }).filter(s => s.totalDue > 0 || (s.sessionTotal || 0) > 0);
    }, [localStudents, feeGroups, transactions, appliedFilters, selectedClassHasSections, schoolDetails, startMonth]);

    // Final Filtered & Sorted List
    const displayList = useMemo(() => {
        let list = [...studentDues];

        if (tableKeyword) {
            const lower = tableKeyword.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lower)) ||
                (s.rollNumber && s.rollNumber.toLowerCase().includes(lower))
            );
        }

        if (sortConfig) {
            list.sort((a, b) => {
                const aVal = (a[sortConfig.key as keyof typeof a] || '').toString();
                const bVal = (b[sortConfig.key as keyof typeof b] || '').toString();
                
                if (sortConfig.key === 'totalDue') {
                    return sortConfig.direction === 'asc' 
                        ? (a.totalDue - b.totalDue) 
                        : (b.totalDue - a.totalDue);
                }

                const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }

        return list;
    }, [studentDues, tableKeyword, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) {
            return <svg className="ml-1.5 inline-block w-4 h-4 text-slate-400 opacity-50 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 16-3 3-3-3"/><path d="m9 8 3-3 3 3"/></svg>;
        }
        if (sortConfig.direction === 'asc') {
            return <ChevronUp className="inline-block w-4 h-4 ml-1.5 text-red-600" strokeWidth={3} />;
        }
        return <ChevronDown className="inline-block w-4 h-4 ml-1.5 text-red-600" strokeWidth={3} />;
    };

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (displayList.length === 0) {
            toast.error("No data to export");
            return;
        }

        if (format === 'pdf') {
            window.print();
            return;
        }

        const headers = ["Class", "Section", "Roll No", "ID", "Student Name", "Father Name", "Phone", `${sessionMonths[0].name} Due`, "Past Dues", "Current Month", "Next Month", "Session Outstanding"];
        const csvRows = [headers.join(",")];

        displayList.forEach(s => {
            const row = [
                `"${s.className || ''}"`,
                `"${s.section || ''}"`,
                `"${s.rollNumber || ''}"`,
                `"${s.admissionNumber || ''}"`,
                `"${s.name || ''}"`,
                `"${s.fatherName || ''}"`,
                `"${s.phone || ''}"`,
                `"${s.firstMonthDue}"`,
                `"${s.pastDues}"`,
                `"${s.currentMonthDue}"`,
                `"${s.nextMonthDue}"`,
                `"${s.sessionTotal}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `due_fees_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${displayList.length} records to ${format.toUpperCase()}`);
    };

    const handleReminder = (student: any) => {
        toast.info(`Sending payment reminder to ${student.name}'s parent (${student.phone || 'N/A'})...`);
        // Implementation for SMS/WhatsApp would go here
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Calculating dues...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-full">
            {/* SEARCH CRITERIA CARD */}
            <Card className="shadow-sm border-t-2 border-t-red-600">
                <CardContent className="p-5 pt-2">
                    <h2 className="text-lg text-slate-800 font-bold mb-3 mt-0">Select Criteria</h2>
                    <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                        {/* Filters Panel (75%) */}
                        <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 w-full xl:w-3/4" onKeyDown={(e) => { if (e.key === 'Enter' && !isSearching) handleSearch(); }}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
                                <div className="min-w-0">
                                    <Label className="text-[10px] mb-1 block text-red-900 font-extrabold">Class</Label>
                                    <Select value={classFilter} onValueChange={setClassFilter}>
                                        <SelectTrigger className="w-full !h-9 bg-white border-red-200 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {availableClasses.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Classes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-0">
                                    <Label className="text-[10px] mb-1 block text-red-900 font-extrabold">Section</Label>
                                        <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                            <SelectTrigger className="w-full !h-9 bg-white border-red-200 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select</SelectItem>
                                                {availableSections.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                                <SelectItem value="all">All Sections</SelectItem>
                                            </SelectContent>
                                        </Select>
                                </div>
                                <div className="min-w-0">
                                    <Label className="text-[10px] mb-1 block text-red-900 font-extrabold">Fees Group</Label>
                                    <Select value={feeGroupFilter} onValueChange={setFeeGroupFilter}>
                                        <SelectTrigger className="w-full !h-9 bg-white border-red-200 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {feeGroups.map(g => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Groups</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-0">
                                    <Label className="text-[10px] mb-1 block text-red-900 font-extrabold">Fee Type</Label>
                                    <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
                                        <SelectTrigger className="w-full !h-9 bg-white border-red-200 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {masterFeeTypes.sort().map(name => (
                                                <SelectItem key={name} value={name}>{name}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Fee Types</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-0">
                                    <Label className="text-[10px] mb-1 block text-red-900 font-extrabold">Month</Label>
                                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                                        <SelectTrigger className="w-full !h-9 bg-white border-red-200 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Select">Select</SelectItem>
                                            {sessionMonths.map(m => (
                                                <SelectItem key={m.index} value={m.index.toString()}>{m.full}</SelectItem>
                                            ))}
                                            <SelectItem value="all">All Months</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleSearch} disabled={isSearching} className="h-9 bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg text-xs font-bold shadow-[0_4px_14px_0_rgba(220,38,38,0.25)] shrink-0 transition-all">
                                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Keyword Search (25%) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full xl:w-1/4">
                            <Label className="text-[10px] mb-1 block text-slate-700 font-extrabold">Search By Keyword</Label>
                            <div className="flex gap-2 items-end">
                                <Input 
                                    placeholder="Name, ID, Mobile..." 
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isSearching) handleSearch();
                                    }}
                                    className="w-full h-9 bg-white border-slate-200 focus:border-red-500 focus:ring-red-500 rounded-lg shadow-sm text-xs font-semibold"
                                />
                                <Button onClick={handleSearch} disabled={isSearching} variant="outline" className="h-9 border-slate-300 hover:bg-slate-100 px-3 rounded-lg text-xs font-bold shadow-sm shrink-0 transition-all">
                                    <Search className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* RESULTS TABLE CARD */}
            {appliedFilters.hasSearched && (
                <Card className="shadow-sm border-0 animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b">
                        <div>
                            <CardTitle className="text-lg text-slate-700 font-bold">Outstanding Dues List</CardTitle>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Found {displayList.length} students with pending fees</p>
                        </div>
                        
                        <div className="flex gap-2 mt-4 sm:mt-0 print:hidden">
                            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="text-slate-600 border-slate-200 hover:bg-slate-50 h-9 font-bold">
                                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                                CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="text-slate-600 border-slate-200 hover:bg-slate-50 h-9 font-bold">
                                <FileSpreadsheet className="w-4 h-4 text-green-600 mr-1.5" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="text-slate-600 border-slate-200 hover:bg-slate-50 h-9 font-bold">
                                <Printer className="w-4 h-4 mr-1.5" />
                                Print
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Table Search */}
                        <div className="px-5 py-4 border-b bg-slate-50/30 print:hidden flex justify-between items-center">
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="Search in these results..." 
                                    value={tableKeyword}
                                    onChange={(e) => setTableKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            toast.info(`Filtered results for: ${tableKeyword}`);
                                        }
                                    }}
                                    className="pl-9 h-10 text-sm bg-white border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <Table id="due-fees-table">
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3 cursor-pointer select-none group" onClick={() => requestSort('className')}>Class {getSortIcon('className')}</TableHead>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3 cursor-pointer select-none group" onClick={() => requestSort('rollNumber')}>Roll No. {getSortIcon('rollNumber')}</TableHead>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3 cursor-pointer select-none group" onClick={() => requestSort('admissionNumber')}>Adm. ID {getSortIcon('admissionNumber')}</TableHead>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3 cursor-pointer select-none group" onClick={() => requestSort('name')}>Student Name {getSortIcon('name')}</TableHead>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3">Phone</TableHead>
                                        <TableHead className="font-extrabold text-slate-800 px-4 py-3 text-right whitespace-nowrap">{sessionMonths[0].name} Due</TableHead>
                                        <TableHead className="font-extrabold text-red-600 px-4 py-3 text-right">Past</TableHead>
                                        <TableHead className="font-extrabold text-red-600 px-4 py-3 text-right">
                                            {appliedFilters.month !== 'all' ? sessionMonths.find(m => m.index.toString() === appliedFilters.month)?.name : 'Current'}
                                        </TableHead>
                                        <TableHead className="font-extrabold text-blue-600 px-4 py-3 text-right">Upcoming</TableHead>
                                        <TableHead className="font-extrabold text-red-700 px-4 py-3 text-right cursor-pointer select-none group h-auto whitespace-nowrap" onClick={() => requestSort('sessionTotal')}>Session Outstanding {getSortIcon('sessionTotal')}</TableHead>
                                        <TableHead className="font-extrabold text-slate-600 px-4 py-3 text-right print:hidden font-black">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-2 opacity-40">
                                                    <Search className="w-12 h-12 mb-2" />
                                                    <p className="text-lg font-bold">No students found matching your search</p>
                                                    <p className="text-sm">Try adjusting your filters or keyword</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayList.map((student) => (
                                            <TableRow key={student.id} className="hover:bg-slate-50 transition-colors group">
                                                <TableCell className="text-slate-600 font-medium px-4 py-3">{student.className} {student.section ? `(${student.section})` : ''}</TableCell>
                                                <TableCell className="text-slate-600 px-4 py-3">{student.rollNumber || '—'}</TableCell>
                                                <TableCell className="text-slate-500 font-mono text-[11px] px-4 py-3">{student.admissionNumber}</TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="font-bold text-slate-900 leading-tight">{student.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Father: {student.fatherName || '—'}</div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 px-4 py-3 whitespace-nowrap text-sm font-medium">{student.phone || '—'}</TableCell>
                                                <TableCell className="text-right px-4 py-3">
                                                    <span className={cn("font-bold", (student.firstMonthDue || 0) > 0 ? "text-slate-900 font-extrabold" : "text-slate-300 opacity-50")}>
                                                        ₹{(student.firstMonthDue || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 py-3">
                                                    <span className={cn("font-bold", (student.pastDues || 0) > 0 ? "text-red-600 font-black" : "text-slate-300 opacity-50")}>
                                                        ₹{(student.pastDues || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 py-3">
                                                    <span className={cn("font-bold", (student.currentMonthDue || 0) > 0 ? "text-red-600 font-black" : "text-slate-300 opacity-50")}>
                                                        ₹{(student.currentMonthDue || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 py-3">
                                                    <span className={cn("font-bold", (student.nextMonthDue || 0) > 0 ? "text-blue-600" : "text-slate-300 opacity-50")}>
                                                        ₹{(student.nextMonthDue || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 py-3">
                                                    <span className="text-red-700 font-black text-lg">₹{(student.sessionTotal || 0).toLocaleString('en-IN')}</span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 py-3 print:hidden">
                                                    <div className="flex justify-end items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-indigo-600 border-indigo-100 hover:bg-indigo-50 rounded-full"
                                                            onClick={() => handleReminder(student)}
                                                            title="Send Reminder"
                                                        >
                                                            <BellRing className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 bg-slate-900 hover:bg-black text-white px-3 font-bold text-xs"
                                                            asChild
                                                        >
                                                            <Link href={`/school-admin/fees/collect?studentId=${student.id}`}>
                                                                Collect <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!appliedFilters.hasSearched && !loading && (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                    <div className="bg-red-50 p-6 rounded-full mb-4">
                        <Search className="w-10 h-10 text-red-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Ready to search dues</h3>
                    <p className="text-slate-500 mt-1 max-w-sm text-center font-medium">Select a class or use the search bar above to see the list of students with outstanding fee payments.</p>
                </div>
            )}
        </div>
    );
}
