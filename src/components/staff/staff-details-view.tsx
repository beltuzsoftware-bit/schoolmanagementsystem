'use client';

import React from 'react';
import {
    X, User, Mail, Phone, Calendar, MapPin, Award, Briefcase,
    Landmark, ShieldCheck, FileText, BadgePercent, Heart, GraduationCap,
    DollarSign, CreditCard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

export default function StaffDetailsView({ staff, onClose }: StaffDetailsViewProps) {
    if (!staff) return null;

    const p = staff;
    const u = staff.user || {};
    const personal = p.personalDetails || {};
    const exp = p.experience || {};
    const bank = p.bankDetails || {};

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl gap-0 border border-slate-100/80 shadow-2xl bg-white">
                {/* Header Gradient */}
                <div className="relative p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-150/60 rounded-t-2xl flex items-start justify-between">
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
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{u.name}</h2>
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
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
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
                            <DetailItem label="Email" value={u.email} icon={<Mail size={14} />} />
                            <DetailItem label="Mobile Number" value={personal.phone} icon={<Phone size={14} />} />
                            <DetailItem label="Alternate Mobile" value={personal.altPhone} icon={<Phone size={14} />} />
                            <DetailItem label="WhatsApp Number" value={personal.whatsapp} icon={<Phone size={14} />} />
                            <DetailItem label="Date of Birth" value={formatDate(personal.dob)} icon={<Calendar size={14} />} />
                            <DetailItem label="Gender" value={personal.gender} />
                            <DetailItem label="Father Name" value={personal.fatherName} />
                            <DetailItem label="Mother Name" value={personal.motherName} />
                            <DetailItem label="Husband Name" value={personal.husbandName} />
                            <DetailItem label="Aadhar Number" value={personal.aadhar} icon={<FileText size={14} />} />
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
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: string | number; icon?: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                {icon && <span className="text-slate-400">{icon}</span>}
                <span>{value || 'N/A'}</span>
            </div>
        </div>
    );
}
