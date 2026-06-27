'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { getAdmissionFormConfigForSchool, getOnlineAdmissionStatus, submitAdmissionApplication } from '@/app/actions';
import { StudentFormConfig } from '@/types';
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    GraduationCap, 
    Send, 
    ChevronRight, 
    ChevronLeft,
    User,
    BookOpen,
    Users,
    CreditCard,
    Upload,
    Camera
} from 'lucide-react';

export default function PublicAdmissionFormPage({ params }: { params: Promise<{ schoolId: string }> }) {
    const { schoolId } = React.use(params);
    const [status, setStatus] = useState<'loading' | 'open' | 'closed' | 'submitted' | 'error'>('loading');
    const [school, setSchool] = useState<any>(null);
    const [config, setConfig] = useState<StudentFormConfig[]>([]);
    const [academicSettings, setAcademicSettings] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({
        isSpecialNeeds: false,
        isTransfer: false,
        isRte: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [applicationId, setApplicationId] = useState('');
    const [uploadedDocs, setUploadedDocs] = useState<{ name: string; url: string }[]>([]);
    
    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    useEffect(() => {
        const load = async () => {
            const [admStatus, formConfig] = await Promise.all([
                getOnlineAdmissionStatus(schoolId),
                getAdmissionFormConfigForSchool(schoolId)
            ]);
            setSchool(admStatus.school);
            setAcademicSettings(formConfig.academicSettings);
            if (!admStatus.isOpen) {
                setStatus('closed');
                return;
            }
            const visibleFields = (formConfig.config || []).filter((f: any) => f.visible);
            setConfig(visibleFields);
            setStatus('open');
        };
        load().catch(() => setStatus('error'));
    }, [schoolId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        try {
            const result = await submitAdmissionApplication(schoolId, { ...formData, documents: uploadedDocs });
            if (result.success) {
                setApplicationId(result.applicationId || '');
                setStatus('submitted');
            } else {
                setErrorMsg(result.error || 'Submission failed. Please try again.');
            }
        } catch {
            setErrorMsg('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getFieldLabel = (fieldName: string, defaultLabel: string) => {
        const field = config.find(f => f.fieldName === fieldName);
        return field?.label || defaultLabel;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc' | 'tc' = 'doc') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            if (type === 'photo') {
                setFormData(prev => ({ ...prev, photo: base64 }));
            } else if (type === 'tc') {
                setFormData(prev => ({ ...prev, tcUrl: base64 }));
            } else {
                setUploadedDocs(prev => [...prev, { name: file.name, url: base64 }]);
            }
        };
        reader.readAsDataURL(file);
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-slate-500 font-medium">Loading admission form...</p>
                </div>
            </div>
        );
    }

    if (status === 'closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6">
                        <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 mb-3">Admissions Closed</h1>
                    <p className="text-slate-500">Online admissions are currently not accepting applications. Please contact the school directly for more information.</p>
                    {school?.contactNumber && (
                        <p className="mt-4 font-semibold text-indigo-600">📞 {school.contactNumber}</p>
                    )}
                </div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-green-100">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
                            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-10 w-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-black mb-1">Application Submitted!</h1>
                            <p className="text-green-50 text-sm">Thank you for applying to {school?.name}</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
                                <p className="text-3xl font-black text-indigo-600 break-all">{applicationId}</p>
                            </div>

                            {school?.admissionPaymentEnabled && school?.upiId && (
                                <div className="flex flex-col items-center gap-6 p-10 bg-indigo-50 border border-indigo-100 rounded-[3rem] animate-in slide-in-from-bottom-5 duration-700 delay-300">
                                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-indigo-100 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                                        <QRCode 
                                            value={`upi://pay?pa=${school.upiId}&pn=${encodeURIComponent(school.name)}&am=${school.admissionFeeAmount || 0}&tr=APP_${applicationId}&cu=INR&tn=${encodeURIComponent('Admission Fee for ' + (formData.name || 'Student'))}`}
                                            size={180}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h4 className="text-lg font-black text-indigo-950">Pay Processing Fee</h4>
                                        <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-lg shadow-indigo-100">
                                            ₹{school.admissionFeeAmount} Payable
                                        </div>
                                        <p className="text-xs font-medium text-indigo-700/60 leading-relaxed max-w-xs mx-auto">
                                            Scan the code above to pay instantly. The Application ID will be automatically sent as the reference.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Account Created
                                </h4>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    You can track your application status using your <strong>Phone Number</strong> or <strong>Reference ID</strong> and your <strong>Date of Birth</strong> (as password).
                                </p>
                            </div>

                            {school?.admissionPaymentEnabled && (
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                                        <Send className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">Payment Pending</p>
                                        <p className="text-xs text-indigo-700 mt-0.5">Please complete the admission fee of ₹{school.admissionFeeAmount} to process your application.</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <a 
                                    href={`/apply/${schoolId}/status`}
                                    className="block w-full py-4 rounded-2xl bg-slate-800 text-white font-bold text-center hover:bg-slate-900 transition-all shadow-lg"
                                >
                                    Track Status Now
                                </a>
                            </div>

                            <p className="text-center text-xs text-slate-400">
                                A copy of this confirmation has been saved to your dashboard.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const inputBase = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-sm font-medium";
    const labelBase = "block text-sm font-bold text-slate-600 mb-1.5";

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    {school?.logo ? (
                        <img src={school.logo} alt="Logo" className="h-10 w-10 object-contain rounded-lg" />
                    ) : (
                        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black">
                            {school?.name?.charAt(0) || 'S'}
                        </div>
                    )}
                    <div>
                        <h1 className="font-black text-slate-800 text-lg leading-tight">{school?.name || 'School'}</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Admission Portal</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Open
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-8">
                {/* Stepper */}
                <div className="flex items-center justify-between mb-10 bg-white p-6 rounded-[2rem] shadow-sm border overflow-x-auto">
                    {[
                        { id: 1, label: 'Personal', icon: <User className="w-4 h-4" /> },
                        { id: 2, label: 'Admission', icon: <BookOpen className="w-4 h-4" /> },
                        { id: 3, label: 'Family', icon: <Users className="w-4 h-4" /> },
                        { id: 4, label: 'Documents', icon: <Upload className="w-4 h-4" /> },
                    ].map((step, idx) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-2 min-w-[80px]">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                    currentStep >= step.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= step.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < 3 && (
                                <div className={`flex-1 h-0.5 min-w-[20px] mx-2 rounded-full transition-colors duration-500 ${currentStep > step.id ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                        <div className="p-8 md:p-12 flex-1">
                            {/* STEP 1: PERSONAL PROFILE */}
                            {currentStep === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex flex-col md:flex-row gap-10 items-start">
                                        <div className="w-full md:w-48 shrink-0">
                                            <label className={labelBase}>Applicant Photo</label>
                                            <div className="relative group aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-400 transition-all cursor-pointer">
                                                {formData.photo ? (
                                                    <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-indigo-400" />
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-indigo-500">Upload Photo</p>
                                                    </div>
                                                )}
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className={labelBase}>{getFieldLabel('firstName', 'First Name')} <span className="text-red-500">*</span></label>
                                                    <input required type="text" value={formData.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} className={inputBase} placeholder="Enter first name" />
                                                </div>
                                                <div>
                                                    <label className={labelBase}>{getFieldLabel('lastName', 'Last Name')} <span className="text-red-500">*</span></label>
                                                    <input required type="text" value={formData.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} className={inputBase} placeholder="Enter last name" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('dob', 'Date of Birth')} <span className="text-red-500">*</span></label>
                                                <input required type="date" value={formData.dob || ''} onChange={e => handleChange('dob', e.target.value)} className={inputBase} />
                                            </div>
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('gender', 'Gender')} <span className="text-red-500">*</span></label>
                                                <select required value={formData.gender || ''} onChange={e => handleChange('gender', e.target.value)} className={inputBase}>
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('phone', 'Mobile Number')} <span className="text-red-500">*</span></label>
                                                <input required type="tel" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className={inputBase} placeholder="Primary contact" />
                                            </div>
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('whatsapp', 'WhatsApp Number')}</label>
                                                <input type="tel" value={formData.whatsapp || ''} onChange={e => handleChange('whatsapp', e.target.value)} className={inputBase} placeholder="For updates" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelBase}>{getFieldLabel('email', 'Email Address')}</label>
                                                <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} className={inputBase} placeholder="example@mail.com" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: ADMISSION & DISABILITY */}
                            {currentStep === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 border-b pb-4 mb-2">
                                            <h3 className="font-black text-slate-800 text-lg">Academic Preferences</h3>
                                            <p className="text-slate-400 text-xs">Define where you'd like to apply.</p>
                                        </div>
                                        
                                        <div>
                                            <label className={labelBase}>{getFieldLabel('className', 'Applying for Class')} <span className="text-red-500">*</span></label>
                                            <select required value={formData.className || ''} onChange={e => handleChange('className', e.target.value)} className={inputBase}>
                                                <option value="">Select Class</option>
                                                {(academicSettings?.classes || []).map((c: any) => {
                                                    const val = typeof c === 'object' ? (c.name || c.id) : c;
                                                    return <option key={val} value={val}>{val}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelBase}>{getFieldLabel('session', 'Academic Session')} <span className="text-red-500">*</span></label>
                                            <select required value={formData.session || ''} onChange={e => handleChange('session', e.target.value)} className={inputBase}>
                                                <option value="">Select Session</option>
                                                {(academicSettings?.sessions || []).map((s: any) => {
                                                    const val = typeof s === 'object' ? (s.name || s.id || s.year) : s;
                                                    return <option key={val} value={val}>{val}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelBase}>1st Language</label>
                                            <select value={formData.firstLanguage || ''} onChange={e => handleChange('firstLanguage', e.target.value)} className={inputBase}>
                                                <option value="">Select Language</option>
                                                {(academicSettings?.languages || []).map((lang: string) => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelBase}>2nd Language</label>
                                            <select value={formData.secondLanguage || ''} onChange={e => handleChange('secondLanguage', e.target.value)} className={inputBase}>
                                                <option value="">Select Language</option>
                                                {(academicSettings?.languages || []).map((lang: string) => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-4">
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <label className="flex items-center justify-between cursor-pointer mb-2">
                                                    <span className="font-bold text-slate-700">Special Needs / Disability?</span>
                                                    <div className={`w-12 h-6 rounded-full relative transition-all ${formData.isSpecialNeeds ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => handleChange('isSpecialNeeds', !formData.isSpecialNeeds)}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isSpecialNeeds ? 'left-7' : 'left-1'}`} />
                                                    </div>
                                                </label>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4">Select Yes if applicable</p>
                                                {formData.isSpecialNeeds && (
                                                    <textarea value={formData.specialNeedsDetails || ''} onChange={e => handleChange('specialNeedsDetails', e.target.value)} className={`${inputBase} min-h-[100px] mt-2`} placeholder="Please provide details of special needs..." />
                                                )}
                                            </div>

                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <label className="block font-bold text-slate-700 mb-4">Application Type</label>
                                                <div className="flex gap-4">
                                                    {['Fresh', 'Transfer'].map(type => (
                                                        <button key={type} type="button" onClick={() => handleChange('isTransfer', type === 'Transfer')} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                                            (type === 'Transfer' ? formData.isTransfer : !formData.isTransfer) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border'
                                                        }`}>
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                                {formData.isTransfer && (
                                                    <div className="mt-6 space-y-4 animate-in zoom-in-95 duration-300">
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">TC Issue Date</label>
                                                            <input type="date" value={formData.tcDate || ''} onChange={e => handleChange('tcDate', e.target.value)} className={inputBase} />
                                                        </div>
                                                        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center text-center">
                                                            {formData.tcUrl ? (
                                                                <div className="text-green-600 font-bold text-xs flex items-center gap-2">
                                                                    <CheckCircle2 className="w-4 h-4" /> TC Uploaded
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-400 font-bold text-xs">
                                                                     Upload Transfer Certificate
                                                                </div>
                                                            )}
                                                            <input type="file" onChange={(e) => handleFileChange(e, 'tc')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 pt-4 flex items-center gap-3">
                                            <input type="checkbox" id="rte" checked={!!formData.isRte} onChange={e => handleChange('isRte', e.target.checked)} className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            <label htmlFor="rte" className="text-sm font-bold text-slate-700 select-none">Apply under RTE (Right to Education) scheme?</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: FAMILY & DEMOGRAPHICS */}
                            {currentStep === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 border-b pb-4">
                                            <h3 className="font-black text-slate-800 text-lg">Guardian & Background</h3>
                                            <p className="text-slate-400 text-xs">Information about family and previous academic performance.</p>
                                        </div>

                                        <div>
                                            <label className={labelBase}>{getFieldLabel('fatherName', "Father's / Guardian Name")} <span className="text-red-500">*</span></label>
                                            <input required type="text" value={formData.fatherName || ''} onChange={e => handleChange('fatherName', e.target.value)} className={inputBase} placeholder="Full name" />
                                        </div>
                                        <div>
                                            <label className={labelBase}>{getFieldLabel('fatherOccupation', 'Parent Profession')}</label>
                                            <input type="text" value={formData.parentProfession || ''} onChange={e => handleChange('parentProfession', e.target.value)} className={inputBase} placeholder="e.g. Engineer" />
                                        </div>
                                        <div>
                                            <label className={labelBase}>{getFieldLabel('motherName', "Mother's Name")} <span className="text-red-500">*</span></label>
                                            <input required type="text" value={formData.motherName || ''} onChange={e => handleChange('motherName', e.target.value)} className={inputBase} placeholder="Full name" />
                                        </div>
                                        <div>
                                            <label className={labelBase}>{getFieldLabel('fatherPhone', 'Parent Contact No')} <span className="text-red-500">*</span></label>
                                            <input required type="tel" value={formData.fatherPhone || ''} onChange={e => handleChange('fatherPhone', e.target.value)} className={inputBase} placeholder="Guardian contact" />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className={labelBase}>{getFieldLabel('currentAddress', 'Residential Address')} <span className="text-red-500">*</span></label>
                                            <textarea required value={formData.currentAddress || ''} onChange={e => handleChange('currentAddress', e.target.value)} className={`${inputBase} min-h-[80px] resize-none`} placeholder="Current living address" />
                                        </div>

                                        <div>
                                            <label className={labelBase}>Previous Percentage / CGPA</label>
                                            <input type="text" value={formData.percentageCGPA || ''} onChange={e => handleChange('percentageCGPA', e.target.value)} className={inputBase} placeholder="e.g. 85% or 9.0" />
                                        </div>
                                        <div>
                                            <label className={labelBase}>Reason for Joining</label>
                                            <input type="text" value={formData.reasonToJoin || ''} onChange={e => handleChange('reasonToJoin', e.target.value)} className={inputBase} placeholder="Why our school?" />
                                        </div>

                                        <div className="md:col-span-2 border-t pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('category', 'Category')}</label>
                                                <select value={formData.category || ''} onChange={e => handleChange('category', e.target.value)} className={inputBase}>
                                                    <option value="">Select Category</option>
                                                    {(academicSettings?.categories || []).map((cat: any) => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelBase}>Caste</label>
                                                <input type="text" value={formData.caste || ''} onChange={e => handleChange('caste', e.target.value)} className={inputBase} placeholder="e.g. Hindu" />
                                            </div>
                                            <div>
                                                <label className={labelBase}>Nationality</label>
                                                <input type="text" value={formData.nationality || ''} onChange={e => handleChange('nationality', e.target.value)} className={inputBase} placeholder="e.g. Indian" />
                                            </div>
                                            <div>
                                                <label className={labelBase}>{getFieldLabel('penNo', 'PEN No. (Permanent Education Number)')}</label>
                                                <input type="text" value={formData.penNo || ''} onChange={e => handleChange('penNo', e.target.value)} className={inputBase} placeholder="Optional" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: DOCUMENTS & PAYMENT */}
                            {currentStep === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 mb-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                                <Upload className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800">Supportive Documents</h3>
                                                <p className="text-slate-400 text-xs">Upload Aadhaar, birth certificate, etc.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative group border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:border-indigo-400 transition-all text-center cursor-pointer bg-white">
                                                <input type="file" multiple onChange={(e) => handleFileChange(e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-50 transition-all">
                                                    <Upload className="w-6 h-6 text-slate-300 group-hover:text-indigo-400" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-600">Select Files</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter">Multiple files allowed</p>
                                            </div>

                                            <div className="space-y-2">
                                                {uploadedDocs.map((doc, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-2xl shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-[8px] font-black uppercase shrink-0">
                                                                {doc.name.split('.').pop()}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 truncate">{doc.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => setUploadedDocs(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {uploadedDocs.length === 0 && (
                                                    <div className="h-full flex items-center justify-center text-slate-300 italic text-xs border border-dashed rounded-3xl py-10">
                                                        No documents added yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {school?.admissionPaymentEnabled && (
                                        <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-125" />
                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="space-y-4">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">
                                                        Admission Fee
                                                    </div>
                                                    <h3 className="text-3xl font-black tracking-tight">Process Your Application</h3>
                                                    <p className="text-indigo-100/70 text-sm max-w-sm">
                                                        A one-time application processing fee is required. You can pay via UPI or Bank Transfer and provide the reference ID after submission.
                                                    </p>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-xl px-10 py-6 rounded-[2rem] border border-white/20 text-center md:text-right shadow-2xl">
                                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 opacity-60">Total Payable</p>
                                                    <p className="text-5xl font-black tabular-nums">₹{school.admissionFeeAmount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-8 border-2 border-indigo-100 rounded-[2.5rem] bg-indigo-50/30">
                                        <h3 className="text-sm font-black text-indigo-900 mb-2">Final Confirmation</h3>
                                        <p className="text-xs text-indigo-700/70 leading-relaxed font-medium">
                                            By submitting this application, you certify that all information provided is accurate and true to the best of your knowledge. Any false information may lead to rejection of your application.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="mt-8 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-in bounce-in duration-300">
                                    <XCircle className="w-5 h-5 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}
                        </div>

                        {/* Navigation Footer */}
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <button type="button" onClick={prevStep} disabled={currentStep === 1 || submitting} className={`px-6 md:px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                                currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:shadow-md active:scale-95'
                            }`}>
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>

                            {currentStep < totalSteps ? (
                                <button type="button" onClick={nextStep} className="px-10 md:px-12 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                    Next Step <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button type="submit" disabled={submitting} className="px-12 md:px-16 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting</> : <><Send className="h-4 w-4" /> Final Submit</>}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
