"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX, Search, RotateCcw, Eye } from "lucide-react";
import { searchStudents, enableStudent } from "@/app/actions";
import { Student } from "@/types";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DisabledStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDisabledStudents = async (schoolId: string) => {
        setLoading(true);
        try {
            const results = await searchStudents(schoolId, { status: "Disabled" }) as Student[];
            setStudents(results || []);
        } catch (error) {
            toast.error("Failed to load disabled students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                fetchDisabledStudents(user.schoolId);
            }
        }
    }, []);
    
    const handleReactivate = async (studentId: string) => {
        try {
            const res = await enableStudent(studentId, "Reactivated from Archive");
            if (res.success) {
                toast.success("Student reactivated successfully!");
                // Refresh list
                const storedUser = localStorage.getItem('kummi_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    fetchDisabledStudents(user.schoolId);
                }
            } else {
                toast.error(res.error || "Failed to reactivate");
            }
        } catch (error) {
            toast.error("An error occurred during reactivation");
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <UserX className="h-10 w-10 text-rose-600" strokeWidth={3} />
                        Disabled Students
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Archived student records that currently have no portal access.
                    </p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by name or ID..." 
                        className="pl-10 h-11 rounded-xl border-slate-200 focus:ring-rose-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
            ) : filteredStudents.length > 0 ? (
                <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Admission ID</TableHead>
                                <TableHead className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Student Name</TableHead>
                                <TableHead className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Class/Section</TableHead>
                                <TableHead className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Status</TableHead>
                                <TableHead className="text-right font-extrabold text-slate-900 uppercase text-xs tracking-wider">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 font-bold text-slate-700">{student.admissionNumber}</td>
                                    <td className="py-4 px-4">
                                        <div className="font-bold text-slate-900 leading-none">{student.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{student.id}</div>
                                    </td>
                                    <td className="py-4 px-4 font-medium text-slate-600">
                                        {student.className} {student.section ? `(${student.section})` : ""}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 border border-rose-200">
                                            Disabled
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100" title="View Profile">
                                                <Eye className="h-4 w-4 text-slate-600" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-full hover:bg-rose-50" 
                                                title="Reactivate"
                                                onClick={() => handleReactivate(student.id)}
                                            >
                                                <RotateCcw className="h-4 w-4 text-rose-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white min-h-[400px] flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <UserX className="h-10 w-10 text-slate-400" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-800 mb-4">No Disabled Records</CardTitle>
                    <CardContent className="max-w-md text-slate-500 font-medium">
                        {searchQuery ? "No disabled students match your search criteria." : "There are currently no disabled student records in your database. When a student is disabled, they will appear here for archive or reactivation."}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
