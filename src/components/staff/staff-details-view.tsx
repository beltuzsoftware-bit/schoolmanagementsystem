'use client';

import React from 'react';
import {
    X, User, Mail, Phone, Calendar, MapPin, Award, Briefcase,
    Landmark, ShieldCheck, FileText, BadgePercent, Heart, GraduationCap,
    DollarSign, CreditCard, Printer
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import QRCode from 'react-qr-code';

interface StaffDetailsViewProps {
    staff: any;
    onClose: () => void;
}

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateStr;
    }
};

const formatScientificNumber = (val: any): string => {
    if (val === undefined || val === null) return 'N/A';
    const cleanStr = String(val).trim();
    if (/^[+\-]?\d+(\.\d+)?[eE][+\-]?\d+$/.test(cleanStr)) {
        try {
            const num = Number(cleanStr);
            if (!isNaN(num)) {
                return num.toFixed(0);
            }
        } catch (e) {}
    }
    return cleanStr || 'N/A';
};

export default function StaffDetailsView({ staff, onClose }: StaffDetailsViewProps) {
    if (!staff) return null;

    const p = staff;
    const u = staff.user || {};
    const personal = p.personalDetails || {};
    const exp = p.experience || {};
    const bank = p.bankDetails || {};
    const qrVal = p.qrCode || p.staffId || p.id || 'EMP-001';

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head>
                    <title>Staff Profile - ${u.name || 'Employee'}</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #1e293b;
                            margin: 0;
                            padding: 20px;
                            line-height: 1.4;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border-bottom: 2px solid #e2e8f0;
                            padding-bottom: 12px;
                            margin-bottom: 16px;
                        }
                        .profile-info {
                            display: flex;
                            align-items: center;
                            gap: 15px;
                        }
                        .photo-box {
                            width: 60px;
                            height: 75px;
                            border-radius: 6px;
                            overflow: hidden;
                            border: 1px solid #cbd5e1;
                            background-color: #f1f5f9;
                        }
                        .photo-box img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .name-section h1 {
                            margin: 0;
                            font-size: 18px;
                            font-weight: bold;
                            color: #0f172a;
                        }
                        .name-section p {
                            margin: 2px 0 0 0;
                            font-size: 11px;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .section-title {
                            font-size: 11px;
                            font-weight: bold;
                            text-transform: uppercase;
                            color: #4f46e5;
                            border-bottom: 1px solid #e2e8f0;
                            padding-bottom: 4px;
                            margin-top: 16px;
                            margin-bottom: 10px;
                            letter-spacing: 0.5px;
                        }
                        .grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px 15px;
                        }
                        .col-span-2 {
                            grid-column: span 2;
                        }
                        .detail-item {
                            font-size: 11px;
                        }
                        .detail-label {
                            font-size: 8px;
                            font-weight: bold;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 1px;
                        }
                        .detail-value {
                            font-weight: 600;
                            color: #1e293b;
                        }
                        .table-container {
                            margin-top: 8px;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            overflow: hidden;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px;
                        }
                        th, td {
                            padding: 6px 10px;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        th {
                            background-color: #f8fafc;
                            font-weight: bold;
                            text-align: left;
                            color: #475569;
                        }
                        tr:last-child td {
                            border-bottom: none;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="profile-info">
                            ${p.photo ? `
                                <div class="photo-box">
                                    <img src="${p.photo}" alt="${u.name}" />
                                </div>
                            ` : `
                                <div class="photo-box" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;">
                                    <span style="font-size:24px;">👤</span>
                                </div>
                            `}
                            <div class="name-section">
                                <h1>${u.name}</h1>
                                <p>${p.designation} &bull; ${p.department}</p>
                                <div style="font-size:10px; color:#475569; margin-top:3px;">
                                    Employee ID: <strong>${p.staffId || 'N/A'}</strong> | Role: <strong>${u.designation || u.role || 'STAFF'}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:center; font-size:8px; color:#64748b;">
                            <div id="print-qr" style="display:flex; justify-content:center; margin-bottom:2px;"></div>
                            <strong>${p.staffId || 'QR'}</strong>
                        </div>
                    </div>

                    <div class="section-title">Personal Details</div>
                    <div class="grid">
                        <div class="detail-item col-span-2">
                            <div class="detail-label">Email</div>
                            <div class="detail-value">${u.email || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Mobile Number</div>
                            <div class="detail-value">${formatScientificNumber(personal.phone)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Alternate Mobile</div>
                            <div class="detail-value">${formatScientificNumber(personal.altPhone)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">WhatsApp Number</div>
                            <div class="detail-value">${formatScientificNumber(personal.whatsapp)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Date of Birth</div>
                            <div class="detail-value">${formatDate(personal.dob)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Gender</div>
                            <div class="detail-value">${personal.gender || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Father Name</div>
                            <div class="detail-value">${personal.fatherName || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Mother Name</div>
                            <div class="detail-value">${personal.motherName || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Husband Name</div>
                            <div class="detail-value">${personal.husbandName || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Aadhar Number</div>
                            <div class="detail-value">${formatScientificNumber(personal.aadhar)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Blood Group</div>
                            <div class="detail-value">${personal.bloodGroup || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Nationality</div>
                            <div class="detail-value">${personal.nationality || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Religion</div>
                            <div class="detail-value">${personal.religion || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Category</div>
                            <div class="detail-value">${personal.category || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Marital Status</div>
                            <div class="detail-value">${personal.maritalStatus || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="section-title">Residential Address</div>
                    <div class="grid">
                        <div class="detail-item">
                            <div class="detail-label">Pincode</div>
                            <div class="detail-value">${personal.pincode || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">City</div>
                            <div class="detail-value">${personal.city || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">State</div>
                            <div class="detail-value">${personal.state || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Country</div>
                            <div class="detail-value">${personal.country || 'N/A'}</div>
                        </div>
                        <div class="detail-item col-span-2">
                            <div class="detail-label">Full Address</div>
                            <div class="detail-value">${personal.address || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="section-title">Employment & Payroll</div>
                    <div class="grid">
                        <div class="detail-item">
                            <div class="detail-label">Joining Date</div>
                            <div class="detail-value">${formatDate(p.joiningDate)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Monthly Basic Salary</div>
                            <div class="detail-value">${p.salary ? `₹${p.salary.toLocaleString()}` : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Payment Mode</div>
                            <div class="detail-value">${p.paymentMode || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">PF Rate (%)</div>
                            <div class="detail-value">${p.pfRate ? `${p.pfRate}%` : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">ESI Rate (%)</div>
                            <div class="detail-value">${p.esiRate ? `${p.esiRate}%` : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Username</div>
                            <div class="detail-value">${u.username || 'N/A'}</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 20px; margin-top: 5px;">
                        <div style="flex: 1;">
                            <div class="section-title">Bank Details</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div class="detail-item"><div class="detail-label">Account Holder</div><div class="detail-value">${bank.accHolder || 'N/A'}</div></div>
                                <div class="detail-item"><div class="detail-label">Bank Name</div><div class="detail-value">${bank.bankName || 'N/A'}</div></div>
                                <div class="detail-item"><div class="detail-label">IFSC Code</div><div class="detail-value">${bank.ifsc || 'N/A'}</div></div>
                                <div class="detail-item"><div class="detail-label">Account Number</div><div class="detail-value">${bank.accNo || 'N/A'}</div></div>
                                <div class="detail-item" style="grid-column: span 2;"><div class="detail-label">PAN Number</div><div class="detail-value">${bank.panNo || 'N/A'}</div></div>
                            </div>
                        </div>
                        <div style="flex: 1;">
                            <div class="section-title">Previous Experience</div>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                                <div class="detail-item"><div class="detail-label">Last Organization</div><div class="detail-value">${exp.lastOrg || 'N/A'}</div></div>
                                <div class="detail-item"><div class="detail-label">Last Job Position</div><div class="detail-value">${exp.lastJob || 'N/A'}</div></div>
                                <div class="detail-item"><div class="detail-label">Years of Experience</div><div class="detail-value">${exp.yearsExp || 'N/A'}</div></div>
                            </div>
                        </div>
                    </div>

                    ${p.qualifications && p.qualifications.length > 0 ? `
                        <div class="section-title">Qualifications</div>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Qualification</th>
                                        <th>College/University</th>
                                        <th>Passing Year</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${p.qualifications.map((q: any) => `
                                        <tr>
                                            <td>${q.name}</td>
                                            <td>${q.college || 'N/A'}</td>
                                            <td>${q.year || 'N/A'}</td>
                                            <td>${q.document ? 'Uploaded' : 'None'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <script>
                        const sourceQr = window.opener.document.querySelector('#staff-profile-qrcode svg');
                        if (sourceQr) {
                            const qrClone = sourceQr.cloneNode(true);
                            qrClone.style.width = '48px';
                            qrClone.style.height = '48px';
                            document.getElementById('print-qr').appendChild(qrClone);
                        }
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl gap-0 border border-slate-100/80 shadow-2xl bg-white">
                <div id="print-staff-profile-body" className="w-full bg-white text-slate-800">
                    {/* Header Gradient */}
                    <div className="relative p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-150/60 rounded-t-2xl flex items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            {p.photo ? (
                                <div className="w-20 h-24 rounded-xl overflow-hidden shadow-md border-2 border-white bg-white shrink-0">
                                    <img src={p.photo} alt={u.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-20 h-24 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                    <User size={40} />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{u.name}</DialogTitle>
                                    <Badge className={p.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold' : 'bg-slate-500 text-white'}>
                                        {p.status || 'Active'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">{p.designation} &bull; {p.department}</p>
                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                                    <span>Employee ID: <strong className="text-indigo-600 font-bold">{p.staffId || 'N/A'}</strong></span>
                                    <span>Role: <strong className="text-indigo-600 font-bold">{u.designation || u.role}</strong></span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 no-print">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
                                title="Print Profile"
                            >
                                <Printer size={14} />
                                Print
                            </button>
                            <div id="staff-profile-qrcode" className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center gap-1 shrink-0">
                                <QRCode value={qrVal} size={56} style={{ height: '56px', width: '56px' }} />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.staffId || 'QR CODE'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Grid */}
                    <div className="p-8 space-y-8">
                    {/* Section: Personal Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-indigo-100/50">
                            <User className="text-indigo-500" size={18} />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Personal Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <DetailItem label="Email" value={u.email} icon={<Mail size={14} />} className="md:col-span-2" />
                            <DetailItem label="Mobile Number" value={formatScientificNumber(personal.phone)} icon={<Phone size={14} />} />
                            <DetailItem label="Alternate Mobile" value={formatScientificNumber(personal.altPhone)} icon={<Phone size={14} />} />
                            <DetailItem label="WhatsApp Number" value={formatScientificNumber(personal.whatsapp)} icon={<Phone size={14} />} />
                            <DetailItem label="Date of Birth" value={formatDate(personal.dob)} icon={<Calendar size={14} />} />
                            <DetailItem label="Gender" value={personal.gender} />
                            <DetailItem label="Father Name" value={personal.fatherName} />
                            <DetailItem label="Mother Name" value={personal.motherName} />
                            <DetailItem label="Husband Name" value={personal.husbandName} />
                            <DetailItem label="Aadhar Number" value={formatScientificNumber(personal.aadhar)} icon={<FileText size={14} />} />
                            <DetailItem label="Blood Group" value={personal.bloodGroup} icon={<Heart size={14} />} />
                            <DetailItem label="Nationality" value={personal.nationality} />
                            <DetailItem label="Religion" value={personal.religion} />
                            <DetailItem label="Category" value={personal.category} />
                            <DetailItem label="Marital Status" value={personal.maritalStatus} />
                        </div>
                    </div>

                    {/* Section: Residential Address */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-purple-100/50">
                            <MapPin className="text-purple-500" size={18} />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Residential Address</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <DetailItem label="Pincode" value={personal.pincode} />
                            <DetailItem label="City" value={personal.city} />
                            <DetailItem label="State" value={personal.state} />
                            <DetailItem label="Country" value={personal.country} />
                            <div className="md:col-span-4 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Address</span>
                                <span className="text-sm font-semibold text-slate-800">{personal.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section: Employment & Payroll Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-emerald-100/50">
                            <Briefcase className="text-emerald-500" size={18} />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Employment & Payroll</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <DetailItem label="Joining Date" value={formatDate(p.joiningDate)} icon={<Calendar size={14} />} />
                            <DetailItem label="Monthly Basic Salary" value={p.salary ? `₹${p.salary.toLocaleString()}` : 'N/A'} icon={<DollarSign size={14} />} />
                            <DetailItem label="Payment Mode" value={p.paymentMode} icon={<CreditCard size={14} />} />
                            <DetailItem label="PF Rate (%)" value={p.pfRate ? `${p.pfRate}%` : 'N/A'} icon={<BadgePercent size={14} />} />
                            <DetailItem label="ESI Rate (%)" value={p.esiRate ? `${p.esiRate}%` : 'N/A'} icon={<BadgePercent size={14} />} />
                            <DetailItem label="Username" value={u.username} icon={<User size={14} />} />
                        </div>
                    </div>

                    {/* Section: Experience & Qualifications */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Experience */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-amber-100/50">
                                <Award className="text-amber-500" size={18} />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Previous Experience</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <DetailItem label="Last Organization" value={exp.lastOrg} />
                                <DetailItem label="Last Job Position" value={exp.lastJob} />
                                <DetailItem label="Years of Experience" value={exp.yearsExp} />
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-teal-100/50">
                                <Landmark className="text-teal-500" size={18} />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Bank Details</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Account Holder" value={bank.accHolder} />
                                <DetailItem label="Bank Name" value={bank.bankName} />
                                <DetailItem label="IFSC Code" value={bank.ifsc} />
                                <DetailItem label="Account Number" value={bank.accNo} />
                                <DetailItem label="PAN Number" value={bank.panNo} />
                                <DetailItem label="PF Account Number" value={bank.pfAccNo} />
                                <DetailItem label="UAN Number" value={bank.uanNo} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Qualifications Table */}
                    {p.qualifications && p.qualifications.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-sky-100/50">
                                <GraduationCap className="text-sky-500" size={18} />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Qualifications</h3>
                            </div>
                            <div className="border border-slate-150 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-sky-50/50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-150">
                                            <th className="px-4 py-2">Qualification</th>
                                            <th className="px-4 py-2">College/University</th>
                                            <th className="px-4 py-2">Passing Year</th>
                                            <th className="px-4 py-2 text-right">Document</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                                        {p.qualifications.map((q: any) => (
                                            <tr key={q.id || q.name} className="hover:bg-slate-50/40">
                                                <td className="px-4 py-2.5">{q.name}</td>
                                                <td className="px-4 py-2.5">{q.college || 'N/A'}</td>
                                                <td className="px-4 py-2.5">{q.year || 'N/A'}</td>
                                                <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                                                    {q.document ? 'Uploaded' : 'None'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({ label, value, icon, className = "" }: { label: string; value?: string | number; icon?: React.ReactNode; className?: string }) {
    return (
        <div className={`space-y-1 ${className}`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
            <div className="flex items-start gap-1.5 text-sm font-semibold text-slate-800 break-words">
                {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
                <span className="break-all">{value || 'N/A'}</span>
            </div>
        </div>
    );
}
