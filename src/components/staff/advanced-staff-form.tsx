'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Eye, EyeOff, Trash2, User, Landmark, Briefcase, MapPin, GraduationCap, Building2, KeyRound, Wallet, Percent, Phone, Mail, Calendar, CreditCard, Hash, CheckCircle2, ShieldCheck } from 'lucide-react';
import { StaffRole, Qualification, SalaryComponent } from '@/types/staff';
import { UserRole, StaffFormConfig } from '@/types';
import { addStaff, editStaff, getNextEmployeeId, getPackages, getSchools } from '@/app/actions';
import { toast } from 'sonner';
import ImageCropper from './image-cropper';

const compressBase64Image = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str || !base64Str.startsWith('data:image/')) {
            resolve(base64Str);
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

interface AdvancedStaffFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolId: string;
    initialData?: any;
}

export default function AdvancedStaffForm({ open, onClose, onSuccess, schoolId, initialData }: AdvancedStaffFormProps) {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [qualifications, setQualifications] = useState<Qualification[]>([
        { id: '1', name: '', college: '', year: '' }
    ]);

    const [allowances, setAllowances] = useState<SalaryComponent[]>([]);
    const [customDeductions, setCustomDeductions] = useState<SalaryComponent[]>([]);
    const [isCropping, setIsCropping] = useState(false);
    const [tempPhoto, setTempPhoto] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        altPhone: '',
        whatsapp: '',
        email: '',
        dob: '',
        aadhar: '',
        gender: 'Male',
        husbandName: '',
        fatherName: '',
        nationality: 'INDIAN',
        religion: '',
        category: '',
        maritalStatus: '',
        lastOrg: '',
        lastJob: '',
        yearsExp: '',
        pincode: '',
        city: '',
        state: '',
        country: '',
        fullAddress: '',
        accHolder: '',
        bankName: '',
        ifsc: '',
        accNo: '',
        panNo: '',
        pfAccNo: '',
        uanNo: '',
        role: StaffRole.TEACHER,
        joiningDate: new Date().toISOString().split('T')[0],
        staffId: '',
        designation: '',
        department: '',
        username: '',
        password: '',
        salary: '45000',
        pfRate: '12',
        esiRate: '0.75',
        paymentMode: 'Bank Transfer',
        photo: ''
    });

    const [config, setConfig] = useState<StaffFormConfig[]>([]);

    useEffect(() => {
        const fetchConfig = async () => {
            if (!schoolId) return;
            try {
                const { getStaffFormConfigForSchool } = await import('@/app/actions');
                const config = await getStaffFormConfigForSchool(schoolId);
                if (config) {
                    setConfig(config);
                }
            } catch (err) {
                console.error('Failed to load form config', err);
            }
        };
        fetchConfig();
    }, [schoolId]);

    const shouldShow = (fieldName: string) => {
        // If no config exists (legacy/default), show everything
        if (config.length === 0) return true;
        const field = config.find(c => c.fieldName === fieldName);
        return field ? field.visible : true; // Default to true if field not in config
    };

    const isRequired = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        return field ? field.required : false;
    };

    useEffect(() => {
        if (initialData) {
            const p = initialData;
            const u = initialData.user || {};
            const names = u.name?.split(' ') || [];

            setFormData({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                phone: p.personalDetails?.phone || '',
                altPhone: p.personalDetails?.altPhone || '',
                whatsapp: p.personalDetails?.whatsapp || '',
                email: u.email || '',
                dob: p.personalDetails?.dob || '',
                aadhar: p.personalDetails?.aadhar || '',
                gender: p.personalDetails?.gender || 'Male',
                husbandName: p.personalDetails?.husbandName || '',
                fatherName: p.personalDetails?.fatherName || '',
                nationality: p.personalDetails?.nationality || 'INDIAN',
                religion: p.personalDetails?.religion || '',
                category: p.personalDetails?.category || '',
                maritalStatus: p.personalDetails?.maritalStatus || '',
                lastOrg: p.experience?.lastOrg || '',
                lastJob: p.experience?.lastJob || '',
                yearsExp: p.experience?.yearsExp || '',
                pincode: p.personalDetails?.pincode || '',
                city: p.personalDetails?.city || '',
                state: p.personalDetails?.state || '',
                country: p.personalDetails?.country || '',
                fullAddress: p.personalDetails?.address || '',
                accHolder: p.bankDetails?.accHolder || '',
                bankName: p.bankDetails?.bankName || '',
                ifsc: p.bankDetails?.ifsc || '',
                accNo: p.bankDetails?.accNo || '',
                panNo: p.bankDetails?.panNo || '',
                pfAccNo: p.bankDetails?.pfAccNo || '',
                uanNo: p.bankDetails?.uanNo || '',
                role: p.role || StaffRole.TEACHER,
                joiningDate: p.joiningDate || new Date().toISOString().split('T')[0],
                staffId: p.staffId || '',
                designation: p.designation || '',
                department: p.department || '',
                username: u.username || '',
                password: '',
                salary: p.salary?.toString() || '0',
                pfRate: p.pfRate?.toString() || '12',
                esiRate: p.esiRate?.toString() || '0.75',
                paymentMode: p.paymentMode || 'Bank Transfer',
                photo: p.photo || ''
            });

            if (p.qualifications?.length > 0) setQualifications(p.qualifications);
            if (p.allowances?.length > 0) setAllowances(p.allowances);
            if (p.customDeductions?.length > 0) setCustomDeductions(p.customDeductions);
        } else {
            // Reset form if closing edit and opening add
            setFormData({
                firstName: '', lastName: '', phone: '', altPhone: '', whatsapp: '', email: '',
                dob: '', aadhar: '', gender: 'Male', husbandName: '', fatherName: '',
                nationality: 'INDIAN', religion: '', category: '', maritalStatus: '',
                lastOrg: '', lastJob: '', yearsExp: '', pincode: '', city: '',
                state: '', country: '', fullAddress: '', accHolder: '', bankName: '',
                ifsc: '', accNo: '', panNo: '', pfAccNo: '', uanNo: '',
                role: StaffRole.TEACHER, joiningDate: new Date().toISOString().split('T')[0],
                staffId: '', designation: '', department: '', username: '', password: '',
                salary: '0', pfRate: '12', esiRate: '0.75', paymentMode: 'Bank Transfer',
                photo: ''
            });
            setQualifications([{ id: '1', name: '', college: '', year: '', document: '' }]);
            setAllowances([]);
            setCustomDeductions([]);
        }
    }, [initialData, open]);

    if (!open) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'photo') {
                    setTempPhoto(reader.result as string);
                    setIsCropping(true);
                } else {
                    setFormData(prev => ({ ...prev, [field]: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedImage: string) => {
        try {
            const compressed = await compressBase64Image(croppedImage, 400, 400, 0.75);
            setFormData(prev => ({ ...prev, photo: compressed }));
        } catch (err) {
            setFormData(prev => ({ ...prev, photo: croppedImage }));
        }
        setIsCropping(false);
        setTempPhoto(null);
    };

    const handleQualFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                let content = reader.result as string;
                if (file.type.startsWith('image/')) {
                    try {
                        content = await compressBase64Image(content, 800, 800, 0.7);
                    } catch (err) {}
                }
                setQualifications(prev => prev.map(q =>
                    q.id === id ? { ...q, document: content } : q
                ));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQualChange = (id: string, field: keyof Qualification, value: string) => {
        setQualifications(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const addQualRow = () => {
        setQualifications([...qualifications, { id: Date.now().toString(), name: '', college: '', year: '', document: '' }]);
    };

    const removeQualRow = (id: string) => {
        if (qualifications.length > 1) {
            setQualifications(qualifications.filter(q => q.id !== id));
        }
    };

    const addAllowance = () => {
        setAllowances([...allowances, { id: Date.now().toString(), label: '', amount: 0 }]);
    };

    const updateAllowance = (id: string, field: keyof SalaryComponent, value: any) => {
        setAllowances(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const removeAllowance = (id: string) => {
        setAllowances(allowances.filter(a => a.id !== id));
    };

    const addDeduction = () => {
        setCustomDeductions([...customDeductions, { id: Date.now().toString(), label: '', amount: 0 }]);
    };

    const updateDeduction = (id: string, field: keyof SalaryComponent, value: any) => {
        setCustomDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const removeDeduction = (id: string) => {
        setCustomDeductions(customDeductions.filter(d => d.id !== id));
    };

    const handleAutoGenerateId = async () => {
        try {
            const nextId = await getNextEmployeeId(schoolId);
            setFormData(prev => ({ ...prev, staffId: nextId }));
        } catch (err) {
            toast.error('Failed to generate ID');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const userData = {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            role: 'STAFF' as UserRole,
            schoolId: schoolId,
            password: formData.password || 'password123'
        };

        const profileDataExtras = {
            staffId: formData.staffId,
            designation: formData.designation,
            department: formData.department,
            salary: parseFloat(formData.salary),
            joiningDate: formData.joiningDate,
            pfRate: parseFloat(formData.pfRate),
            overtimeRate: 1,
            workingDaysPerMonth: 30,
            paymentMode: formData.paymentMode,
            photo: formData.photo,
            allowances: allowances.filter(a => a.label && a.amount >= 0),
            customDeductions: customDeductions.filter(d => d.label && d.amount >= 0),
            personalDetails: {
                phone: formData.phone,
                altPhone: formData.altPhone,
                whatsapp: formData.whatsapp,
                address: formData.fullAddress,
                pincode: formData.pincode,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                bloodGroup: initialData?.personalDetails?.bloodGroup || '',
                qualification: qualifications[0]?.name || '',
                dob: formData.dob,
                aadhar: formData.aadhar,
                gender: formData.gender,
                husbandName: formData.husbandName,
                fatherName: formData.fatherName,
                nationality: formData.nationality,
                religion: formData.religion,
                category: formData.category,
                maritalStatus: formData.maritalStatus,
            },
            qualifications: qualifications.filter(q => q.name),
            experience: {
                lastOrg: formData.lastOrg,
                lastJob: formData.lastJob,
                yearsExp: formData.yearsExp
            },
            bankDetails: {
                accHolder: formData.accHolder,
                bankName: formData.bankName,
                ifsc: formData.ifsc,
                accNo: formData.accNo,
                panNo: formData.panNo,
                pfAccNo: formData.pfAccNo,
                uanNo: formData.uanNo
            }
        };

        try {
            let res;
            if (initialData) {
                // Remove empty password to avoid overwriting with blank
                const userUpdate: any = { ...userData };
                if (!formData.password) delete userUpdate.password;

                res = await editStaff(initialData.id, initialData.userId, userUpdate, profileDataExtras as any);
            } else {
                res = await addStaff(userData as any, profileDataExtras as any);
            }

            if (res.success) {
                toast.success(initialData ? 'Staff member updated successfully' : 'Staff member added successfully');
                onSuccess();
                onClose();
            } else {
                toast.error((res as any).error || 'Failed to save staff');
            }
        } catch (err) {
            console.error('Staff submission error:', err);
            toast.error('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden no-print">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100/80">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-blue-600 shadow-sm shadow-indigo-100"></div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">{initialData ? 'Edit Staff Member' : 'Add Employee'}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-300 hover:rotate-90">
                        <X size={20} className="text-slate-500 hover:text-slate-800" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10">

                    {/* Section: Personal Details */}
                    <section>
                        <SectionHeader icon={<User size={18} />} title="Personal Details:" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="First name *" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            <InputField label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} />
                            <InputField label="Mobile no. *" name="phone" value={formData.phone} onChange={handleChange} required />
                            <InputField label="Alternate mobile no." name="altPhone" value={formData.altPhone} onChange={handleChange} />
                            <InputField label="Whatsapp no." name="whatsapp" value={formData.whatsapp} onChange={handleChange} />
                            <InputField label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            <InputField label="DOB" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                            <InputField label="Aadhar no." name="aadhar" value={formData.aadhar} onChange={handleChange} />

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase">Gender</label>
                                <div className="flex items-center gap-4 py-2">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <label key={g} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value={g}
                                                checked={formData.gender === g}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                            /> {g}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {shouldShow('husbandName') && <InputField label="Husband name" name="husbandName" value={formData.husbandName} onChange={handleChange} required={isRequired('husbandName')} />}
                            {shouldShow('fatherName') && <InputField label="Father name" name="fatherName" value={formData.fatherName} onChange={handleChange} required={isRequired('fatherName')} />}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Photo</label>
                                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    {formData.photo ? (
                                        <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-indigo-200 shadow-sm shrink-0 bg-white">
                                            <img
                                                src={formData.photo}
                                                alt="Staff"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, photo: '' }))}
                                                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                                            >
                                                <Trash2 size={14} className="text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-20 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                                            <User size={24} />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'photo')}
                                        className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Salary & Finance */}
                    <section className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <SectionHeader icon={<Wallet size={18} />} title="Salary & Financial Configuration:" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">Monthly Basic Salary (₹) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        name="salary"
                                        value={formData.salary}
                                        onChange={handleChange}
                                        onFocus={(e) => {
                                            if (e.target.value && /^0+$/.test(e.target.value)) {
                                                setFormData(prev => ({ ...prev, salary: '' }));
                                            }
                                        }}
                                        required
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">Provident Fund (PF) Rate (%)</label>
                                <div className="relative">
                                    <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                                    <input
                                        type="number"
                                        name="pfRate"
                                        step="0.1"
                                        value={formData.pfRate}
                                        onChange={handleChange}
                                        onFocus={(e) => {
                                            if (e.target.value && /^0+$/.test(e.target.value)) {
                                                setFormData(prev => ({ ...prev, pfRate: '' }));
                                            }
                                        }}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">ESI Rate (%)</label>
                                <div className="relative">
                                    <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                                    <input
                                        type="number"
                                        name="esiRate"
                                        step="0.01"
                                        value={formData.esiRate}
                                        onChange={handleChange}
                                        onFocus={(e) => {
                                            if (e.target.value && /^0+$/.test(e.target.value)) {
                                                setFormData(prev => ({ ...prev, esiRate: '' }));
                                            }
                                        }}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Allowances Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monthly Allowances (HRA, DA, etc.)</h4>
                                    <button type="button" onClick={addAllowance} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[11px] font-bold">
                                        <Plus size={14} /> Add New
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Component Label</th>
                                                <th className="px-3 py-2 text-right">Amount (₹)</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {allowances.map((a) => (
                                                <tr key={a.id}>
                                                    <td className="p-2">
                                                        <input
                                                            placeholder="e.g. HRA"
                                                            value={a.label}
                                                            onChange={e => updateAllowance(a.id, 'label', e.target.value)}
                                                            className="w-full px-2 py-1 border-b border-transparent focus:border-indigo-500 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={a.amount}
                                                            onChange={e => updateAllowance(a.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 text-right font-bold text-slate-700 border-b border-transparent focus:border-indigo-500 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button type="button" onClick={() => removeAllowance(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {allowances.length === 0 && (
                                                <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">No custom allowances set</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Deductions Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fixed Monthly Deductions</h4>
                                    <button type="button" onClick={addDeduction} className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-[11px] font-bold">
                                        <Plus size={14} /> Add New
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Component Label</th>
                                                <th className="px-3 py-2 text-right">Amount (₹)</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {customDeductions.map((d) => (
                                                <tr key={d.id}>
                                                    <td className="p-2">
                                                        <input
                                                            placeholder="e.g. Professional Tax"
                                                            value={d.label}
                                                            onChange={e => updateDeduction(d.id, 'label', e.target.value)}
                                                            className="w-full px-2 py-1 border-b border-transparent focus:border-rose-500 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={d.amount}
                                                            onChange={e => updateDeduction(d.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 text-right font-bold text-slate-700 border-b border-transparent focus:border-rose-500 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button type="button" onClick={() => removeDeduction(d.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {customDeductions.length === 0 && (
                                                <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">No custom deductions set</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Religion & Category */}
                    <section>
                        <SectionHeader icon={<Building2 size={18} />} title="Religion & Category:" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <SelectField label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} options={['INDIAN', 'OTHER']} />
                            {shouldShow('religion') && <SelectField label="Religion" name="religion" value={formData.religion} onChange={handleChange} options={['Hindu', 'Muslim', 'Christian', 'Sikh', 'Other']} />}
                            {shouldShow('category') && <SelectField label="Category" name="category" value={formData.category} onChange={handleChange} options={['General', 'OBC', 'SC', 'ST']} />}
                            {shouldShow('maritalStatus') && <SelectField label="Marital Status" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} options={['Single', 'Married', 'Divorced', 'Widowed']} />}
                        </div>
                    </section>

                    {/* Section: Experience */}
                    {shouldShow('experience') && (
                        <section>
                            <SectionHeader icon={<Briefcase size={18} />} title="Experience (If Any):" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputField label="Last organization name" name="lastOrg" value={formData.lastOrg} onChange={handleChange} />
                                <InputField label="Last job position" name="lastJob" value={formData.lastJob} onChange={handleChange} />
                                <InputField label="Years of experience" name="yearsExp" value={formData.yearsExp} onChange={handleChange} />
                            </div>
                        </section>
                    )}

                    {/* Section: Qualifications */}
                    <section>
                        <SectionHeader icon={<GraduationCap size={18} />} title="Qualification:" />
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[#f0f9f1] border-b border-slate-200">
                                    <tr className="text-xs font-bold text-slate-700">
                                        <th className="px-4 py-3">Qualification</th>
                                        <th className="px-4 py-3">College/University</th>
                                        <th className="px-4 py-3">Passing Year</th>
                                        <th className="px-4 py-3">Document</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {qualifications.map((q) => (
                                        <tr key={q.id}>
                                            <td className="p-2">
                                                <input
                                                    value={q.name}
                                                    onChange={(e) => handleQualChange(q.id, 'name', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-slate-100 rounded text-sm focus:border-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    value={q.college}
                                                    onChange={(e) => handleQualChange(q.id, 'college', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-slate-100 rounded text-sm focus:border-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    value={q.year}
                                                    onChange={(e) => handleQualChange(q.id, 'year', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-slate-100 rounded text-sm focus:border-indigo-500 outline-none bg-white"
                                                >
                                                    <option value="">Select</option>
                                                    {Array.from({ length: 40 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleQualFileChange(q.id, e)}
                                                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                    />
                                                    {q.document && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setQualifications(prev => prev.map(item => item.id === q.id ? { ...item, document: '' } : item))}
                                                                className="text-rose-500 hover:text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2 text-center">
                                                {qualifications.length > 1 && (
                                                    <button type="button" onClick={() => removeQualRow(q.id)} className="text-rose-400 hover:text-rose-600">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 bg-white flex justify-center">
                                <button type="button" onClick={addQualRow} className="bg-indigo-500 text-white p-1 rounded-full hover:bg-indigo-600 transition-all">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Section: Address */}
                    <section>
                        <SectionHeader icon={<MapPin size={18} />} title="Residential Address:" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <InputField label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
                            <InputField label="City" name="city" value={formData.city} onChange={handleChange} />
                            <InputField label="State" name="state" value={formData.state} onChange={handleChange} />
                            <InputField label="Country" name="country" value={formData.country} onChange={handleChange} />
                            <div className="md:col-span-4 flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-600 uppercase">Address</label>
                                <textarea
                                    name="fullAddress"
                                    value={formData.fullAddress}
                                    onChange={handleChange}
                                    onFocus={(e) => {
                                        if (e.target.value && /^(0+|New Location|New Address)$/i.test(e.target.value)) {
                                            setFormData(prev => ({ ...prev, fullAddress: '' }));
                                        }
                                    }}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section: Bank Details */}
                    {shouldShow('bankDetails') && (
                        <section>
                            <SectionHeader icon={<Landmark size={18} />} title="Bank Account Details:" />
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <InputField label="Account Holder Name" name="accHolder" value={formData.accHolder} onChange={handleChange} />
                                <InputField label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
                                <InputField label="IFSC Code" name="ifsc" value={formData.ifsc} onChange={handleChange} />
                                <InputField label="Account No." name="accNo" value={formData.accNo} onChange={handleChange} />
                                {shouldShow('panNo') && <InputField label="PAN No." name="panNo" value={formData.panNo} onChange={handleChange} />}
                                {shouldShow('pfAccNo') && <InputField label="PF Account Number" name="pfAccNo" value={formData.pfAccNo} onChange={handleChange} />}
                                <div className="md:col-span-2">
                                    {shouldShow('uanNo') && <InputField label="Universal Account Number (UAN)" name="uanNo" value={formData.uanNo} onChange={handleChange} />}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Section: Employment Details */}
                    <section>
                        <SectionHeader icon={<Briefcase size={18} />} title="Employment Details:" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-600 uppercase">Select Role *</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white cursor-pointer"
                                >
                                    {Object.values(StaffRole).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <InputField label="Joining Date" name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-600 uppercase">Employee ID</label>
                                <div className="relative">
                                    <input
                                        name="staffId"
                                        value={formData.staffId}
                                        onChange={handleChange}
                                        placeholder="EMP-XXX"
                                        className="w-full pl-3 pr-16 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAutoGenerateId}
                                        className="absolute right-1 top-1 bottom-1 px-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded hover:bg-indigo-100 transition-colors"
                                    >
                                        GENERATE
                                    </button>
                                </div>
                            </div>
                            <InputField label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
                            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectField label="Department" name="department" value={formData.department} onChange={handleChange} options={['Academic', 'Admin', 'Accounts', 'Library', 'Hostel', 'Support']} />
                                <SelectField label="Payment Mode" name="paymentMode" value={formData.paymentMode} onChange={handleChange} options={['Bank Transfer', 'Cash', 'Cheque']} />
                            </div>
                        </div>
                    </section>

                    {/* Section: Login Details */}
                    <section>
                        <SectionHeader icon={<KeyRound size={18} />} title="Login Details:" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase">Username</label>
                                <input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Leave empty for auto-generation"
                                    className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-slate-500 italic">If left empty, the email address will be used as the username.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full pl-4 pr-10 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">(Default password is "password123" if left empty)</p>
                            </div>
                        </div>
                    </section>


                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between sticky bottom-0 z-10 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-8 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all">Close</button>
                    <button type="submit" disabled={loading} className="px-10 py-2.5 bg-[#1d7cf2] text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Staff' : 'Submit')}
                    </button>
                </div>
            </form>

            <ImageCropper
                image={tempPhoto as string}
                open={isCropping}
                aspect={3 / 4}
                onCropComplete={handleCropComplete}
                onClose={() => {
                    setIsCropping(false);
                    setTempPhoto(null);
                }}
            />
        </div>
    );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="flex items-center gap-3 mb-6 bg-slate-50 border border-slate-100/80 px-4 py-3 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.01)] transition-all duration-300 hover:border-slate-200">
            <span className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-100">{icon}</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</h3>
        </div>
    );
}

function InputField({ label, type = "text", name, value, onChange, required, placeholder }: any) {
    return (
        <div className="flex flex-col gap-1.5 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 group-focus-within:text-indigo-600 transition-colors">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                onFocus={(e) => {
                    if (e.target.value && /^(0+|New Location|New Address)$/i.test(e.target.value)) {
                        onChange({
                            target: { name, value: '' }
                        } as any);
                    }
                }}
                required={required}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 outline-none text-sm bg-white transition-all duration-300 shadow-[0_2px_6px_rgb(0,0,0,0.01)] placeholder:text-slate-400 font-medium text-slate-800"
            />
        </div>
    );
}

function SelectField({ label, options, name, value, onChange, required }: any) {
    return (
        <div className="flex flex-col gap-1.5 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 group-focus-within:text-indigo-600 transition-colors">{label}</label>
            <select
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 outline-none text-sm bg-white cursor-pointer transition-all duration-300 shadow-[0_2px_6px_rgb(0,0,0,0.01)] font-medium text-slate-800"
            >
                <option value="">Select</option>
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}
