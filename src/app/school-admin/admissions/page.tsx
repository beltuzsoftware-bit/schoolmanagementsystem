"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    UserPlus,
    Search,
    Filter,
    Download,
    MoreVertical,
    CheckCircle2,
    Clock,
    XCircle,
    GraduationCap,
    Users,
    Calendar,
    ArrowRight,
    MessageSquare,
    Phone,
    Mail,
    Trash2,
    Upload,
    Settings2,
    Save,
    Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSchools, getStudents, deleteStudent, getAdmissionFormConfigForSchool, updateSchoolAdmissionFieldOverride, getAdmissionApplications, approveAdmissionApplication, deleteAdmissionApplication } from "@/app/actions";
import { Student, StudentFormConfig, AdmissionApplication } from "@/types";
import ImportStudentsModal from "@/components/school-admin/import-students-modal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdmissionsPage() {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [schoolId, setSchoolId] = useState<string>("");
    const [students, setStudents] = useState<Student[]>([]);
    const [applications, setApplications] = useState<AdmissionApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [sessionFilter, setSessionFilter] = useState("all");
    const [school, setSchool] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"applications" | "admitted">("applications");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const fetchStudents = async (sid: string) => {
        setLoading(true);
        const [studentData, applicationData, configData, schools] = await Promise.all([
            getStudents(sid),
            getAdmissionApplications(sid),
            getAdmissionFormConfigForSchool(sid),
            getSchools()
        ]);
        setStudents(studentData);
        setApplications(applicationData);
        setConfig(configData?.config || []);

        const mySchool = schools.find((s: any) => s.id === sid);
        if (mySchool) {
            setSchool(mySchool);
            // Default to current session if none selected
            if (mySchool.currentSession) {
                setSessionFilter(mySchool.currentSession);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                setSchoolId(user.schoolId);
                fetchStudents(user.schoolId);
            }
        } else {
            // Fallback for dev
            getSchools().then(schools => {
                if (schools.length > 0) {
                    setSchoolId(schools[0].id);
                    fetchStudents(schools[0].id);
                }
            });
        }

        const handleSessionChange = () => {
            const activeSession = localStorage.getItem('kummi_active_session');
            if (activeSession) {
                setSessionFilter(activeSession);
            }
        };

        handleSessionChange(); // set initial
        window.addEventListener('session-changed', handleSessionChange);
        return () => window.removeEventListener('session-changed', handleSessionChange);
    }, []);

    const handleEdit = (student: Student) => {
        setSelectedStudent(student);
        if (confirm('Editing is not supported in this view yet.')) {
            // handle edit
        }
    };

    const handleDelete = async (id: string) => {
        const isApplicant = activeTab === 'applications';
        const message = isApplicant
            ? 'Are you sure you want to delete this application? This action cannot be undone.'
            : 'Are you sure you want to delete this student record? This action cannot be undone.';

        if (window.confirm(message)) {
            const res = (isApplicant
                ? await deleteAdmissionApplication(id, schoolId)
                : await deleteStudent(id)) as { success: boolean; error?: string };

            if (res.success) {
                toast.success(isApplicant ? 'Application deleted successfully.' : 'Student record deleted successfully.');
                fetchStudents(schoolId);
            } else {
                toast.error(res.error || (isApplicant ? 'Failed to delete application.' : 'Failed to delete student record.'));
            }
        }
    };



    const handleApprove = async (applicationId: string) => {
        if (confirm('Are you sure you want to approve this application and admit the student?')) {
            const res = await approveAdmissionApplication(applicationId, schoolId);
            if (res.success) {
                toast.success('Application approved! Student has been admitted.');
                fetchStudents(schoolId);
            } else {
                toast.error(res.error || 'Failed to approve application.');
            }
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSession = sessionFilter === 'all' ||
            s.currentSessionId === sessionFilter ||
            s.enrolledSession === sessionFilter;

        return matchesSearch && matchesSession;
    });

    const filteredApplications = applications.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.phone && a.phone.includes(searchQuery));

        const matchesSession = sessionFilter === 'all' ||
            a.session === sessionFilter;

        return matchesSearch && matchesSession;
    });

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <UserPlus className="h-10 w-10 text-indigo-600" strokeWidth={3} />
                        Student Admissions
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsImportModalOpen(true)}
                        variant="outline"
                        className="rounded-2xl h-14 px-6 border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                    </Button>
                    <Link href="/school-admin/admissions/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-8 shadow-xl shadow-indigo-100 font-black">
                            <Plus className="mr-2 h-5 w-5" /> New Admission
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Applications"
                    value={applications.length.toString()}
                    icon={<Clock className="text-orange-600" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="Total Admitted"
                    value={students.length.toString()}
                    icon={<Users className="text-indigo-600" />}
                    color="bg-indigo-50"
                />
            </div>

            {/* List Section */}
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-50">
                    <div className="flex flex-col space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                                <button
                                    onClick={() => setActiveTab('applications')}
                                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'applications' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    New Applications ({filteredApplications.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('admitted')}
                                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'admitted' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Admitted Students ({filteredStudents.length})
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                                {activeTab === 'applications' ? 'Pending & Recent Applications' : 'All Admitted Students'}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        placeholder="Search by name..."
                                        className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium w-64 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                toast.info(`Filtering applications for: ${searchQuery}`);
                                                // The list filters reactively, so this just confirms the action
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" className="rounded-xl border-slate-100 bg-slate-50">
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-black text-slate-400 bg-slate-50 rounded-xl px-4 py-2 whitespace-nowrap">
                                        {activeTab === 'admitted'
                                            ? `${filteredStudents.length} / ${students.length} students`
                                            : `${filteredApplications.length} / ${applications.length} applications`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{config.find(f => f.fieldName === 'className')?.label || 'Applied Class'}</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold italic">
                                            Loading data...
                                        </td>
                                    </tr>
                                ) : (activeTab === 'applications' ? filteredApplications : filteredStudents).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold italic">
                                            No {activeTab} found.
                                        </td>
                                    </tr>
                                ) : (activeTab === 'applications' ? filteredApplications : filteredStudents).map((adm) => (
                                    <tr key={adm.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner group-hover:bg-indigo-100 transition-colors duration-500 overflow-hidden border-2 border-slate-100">
                                                    {(adm as any).photo ? (
                                                        <img src={(adm as any).photo} alt={adm.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        adm.name.charAt(0)
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="font-black text-slate-900 leading-none">{adm.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-black mt-1.5 flex items-center gap-2 uppercase tracking-widest">
                                                        <span className="text-indigo-500">{(adm as any).admissionNumber || 'APPLICANT'}</span> • {adm.gender}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-black text-slate-700">{adm.className || (adm as any).class || (adm as any).classAppliedFor || '—'} {(adm as any).section || ''}</td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-500">{adm.phone}</td>
                                        <td className="px-8 py-5">
                                            <Badge className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none ${adm.status === 'Active' || adm.status === 'Approved' ? 'bg-emerald-500 text-white' :
                                                    adm.status === 'Pending' ? 'bg-orange-500 text-white' : 'bg-rose-500 text-white'
                                                }`}>
                                                {adm.status}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 text-slate-500">
                                                {activeTab === 'applications' && (adm as any).status === 'Pending' && (
                                                    <Button
                                                        onClick={() => handleApprove(adm.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-4"
                                                    >
                                                        <CheckCircle2 size={16} className="mr-2" /> Approve
                                                    </Button>
                                                )}
                                                <Button onClick={() => handleEdit(adm as any)} variant="ghost" size="icon" className="rounded-xl hover:bg-white border border-transparent hover:border-slate-100 shadow-sm transition-all duration-300">
                                                    <Mail size={16} className="text-indigo-400" />
                                                </Button>
                                                <Button onClick={() => handleDelete(adm.id)} variant="ghost" size="icon" className="rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 shadow-sm transition-all duration-300 group/del">
                                                    <Trash2 size={16} className="text-slate-400 group-hover/del:text-rose-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white border border-transparent hover:border-slate-100 shadow-sm transition-all duration-300">
                                                    <MoreVertical size={16} className="text-slate-400" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Info Section */}
            <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group border-none shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-4">
                            <GraduationCap size={20} /> Professional Enrollment
                        </div>
                        <h3 className="text-3xl font-black tracking-tight mb-4">Digitize your Admissions.</h3>
                        <p className="text-slate-400 font-medium text-base leading-relaxed mb-auto">
                            Stop using paper forms. Every student registered here automatically flows into your Students module and Financial systems.
                        </p>
                        <Button variant="ghost" className="w-fit mt-8 rounded-2xl h-12 text-indigo-400 hover:text-white hover:bg-white/10 px-0">
                            Learn more about workflow <ArrowRight size={18} className="ml-2" />
                        </Button>
                    </div>
                </Card>

                <Card className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group border-none shadow-2xl">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32" />
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h3 className="text-3xl font-black tracking-tight">Upcoming Deadlines</h3>
                            <p className="text-indigo-100 font-medium text-sm mt-2">Next phase of enrollment starts soon.</p>
                        </div>
                        <div className="space-y-4">
                            {[
                                { t: 'Early Bird End', d: '25th May' },
                                { t: 'Verification Camp', d: '02nd June' },
                                { t: 'Session Start', d: '15th June' }
                            ].map(item => (
                                <div key={item.t} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <span className="font-bold text-sm tracking-tight">{item.t}</span>
                                    <span className="font-black text-sm uppercase px-3 py-1 bg-white/20 rounded-lg">{item.d}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>



            {isImportModalOpen && (
                <ImportStudentsModal
                    schoolId={schoolId}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => fetchStudents(schoolId)}
                />
            )}

        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <Card className={`rounded-3xl border-none shadow-sm ${color} p-8 flex flex-col justify-between h-44 hover:shadow-xl hover:-translate-y-1 transition-all duration-500`}>
            <div className="flex items-center justify-between">
                <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
            </div>
            <div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-60">{title}</div>
            </div>
        </Card>
    );
}

