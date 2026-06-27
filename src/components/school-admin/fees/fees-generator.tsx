'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, FolderOpen } from 'lucide-react';
import { getSchools } from '@/app/actions';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    className: string;
    section: string;
    rollNumber?: string;
    fatherName?: string;
    dob?: string;
    phone?: string;
    status?: string;
}

interface FeesGeneratorProps {
    students: Student[];
}

export default function FeesGenerator({ students }: FeesGeneratorProps) {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [school, setSchool] = useState<any>(null);

    // Load school config to get proper classes & sections
    useEffect(() => {
        const loadConfig = async () => {
            const stored = localStorage.getItem('kummi_user');
            if (!stored) return;
            const user = JSON.parse(stored);
            const schools = await getSchools();
            const mySchool = schools.find((s: any) => s.id === user.schoolId);
            if (mySchool) {
                setSchool(mySchool);
                const ms = mySchool as any;
                const classes = ms.useCustomClasses && ms.classes
                    ? ms.classes.map((c: any) => c.name)
                    : INITIAL_CLASS_SETUPS.map(c => c.name);
                const sections = ms.useCustomSections && ms.sections
                    ? ms.sections
                    : INITIAL_SECTIONS;
                setAvailableClasses(classes);
                setAvailableSections(sections);
            } else {
                setAvailableClasses(INITIAL_CLASS_SETUPS.map(c => c.name));
                setAvailableSections(INITIAL_SECTIONS);
            }
        };
        loadConfig();
    }, []);

    // Update sections when class changes (use class-specific sections if configured)
    useEffect(() => {
        if (!selectedClass) {
            const fullSections = school?.useCustomSections && school.sections ? school.sections : INITIAL_SECTIONS;
            setAvailableSections(fullSections);
            setSelectedSection('');
            return;
        }
        if (school?.useCustomClasses && school.classes) {
            const cls = school.classes.find((c: any) => c.name === selectedClass);
            if (cls?.sections && cls.sections.length > 0) {
                setAvailableSections(cls.sections);
            } else {
                const fullSections = school?.useCustomSections && school.sections ? school.sections : INITIAL_SECTIONS;
                setAvailableSections(fullSections);
            }
        } else {
            const cls = INITIAL_CLASS_SETUPS.find(c => c.name === selectedClass);
            if (cls?.sections && cls.sections.length > 0) {
                setAvailableSections(cls.sections);
            } else {
                setAvailableSections(INITIAL_SECTIONS);
            }
        }
        setSelectedSection('');
    }, [selectedClass, school]);

    const activeStudents = students.filter(s => (s.status || 'Active') === 'Active');

    const filteredStudents = hasSearched ? activeStudents.filter(student => {
        const matchesClass = !selectedClass || student.className === selectedClass;
        const matchesSection = !selectedSection || student.section === selectedSection;
        const searchTerm = searchQuery.toLowerCase().trim();
        const matchesSearch = !searchTerm ||
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm) ||
            student.id.toLowerCase().includes(searchTerm) ||
            (student.rollNumber || '').toLowerCase().includes(searchTerm) ||
            (student.fatherName || '').toLowerCase().includes(searchTerm) ||
            (student.phone || '').includes(searchTerm);
        return matchesClass && matchesSection && matchesSearch;
    }) : [];

    const handleSearch = () => {
        setHasSearched(true);
    };

    return (
        <div className="space-y-4 p-4 bg-[#f4f4f4] min-h-screen font-sans">
            {/* Select Criteria Section */}
            <Card className="border shadow-sm rounded-none">
                <div className="p-3 border-b bg-white">
                    <h2 className="text-lg font-medium text-slate-700">Select Criteria</h2>
                </div>
                <CardContent className="p-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Class <span className="text-red-500">*</span></label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="h-9 rounded-md border-slate-300">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Section</label>
                            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                                <SelectTrigger className="h-9 rounded-md border-slate-300 disabled:opacity-50">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Search By Keyword</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search By Student Name, Roll Number, Enroll Number, National Id, Local Id Etc."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    className="h-9 rounded-md border-slate-300 text-sm"
                                />
                                <Button
                                    onClick={handleSearch}
                                    className="h-9 px-4 bg-[#424242] hover:bg-[#333] text-white flex items-center gap-2 rounded-md shrink-0"
                                >
                                    <Search size={14} />
                                    Search
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Student List Section */}
            <Card className="border shadow-sm rounded-none">
                <div className="p-3 border-b bg-white flex justify-between items-center">
                    <h2 className="text-lg font-medium text-slate-700">Student List</h2>
                    <Button onClick={handleSearch} className="h-8 bg-[#424242] text-white hover:bg-[#333] border-none rounded-md">
                        <Search size={14} className="mr-2" /> Search
                    </Button>
                </div>
                <CardContent className="p-0 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b text-slate-700 text-sm">
                                    <th className="px-4 py-3 font-bold">Class</th>
                                    <th className="px-4 py-3 font-bold">Section</th>
                                    <th className="px-4 py-3 font-bold">Student ID</th>
                                    <th className="px-4 py-3 font-bold">Student Name</th>
                                    <th className="px-4 py-3 font-bold">Father Name</th>
                                    <th className="px-4 py-3 font-bold">Date Of Birth</th>
                                    <th className="px-4 py-3 font-bold">Mobile No.</th>
                                    <th className="px-4 py-3 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="border-b text-sm text-slate-600 hover:bg-slate-50">
                                            <td className="px-4 py-3">{student.className}</td>
                                            <td className="px-4 py-3">{student.section}</td>
                                            <td className="px-4 py-3">{student.id.split('_').pop()}</td>
                                            <td className="px-4 py-3">{student.firstName} {student.lastName}</td>
                                            <td className="px-4 py-3">{student.fatherName || '-'}</td>
                                            <td className="px-4 py-3">{student.dob || '-'}</td>
                                            <td className="px-4 py-3">{student.phone || '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="link" className="text-blue-500 h-auto p-0 font-normal">Action</Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <p className="text-red-400 italic text-sm">No data available in table</p>
                                                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                                                    <FolderOpen size={48} className="text-slate-200" />
                                                </div>
                                                <p className="text-[#008d4c] text-sm font-medium">
                                                    ← Add new record or search with different criteria.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-slate-50 border-t text-[11px] text-slate-500">
                        Records: {filteredStudents.length > 0 ? `1 to ${filteredStudents.length} of ${filteredStudents.length}` : '0 to 0 of 0'}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
