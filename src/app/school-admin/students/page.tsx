'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Menu,
    Pencil,
    IndianRupee,
    Printer,
    FileText,
    LayoutList,
    LayoutGrid,
    FileSpreadsheet,
    FileJson,
    Phone,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Users,
    Filter,
    Trash2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Student } from '@/types';
import { searchStudents, getSchools, getStudentById, deleteStudent, deleteStudentsBatch } from '@/app/actions';
import StudentDetailsView from '@/components/school-admin/student-details-view';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    // Filters
    const [classFilter, setClassFilter] = useState<string>('Select');
    const [sectionFilter, setSectionFilter] = useState<string>('Select');
    const [sessionFilter, setSessionFilter] = useState<string>('Select');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [keyword, setKeyword] = useState<string>('');

    // Dynamic class and section lists
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(false);

    // Sort
    const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>({ key: 'admissionNumber', direction: 'desc' });

    // Pagination
    const [pageSize, setPageSize] = useState<number>(50);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [schoolId, setSchoolId] = useState<string>('');
    const [school, setSchool] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    // Selection state for bulk actions
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const handleViewProfile = async (student: Student) => {
        if (isFetchingProfile) return;
        setIsFetchingProfile(true);
        try {
            const result = await getStudentById(student.id);
            if (result?.success && result.student) {
                setSelectedStudent(result.student as Student);
            } else {
                toast.error(result?.error || "Failed to load full student profile");
            }
        } catch (error) {
            toast.error("Error fetching student details");
        } finally {
            setIsFetchingProfile(false);
        }
    };

    const fetchStudents = async (id: string, filters: any = {}) => {
        if (!id) return;
        setLoading(true);
        try {
            const results = await searchStudents(id, filters) as Student[];
            setStudents(results || []);
        } catch (error) {
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    const handleCriteriaSearch = () => {
        if (classFilter === 'Select') {
            toast.error('Please select a class to search.');
            return;
        }
        if (selectedClassHasSections && sectionFilter === 'Select') {
            toast.error('Please select a section, or choose "All Sections".');
            return;
        }
        // Clear keyword when searching by criteria
        setKeyword('');
        fetchStudents(schoolId, { keyword: '', classFilter, sectionFilter, sessionId: sessionFilter, status: statusFilter });
    };

    const handleKeywordSearch = () => {
        if (!keyword.trim()) {
            toast.error('Please enter a keyword to search.');
            return;
        }
        // Reset class/section filters when searching by keyword globally
        setClassFilter('Select');
        setSectionFilter('Select');
        fetchStudents(schoolId, { keyword, classFilter: 'Select', sectionFilter: 'Select', sessionId: sessionFilter, status: statusFilter });
    };

    useEffect(() => {
        setIsMounted(true);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            const id = user.schoolId || '';
            setSchoolId(id);
            // Default session to school's current session if available
            fetchSchoolConfig(id);
            // fetchStudents will be called after school config loads to ensure correct session
        } else {
            setLoading(false);
        }

        const handleSessionChange = () => {
            const activeSession = localStorage.getItem('kummi_active_session');
            if (activeSession) {
                setSessionFilter(activeSession);
            }
        };

        window.addEventListener('session-changed', handleSessionChange);
        return () => window.removeEventListener('session-changed', handleSessionChange);
    }, []);

    const fetchSchoolConfig = async (id: string) => {
        const schools = await getSchools();
        const mySchool = schools.find((s: any) => s.id === id);
        if (mySchool) {
            setSchool(mySchool);
            const ms = mySchool as any;
            
            // Logic to determine available classes
            let classes: string[] = [];
            if (ms.useCustomClasses && ms.classes) {
                classes = ms.classes.map((c: any) => c.name);
            } else {
                classes = INITIAL_CLASS_SETUPS.map(c => c.name);
            }
            
            // Logic to determine available sections (master pool)
            let sections: string[] = [];
            if (ms.useCustomSections && ms.sections) {
                sections = ms.sections;
            } else {
                sections = INITIAL_SECTIONS;
            }
            
            setAvailableClasses(classes);
            setAvailableSections(sections);
            
            // Set default session filter
            const globalSession = localStorage.getItem('kummi_active_session');
            if (globalSession) {
                setSessionFilter(globalSession);
                fetchStudents(id, { sessionId: globalSession, status: statusFilter });
            } else if (ms.currentSession) {
                setSessionFilter(ms.currentSession);
                fetchStudents(id, { sessionId: ms.currentSession, status: statusFilter });
            } else {
                fetchStudents(id, { status: statusFilter });
            }
        } else {
            // Fallback to defaults if school not found
            setAvailableClasses(INITIAL_CLASS_SETUPS.map(c => c.name));
            setAvailableSections(INITIAL_SECTIONS);
            fetchStudents(id, { status: statusFilter });
        }
    };

    // Check if selected class has sections and filter the sections list
    useEffect(() => {
        if (classFilter && classFilter !== 'all' && classFilter !== 'Select') {
            let hasSections = false;
            let classSections: string[] = [];
            
            if (school?.useCustomClasses && school.classes) {
                const selectedClass = school.classes.find((c: any) => c.name === classFilter);
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
            setAvailableSections(classSections);
            
            // Reset section filter if class doesn't have sections or current section filter not in new list
            if (!hasSections || (sectionFilter !== 'all' && sectionFilter !== 'Select' && !classSections.includes(sectionFilter))) {
                setSectionFilter('Select');
            }
        } else {
            // Restore full sections pool if 'All' classes selected
            const fullSections = school?.useCustomSections && school.sections ? school.sections : INITIAL_SECTIONS;
            setAvailableSections(fullSections);
            setSelectedClassHasSections(false);
            setSectionFilter('Select');
        }
    }, [classFilter, school]);

    useEffect(() => {
        if (schoolId) {
            fetchStudents(schoolId, { keyword, classFilter, sectionFilter, sessionId: sessionFilter });
        }
    }, [sessionFilter]);

    // Client-side filtering based on keyword, class, and section
    let filteredStudents: Student[] = [];

    // Only process array if a specific search was triggered or 'All' classes is explicitly selected
    if (keyword || (classFilter !== 'Select')) {
        if (selectedClassHasSections && sectionFilter === 'Select') {
            filteredStudents = [];
        } else {
            filteredStudents = students.filter(student => {
                // Keyword filter
                if (keyword) {
                    const searchTerm = keyword.toLowerCase();
                    const matchesKeyword = (
                        student.name?.toLowerCase().includes(searchTerm) ||
                        student.firstName?.toLowerCase().includes(searchTerm) ||
                        student.lastName?.toLowerCase().includes(searchTerm) ||
                        student.admissionNumber?.toLowerCase().includes(searchTerm) ||
                        student.rollNumber?.toLowerCase().includes(searchTerm) ||
                        student.phone?.toLowerCase().includes(searchTerm) ||
                        student.fatherName?.toLowerCase().includes(searchTerm)
                    );
                    if (!matchesKeyword) return false;
                }

                // Class filter
                if (classFilter !== 'Select' && classFilter !== 'all') {
                    const target = classFilter.toLowerCase().trim();
                    const studentClass = (student.className || (student as any).class || '').toLowerCase().trim();
                    if (studentClass !== target && !studentClass.includes(target) && !target.includes(studentClass)) return false;
                }

                // Section filter
                if (sectionFilter !== 'Select' && sectionFilter !== 'all') {
                    const target = sectionFilter.toLowerCase().trim();
                    const studentSection = (student.section || '').toLowerCase().trim();
                    if (studentSection !== target && !studentSection.includes(target) && !target.includes(studentSection)) return false;
                }

                return true;
            });
        }
    }

    const handleSort = (key: keyof Student) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        const aVal = (a[key] || '').toString();
        const bVal = (b[key] || '').toString();

        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });

        return direction === 'asc' ? comparison : -comparison;
    });

    // Paginate: compute current page slice
    const totalFiltered = sortedStudents.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * pageSize;          // 0-based index
    const pageEnd   = Math.min(pageStart + pageSize, totalFiltered);
    const pagedStudents = sortedStudents.slice(pageStart, pageEnd);
    // Display range (1-based)
    const rangeStart = totalFiltered === 0 ? 0 : pageStart + 1;
    const rangeEnd   = pageEnd;

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (format === 'pdf') {
            handlePrint();
            return;
        }

        const headers = [
            "Admission", "Name", "Roll", "Class", "Section", "Enrolled Year", "House", "Aadhaar", "APAAR ID", 
            "Religion", "Referred By", "Special Needs", "Guardian Email", "Prev Last Class", "Board", "Marks", "CGPA", "Result",
            "Mobile", "Father", "DOB", "Gender"
        ];
        const csvRows = [headers.join(",")];

        sortedStudents.forEach(student => {
            const row = [
                `"${student.admissionNumber || ''}"`,
                `"${student.name || ''}"`,
                `"${student.rollNumber || ''}"`,
                `"${student.className || ''}"`,
                `"${student.section || ''}"`,
                `"${(student as any).enrolledYear || ''}"`,
                `"${(student as any).house || ''}"`,
                `"${(student as any).aadhaarNo || ''}"`,
                `"${(student as any).apaarId || ''}"`,
                `"${(student as any).religion || ''}"`,
                `"${(student as any).referredBy || ''}"`,
                `"${(student as any).specialNeeds || 'No'}"`,
                `"${(student as any).guardianEmail || ''}"`,
                `"${(student as any).previousLastClass || ''}"`,
                `"${(student as any).affiliatedBoard || ''}"`,
                `"${(student as any).marksObtained || ''}"`,
                `"${(student as any).percentageCGPA || ''}"`,
                `"${(student as any).result || ''}"`,
                `"${student.phone || ''}"`,
                `"${student.fatherName || ''}"`,
                `"${student.dob || '—'}"`,
                `"${student.gender || '—'}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `full_student_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exporting full data to ${format.toUpperCase()}...`);
    };

    const handlePrint = () => {
        toast.info("Preparing print view...");
        window.print();
    };

    const SortIcons = ({ columnKey }: { columnKey: keyof Student }) => {
        if (sortConfig?.key !== columnKey) {
            return <svg className="ml-1.5 inline-block w-4 h-4 text-slate-500 opacity-70 group-hover:opacity-100 group-hover:text-slate-900 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 16-3 3-3-3"/><path d="m9 8 3-3 3 3"/></svg>;
        }
        if (sortConfig.direction === 'asc') {
            return <ChevronUp className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
        }
        return <ChevronDown className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
    };

    const ActionButtons = ({ student }: { student: Student }) => (
        <div className="flex items-center gap-0.5">
            <Button
                variant="secondary"
                size="icon"
                title="View Profile"
                disabled={isFetchingProfile}
                className="h-8 w-8 bg-[#7c83fd] hover:bg-[#6b72f0] text-white rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => handleViewProfile(student)}
            >
                {isFetchingProfile && selectedStudent?.id === student.id ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Menu className="h-4.5 w-4.5 stroke-[2.5px]" />
                )}
            </Button>
            <Button
                variant="secondary"
                size="icon"
                title="Edit Student"
                className="h-8 w-8 bg-[#7c83fd] hover:bg-[#6b72f0] text-white rounded-none first:rounded-l-md last:rounded-r-md border-l border-white/20"
                onClick={() => router.push(`/school-admin/students/${student.id}/edit`)}
            >
                <Pencil className="h-4.5 w-4.5 stroke-[2.5px]" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                title="Collect Fees"
                className="h-8 w-8 bg-[#7c83fd] hover:bg-[#6b72f0] text-white rounded-none first:rounded-l-md last:rounded-r-md border-l border-white/20"
            >
                <IndianRupee className="h-4.5 w-4.5 stroke-[2.5px]" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                title="Print Report"
                className="h-8 w-8 bg-[#7c83fd] hover:bg-[#6b72f0] text-white rounded-none first:rounded-l-md last:rounded-r-md border-l border-white/20"
            >
                <Printer className="h-4.5 w-4.5 stroke-[2.5px]" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                title="Delete Student"
                className="h-8 w-8 bg-rose-500 hover:bg-rose-600 text-white rounded-none first:rounded-l-md last:rounded-r-md border-l border-white/20"
                onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
                        const res = await deleteStudent(student.id);
                        if (res.success) {
                            toast.success("Student deleted successfully");
                            fetchStudents(schoolId, { keyword, classFilter, sectionFilter, sessionId: sessionFilter, status: statusFilter });
                        } else {
                            toast.error("Failed to delete student");
                        }
                    }
                }}
            >
                <Trash2 className="h-4.5 w-4.5 stroke-[2.5px]" />
            </Button>
        </div>
    );

    if (!isMounted) {
        return (
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-pulse">
                <div className="h-10 w-64 bg-gray-200 rounded-lg mb-8" />
                <div className="h-44 w-full bg-gray-100/50 rounded-2xl border border-gray-100 shadow-sm" />
                <div className="space-y-4">
                    <div className="h-10 w-full bg-gray-100/50 rounded-lg" />
                    <div className="h-[500px] w-full bg-white rounded-xl border border-gray-100 shadow-sm" />
                </div>
            </div>
        );
    }

    return (
        <div className="font-sans pb-10">
            {/* Global Scoped Styles */}
            <style jsx global>{`
                @media print {
                    .no-print, button, input, aside, nav, [role="tablist"], .md\:col-span-2, .md\:col-span-1 { display: none !important; }
                    .print-only { display: block !important; }
                    body, .bg-white, .bg-slate-50 { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .max-w-\[1600px\] { max-width: 100% !important; width: 100% !important; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { border: 1px solid #e2e8f0 !important; font-size: 10pt !important; }
                    .shadow-sm, .border { box-shadow: none !important; border-color: #eee !important; }
                }
            `}</style>
            <div className="px-6 pt-6 space-y-6 max-w-[1600px] mx-auto print:px-0 print:pt-0">
                {/* Results Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:border-none print:shadow-none print:p-0">
                    <div className="hidden print:block text-center mb-8 border-b-2 border-gray-200 pb-4">
                        <h2 className="text-2xl font-black text-[#434190] uppercase tracking-widest">
                            {school?.name || 'KuMMi - School Management System'}
                        </h2>
                        <h3 className="text-lg font-bold text-gray-700 mt-1">Student Information Report</h3>
                        {(classFilter !== 'all' || sectionFilter !== 'all') && (
                            <p className="text-sm font-semibold text-gray-500 mt-2">
                                Class: {classFilter !== 'all' ? classFilter : 'All'} 
                                {sectionFilter !== 'all' && sectionFilter ? ` (${sectionFilter})` : ''}
                            </p>
                        )}
                    </div>
                    {/* FILTER BAR - "Select Criteria" Replica */}
                    <Card className="shadow-sm border-t-2 border-t-indigo-600 rounded-2xl overflow-hidden mb-5 print:hidden">
                        <CardContent className="p-4 pt-2.5 pb-3.5">
                            <h2 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2.5 mt-0">Select Criteria</h2>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-end">
                                {/* Filter by Class & Section (GREEN REPLICA - now clean & borderless) */}
                                <div className="w-full xl:col-span-2" onKeyDown={(e) => { if (e.key === 'Enter') handleCriteriaSearch(); }}>
                                    <div className="flex flex-col sm:flex-row gap-3.5 items-end">
                                        <div className="w-full sm:w-[140px]">
                                            <Label className="text-xs mb-1 block text-slate-500 font-semibold">Status</Label>
                                            <Select value={statusFilter} onValueChange={(val) => {
                                                setStatusFilter(val);
                                                // auto-refetch on status change if class is selected
                                                if (classFilter !== 'Select') {
                                                    fetchStudents(schoolId, { keyword, classFilter, sectionFilter, sessionId: sessionFilter, status: val });
                                                }
                                            }}>
                                                <SelectTrigger className={cn(
                                                    "w-full !h-10 bg-white rounded-lg shadow-sm text-sm font-semibold transition-all border-slate-200 focus:ring-indigo-500 focus:border-indigo-500",
                                                    statusFilter === 'all' && "border-green-300 bg-green-50/50 text-green-700 font-semibold"
                                                )}>
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Active">Active</SelectItem>
                                                    <SelectItem value="Disabled">Disabled</SelectItem>
                                                    <SelectItem value="all">All Status</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-xs mb-1 block text-slate-500 font-semibold">Class <span className="text-rose-500">*</span></Label>
                                            <Select value={classFilter} onValueChange={setClassFilter}>
                                                <SelectTrigger className="w-full !h-10 bg-white border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm text-sm font-semibold">
                                                    <SelectValue placeholder="Select" />
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
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-xs mb-1 block text-slate-500 font-semibold">Section</Label>
                                            <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === 'Select' || (!selectedClassHasSections && classFilter !== 'all')}>
                                                <SelectTrigger className="w-full !h-10 bg-white border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm text-sm font-semibold disabled:opacity-50">
                                                    <SelectValue placeholder={classFilter === 'Select' ? "Select Class First" : (selectedClassHasSections || classFilter === 'all' ? "Select Section" : "No Sections")} />
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
                                        <Button 
                                            onClick={handleCriteriaSearch} 
                                            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-lg text-sm font-bold shadow-[0_2px_8px_0_rgba(79,70,229,0.15)] shrink-0 transition-all w-full sm:w-auto"
                                        >
                                            <Search className="w-4 h-4 mr-2" /> 
                                            Search
                                        </Button>
                                    </div>
                                </div>

                                {/* Search by Keyword (INDIGO THEME - now clean, borderless, separated by vertical line) */}
                                <div className="w-full xl:border-l xl:border-slate-200 xl:pl-6" onKeyDown={(e) => { if (e.key === 'Enter') handleKeywordSearch(); }}>
                                    <div className="flex flex-col sm:flex-row gap-3.5 items-end">
                                        <div className="flex-1 min-w-0 w-full">
                                            <Label className="text-xs mb-1 block text-slate-500 font-semibold">Search By Keyword</Label>
                                            <Input 
                                                placeholder="Name, Roll No, Admission ID..." 
                                                value={keyword}
                                                onChange={(e) => setKeyword(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleKeywordSearch();
                                                }}
                                                className="w-full h-10 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-sm font-semibold"
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleKeywordSearch} 
                                            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-lg text-sm font-bold shadow-[0_2px_8px_0_rgba(79,70,229,0.15)] shrink-0 transition-all w-full sm:w-auto"
                                        >
                                            <Search className="w-4 h-4 mr-2" /> 
                                            Search
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="list" className="w-full" onValueChange={(val) => setViewMode(val as 'list' | 'details')}>
                        <div className="flex items-center justify-start border-b border-gray-100 mb-6 print:hidden">
                            <TabsList className="bg-transparent h-auto p-0 gap-0">
                                <TabsTrigger
                                    value="list"
                                    className="rounded-none border-x border-t border-gray-100 data-[state=active]:border-indigo-600 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-none px-6 py-3 text-gray-400 data-[state=active]:text-indigo-600 font-bold text-sm transition-all -mb-[1px]"
                                >
                                    <LayoutList className="w-4 h-4 mr-2" />
                                    List View
                                </TabsTrigger>
                                <TabsTrigger
                                    value="details"
                                    className="rounded-none border-x border-t border-transparent data-[state=active]:border-indigo-600 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-none px-6 py-3 text-gray-400 data-[state=active]:text-indigo-600 font-bold text-sm transition-all -mb-[1px]"
                                >
                                    <LayoutGrid className="w-4 h-4 mr-2" />
                                    Details View
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* List/Details Search Utilities */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
                            <div className="flex items-center gap-3">
                                <span className="text-[13px] font-bold text-gray-500">Show</span>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                                >
                                    <SelectTrigger className="w-20 h-9 border-gray-200 text-sm font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="200">200</SelectItem>
                                    </SelectContent>
                                </Select>

                                {selectedIds.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-9 font-bold bg-rose-600 hover:bg-rose-700"
                                        disabled={isDeletingBulk}
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${selectedIds.length} selected students?`)) {
                                                setIsDeletingBulk(true);
                                                try {
                                                    const res = await deleteStudentsBatch(selectedIds);
                                                    if (res.success) {
                                                        toast.success(`Successfully deleted ${res.count} students`);
                                                        setSelectedIds([]);
                                                        fetchStudents(schoolId, { keyword, classFilter, sectionFilter, sessionId: sessionFilter, status: statusFilter });
                                                    } else {
                                                        toast.error("Failed to delete students");
                                                    }
                                                } finally {
                                                    setIsDeletingBulk(false);
                                                }
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Selected ({selectedIds.length})
                                    </Button>
                                )}
                                {/* Student count: range / total */}
                                {students.length > 0 && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[12px] font-bold text-indigo-700 select-none">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                                        Students:&nbsp;
                                        {totalPages > 1 ? (
                                            <>
                                                <span className="text-indigo-900">{rangeStart}–{rangeEnd}</span>
                                                <span className="text-indigo-400">&nbsp;of&nbsp;</span>
                                                <span className="text-indigo-600">{totalFiltered}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-indigo-900">{totalFiltered}</span>
                                                {totalFiltered !== students.length && (
                                                    <>
                                                        <span className="text-indigo-400">&nbsp;of&nbsp;</span>
                                                        <span className="text-indigo-600">{students.length}</span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                            {/* Pagination controls */}
                            <div className="flex items-center gap-2">
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden h-9 bg-white shadow-sm">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={safePage <= 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="h-full w-9 rounded-none hover:bg-indigo-50 border-r border-gray-200 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-gray-700" />
                                        </Button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <span key={`e-${idx}`} className="px-2 text-gray-400 text-xs font-bold">…</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => setCurrentPage(p as number)}
                                                        className={`h-9 min-w-[36px] px-2 text-[13px] font-bold border-r border-gray-200 last:border-r-0 transition-colors ${
                                                            safePage === p
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'text-gray-600 hover:bg-indigo-50'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            )
                                        }
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={safePage >= totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="h-full w-9 rounded-none hover:bg-indigo-50 disabled:opacity-40"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-700" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden h-9 bg-white shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Excel"
                                        className="h-full w-9 rounded-none hover:bg-indigo-50 border-r border-gray-200 group"
                                        onClick={() => handleExport('excel')}
                                    >
                                        <FileSpreadsheet className="w-4.5 h-4.5 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="CSV"
                                        className="h-full w-9 rounded-none hover:bg-indigo-50 border-r border-gray-200 group"
                                        onClick={() => handleExport('csv')}
                                    >
                                        <FileText className="w-4.5 h-4.5 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="PDF"
                                        className="h-full w-9 rounded-none hover:bg-indigo-50 border-r border-gray-200 group"
                                        onClick={() => handleExport('pdf')}
                                    >
                                        <FileJson className="w-4.5 h-4.5 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Print"
                                        className="h-full w-9 rounded-none hover:bg-indigo-50 group"
                                        onClick={handlePrint}
                                    >
                                        <Printer className="w-4.5 h-4.5 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <TabsContent value="list" className="mt-0 outline-none">
                            <div className="border border-gray-100 rounded-md overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="w-[40px] py-4">
                                                <Checkbox 
                                                    checked={pagedStudents.length > 0 && selectedIds.length === pagedStudents.length}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedIds(pagedStudents.map(s => s.id));
                                                        } else {
                                                            setSelectedIds([]);
                                                        }
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('admissionNumber')}>
                                                <div className="flex items-center">
                                                    Admission <SortIcons columnKey="admissionNumber" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('name')}>
                                                <div className="flex items-center">
                                                    Name <SortIcons columnKey="name" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('rollNumber')}>
                                                <div className="flex items-center">
                                                    Roll <SortIcons columnKey="rollNumber" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('className')}>
                                                <div className="flex items-center">
                                                    Class <SortIcons columnKey="className" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('apaarId' as any)}>
                                                <div className="flex items-center">
                                                    APAAR ID <SortIcons columnKey="apaarId" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('aadhaarNo' as any)}>
                                                <div className="flex items-center">
                                                    Aadhaar <SortIcons columnKey="aadhaarNo" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('house' as any)}>
                                                <div className="flex items-center">
                                                    House <SortIcons columnKey="house" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('fatherName')}>
                                                <div className="flex items-center">
                                                    Father <SortIcons columnKey="fatherName" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('dob')}>
                                                <div className="flex items-center">
                                                    DOB <SortIcons columnKey="dob" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('gender')}>
                                                <div className="flex items-center">
                                                    Gender <SortIcons columnKey="gender" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('category')}>
                                                <div className="flex items-center">
                                                    Category <SortIcons columnKey="category" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('phone')}>
                                                <div className="flex items-center">
                                                    Mobile <SortIcons columnKey="phone" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="group cursor-pointer py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight select-none" onClick={() => handleSort('status' as any)}>
                                                <div className="flex items-center">
                                                    Status <SortIcons columnKey="status" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right font-extrabold text-slate-900 text-[13px] uppercase tracking-tight py-4 print:hidden">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedStudents.map((student) => (
                                            <React.Fragment key={student.id}>
                                                <TableRow className={`hover:bg-gray-50 border-b border-gray-100 last:border-0 h-16 transition-colors ${selectedIds.includes(student.id) ? 'bg-indigo-50/30' : ''}`}>
                                                    <TableCell className="py-1">
                                                        <Checkbox 
                                                            checked={selectedIds.includes(student.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedIds([...selectedIds, student.id]);
                                                                } else {
                                                                    setSelectedIds(selectedIds.filter(id => id !== student.id));
                                                                }
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-[13px] text-gray-600 font-medium">{student.admissionNumber}</TableCell>
                                                    <TableCell>
                                                        <button 
                                                            disabled={isFetchingProfile}
                                                            onClick={() => handleViewProfile(student)}
                                                            className="text-indigo-600 hover:text-indigo-800 font-bold text-[13px] hover:underline text-left disabled:opacity-50"
                                                        >
                                                            {student.name}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{student.rollNumber || ''}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">
                                                        {student.className || (student as any).class || (student as any).classAppliedFor || '—'}
                                                        {student.section ? ` (${student.section})` : ''}
                                                    </TableCell>
                                                    <TableCell className="text-[13px] text-indigo-600 font-bold">{(student as any).apaarId || '—'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{(student as any).aadhaarNo || '—'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{(student as any).house || '—'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{student.fatherName}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{student.dob || '—'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600 capitalize">{student.gender || '—'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600">{student.category || 'General'}</TableCell>
                                                    <TableCell className="text-[13px] text-gray-600 font-bold">{student.phone}</TableCell>
                                                    <TableCell className="py-1">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                                                            ((student.status as string) === 'Disabled') 
                                                                ? "bg-rose-100 text-rose-600 border border-rose-200" 
                                                                : "bg-emerald-100 text-emerald-600 border border-emerald-200"
                                                        )}>
                                                            {student.status || 'Active'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-1 print:hidden">
                                                        <div className="inline-block"><ActionButtons student={student} /></div>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        ))}
                                        {pagedStudents.length === 0 && !loading && (
                                            <TableRow className="hover:bg-transparent">
                                                <TableCell colSpan={11} className="h-64 text-center bg-white">
                                                    <div className="space-y-2">
                                                        <div className="text-slate-400 font-bold text-base">No results found for these criteria.</div>
                                                        <div className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
                                                            Tip: If you're missing students, try searching by <span className="text-indigo-600 font-bold">Keyword</span> or check if they belong to a different <span className="text-indigo-600 font-bold">Academic Session</span> using the switcher in the sidebar.
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="details" className="mt-0 outline-none space-y-4">
                            {pagedStudents.length > 0 ? (
                                pagedStudents.map((student) => (
                                    <div key={student.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex gap-10 relative overflow-hidden transition-all hover:shadow-md group">
                                        <div className="w-32 h-36 bg-[#fcfcfc] rounded-md overflow-hidden flex items-center justify-center border border-gray-200 shrink-0 shadow-inner">
                                            {student.photo ? (
                                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="bg-gray-100 h-full w-full flex items-center justify-center text-gray-200">
                                                    <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-2 text-[13px]">
                                            <div className="col-span-full mb-3 pb-2 border-b border-gray-50">
                                                <h3 className="text-xl font-bold text-[#434190] uppercase tracking-tight">
                                                    {student.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[140px]">Class:</span>
                                                <span className="text-gray-600 font-medium">
                                                    {student.className || (student as any).class || '—'}
                                                    {student.section ? ` (${student.section})` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[220px] print:min-w-[140px]">Identification Number:</span>
                                                <span className="text-gray-600">{student.aadhaarNo || (student as any).apaarId || '—'}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[140px]">Admission No:</span>
                                                <span className="text-gray-600 font-medium">{student.admissionNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[220px] print:min-w-[140px]">Guardian Name:</span>
                                                <span className="text-gray-600 font-semibold uppercase">{student.guardianName || student.fatherName || '—'}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[140px]">Date Of Birth:</span>
                                                <span className="text-gray-600">{student.dob || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[220px] print:min-w-[140px]">Contact Number:</span>
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span className="font-bold text-gray-800 tracking-wide">{student.phone || student.guardianPhone || '—'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[140px]">Gender:</span>
                                                <span className="text-gray-600 capitalize">{student.gender || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 min-w-[220px] print:min-w-[140px]">Current Address:</span>
                                                <span className="text-gray-600 line-clamp-1">{student.currentAddress || '—'}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-6 right-6">
                                            <ActionButtons student={student} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center space-y-2">
                                    <div className="text-slate-400 font-bold">No results found for these criteria.</div>
                                    <div className="text-[11px] text-slate-300 font-medium">
                                        Tip: If you're missing students, try searching by <span className="text-indigo-400/80 font-bold">Keyword</span> or switching the <span className="text-indigo-400/80 font-bold">Academic Session</span> in the sidebar.
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modal View */}
            {selectedStudent && (
                <StudentDetailsView
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onUpdate={() => fetchStudents(schoolId, { keyword, classFilter, sectionFilter, sessionId: sessionFilter, status: statusFilter })}
                />
            )}

        </div>
    );
}
