"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
    Award, 
    Printer, 
    Download, 
    FileCheck, 
    Sparkles, 
    Search, 
    Eye, 
    Check, 
    User,
    Loader2
} from "lucide-react";
import { getIDCardsPageData } from "@/app/actions";
import { Student, School } from "@/types";

export default function CertificatesPage() {
    const [loading, setLoading] = useState(true);
    const [school, setSchool] = useState<School | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Certificate Type: 'tc' (Transfer Certificate) | 'merit' (Merit & Achievement)
    const [certType, setCertType] = useState<'tc' | 'merit'>('tc');
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    // Filters
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // TC Config Fields
    const [tcSerialNo, setTcSerialNo] = useState("TC-2024-001");
    const [tcReason, setTcReason] = useState("Parent's transfer / Relocation");
    const [tcConduct, setTcConduct] = useState("Good");
    const [tcDateOfLeaving, setTcDateOfLeaving] = useState(new Date().toISOString().slice(0, 10));

    // Merit Config Fields
    const [meritTitle, setMeritTitle] = useState("CERTIFICATE OF EXCELLENCE");
    const [meritReason, setMeritReason] = useState("Securing 1st Rank in Academic Excellence for Session 2024-25");

    const [isDownloading, setIsDownloading] = useState(false);
    const certRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getIDCardsPageData("s_1782211560310");
                setSchool(data.school);
                setStudents(data.students || []);
                if (data.students && data.students.length > 0) {
                    setSelectedStudentId(data.students[0].id);
                }
            } catch (e: any) {
                console.error("Failed to load data:", e);
                toast.error("Failed to load student data");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const uniqueClasses = Array.from(new Set(students.map(s => s.className).filter(Boolean))) as string[];

    const filteredStudents = students.filter(s => {
        if (selectedClass !== "all" && s.className !== selectedClass) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = (s.name || "").toLowerCase().includes(q);
            const admMatch = (s.admissionNumber || "").toLowerCase().includes(q);
            if (!nameMatch && !admMatch) return false;
        }
        return true;
    });

    const activeStudent = students.find(s => s.id === selectedStudentId) || filteredStudents[0] || null;

    // Print Certificate
    const handlePrint = () => {
        window.print();
    };

    // Download PNG Certificate
    const handleDownload = async () => {
        if (!certRef.current || !activeStudent) return;
        setIsDownloading(true);
        toast.info("Generating high-resolution certificate...");

        try {
            const { domToPng } = await import("modern-screenshot");
            const dataUrl = await domToPng(certRef.current, { scale: 3, backgroundColor: "#ffffff" });
            const a = document.createElement("a");
            a.href = dataUrl;
            const safeName = (activeStudent.name || "Student").replace(/[^a-zA-Z0-9]/g, "_");
            a.download = `${certType.toUpperCase()}_Certificate_${safeName}.png`;
            a.click();
            toast.success("Certificate downloaded successfully!");
        } catch (e: any) {
            console.error("Download error:", e);
            toast.error("Failed to download certificate image");
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Award className="w-6 h-6 text-amber-500" /> Transfer & Merit Certificate Generator
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Issue official Transfer Certificates (TC) and Academic Achievement Certificates with school seal.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={!activeStudent || isDownloading}
                        onClick={handleDownload}
                        className="gap-2 font-bold text-xs h-9 border-slate-300"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Certificate (PNG)
                    </Button>
                    <Button
                        disabled={!activeStudent}
                        onClick={handlePrint}
                        className="gap-2 font-bold text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> Print Certificate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
                {/* Left Sidebar: Controls */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Certificate Type Picker */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-800">Certificate Format</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <button
                                onClick={() => setCertType('tc')}
                                className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border ${
                                    certType === 'tc'
                                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                📜 Transfer Certificate (TC)
                            </button>
                            <button
                                onClick={() => setCertType('merit')}
                                className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border ${
                                    certType === 'merit'
                                        ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                🏆 Certificate of Merit & Award
                            </button>
                        </CardContent>
                    </Card>

                    {/* Student Selector */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-800">Select Student</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Filter by Class</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="All Classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {uniqueClasses.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Student</Label>
                                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="Choose student..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        {filteredStudents.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="text-xs">
                                                {s.name} ({s.admissionNumber})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Certificate Fields */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-800">
                                {certType === 'tc' ? 'TC Configuration' : 'Award Details'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            {certType === 'tc' ? (
                                <>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">Serial No</Label>
                                        <Input
                                            value={tcSerialNo}
                                            onChange={e => setTcSerialNo(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">Reason for Leaving</Label>
                                        <Input
                                            value={tcReason}
                                            onChange={e => setTcReason(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">General Conduct</Label>
                                        <Input
                                            value={tcConduct}
                                            onChange={e => setTcConduct(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">Date of Leaving</Label>
                                        <Input
                                            type="date"
                                            value={tcDateOfLeaving}
                                            onChange={e => setTcDateOfLeaving(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">Award Title</Label>
                                        <Input
                                            value={meritTitle}
                                            onChange={e => setMeritTitle(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-bold text-slate-600">Achievement Text</Label>
                                        <Input
                                            value={meritReason}
                                            onChange={e => setMeritReason(e.target.value)}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Live Certificate Preview Canvas */}
                <div className="lg:col-span-3 flex justify-center p-6 bg-slate-100/70 border border-slate-200 rounded-xl overflow-x-auto">
                    {activeStudent && (
                        <div
                            ref={certRef}
                            id="certificate-render-view"
                            className="bg-white shadow-xl relative"
                            style={{
                                width: "840px",
                                minHeight: certType === 'tc' ? "1050px" : "600px",
                                padding: "40px",
                                boxSizing: "border-box"
                            }}
                        >
                            {certType === 'tc' ? (
                                /* ─── TRANSFER CERTIFICATE (TC) ─── */
                                <div className="border-4 border-double border-slate-800 p-8 h-full flex flex-col justify-between text-slate-900 font-serif">
                                    {/* Header */}
                                    <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            {school?.logo && (
                                                <img src={school.logo} alt="Logo" className="w-16 h-16 object-contain" />
                                            )}
                                            <div>
                                                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">
                                                    {school?.name || "HERITAGE MODEL SCHOOL"}
                                                </h2>
                                                <p className="text-xs font-sans text-slate-600">
                                                    Recognized by Directorate of Education | Affiliation No: 2130894
                                                </p>
                                                <p className="text-xs font-sans text-slate-500">
                                                    {school?.address || "Main Campus, City Center Road, Pin: 400001"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inline-block border-2 border-slate-800 px-6 py-1 rounded-full font-black text-sm uppercase tracking-widest bg-slate-50 mt-2">
                                            TRANSFER CERTIFICATE / SCHOOL LEAVING CERTIFICATE
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-600 mt-4 px-2">
                                            <span>TC No: <span className="font-mono text-slate-900">{tcSerialNo}</span></span>
                                            <span>Admission No: <span className="font-mono text-slate-900">{activeStudent.admissionNumber}</span></span>
                                        </div>
                                    </div>

                                    {/* TC Body Questions Table */}
                                    <div className="space-y-3 text-xs leading-relaxed font-sans">
                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">1.</span>
                                            <span className="w-64 text-slate-600">Name of Pupil:</span>
                                            <span className="font-bold text-slate-900 uppercase font-serif text-sm">{activeStudent.name}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">2.</span>
                                            <span className="w-64 text-slate-600">Father's / Guardian's Name:</span>
                                            <span className="font-bold text-slate-900 uppercase">{activeStudent.fatherName || "—"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">3.</span>
                                            <span className="w-64 text-slate-600">Mother's Name:</span>
                                            <span className="font-semibold text-slate-900 uppercase">{activeStudent.motherName || "—"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">4.</span>
                                            <span className="w-64 text-slate-600">Nationality & Religion:</span>
                                            <span className="font-semibold text-slate-900">Indian</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">5.</span>
                                            <span className="w-64 text-slate-600">Whether belongs to SC/ST/OBC:</span>
                                            <span className="font-semibold text-slate-900">{activeStudent.category || "General"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">6.</span>
                                            <span className="w-64 text-slate-600">Date of First Admission:</span>
                                            <span className="font-semibold text-slate-900">{activeStudent.admissionDate || "01-04-2022"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">7.</span>
                                            <span className="w-64 text-slate-600">Date of Birth (according to records):</span>
                                            <span className="font-bold text-slate-900">{activeStudent.dob || "—"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">8.</span>
                                            <span className="w-64 text-slate-600">Class in which pupil last studied:</span>
                                            <span className="font-bold text-slate-900">{activeStudent.className || "Class 10"}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">9.</span>
                                            <span className="w-64 text-slate-600">Subjects Studied:</span>
                                            <span className="font-semibold text-slate-900">English, Mathematics, Science, Social Science, Hindi</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">10.</span>
                                            <span className="w-64 text-slate-600">Whether qualified for promotion:</span>
                                            <span className="font-bold text-slate-900 text-emerald-700">Yes, Promoted</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">11.</span>
                                            <span className="w-64 text-slate-600">Date of Pupil's Leaving:</span>
                                            <span className="font-semibold text-slate-900">{tcDateOfLeaving}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">12.</span>
                                            <span className="w-64 text-slate-600">Reason for Leaving:</span>
                                            <span className="font-semibold text-slate-900">{tcReason}</span>
                                        </div>

                                        <div className="flex border-b border-dotted border-slate-300 pb-1">
                                            <span className="w-8 font-bold">13.</span>
                                            <span className="w-64 text-slate-600">General Conduct:</span>
                                            <span className="font-bold text-slate-900">{tcConduct}</span>
                                        </div>
                                    </div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs font-sans">
                                        <div>
                                            <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
                                                <span className="text-[10px] text-slate-400 italic">Class Teacher Sign</span>
                                            </div>
                                            <span className="font-bold uppercase text-slate-700 block mt-1">Class Teacher</span>
                                        </div>

                                        <div>
                                            <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
                                                <span className="text-[10px] text-slate-400 italic">Office Stamp / Seal</span>
                                            </div>
                                            <span className="font-bold uppercase text-slate-700 block mt-1">Checked By (Clerk)</span>
                                        </div>

                                        <div>
                                            <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
                                                {school?.signature ? (
                                                    <img src={school.signature} alt="Principal" className="h-10 object-contain" />
                                                ) : (
                                                    <span className="font-serif italic font-bold text-slate-800">Principal</span>
                                                )}
                                            </div>
                                            <span className="font-bold uppercase text-slate-900 block mt-1">Principal / Headmaster</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ─── MERIT & AWARD CERTIFICATE ─── */
                                <div className="border-[12px] border-amber-600/30 p-8 h-full flex flex-col justify-between text-center relative bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20">
                                    <div className="border-2 border-amber-600 p-8 flex flex-col justify-between h-full relative">
                                        {/* Corner Ornaments */}
                                        <div className="absolute top-2 left-2 text-amber-600 font-serif text-lg">✦</div>
                                        <div className="absolute top-2 right-2 text-amber-600 font-serif text-lg">✦</div>
                                        <div className="absolute bottom-2 left-2 text-amber-600 font-serif text-lg">✦</div>
                                        <div className="absolute bottom-2 right-2 text-amber-600 font-serif text-lg">✦</div>

                                        {/* Header */}
                                        <div>
                                            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 mx-auto flex items-center justify-center text-amber-600 mb-2">
                                                <Award className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-600">
                                                {school?.name || "HERITAGE MODEL SCHOOL"}
                                            </h3>
                                            <h2 className="text-3xl font-black text-amber-700 tracking-wider font-serif uppercase mt-1">
                                                {meritTitle}
                                            </h2>
                                            <div className="w-32 h-1 bg-amber-500 mx-auto mt-2 mb-4 rounded-full" />
                                        </div>

                                        {/* Body */}
                                        <div className="my-4 space-y-3">
                                            <p className="text-sm text-slate-500 italic font-serif">This certificate is proudly awarded to</p>
                                            <h1 className="text-3xl font-black text-slate-900 uppercase font-serif tracking-wide border-b-2 border-amber-400/60 inline-block px-8 pb-1">
                                                {activeStudent.name}
                                            </h1>
                                            <p className="text-xs text-slate-600 font-sans mt-2">
                                                Class: <span className="font-bold text-slate-900">{activeStudent.className || "Class 10"} - {activeStudent.section || "A"}</span> | Admission No: <span className="font-mono font-bold text-slate-900">{activeStudent.admissionNumber}</span>
                                            </p>
                                            <p className="text-sm text-slate-700 max-w-lg mx-auto font-sans leading-relaxed pt-2">
                                                {meritReason}
                                            </p>
                                        </div>

                                        {/* Signatures */}
                                        <div className="grid grid-cols-2 gap-12 pt-8 text-xs font-sans max-w-md mx-auto w-full">
                                            <div>
                                                <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                                                    <span className="text-[10px] text-slate-400 font-mono italic">Date: {new Date().toLocaleDateString()}</span>
                                                </div>
                                                <span className="font-bold uppercase text-slate-700 block mt-1">Date of Issue</span>
                                            </div>
                                            <div>
                                                <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                                                    {school?.signature ? (
                                                        <img src={school.signature} alt="Signature" className="h-9 object-contain" />
                                                    ) : (
                                                        <span className="font-serif italic font-bold text-slate-800">Principal</span>
                                                    )}
                                                </div>
                                                <span className="font-bold uppercase text-slate-900 block mt-1">Principal Signature</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #certificate-render-view, #certificate-render-view * { visibility: visible !important; }
                    #certificate-render-view {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
