'use client';

import React from 'react';
import { StudentFormConfig, SectionConfig } from '@/types';
import {
    User,
    Users,
    GraduationCap,
    CreditCard,
    LayoutDashboard,
    Home,
    ClipboardList,
    CheckCircle2,
    ToggleLeft,
    Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import ToggleSwitch from '@/components/school-admin/toggle-switch';
import { BookOpen, FileText, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateNextId } from '@/lib/id-generator';

interface AdmissionFormPreviewProps {
    config: StudentFormConfig[];
    sectionSettings?: SectionConfig[];
    idSettings?: Record<string, any>;
    fullWidth?: boolean;
}

const FIELD_SECTIONS = [
    {
        title: 'Admission Details',
        icon: <GraduationCap size={18} />,
        color: 'bg-indigo-600',
        fields: ['registrationNo', 'enrollmentNo', 'apaarId', 'penNo', 'srNo', 'generalRegistrationNo', 'admissionDate', 'stream', 'classAppliedFor', 'enrolledYear', 'enrolledSession', 'className', 'section', 'rollNumber', 'house', 'rte', 'studentType', 'photo', 'firstLanguage', 'secondLanguage', 'thirdLanguage', 'referredBy', 'sibling']
    },
    {
        title: 'Personal Information',
        icon: <User size={18} />,
        color: 'bg-indigo-600',
        fields: ['firstName', 'lastName', 'dob', 'gender', 'bloodGroup', 'religion', 'category', 'phone', 'email', 'whatsappNo', 'alternateNumber', 'height', 'weight', 'measurementDate', 'specialNeeds', 'specialNeedsDetails']
    },
    {
        title: 'Parents/Guardian Details',
        icon: <Users size={18} />,
        color: 'bg-emerald-500',
        fields: ['fatherName', 'fatherOccupation', 'fatherPhone', 'fatherPhoto', 'fatherDocName', 'fatherDocFile', 'motherName', 'motherOccupation', 'motherPhone', 'motherPhoto', 'motherDocName', 'motherDocFile', 'guardianSelection', 'guardianName', 'guardianRelation', 'guardianOccupation', 'guardianPhone', 'guardianPhoto', 'guardianAddress', 'guardianEmail', 'guardianDocName', 'guardianDocFile', 'fatherEmail', 'motherEmail']
    },
    {
        title: 'Address Details',
        icon: <Home size={18} />,
        color: 'bg-amber-500',
        fields: ['currentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'district', 'city', 'state', 'pincode', 'country', 'permanentAddress', 'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry']
    },
    {
        title: 'Previous Academic Details',
        icon: <ClipboardList size={18} />,
        color: 'bg-sky-500',
        fields: ['previousSchool', 'previousLastClass', 'affiliatedBoard', 'marksObtained', 'percentageCGPA', 'result', 'tcDate', 'tcNo', 'tcFile']
    },
    {
        title: 'Bank & Govt IDs',
        icon: <CreditCard size={18} />,
        color: 'bg-purple-500',
        fields: ['aadhaarNo', 'samagraId', 'bankAccountNo', 'ifscCode', 'bankName', 'accountHolderName']
    },
    {
        title: 'Miscellaneous',
        icon: <LayoutDashboard size={18} />,
        color: 'bg-slate-500',
        fields: ['caste', 'nationality']
    },
    {
        title: 'Miscellaneous Documents',
        icon: <FileText size={18} />,
        color: 'bg-indigo-500',
        fields: ['miscDocuments']
    }
];

export default function AdmissionFormPreview({ config, sectionSettings, idSettings, fullWidth }: AdmissionFormPreviewProps) {
    const [manualFields, setManualFields] = React.useState<Record<string, any>>({});

    const isVisible = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        if (!field) return false;
        if (!field.visible) return false;

        // Preview Dependency Logic
        if (field.dependsOn) {
            const depValue = manualFields[field.dependsOn.fieldName] || '';
            // For preview, we allow seeing it if the dep match
            return String(depValue) === String(field.dependsOn.value);
        }

        return true;
    };

    const getFieldMetadata = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        return {
            placeholder: field?.placeholder,
            helpText: field?.helpText,
            fieldType: field?.fieldType
        };
    };

    const isRequired = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        return field ? field.required : false;
    };

    const hasAutoManualToggle = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        return field ? field.hasAutoManualToggle : false;
    };

    const getFieldLabel = (fieldName: string) => {
        const field = config.find(c => c.fieldName === fieldName);
        return field ? field.label : fieldName;
    };

    const getAutoValue = (fieldName: string) => {
        if (!idSettings || !idSettings[fieldName]) return fieldName.toUpperCase() + '-XXXX';
        const settings = idSettings[fieldName];

        // Special case for enrollment
        if (fieldName === 'enrollmentNo' && settings.useSameAsRegNo) {
            return getAutoValue('registrationNo');
        }

        return generateNextId(settings);
    };

    return (
        <div className={`bg-white w-full ${fullWidth ? '' : 'max-w-5xl mx-auto'} rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 transition-all duration-500`}>
            {/* Header - Styled for 'Exact Copy' requirement */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-10 rounded-t-[2.5rem]">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner">
                        <BookOpen className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                            Easy School
                        </h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                            Default admission Preview
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center px-4 h-10 bg-indigo-50 rounded-full border border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">SESSION</span>
                        <span className="text-sm font-bold text-indigo-700">2025-2026</span>
                    </div>
                    <div className="text-[10px] text-indigo-100 font-black px-4 py-1.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100 italic">WYSIWYG EDITOR</div>
                </div>
            </div>

            <div className="p-10 space-y-12 bg-slate-50/30 overflow-y-auto max-h-[70vh]">
                {FIELD_SECTIONS.map((section, sIndex) => {
                    const visibleFields = section.fields.filter(f => isVisible(f));
                    if (visibleFields.length === 0) return null;

                    const getLgCols = () => {
                        return fullWidth ? 4 : 3;
                    };

                    const subSections = [
                        { header: "Father's Details", trigger: 'fatherName', fields: ['fatherName', 'fatherOccupation', 'fatherPhone', 'fatherPhoto', 'fatherDocName', 'fatherDocFile', 'fatherEmail'] },
                        { header: "Mother's Details", trigger: 'motherName', fields: ['motherName', 'motherOccupation', 'motherPhone', 'motherPhoto', 'motherDocName', 'motherDocFile', 'motherEmail'] },
                        { header: "Guardian Details", trigger: 'guardianSelection', fields: ['guardianSelection', 'guardianName', 'guardianRelation', 'guardianOccupation', 'guardianPhone', 'guardianPhoto', 'guardianAddress', 'guardianEmail', 'guardianDocName', 'guardianDocFile'] },
                        { header: "Current Residence", trigger: 'currentAddress', fields: ['currentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'district', 'city', 'state', 'pincode', 'country'] },
                        { header: "Permanent Residence", trigger: 'permanentAddress', fields: ['permanentAddress', 'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentDistrict', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry'] }
                    ];

                    return (
                        <section key={section.title} className="mb-12">
                            <SectionHeader icon={section.icon} title={section.title} />
                            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${getLgCols()} gap-x-8 gap-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                {section.fields.map((fieldName, fIndex) => {
                                    const label = getFieldLabel(fieldName);
                                    const visible = isVisible(fieldName);
                                    const required = isRequired(fieldName);
                                    const hasToggle = hasAutoManualToggle(fieldName);

                                    if (!visible) return null;

                                    // Skip dependent guardian fields if not 'Other'
                                    if (['guardianName', 'guardianRelation', 'guardianOccupation', 'guardianPhone', 'guardianPhoto', 'guardianAddress', 'guardianEmail', 'guardianDocName', 'guardianDocFile'].includes(fieldName)) {
                                        const selection = manualFields['guardianSelection'] || 'Father';
                                        if (selection !== 'Other') return null;
                                    }

                                    // Check for sub-section header
                                    const subSec = subSections.find(s => s.trigger === fieldName);
                                    const showSubHeader = subSec && subSec.fields.some(f => isVisible(f));

                                    return (
                                        <React.Fragment key={fieldName}>
                                            {showSubHeader && (
                                                <div className="col-span-full mt-6 mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-6 w-1 bg-indigo-500 rounded-full" />
                                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                                            {subSec.header}
                                                        </h4>
                                                    </div>
                                                    <div className="mt-2 h-px bg-slate-100 w-full" />
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between min-h-[1.5rem]">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                        {label}{required ? <span className="text-rose-500 ml-1 text-xs">*</span> : ''}
                                                    </label>
                                                    {hasToggle && (
                                                        <ToggleSwitch
                                                            enabled={manualFields[fieldName] || false}
                                                            onChange={(val) => setManualFields(prev => ({ ...prev, [fieldName]: val }))}
                                                            labelOff="Auto"
                                                            labelOn="Manual"
                                                        />
                                                    )}
                                                </div>

                                                {/* Specialized rendering for functional toggles */}
                                                {fieldName === 'specialNeeds' ? (
                                                    <div className="h-11 flex items-center">
                                                        <ToggleSwitch
                                                            enabled={manualFields['specialNeeds'] || false}
                                                            onChange={(val) => setManualFields(prev => ({ ...prev, specialNeeds: val }))}
                                                            labelOff="No"
                                                            labelOn="Yes"
                                                        />
                                                    </div>
                                                ) : fieldName === 'rte' ? (
                                                    <div className="flex items-center gap-4 mt-1 h-11 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                                        <label className="flex items-center gap-2 cursor-pointer group px-4 py-1.5 rounded-lg transition-all hover:bg-white">
                                                            <input
                                                                type="radio"
                                                                checked={manualFields['rte'] === true}
                                                                onChange={() => setManualFields(prev => ({ ...prev, rte: true }))}
                                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Yes</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group px-4 py-1.5 rounded-lg transition-all hover:bg-white">
                                                            <input
                                                                type="radio"
                                                                checked={manualFields['rte'] !== true}
                                                                onChange={() => setManualFields(prev => ({ ...prev, rte: false }))}
                                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No</span>
                                                        </label>
                                                    </div>
                                                ) : fieldName === 'guardianSelection' ? (
                                                    <div className="flex items-center gap-2 mt-1 h-11 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100">
                                                        {['Father', 'Mother', 'Other'].map(opt => (
                                                            <label key={opt} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg cursor-pointer transition-all ${manualFields['guardianSelection'] === opt || (!manualFields['guardianSelection'] && opt === 'Father') ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white text-slate-400'}`}>
                                                                <input
                                                                    type="radio"
                                                                    checked={manualFields['guardianSelection'] === opt || (!manualFields['guardianSelection'] && opt === 'Father')}
                                                                    onChange={() => setManualFields(prev => ({ ...prev, guardianSelection: opt }))}
                                                                    className="hidden"
                                                                />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <InputField
                                                        label={null}
                                                        disabled
                                                        value={hasToggle
                                                            ? (manualFields[fieldName] ? "MANUAL INPUT" : getAutoValue(fieldName))
                                                            : (fieldName.toLowerCase().includes('photo') ? "CLICK TO UPLOAD" : "PREVIEW DATA")}
                                                        hasToggle={hasToggle}
                                                        metadata={getFieldMetadata(fieldName)}
                                                    />
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0">
                <div className="flex gap-4">
                    <Badge variant="outline" className="px-4 py-2 rounded-full border-slate-200 font-bold text-slate-500">
                        {config.filter(c => c.visible).length} Enabled
                    </Badge>
                    <Badge className="px-4 py-2 rounded-full border-indigo-100 bg-indigo-50 text-indigo-600 font-bold border">
                        {config.filter(c => c.required).length} Required
                    </Badge>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl h-12 px-6 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 pointer-events-none">
                        Cancel
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 shadow-lg shadow-indigo-100 font-bold flex items-center gap-2 pointer-events-none">
                        <Save className="w-5 h-5" />
                        Save Student
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="flex items-center gap-3 mb-8 text-slate-800 border-b border-slate-50 pb-4">
            <div className="text-indigo-600 p-2 bg-indigo-50 rounded-xl">{icon}</div>
            <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
        </div>
    );
}

function InputField({ label, value, disabled, hasToggle, metadata }: any) {
    return (
        <div className="space-y-2">
            {label && <label className="text-sm font-bold text-slate-700 pl-1">{label}</label>}
            <div className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${disabled ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-800'} ${hasToggle ? 'border-indigo-100 bg-indigo-50/30' : ''}`}>
                {metadata?.placeholder || value}
            </div>
            {metadata?.helpText && <p className="text-[10px] text-slate-400 italic pl-1">{metadata.helpText}</p>}
            {metadata?.fieldType && <Badge variant="outline" className="text-[8px] bg-slate-50 border-slate-200 text-slate-400 px-1 py-0">{metadata.fieldType.toUpperCase()}</Badge>}
        </div>
    );
}
