"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
    Printer, 
    Download, 
    Calendar, 
    Search, 
    Plus, 
    Trash2, 
    Users, 
    FileText, 
    Loader2, 
    CheckSquare, 
    Square, 
    Sparkles,
    Eye
} from "lucide-react";
import { getIDCardsPageData } from "@/app/actions";
import { Student, School } from "@/types";
import { AdmitCardPreview, ExamScheduleItem, DEFAULT_EXAM_INSTRUCTIONS } from "@/components/school-admin/admit-card-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const DEFAULT_SCHEDULE: ExamScheduleItem[] = [
    { date: "2024-10-14", day: "Monday", subject: "English Language & Literature", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { date: "2024-10-16", day: "Wednesday", subject: "Mathematics", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { date: "2024-10-18", day: "Friday", subject: "Science (Physics, Chem, Bio)", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { date: "2024-10-21", day: "Monday", subject: "Social Science", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { date: "2024-10-23", day: "Wednesday", subject: "Hindi Course-A / Regional", time: "09:30 AM - 12:30 PM", room: "Hall A" },
];

export default function AdmitCardsPage() {
    const [loading, setLoading] = useState(true);
    const [school, setSchool] = useState<School | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Filters
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSection, setSelectedSection] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Exam Config
    const [examTitle, setExamTitle] = useState("Final Term Examination 2024-25");
    const [examCenter, setExamCenter] = useState("Heritage Model School - Main Hall");
    const [schedule, setSchedule] = useState<ExamScheduleItem[]>(DEFAULT_SCHEDULE);

    // Preview Dialog
    const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

    // ZIP & Print States
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);

    const printContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getIDCardsPageData("s_1782211560310");
                setSchool(data.school);
                setStudents(data.students || []);
            } catch (e: any) {
                console.error("Failed to load students:", e);
                toast.error("Failed to load students list");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Unique Classes & Sections
    const uniqueClasses = Array.from(new Set(students.map(s => s.className).filter(Boolean))) as string[];
    const uniqueSections = Array.from(new Set(students.map(s => s.section).filter(Boolean))) as string[];

    // Filtered list
    const filteredStudents = students.filter(s => {
        if (selectedClass !== "all" && s.className !== selectedClass) return false;
        if (selectedSection !== "all" && s.section !== selectedSection) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = (s.name || "").toLowerCase().includes(q);
            const admMatch = (s.admissionNumber || "").toLowerCase().includes(q);
            const rollMatch = (s.rollNumber || "").toLowerCase().includes(q);
            if (!nameMatch && !admMatch && !rollMatch) return false;
        }
        return true;
    });

    const handleToggleSelectAll = () => {
        if (selectedStudentIds.size === filteredStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleToggleStudent = (id: string) => {
        const next = new Set(selectedStudentIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedStudentIds(next);
    };

    // Print Selected
    const handlePrintSelected = () => {
        const toPrint = filteredStudents.filter(s => selectedStudentIds.has(s.id));
        if (toPrint.length === 0) {
            toast.error("Please select at least one student");
            return;
        }
        setStudentsToPrint(toPrint);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    // Download ZIP
    const handleDownloadZip = async () => {
        const toDownload = filteredStudents.filter(s => selectedStudentIds.has(s.id));
        if (toDownload.length === 0) {
            toast.error("Please select at least one student");
            return;
        }

        setIsDownloadingZip(true);
        toast.info(`Generating ${toDownload.length} Admit Card images...`);

        try {
            const [{ domToPng }, JSZip] = await Promise.all([
                import("modern-screenshot"),
                import("jszip").then(m => m.default)
            ]);

            const zip = new JSZip();
            const container = document.getElementById("admit-card-zip-render");
            if (!container) throw new Error("Render container not found");

            container.style.left = "0";
            container.style.top = "-99999px";

            // Wait for images to load
            await new Promise<void>(resolve => {
                const imgs = Array.from(container.querySelectorAll("img"));
                const pending = imgs.filter(img => !img.complete);
                if (pending.length === 0) { resolve(); return; }
                let count = 0;
                const done = () => { if (++count >= pending.length) resolve(); };
                pending.forEach(img => {
                    img.addEventListener("load", done, { once: true });
                    img.addEventListener("error", done, { once: true });
                });
                setTimeout(resolve, 4000);
            });

            const cards = Array.from(container.querySelectorAll("[data-admit-card]")) as HTMLElement[];

            for (let i = 0; i < cards.length; i++) {
                const cardEl = cards[i];
                const student = toDownload[i];
                if (!student) continue;

                const dataUrl = await domToPng(cardEl, { scale: 3, backgroundColor: "#ffffff" });
                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const safeName = (student.name || `Student_${i + 1}`).replace(/[^a-zA-Z0-9]/g, "_");
                const safeAdm = (student.admissionNumber || "").replace(/[^a-zA-Z0-9]/g, "_");
                zip.file(`${i + 1}_${safeName}_${safeAdm}_AdmitCard.png`, base64Data, { base64: true });
            }

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Admit_Cards_${examTitle.replace(/[^a-zA-Z0-9]/g, "_")}.zip`;
            a.click();
            toast.success(`Downloaded ${toDownload.length} Admit Cards in ZIP!`);
        } catch (e: any) {
            console.error("ZIP Generation error:", e);
            toast.error(e.message || "Failed to generate Admit Cards ZIP");
        } finally {
            setIsDownloadingZip(false);
            const container = document.getElementById("admit-card-zip-render");
            if (container) {
                container.style.left = "-99999px";
            }
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
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" /> Exam Admit Cards & Hall Tickets
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Generate, print, and bulk export official examination admit cards for students.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={selectedStudentIds.size === 0 || isDownloadingZip}
                        onClick={handleDownloadZip}
                        className="gap-2 font-bold text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        {isDownloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download ZIP ({selectedStudentIds.size})
                    </Button>
                    <Button
                        disabled={selectedStudentIds.size === 0}
                        onClick={handlePrintSelected}
                        className="gap-2 font-bold text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> Print Selected ({selectedStudentIds.size})
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
                {/* Left Column: Exam Configuration */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-800">Exam Details</CardTitle>
                            <CardDescription className="text-xs">Customize exam name and center</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Exam Title</Label>
                                <Input
                                    value={examTitle}
                                    onChange={(e) => setExamTitle(e.target.value)}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Exam Center / Venue</Label>
                                <Input
                                    value={examCenter}
                                    onChange={(e) => setExamCenter(e.target.value)}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Filter Card */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-800">Student Filter</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Class</Label>
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
                                <Label className="text-[11px] font-bold text-slate-600">Section</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="All Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {uniqueSections.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-slate-600">Search</Label>
                                <Input
                                    placeholder="Name or Adm No..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Students Table */}
                <div className="lg:col-span-3">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800">Eligible Candidates ({filteredStudents.length})</CardTitle>
                                <CardDescription className="text-xs">Select candidates to generate and print admit cards</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToggleSelectAll}
                                    className="h-8 text-xs font-bold"
                                >
                                    {selectedStudentIds.size === filteredStudents.length ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left w-10">
                                                <Checkbox
                                                    checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                                                    onCheckedChange={handleToggleSelectAll}
                                                />
                                            </th>
                                            <th className="px-3 py-2.5 text-left">Adm No</th>
                                            <th className="px-3 py-2.5 text-left">Roll No</th>
                                            <th className="px-3 py-2.5 text-left">Candidate Name</th>
                                            <th className="px-3 py-2.5 text-left">Class-Section</th>
                                            <th className="px-3 py-2.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3 py-2">
                                                    <Checkbox
                                                        checked={selectedStudentIds.has(student.id)}
                                                        onCheckedChange={() => handleToggleStudent(student.id)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 font-mono font-bold text-slate-800">{student.admissionNumber}</td>
                                                <td className="px-3 py-2 font-mono text-slate-600">{student.rollNumber || "—"}</td>
                                                <td className="px-3 py-2 font-bold text-slate-900">{student.name}</td>
                                                <td className="px-3 py-2 text-slate-600">{student.className || "—"} - {student.section || "—"}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPreviewStudent(student)}
                                                        className="h-7 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Preview
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Single Student Preview Dialog */}
            <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Admit Card Preview</DialogTitle>
                        <DialogDescription className="text-xs">
                            Verify the candidate details and examination schedule before printing.
                        </DialogDescription>
                    </DialogHeader>

                    {previewStudent && (
                        <div className="flex justify-center p-4 bg-slate-100 rounded-lg overflow-x-auto">
                            <AdmitCardPreview
                                student={previewStudent}
                                school={school}
                                examTitle={examTitle}
                                examCenter={examCenter}
                                schedule={schedule}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Offscreen ZIP Capture Container */}
            <div
                id="admit-card-zip-render"
                style={{ position: "absolute", left: "-99999px", top: "0" }}
            >
                {filteredStudents.filter(s => selectedStudentIds.has(s.id)).map(student => (
                    <div key={student.id} data-admit-card="true" className="mb-4 bg-white p-2">
                        <AdmitCardPreview
                            student={student}
                            school={school}
                            examTitle={examTitle}
                            examCenter={examCenter}
                            schedule={schedule}
                        />
                    </div>
                ))}
            </div>

            {/* Printable Container (Shown during window.print) */}
            <div id="printable-admit-cards" className="hidden print:block">
                {studentsToPrint.map(student => (
                    <div key={student.id} className="admit-card-page-break p-4 bg-white">
                        <AdmitCardPreview
                            student={student}
                            school={school}
                            examTitle={examTitle}
                            examCenter={examCenter}
                            schedule={schedule}
                        />
                    </div>
                ))}
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #printable-admit-cards, #printable-admit-cards * { visibility: visible !important; }
                    #printable-admit-cards {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: block !important;
                    }
                    .admit-card-page-break {
                        page-break-after: always !important;
                        break-after: page !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                    }
                    .admit-card-page-break:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
