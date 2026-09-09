"use client";

import React from "react";
import { Student, School } from "@/types";
import { StudentPhoto } from "@/components/ui/student-photo";
import QRCode from "react-qr-code";

export interface ExamScheduleItem {
    date: string;
    day: string;
    subject: string;
    time: string;
    room?: string;
}

interface AdmitCardProps {
    student: Student;
    school: School | null;
    examTitle: string;
    examCenter: string;
    schedule: ExamScheduleItem[];
    instructions?: string[];
    scale?: number;
}

export const DEFAULT_EXAM_INSTRUCTIONS = [
    "Students must report to the examination center at least 15 minutes before the scheduled time.",
    "Entry into the examination hall without this Admit Card and School ID is strictly prohibited.",
    "Any electronic gadgets (mobile phones, smartwatches, calculators) are strictly forbidden.",
    "Candidates must bring their own stationery (blue/black pens, pencils, geometry box).",
    "Maintain complete silence and discipline inside the exam hall."
];

export function AdmitCardPreview({
    student,
    school,
    examTitle = "Final Term Examination 2024-25",
    examCenter = "Main Campus - Block A",
    schedule = [],
    instructions = DEFAULT_EXAM_INSTRUCTIONS,
    scale = 1
}: AdmitCardProps) {
    return (
        <div
            className="bg-white border-2 border-slate-800 rounded-lg p-6 shadow-md text-slate-900 font-sans print:shadow-none print:border-slate-800"
            style={{
                width: `${750 * scale}px`,
                transformOrigin: "top left",
            }}
        >
            {/* Header with School Crest & Title */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-4">
                    {school?.logo ? (
                        <img src={school.logo} alt="Logo" className="w-16 h-16 object-contain" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xl text-slate-700">
                            {school?.name ? school.name.charAt(0) : "S"}
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                            {school?.name || "HERITAGE MODEL SCHOOL"}
                        </h2>
                        <p className="text-xs font-semibold text-slate-600">
                            {school?.address || "CBSE Affiliation No: 2130894 | School Code: 70124"}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                            {(school as any)?.phone ? `Contact: ${(school as any).phone}` : "Email: contact@school.edu | Web: kummi.school"}
                        </p>
                    </div>
                </div>

                <div className="text-right flex flex-col items-end">
                    <span className="bg-slate-900 text-white text-xs font-extrabold px-3 py-1 rounded uppercase tracking-widest mb-1">
                        Hall Ticket
                    </span>
                    <span className="text-xs font-bold text-indigo-700">
                        Roll No: <span className="text-base text-slate-900 font-mono font-black">{student.rollNumber || student.admissionNumber}</span>
                    </span>
                </div>
            </div>

            {/* Exam Badge Header */}
            <div className="bg-slate-100 border border-slate-300 rounded p-2.5 text-center mb-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">
                    {examTitle}
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Exam Center: <span className="font-bold text-slate-800">{examCenter}</span>
                </p>
            </div>

            {/* Student Info & Photo Layout */}
            <div className="flex gap-6 items-start mb-5">
                {/* Details Table */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs border border-slate-200 rounded p-3 bg-slate-50/50">
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Student Name</span>
                        <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Admission No</span>
                        <span className="font-mono font-bold text-slate-900">{student.admissionNumber}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Class & Section</span>
                        <span className="font-bold text-slate-900">{student.className || "Class 10"} - {student.section || "A"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Father / Guardian</span>
                        <span className="font-semibold text-slate-800">{student.fatherName || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Date of Birth</span>
                        <span className="font-semibold text-slate-800">{student.dob || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Gender</span>
                        <span className="font-semibold text-slate-800">{student.gender || "—"}</span>
                    </div>
                </div>

                {/* Photo & QR */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-28 h-32 rounded border-2 border-slate-800 overflow-hidden bg-white shadow-sm flex items-center justify-center">
                        <StudentPhoto src={student.photo} alt={student.name} />
                    </div>
                    <div className="p-1 bg-white border border-slate-200 rounded">
                        <QRCode value={`STUDENT:${student.id}|ADM:${student.admissionNumber}|ROLL:${student.rollNumber}`} size={50} />
                    </div>
                </div>
            </div>

            {/* Timetable Schedule Table */}
            <div className="mb-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Examination Schedule</span>
                    <span className="text-[10px] text-slate-400 font-normal">Candidate must verify subjects</span>
                </h4>
                <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                        <tr>
                            <th className="border border-slate-600 px-3 py-1.5 text-left w-12">#</th>
                            <th className="border border-slate-600 px-3 py-1.5 text-left">Date & Day</th>
                            <th className="border border-slate-600 px-3 py-1.5 text-left">Subject</th>
                            <th className="border border-slate-600 px-3 py-1.5 text-left">Timing</th>
                            <th className="border border-slate-600 px-3 py-1.5 text-center w-24">Invigilator Sign</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {schedule.length > 0 ? (
                            schedule.map((item, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600">{idx + 1}</td>
                                    <td className="border border-slate-300 px-3 py-1.5 font-medium">{item.date} ({item.day})</td>
                                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-900">{item.subject}</td>
                                    <td className="border border-slate-300 px-3 py-1.5 text-slate-600">{item.time}</td>
                                    <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-300 font-mono">______</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-3 text-slate-400 italic">No exam subjects configured</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Candidate Instructions */}
            <div className="border border-slate-200 bg-slate-50/70 rounded p-3 mb-6 text-[10px] text-slate-600">
                <span className="font-bold text-slate-800 uppercase block mb-1">Important Instructions for Candidates:</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                    {instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                    ))}
                </ol>
            </div>

            {/* Signatures Footer */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 text-center text-xs">
                <div>
                    <div className="h-10 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                        <span className="text-[10px] text-slate-400 italic font-mono">Candidate Signature</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-600 mt-1 block">Student Signature</span>
                </div>

                <div>
                    <div className="h-10 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                        <span className="text-[10px] text-slate-400 italic font-mono">Exam Controller</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-600 mt-1 block">Center Superintendent</span>
                </div>

                <div>
                    <div className="h-10 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                        {school?.signature ? (
                            <img src={school.signature} alt="Principal" className="h-9 object-contain" />
                        ) : (
                            <span className="text-[11px] font-bold font-serif text-slate-800 italic">Principal</span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-900 mt-1 block">Principal / Headmaster</span>
                </div>
            </div>
        </div>
    );
}
