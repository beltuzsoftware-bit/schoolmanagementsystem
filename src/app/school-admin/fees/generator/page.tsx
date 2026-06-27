'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Search, 
    FolderOpen, 
    Users, 
    Loader2, 
    CreditCard, 
    Printer, 
    Settings2,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { getSchools, searchStudents } from '@/app/actions';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function FeesGeneratorPage() {
    const router = useRouter();
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [school, setSchool] = useState<any>(null);
    const [schoolId, setSchoolId] = useState('');

    // Load school config to get proper classes & sections
    useEffect(() => {
        const loadConfig = async () => {
            const stored = localStorage.getItem('kummi_user');
            if (!stored) return;
            const user = JSON.parse(stored);
            const id = user.schoolId || '';
            setSchoolId(id);

            const schools = await getSchools();
            const mySchool = schools.find((s: any) => s.id === id);
            if (mySchool) {
                setSchool(mySchool);
                const ms = mySchool as any;
                const classes = ms.useCustomClasses && ms.classes
                    ? ms.classes.map((c: any) => c.name)
                    : INITIAL_CLASS_SETUPS.map(c => c.name);
                setAvailableClasses(classes);
            } else {
                setAvailableClasses(INITIAL_CLASS_SETUPS.map(c => c.name));
            }
        };
        loadConfig();
    }, []);

    // Update sections when class changes
    useEffect(() => {
        if (!selectedClass) {
            setSelectedSection('');
            return;
        }
        if (school?.useCustomClasses && school.classes) {
            const cls = school.classes.find((c: any) => c.name === selectedClass);
            setAvailableSections(cls?.sections && cls.sections.length > 0 ? cls.sections : (school?.useCustomSections && school.sections ? school.sections : INITIAL_SECTIONS));
        } else {
            const cls = INITIAL_CLASS_SETUPS.find(c => c.name === selectedClass);
            setAvailableSections(cls?.sections && cls.sections.length > 0 ? cls.sections : INITIAL_SECTIONS);
        }
        setSelectedSection('');
    }, [selectedClass, school]);

    const handleSearch = async () => {
        if (!schoolId) return;
        setLoading(true);
        setHasSearched(true);
        try {
            const results = await searchStudents(schoolId, {
                keyword: searchQuery,
                classFilter: selectedClass || 'Select',
                sectionFilter: selectedSection || 'Select',
                status: 'Active'
            }) as any[];
            setStudents(results || []);
        } catch (e) {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-sans pb-10">
            <div className="px-6 pt-0 space-y-1 max-w-[1600px] mx-auto print:px-0 print:pt-0">
                {/* FILTER BAR - Modernized Replica */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mb-0.5 print:hidden">
                    {/* Filter by Class & Section (GREEN THEME) */}
                    <div className="bg-green-50/70 border border-green-200 rounded-xl p-4 w-full xl:col-span-2" onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="w-full sm:w-[140px]">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full !h-12 bg-white rounded-lg shadow-sm text-sm font-semibold transition-all border-blue-200 focus:ring-blue-500">
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
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold transition-all">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Select">Select Class</SelectItem>
                                        {availableClasses.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 min-w-0 w-full">
                                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass || selectedClass === 'Select'}>
                                    <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold disabled:opacity-50 transition-all">
                                        <SelectValue placeholder={!selectedClass || selectedClass === 'Select' ? "Select Class First" : "Select Section"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Select">Select Section</SelectItem>
                                        {availableSections.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button 
                                onClick={handleSearch} 
                                className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(37,99,235,0.25)] shrink-0 transition-all w-full sm:w-auto"
                            >
                                <Search className="w-4 h-4 mr-2" /> 
                                Search
                            </Button>
                        </div>
                    </div>

                    {/* Search by Keyword (INDIGO THEME) */}
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 w-full" onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 min-w-0 w-full">
                                <Input 
                                    placeholder="Search by Name, Roll No..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    className="w-full h-12 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-sm font-semibold"
                                />
                            </div>
                            <Button 
                                onClick={handleSearch} 
                                className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] shrink-0 transition-all w-full sm:w-auto"
                            >
                                <Search className="w-4 h-4 mr-2" /> 
                                Search
                            </Button>
                        </div>
                    </div>
                </div>


                {/* Results Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 pt-0 print:border-none print:shadow-none print:p-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-3 px-1 border-b border-gray-100 mb-1 print:hidden">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                </div>
                                <h2 className="text-[15px] font-bold text-slate-800">Student Records</h2>
                            </div>
                            
                            {students.length > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-black text-indigo-700 uppercase tracking-wider select-none">
                                    Total: {students.length}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden h-9 bg-white shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Print List"
                                className="h-full w-9 rounded-none hover:bg-indigo-50 group border-r border-gray-100"
                                onClick={() => window.print()}
                            >
                                <Printer className="w-4 h-4 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Column Settings"
                                className="h-full w-9 rounded-none hover:bg-indigo-50 group p-0"
                            >
                                <Settings2 className="w-4 h-4 text-gray-800 group-hover:text-indigo-600 stroke-[2px]" />
                            </Button>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-md overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-200">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight">Class</TableHead>
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight">Section</TableHead>
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight max-w-[100px] truncate">ID</TableHead>
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight max-w-[140px] truncate">Name</TableHead>
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight max-w-[140px] truncate">Father</TableHead>
                                    <TableHead className="py-4 font-extrabold text-slate-900 text-[13px] uppercase tracking-tight">Mobile</TableHead>
                                    <TableHead className="text-right font-extrabold text-slate-900 text-[13px] uppercase tracking-tight py-4">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center bg-white">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-200" />
                                        </TableCell>
                                    </TableRow>
                                ) : students.length > 0 ? (
                                    students.map((student) => (
                                        <TableRow key={student.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 h-16 transition-colors">
                                            <TableCell className="text-[13px] text-gray-600 font-medium">
                                                {student.className || student.class || '-'}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-gray-600 font-medium">
                                                {student.section || '-'}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-gray-600 font-medium max-w-[100px] truncate" title={student.admissionNumber || student.id}>
                                                {(student.admissionNumber || student.id?.split('_').pop()).length > 10 
                                                    ? (student.admissionNumber || student.id?.split('_').pop()).substring(0, 10) + '...' 
                                                    : (student.admissionNumber || student.id?.split('_').pop())}
                                            </TableCell>
                                            <TableCell className="max-w-[140px] truncate" title={student.name}>
                                                <span className="text-indigo-600 font-bold text-[13px]">
                                                    {student.name && student.name.length > 16 
                                                        ? student.name.substring(0, 16) + '...' 
                                                        : (student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim())}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-[13px] text-gray-600 max-w-[140px] truncate" title={student.fatherName}>
                                                {student.fatherName && student.fatherName.length > 16 
                                                    ? student.fatherName.substring(0, 16) + '...' 
                                                    : (student.fatherName || '-')}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-gray-600 font-bold">
                                                {student.phone || '-'}
                                            </TableCell>
                                            <TableCell className="text-right py-1">
                                                <Button
                                                    onClick={() => router.push(`/school-admin/fees/collect/${student.id}`)}
                                                    className="h-9 px-4 text-[11px] bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 rounded-xl font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ml-auto"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5" /> Collect
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center bg-white">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                                                    <FolderOpen size={30} className="text-slate-200" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-slate-400 font-bold text-base">No Students Found</p>
                                                    <p className="text-slate-400 text-[11px] max-w-[200px] mx-auto font-medium">Apply filters or use search keywords to find student records.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                                }
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
