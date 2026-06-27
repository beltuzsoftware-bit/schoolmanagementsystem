'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export interface FeeRow {
    id: string;
    feesName: string;
    dueDate: string;
    status: 'Unpaid' | 'Paid' | 'Partial';
    amount: number;
    paymentId?: string;
    mode?: string;
    date?: string;
    discount: number;
    fine: number;
    paid: number;
    balance: number;
}

export interface StudentProfile {
    id: string;
    name: string;
    fatherName?: string;
    phone?: string;
    category?: string;
    className?: string;
    section?: string;
    admissionNumber?: string;
    rollNumber?: string;
    rte?: string;
    photo?: string;
}

interface StudentFeesTemplateProps {
    student: StudentProfile;
    feeRows: FeeRow[];
    onCollect?: (selectedIds: string[]) => void;
    onRowAction?: (row: FeeRow) => void;
}

export default function StudentFeesTemplate({
    student,
    feeRows,
    onCollect,
    onRowAction,
}: StudentFeesTemplateProps) {
    const router = useRouter();
    const [selectedRows, setSelectedRows] = useState<string[]>([]);

    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const toggleRow = (id: string) =>
        setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

    const toggleAll = () =>
        setSelectedRows(selectedRows.length === feeRows.length ? [] : feeRows.map(r => r.id));

    return (
        <div className="p-4 bg-[#f4f4f4] min-h-screen font-sans space-y-4">

            {/* ── YELLOW SECTION: Student Profile ───────────────────────── */}
            <div className="bg-white border-2 border-[#f5a623] rounded-sm">

                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#f5a623]">
                    <h2 className="font-semibold text-slate-700 text-base">Student Fees</h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                        ← Back
                    </Button>
                </div>

                {/* Profile row */}
                <div className="flex items-start gap-5 p-4">
                    {/* Photo */}
                    <div className="w-20 h-20 rounded border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-100 shrink-0">
                        {student.photo ? (
                            <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                            <svg viewBox="0 0 80 80" className="w-16 h-16 text-slate-400" fill="currentColor">
                                <circle cx="40" cy="28" r="16" />
                                <path d="M10 72c0-16.6 13.4-30 30-30s30 13.4 30 30" />
                            </svg>
                        )}
                    </div>

                    {/* Info grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                        <div>
                            <p className="text-slate-500 text-xs">Name</p>
                            <p className="font-semibold text-slate-800">{student.name}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Class (Section)</p>
                            <p className="font-semibold text-slate-800">
                                {student.className || '-'}{student.section ? ` (${student.section})` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Father Name</p>
                            <p className="font-semibold text-blue-600">{student.fatherName || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Student ID</p>
                            <p className="font-semibold text-slate-800">{student.admissionNumber || student.id?.split('_').pop()}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Mobile Number</p>
                            <p className="font-semibold text-slate-800">{student.phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Roll Number</p>
                            <p className="font-semibold text-slate-800">{student.rollNumber || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Category</p>
                            <p className="font-semibold text-slate-800">{student.category || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">RTE</p>
                            <p className={`font-bold ${student.rte === 'Yes' ? 'text-green-600' : 'text-red-500'}`}>
                                {student.rte || 'No'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-[#f5a623] bg-[#fffef5]">
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-400 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                            onClick={() => window.print()}
                        >
                            <Printer size={13} /> Print Selected
                        </Button>
                        <Button
                            size="sm"
                            disabled={selectedRows.length === 0}
                            onClick={() => onCollect?.(selectedRows)}
                            className="h-7 text-xs bg-[#f5a623] hover:bg-[#e09610] text-white"
                        >
                            Collect Selected
                        </Button>
                    </div>
                    <span className="text-xs text-slate-500">Date: {today}</span>
                </div>
            </div>

            {/* ── RED SECTION: Fees Table ────────────────────────────────── */}
            <div className="bg-white border-2 border-[#e53935] rounded-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                <th className="px-3 py-3 w-8">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.length === feeRows.length && feeRows.length > 0}
                                        onChange={toggleAll}
                                        className="cursor-pointer"
                                    />
                                </th>
                                <th className="px-3 py-3 font-bold">Fees</th>
                                <th className="px-3 py-3 font-bold">Due Date</th>
                                <th className="px-3 py-3 font-bold">Status</th>
                                <th className="px-3 py-3 font-bold text-right">Amount (₹)</th>
                                <th className="px-3 py-3 font-bold">Payment ID</th>
                                <th className="px-3 py-3 font-bold">Mode</th>
                                <th className="px-3 py-3 font-bold">Date</th>
                                <th className="px-3 py-3 font-bold text-right">Discount (₹)</th>
                                <th className="px-3 py-3 font-bold text-right">Fine (₹)</th>
                                <th className="px-3 py-3 font-bold text-right">Paid (₹)</th>
                                <th className="px-3 py-3 font-bold text-right">Balance (₹)</th>
                                <th className="px-3 py-3 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeRows.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-10 text-center text-slate-400">
                                        No fee records found for this student.
                                    </td>
                                </tr>
                            ) : (
                                feeRows.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b text-slate-700 transition-colors ${
                                            idx === 0 ? 'bg-red-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                                className="cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-3 py-2 font-medium text-blue-700">{row.feesName}</td>
                                        <td className="px-3 py-2">{row.dueDate || '-'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                row.status === 'Paid'    ? 'bg-green-100 text-green-700' :
                                                row.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-600'
                                            }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">{row.amount.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.paymentId || '-'}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.mode || '-'}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.date || '-'}</td>
                                        <td className="px-3 py-2 text-right">{row.discount.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">{row.fine.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">{row.paid.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-medium">{row.balance.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => onRowAction?.(row)}
                                                    className="text-slate-500 hover:text-green-600 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] hover:border-green-400"
                                                >
                                                    +
                                                </button>
                                                <button className="text-slate-500 hover:text-blue-600 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] hover:border-blue-400">
                                                    🖨
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
