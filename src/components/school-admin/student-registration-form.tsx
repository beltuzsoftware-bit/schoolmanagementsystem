'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Upload, User, FileText, Home, BookOpen, IndianRupee, Users, Trash2, MapPin, Shield, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Student } from '@/types';
import FormSection from './form-section';
import TextInput from './text-input';
import SelectInput from './select-input';
import Link from 'next/link';
import ToggleSwitch from './toggle-switch';
import ImageCropper from '../image-cropper';
import { CustomDatePicker } from '@/components/ui/custom-date-picker';
import AddSiblingModal from './add-sibling-modal';
import { getAdmissionFormConfigForSchool, addStudent, updateStudent } from '@/app/actions';
import { generateNextId } from '@/lib/id-generator';
import { StudentFormConfig, SectionConfig } from '@/types';
import {
    INITIAL_CLASS_SETUPS,
    INITIAL_SECTIONS,
    INITIAL_HOUSES,
    INITIAL_SESSIONS,
    INITIAL_RELIGIONS,
    INITIAL_CATEGORIES,
    INITIAL_STREAMS,
    INITIAL_DISABLE_REASONS,
    GENDERS,
    BLOOD_GROUPS,
    YES_NO_OPTIONS
} from '@/lib/student-constants';
import { toast } from 'sonner';

interface StudentRegistrationFormProps {
    schoolId: string;
    initialData?: Student;
    onClose: () => void;
    onSuccess: () => void;
    isFullPage?: boolean;
}

const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({
    schoolId,
    initialData,
    onClose,
    onSuccess,
    isFullPage = false
}) => {
    const [formData, setFormData] = useState<Partial<Student>>({
        schoolId,
        status: 'Active',
        firstName: '',
        lastName: '',
        nationality: 'Indian',
        rte: 'No',
        admissionDate: new Date().toISOString().split('T')[0],
        specialNeeds: 'No',
        specialNeedsDetails: 'N/A',
        guardianSelection: 'Father',
        country: 'India',
        permanentCountry: 'India',
        miscDocuments: [
            { title: '', file: '' },
            { title: '', file: '' },
            { title: '', file: '' },
            { title: '', file: '' }
        ],
        enrolledYear: '',
        referredBy: '',
        guardianEmail: '',
        previousLastClass: '',
        affiliatedBoard: '',
        marksObtained: '',
        percentageCGPA: '',
        result: '',
        recordDateHeightWeight: '',
        ...initialData
    });

    const [isSiblingModalOpen, setIsSiblingModalOpen] = useState(false);
    const [isSameAsCurrent, setIsSameAsCurrent] = useState(false);
    const [formConfig, setFormConfig] = useState<StudentFormConfig[]>([]);
    const [sectionSettings, setSectionSettings] = useState<SectionConfig[]>([]);
    const [idSettings, setIdSettings] = useState<Record<string, any>>({});
    const [manualFields, setManualFields] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [schoolName, setSchoolName] = useState("Easy School");
    const [templateName, setTemplateName] = useState("Default Admission");
    const [academicSettings, setAcademicSettings] = useState<any>(null);
    const [isReadingField, setIsReadingField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<string | null>(null);

    // Sibling Sync States
    const [siblingData, setSiblingData] = useState<Student | null>(null);
    const [siblingSync, setSiblingSync] = useState({
        parents: false,
        address: false,
        guardian: false
    });


    // Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropTarget, setCropTarget] = useState<'photo' | 'fatherPhoto' | 'motherPhoto' | 'guardianPhoto' | null>(null);

    // Derived state for current year (mock)
    const currentYear = new Date().getFullYear().toString();

    // File states - in a real app these would be handled via a file upload hook/service
    const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.photo || null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getAdmissionFormConfigForSchool(schoolId);
                // Set configs with fallback to empty arrays/objects to prevent crashes
                setFormConfig(res.config || []);
                setSectionSettings(res.sectionSettings || []);
                setIdSettings(res.idSettings || {});
                setSchoolName(res.schoolName || "Easy School");
                setTemplateName(res.templateName || "Default Admission");

                // Initialize manualFields for fields that have the toggle
                const initialManual: Record<string, boolean> = {};
                (res.config || []).forEach((f: any) => {
                    if (f.hasAutoManualToggle) {
                        const isAutoEnabled = (res.idSettings as any)?.[f.fieldName]?.enabled !== false;
                        initialManual[f.fieldName] = !isAutoEnabled;
                    }
                });
                setManualFields(initialManual);

                // Set academic settings and default session
                if (res.academicSettings) {
                    setAcademicSettings(res.academicSettings);
                    
                    const updates: any = {};
                    if (res.academicSettings.currentSession) {
                        updates.enrolledSession = formData.enrolledSession || res.academicSettings.currentSession;
                    }
                    
                    const langConfig = res.academicSettings.languages;
                    if (langConfig && typeof langConfig === 'object' && !Array.isArray(langConfig)) {
                        if (langConfig.firstLanguageFixed && langConfig.firstLanguageDefault) {
                            updates.firstLanguage = langConfig.firstLanguageDefault;
                        }
                        if (langConfig.secondLanguageFixed && langConfig.secondLanguageDefault) {
                            updates.secondLanguage = langConfig.secondLanguageDefault;
                        }
                        if (langConfig.thirdLanguageFixed && langConfig.thirdLanguageDefault) {
                            updates.thirdLanguage = langConfig.thirdLanguageDefault;
                        }
                    }
                    
                    if (Object.keys(updates).length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            ...updates
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch form config", error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [schoolId]);

    // Handle Sibling Data Sync
    useEffect(() => {
        if (!siblingData) return;

        const updates: any = {};

        if (siblingSync.parents) {
            updates.fatherName = siblingData.fatherName;
            updates.fatherPhone = siblingData.fatherPhone;
            updates.fatherOccupation = siblingData.fatherOccupation;
            updates.fatherOfficialAddress = siblingData.fatherOfficialAddress;
            updates.fatherEmail = siblingData.fatherEmail;
            updates.fatherAadhar = siblingData.fatherAadhar;
            updates.fatherPhoto = siblingData.fatherPhoto;

            updates.motherName = siblingData.motherName;
            updates.motherPhone = siblingData.motherPhone;
            updates.motherOccupation = siblingData.motherOccupation;
            updates.motherOfficialAddress = siblingData.motherOfficialAddress;
            updates.motherEmail = siblingData.motherEmail;
            updates.motherAadhar = siblingData.motherAadhar;
            updates.motherPhoto = siblingData.motherPhoto;
        }

        if (siblingSync.guardian) {
            updates.guardianSelection = siblingData.guardianSelection;
            updates.guardianName = siblingData.guardianName;
            updates.guardianRelation = siblingData.guardianRelation;
            updates.guardianPhone = siblingData.guardianPhone;
            updates.guardianOccupation = siblingData.guardianOccupation;
            updates.guardianEmail = siblingData.guardianEmail;
            updates.guardianAddress = siblingData.guardianAddress;
            updates.guardianPhoto = siblingData.guardianPhoto;
        }

        if (siblingSync.address) {
            updates.currentAddress = siblingData.currentAddress;
            updates.village = siblingData.village;
            updates.locality = siblingData.locality;
            updates.postOffice = siblingData.postOffice;
            updates.policeStation = siblingData.policeStation;
            updates.district = siblingData.district;
            updates.city = siblingData.city;
            updates.state = siblingData.state;
            updates.pincode = siblingData.pincode;
            updates.country = siblingData.country;

            updates.permanentAddress = siblingData.permanentAddress;
            updates.permanentVillage = siblingData.permanentVillage;
            updates.permanentLocality = siblingData.permanentLocality;
            updates.permanentPostOffice = siblingData.permanentPostOffice;
            updates.permanentPoliceStation = siblingData.permanentPoliceStation;
            updates.permanentDistrict = siblingData.permanentDistrict;
            updates.permanentCity = siblingData.permanentCity;
            updates.permanentState = siblingData.permanentState;
            updates.permanentPincode = siblingData.permanentPincode;
            updates.permanentCountry = siblingData.permanentCountry;
        }

        if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
        }
    }, [siblingData, siblingSync]);

    // NEW: Normalize formData values to match dropdown options (case-insensitive)
    useEffect(() => {
        if (formConfig.length > 0 && formData) {
            let hasChanges = false;
            const normalizedData = { ...formData };

            formConfig.forEach(field => {
                const fieldName = field.fieldName;
                const currentVal = (normalizedData as any)[fieldName];
                if (currentVal && typeof currentVal === 'string') {
                    const options = getFieldOptions(fieldName, []);
                    if (options.length > 0) {
                        const match = options.find((opt: any) => {
                            const optVal = typeof opt === 'string' ? opt : (opt as any).value;
                            return String(optVal).toLowerCase() === currentVal.toLowerCase();
                        });

                        const matchVal = match ? (typeof match === 'string' ? match : (match as any).value) : null;
                        if (matchVal && matchVal !== currentVal) {
                            (normalizedData as any)[fieldName] = matchVal;
                            hasChanges = true;
                        }
                    }
                }
            });

            // Special case for specialNeeds (Prisma) vs hasSpecialNeeds (Legacy Form)
            if ((initialData as any)?.specialNeeds && !normalizedData.specialNeeds) {
                normalizedData.specialNeeds = (initialData as any).specialNeeds;
                hasChanges = true;
            }

            if (hasChanges) {
                setFormData(normalizedData);
            }
        }
    }, [formConfig, initialData]);

    const isVisible = (fieldName: string) => {
        if (formConfig.length === 0) return true;
        const field = formConfig.find(f => f.fieldName === fieldName);
        if (!field) return true;
        if (!field.visible) return false;

        // SaaS-Level Conditional Logic
        if (field.dependsOn) {
            const dependentValue = formData[field.dependsOn.fieldName as keyof Student];
            // NEW: Case-insensitive comparison to handle "Yes" vs "yes"
            return String(dependentValue).toLowerCase() === String(field.dependsOn.value).toLowerCase();
        }

        return true;
    };

    const isRequired = (fieldName: string) => {
        const field = formConfig.find(f => f.fieldName === fieldName);
        return field?.required || false;
    };

    const hasToggle = (fieldName: string) => {
        const field = formConfig.find(f => f.fieldName === fieldName);
        return field?.hasAutoManualToggle || false;
    };

    const renderDynamicField = (field: StudentFormConfig) => {
        const fieldName = field.fieldName;
        let label = field.label;
        if (fieldName === 'postOffice' || fieldName === 'permanentPostOffice') label = 'P.O (POST OFFICE)';
        if (fieldName === 'policeStation' || fieldName === 'permanentPoliceStation') label = 'P.S (POLICE STATION)';

        const required = field.required;
        const placeholder = field.placeholder;
        let type = field.fieldType;
        if (!type || type === 'text') {
            type = (fieldName.toLowerCase().includes('date') || fieldName === 'dob') ? 'date' : 'text';
        }

        const portraitPhotos = ['photo', 'fatherPhoto', 'motherPhoto', 'guardianPhoto'];
        const isPortrait = portraitPhotos.includes(fieldName) || field.fieldType === 'photo' && portraitPhotos.some(p => fieldName.toLowerCase().includes(p.toLowerCase()));

        // If it's a photo but not a portrait, treat it as a file (to support PDFs)
        const isPhoto = isPortrait;
        const isFile = !isPortrait && (
            field.fieldType === 'file' ||
            field.fieldType === 'photo' ||
            fieldName.toLowerCase().includes('file') ||
            fieldName.toLowerCase().includes('docupload') ||
            fieldName.toLowerCase().includes('photo') ||
            fieldName.toLowerCase().includes('aadhar') ||
            fieldName.toLowerCase().includes('certificate') ||
            fieldName.toLowerCase().includes('id')
        );
        const options = getFieldOptions(fieldName, []);
        // Respect the fieldType set in the Super Admin template.
        // Only treat as a dropdown if:
        //   1. The field type is explicitly 'select', OR
        //   2. No fieldType is set AND options exist (backward compatibility for system dropdowns)
        // If the Super Admin sets a field to 'text', 'textarea', 'date', etc., NEVER show as dropdown.
        const explicitType = field.fieldType;
        const isSelect = explicitType === 'select' || (!explicitType && options.length > 0);
        const hasToggleVal = hasToggle(fieldName);

        // 1. Photo Field
        if (isPhoto) {
            const photoValue = formData[fieldName as keyof Student] as string | undefined;
            const hasPhoto = !!photoValue;
            return (
                <div key={fieldName} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                        {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                    </label>
                    <div className="relative">
                        <div
                            className={`w-full h-11 border rounded-xl bg-white flex items-center cursor-pointer transition-all group overflow-hidden
                                ${hasPhoto
                                    ? 'border-indigo-300 hover:border-indigo-400'
                                    : `border-dashed border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 justify-center gap-2 ${isDragging === fieldName ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : ''}`
                                }`}
                            onClick={() => document.getElementById(`${fieldName}-upload`)?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(fieldName); }}
                            onDragLeave={() => setIsDragging(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(null);
                                const file = e.dataTransfer.files?.[0];
                                if (file && file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        setCropImage(reader.result as string);
                                        setCropTarget(fieldName as any);
                                        setIsCropperOpen(true);
                                    };
                                    reader.readAsDataURL(file);
                                } else if (file) {
                                    toast.error("Portraits must be images");
                                }
                            }}
                        >
                            {hasPhoto ? (
                                <>
                                    {/* Thumbnail preview */}
                                    <img
                                        src={photoValue}
                                        alt="preview"
                                        className="h-11 w-11 object-cover shrink-0 border-r border-slate-200"
                                    />
                                    <span className="text-[10px] font-black text-indigo-600 truncate uppercase tracking-widest px-3">
                                        Photo Added ✓ &nbsp; <span className="text-slate-400 font-normal normal-case">Click to change</span>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload size={14} className="text-slate-400 group-hover:text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 truncate uppercase tracking-widest">
                                        {placeholder || 'Upload Image'}
                                    </span>
                                </>
                            )}
                            <input id={`${fieldName}-upload`} type="file" accept="image/*" className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) { handleFileChange(e as any, fieldName as any); } }} />
                        </div>

                        {/* Remove / Delete button — only visible when a photo is set */}
                        {hasPhoto && (
                            <button
                                type="button"
                                title="Remove photo"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(prev => ({ ...prev, [fieldName]: undefined }));
                                    // Also reset the file input so the same file can be re-picked
                                    const input = document.getElementById(`${fieldName}-upload`) as HTMLInputElement;
                                    if (input) input.value = '';
                                }}
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
                            >
                                <X size={11} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>
            );
        }


        // 2. Document/File Field
        if (isFile) {
            const inputId = `${fieldName}-doc-upload`;
            return (
                <div key={fieldName} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                        {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                    </label>
                    <div className="relative group/doc">
                        <div
                            className={`w-full h-11 border border-dashed border-slate-300 rounded-xl bg-white flex items-center justify-center gap-2 cursor-pointer transition-all group ${isDragging === fieldName ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : 'hover:bg-indigo-50 hover:border-indigo-300'}`}
                            onClick={() => document.getElementById(inputId)?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(fieldName); }}
                            onDragLeave={() => setIsDragging(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(null);
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                    setIsReadingField(fieldName);
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        const res = reader.result as string;
                                        setFormData(p => ({
                                            ...p,
                                            [fieldName]: file.name,
                                            [`${fieldName}Content`]: res
                                        }));
                                        setIsReadingField(null);
                                        toast.success(`${label} uploaded`);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        >
                            <Upload size={14} className="text-slate-400 group-hover:text-indigo-500" />
                            <span className="text-[10px] font-black text-slate-400 truncate uppercase tracking-widest">
                                {isReadingField === fieldName ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                                    </span>
                                ) : (
                                    formData[fieldName as keyof Student] ? `${formData[fieldName as keyof Student]} ✓` : (placeholder || 'Drag and drop file here')
                                )}
                            </span>
                        </div>
                        <input id={inputId} type="file" className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setIsReadingField(fieldName);
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        const res = reader.result as string;
                                        setFormData(p => ({
                                            ...p,
                                            [fieldName]: file.name,
                                            [`${fieldName}Content`]: res // Save actual content
                                        }));
                                        setIsReadingField(null);
                                        toast.success(`${label} processed`);
                                    };
                                    reader.onerror = () => {
                                        setIsReadingField(null);
                                        toast.error("Failed to read file");
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />

                        {/* Remove Button */}
                        {formData[fieldName as keyof Student] && !isReadingField && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(p => ({
                                        ...p,
                                        [fieldName]: undefined,
                                        [`${fieldName}Content`]: undefined
                                    }));
                                    const input = document.getElementById(inputId) as HTMLInputElement;
                                    if (input) input.value = '';
                                    toast.info(`${label} removed`);
                                }}
                                className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors z-10"
                            >
                                <X size={10} strokeWidth={4} />
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // 3. Select Field (Dropdown)
        if (isSelect) {
            const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                const val = e.target.value;
                if (fieldName === 'className') {
                    // Logic for class selection resetting sections
                    let selectedClassObj;
                    if (academicSettings?.useCustomClasses) {
                        selectedClassObj = academicSettings.classes.find((c: any) => c.name.toLowerCase() === val.toLowerCase());
                    } else {
                        selectedClassObj = INITIAL_CLASS_SETUPS.find(c => c.name.toLowerCase() === val.toLowerCase());
                    }
                    const sections = selectedClassObj?.sections || [];
                    const hasSections = sections.length > 0;
                    const newSection = hasSections ? (sections[0] || '') : 'N/A';

                    const langConfig = academicSettings?.languages;
                    const langIsObj = langConfig && typeof langConfig === 'object' && !Array.isArray(langConfig);
                    const newFirst = (langIsObj && langConfig.firstLanguageFixed && langConfig.firstLanguageDefault) ? langConfig.firstLanguageDefault : '';
                    const newSecond = (langIsObj && langConfig.secondLanguageFixed && langConfig.secondLanguageDefault) ? langConfig.secondLanguageDefault : '';
                    const newThird = (langIsObj && langConfig.thirdLanguageFixed && langConfig.thirdLanguageDefault) ? langConfig.thirdLanguageDefault : '';

                    setFormData(prev => ({
                        ...prev,
                        className: val,
                        section: newSection,
                        firstLanguage: newFirst, secondLanguage: newSecond, thirdLanguage: newThird
                    }));
                } else if (fieldName === 'enrolledSession') {
                    setFormData(prev => ({
                        ...prev,
                        enrolledSession: val,
                        currentSessionId: val
                    }));
                } else if (fieldName === 'secondLanguage') {
                    let updatedThird = formData.thirdLanguage || '';
                    const langConfig = academicSettings?.languages;
                    if (langConfig && typeof langConfig === 'object' && !Array.isArray(langConfig)) {
                        let available = langConfig.available || [];
                        if (langConfig.firstLanguageFixed && langConfig.firstLanguageDefault) {
                            available = available.filter((l: string) => l !== langConfig.firstLanguageDefault);
                        }
                        if (langConfig.thirdLanguageFixed && langConfig.thirdLanguageDefault) {
                            updatedThird = langConfig.thirdLanguageDefault;
                        } else {
                            const remaining = available.filter((l: string) => l !== val);
                            if (remaining.length === 1) {
                                updatedThird = remaining[0];
                            }
                        }
                    }
                    setFormData(prev => ({
                        ...prev,
                        secondLanguage: val,
                        thirdLanguage: updatedThird
                    }));
                } else if (fieldName === 'thirdLanguage') {
                    let updatedSecond = formData.secondLanguage || '';
                    const langConfig = academicSettings?.languages;
                    if (langConfig && typeof langConfig === 'object' && !Array.isArray(langConfig)) {
                        let available = langConfig.available || [];
                        if (langConfig.firstLanguageFixed && langConfig.firstLanguageDefault) {
                            available = available.filter((l: string) => l !== langConfig.firstLanguageDefault);
                        }
                        if (langConfig.secondLanguageFixed && langConfig.secondLanguageDefault) {
                            updatedSecond = langConfig.secondLanguageDefault;
                        } else {
                            const remaining = available.filter((l: string) => l !== val);
                            if (remaining.length === 1) {
                                updatedSecond = remaining[0];
                            }
                        }
                    }
                    setFormData(prev => ({
                        ...prev,
                        thirdLanguage: val,
                        secondLanguage: updatedSecond
                    }));
                } else {
                    handleChange(e as any);
                }
            };

            const currentVal = (formData as any)[fieldName] || '';
            const options = getFieldOptions(fieldName, []);

            return (
                <div key={fieldName} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                        {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                    </label>
                    <select
                        name={fieldName}
                        id={fieldName}
                        value={currentVal}
                        onChange={handleSelectChange as any}
                        required={required}
                        disabled={
                            (fieldName === 'section' && !formData.className) || 
                            (fieldName === 'firstLanguage' && academicSettings?.languages && typeof academicSettings.languages === 'object' && !Array.isArray(academicSettings.languages) && academicSettings.languages.firstLanguageFixed) ||
                            (fieldName === 'secondLanguage' && academicSettings?.languages && typeof academicSettings.languages === 'object' && !Array.isArray(academicSettings.languages) && academicSettings.languages.secondLanguageFixed) ||
                            (fieldName === 'thirdLanguage' && academicSettings?.languages && typeof academicSettings.languages === 'object' && !Array.isArray(academicSettings.languages) && academicSettings.languages.thirdLanguageFixed)
                        }
                        className="w-full h-11 px-4 text-sm font-black border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                        <option value="">-- Select --</option>
                        {options.map((opt: any, idx: number) => {
                            const optVal = typeof opt === 'string' ? opt : (opt as any).value;
                            const optLabel = typeof opt === 'string' ? opt : (opt as any).label;
                            return (
                                <option key={idx} value={optVal}>
                                    {optLabel}
                                </option>
                            );
                        })}
                    </select>
                </div>
            );
        }

        // 4. Input with Auto/Manual Toggle (ID Fields)
        if (hasToggleVal) {
            const isManual = !!manualFields[fieldName] || idSettings[fieldName]?.enabled === false;

            return (
                <div key={fieldName} className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 transition-colors ${isManual ? 'text-amber-600' : 'text-slate-950'}`}>
                            {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                        </label>
                        {idSettings[fieldName]?.enabled !== false ? (
                            <ToggleSwitch
                                enabled={!!manualFields[fieldName]}
                                onChange={(val) => {
                                    setManualFields(prev => ({ ...prev, [fieldName]: val }));
                                    if (!val) {
                                        setFormData(prev => {
                                            const updated = { ...prev };
                                            delete (updated as any)[fieldName];
                                            return updated;
                                        });
                                    }
                                }}
                                labelOff="Auto"
                                labelOn="Manual"
                            />
                        ) : (
                            <span className="text-[9px] font-black tracking-widest uppercase bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm">
                                Manual Entry
                            </span>
                        )}
                    </div>
                    <TextInput
                        name={fieldName}
                        value={(formData as any)[fieldName] ?? (manualFields[fieldName] ? '' : getAutoValue(fieldName))}
                        onChange={handleChange}
                        onFocus={() => {
                            if ((formData as any)[fieldName] == null && !manualFields[fieldName]) {
                                setFormData(prev => ({ ...prev, [fieldName]: '' }));
                            }
                        }}
                        disabled={!manualFields[fieldName]}
                        required={required}
                        placeholder={placeholder}
                        inputClassName={`transition-all duration-300 ${isManual ? 'border-amber-400 ring-2 ring-amber-500/10 bg-amber-50/30' : ''}`}
                    />
                </div>
            );
        }

        // 4.5. Custom Date Picker
        if (type === 'date') {
            const dStr = (formData as any)[fieldName];
            const dObj = dStr ? new Date(dStr) : null;
            return (
                <div key={fieldName} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                        {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                    </label>
                    <CustomDatePicker
                        date={dObj && !isNaN(dObj.getTime()) ? dObj : null}
                        onSelect={(newDate) => {
                            // Store internally as YYYY-MM-DD string, component will display as DD-MM-YYYY
                            const yyyy = newDate.getFullYear();
                            const mm = String(newDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(newDate.getDate()).padStart(2, '0');
                            setFormData(prev => ({ ...prev, [fieldName]: `${yyyy}-${mm}-${dd}` }));
                        }}
                        placeholder={placeholder}
                    />
                </div>
            );
        }

        // 4.6. Sibling Selection Field
        if (fieldName === 'sibling') {
            return (
                <div key={fieldName} className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                        {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                    </label>
                    <div className="flex gap-2 items-center">
                        <>
                        {formData.siblingId ? (
                                <div className="flex-1 flex items-center justify-between gap-4 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/50 shadow-sm transition-all hover:bg-indigo-50/60">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-indigo-50">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Synced Sibling</h4>
                                            <span className="text-sm font-black text-indigo-900 leading-tight">{formData.siblingName}</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-rose-500 font-bold hover:bg-rose-50 h-8 px-3 rounded-lg text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, siblingId: '', siblingName: '' }));
                                            setSiblingData(null);
                                            setSiblingSync({ parents: false, address: false, guardian: false });
                                        }}
                                    >
                                        <Trash2 size={12} /> Remove
                                    </Button>
                                </div>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsSiblingModalOpen(true)}
                                className="flex-1 h-11 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl"
                            >
                                <span className="text-indigo-500 text-lg leading-none mb-1 mr-1">+</span> Add Sibling for Sync
                            </Button>
                        )}
                        </>
                    </div>
                </div>
            );
        }

        // 5. Default Text/Tel Input
        return (
            <div key={fieldName} className={`space-y-1.5 ${fieldName === 'currentAddress' || fieldName === 'permanentAddress' || fieldName === 'referredBy' ? 'md:col-span-2' : ''}`}>
                <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">
                    {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
                </label>
                <input
                    name={fieldName}
                    value={(formData as any)[fieldName] || ''}
                    onChange={handleChange}
                    required={required}
                    type={type}
                    onFocus={(e) => {
                        if (e.target.value && /^(0+|New Location|New Address)$/i.test(e.target.value)) {
                            setFormData(prev => ({ ...prev, [fieldName]: '' }));
                        }
                    }}
                    className="w-full h-11 px-4 text-sm font-black border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 bg-white text-slate-900"
                    placeholder={placeholder}
                />
            </div>
        );
    };

    const getFieldLabel = (fieldName: string, defaultLabel: string) => {
        const field = formConfig.find(f => f.fieldName === fieldName);
        return field?.label || defaultLabel;
    };

    const getFieldProps = (fieldName: string) => {
        const field = formConfig.find(f => f.fieldName === fieldName);
        return {
            placeholder: field?.placeholder,
            helpText: field?.helpText,
            required: field?.required || false,
        };
    };

    const getFieldOptions = (fieldName: string, defaultOptions: string[]) => {
        const field = formConfig.find(f => f.fieldName === fieldName);

        // 1. School-Specific Logical Overrides (PRIORITY)
        if (fieldName === 'className' || fieldName === 'classAppliedFor') {
            if (academicSettings?.useCustomClasses && academicSettings.classes?.length > 0) {
                return academicSettings.classes.map((c: any) => c.name);
            }
            return INITIAL_CLASS_SETUPS.map(c => c.name);
        }

        if (fieldName === 'enrolledSession') {
            if (academicSettings?.sessions && academicSettings.sessions.length > 0) {
                return academicSettings.sessions.map((s: any) => s.name);
            }
            return INITIAL_SESSIONS;
        }

        if (academicSettings) {
            if (fieldName === 'houseBlock' || fieldName === 'house') {
                if (academicSettings.useCustomHouses && academicSettings.houses.length > 0) {
                    return academicSettings.houses;
                }
                return INITIAL_HOUSES;
            }
            if (fieldName === 'religion') {
                if (academicSettings.useCustomReligions && academicSettings.religions.length > 0) {
                    return academicSettings.religions;
                }
                return INITIAL_RELIGIONS;
            }
            if (fieldName === 'category') {
                if (academicSettings.useCustomCategories && academicSettings.categories.length > 0) {
                    return academicSettings.categories;
                }
                return INITIAL_CATEGORIES;
            }
            if (fieldName === 'stream') {
                if (academicSettings.useCustomStreams && academicSettings.streams.length > 0) {
                    return academicSettings.streams;
                }
                return INITIAL_STREAMS;
            }
            if (fieldName === 'disableReason') {
                if (academicSettings.useCustomDisableReasons && academicSettings.disableReasons.length > 0) {
                    return academicSettings.disableReasons;
                }
                return INITIAL_DISABLE_REASONS;
            }
            if (fieldName === 'studentType') {
                return ['New', 'Old'];
            }
            if (fieldName === 'gender') {
                return GENDERS;
            }
            if (fieldName === 'bloodGroup') {
                return BLOOD_GROUPS;
            }
        }

        if (fieldName === 'firstLanguage' || fieldName === 'secondLanguage' || fieldName === 'thirdLanguage') {
            const langConfig = academicSettings?.languages;
            let availableLangs = ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German'];
            
            if (langConfig) {
                if (Array.isArray(langConfig)) {
                    availableLangs = langConfig;
                } else if (langConfig.available && Array.isArray(langConfig.available)) {
                    availableLangs = langConfig.available;
                }
            }
            
            if (langConfig && typeof langConfig === 'object' && !Array.isArray(langConfig)) {
                const isFirstFixed = !!langConfig.firstLanguageFixed;
                const firstFixedVal = langConfig.firstLanguageDefault;
                const isSecondFixed = !!langConfig.secondLanguageFixed;
                const secondFixedVal = langConfig.secondLanguageDefault;
                const isThirdFixed = !!langConfig.thirdLanguageFixed;
                const thirdFixedVal = langConfig.thirdLanguageDefault;
                
                if (fieldName === 'firstLanguage') {
                    if (isFirstFixed && firstFixedVal) {
                        return [firstFixedVal];
                    }
                } else if (fieldName === 'secondLanguage') {
                    if (isSecondFixed && secondFixedVal) {
                        return [secondFixedVal];
                    }
                    let filtered = availableLangs;
                    if (isFirstFixed && firstFixedVal) {
                        filtered = filtered.filter(l => l !== firstFixedVal);
                    }
                    if (isThirdFixed && thirdFixedVal) {
                        filtered = filtered.filter(l => l !== thirdFixedVal);
                    }
                    const thirdVal = formData.thirdLanguage;
                    if (thirdVal && !isThirdFixed) {
                        filtered = filtered.filter(l => l !== thirdVal);
                    }
                    return filtered;
                } else if (fieldName === 'thirdLanguage') {
                    if (isThirdFixed && thirdFixedVal) {
                        return [thirdFixedVal];
                    }
                    let filtered = availableLangs;
                    if (isFirstFixed && firstFixedVal) {
                        filtered = filtered.filter(l => l !== firstFixedVal);
                    }
                    if (isSecondFixed && secondFixedVal) {
                        filtered = filtered.filter(l => l !== secondFixedVal);
                    }
                    const secondVal = formData.secondLanguage;
                    if (secondVal && !isSecondFixed) {
                        filtered = filtered.filter(l => l !== secondVal);
                    }
                    return filtered;
                }
            }
            return availableLangs;
        }

        // 2. Template-Specific Options (FALLBACK)
        if (field?.options && field.options.length > 0) return field.options;

        // 3. Dynamic Logic for Sections
        if (fieldName === 'section') {
            const currentClassName = formData.className;
            if (currentClassName) {
                if (academicSettings?.useCustomClasses) {
                    const cls = academicSettings.classes.find((c: any) => c.name.toLowerCase() === currentClassName.toLowerCase());
                    const secs = cls?.sections;
                    if (secs && secs.length > 0) return secs;
                } else {
                    const cls = INITIAL_CLASS_SETUPS.find(c => c.name.toLowerCase() === currentClassName.toLowerCase());
                    const secs = cls?.sections;
                    if (secs && secs.length > 0) return secs;
                }
            }
            return INITIAL_SECTIONS.length > 0 ? INITIAL_SECTIONS : ['A', 'B', 'C', 'D', 'E', 'N/A'];
        }

        return defaultOptions;
    };

    const getGridCols = (sectionName: string): 1 | 2 | 3 | 4 => {
        const setting = sectionSettings.find(s => s.sectionName === sectionName);
        return setting ? setting.columns : 3;
    };

    const getAutoValue = (fieldName: string) => {
        const settings = idSettings[fieldName];
        if (!settings || settings.enabled === false) return '';

        // Check for enrollment special case
        if (fieldName === 'enrollmentNo' && settings.useSameAsRegNo) {
            return getAutoValue('registrationNo');
        }

        // FInd Class Code if available
        const selectedClass = academicSettings?.classes?.find((c: any) => c.name === formData.className);

        return generateNextId(settings, {
            className: formData.className,
            classCode: selectedClass?.code,
            date: formData.admissionDate
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'photo' | 'fatherPhoto' | 'motherPhoto' | 'guardianPhoto') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setCropImage(reader.result as string);
                setCropTarget(fieldName);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedImage: string) => {
        if (cropTarget) {
            setFormData(prev => ({ ...prev, [cropTarget]: croppedImage }));
            if (cropTarget === 'photo') {
                setPreviewUrl(croppedImage);
            }
        }
    };

    useEffect(() => {
        if (isSameAsCurrent) {
            setFormData(prev => ({
                ...prev,
                permanentAddress: prev.currentAddress,
                permanentVillage: prev.village,
                permanentLocality: prev.locality,
                permanentPostOffice: prev.postOffice,
                permanentPoliceStation: prev.policeStation,
                permanentDistrict: prev.district,
                permanentCity: prev.city,
                permanentState: prev.state,
                permanentPincode: prev.pincode,
                permanentCountry: prev.country,
            }));
        }
    }, [
        isSameAsCurrent,
        formData.currentAddress,
        formData.village,
        formData.locality,
        formData.postOffice,
        formData.policeStation,
        formData.district,
        formData.city,
        formData.state,
        formData.pincode,
        formData.country
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Sync name from firstName and lastName
            const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
            const dataToSubmit = { ...formData, name: fullName, schoolId };

            let result;
            if (initialData?.id) {
                result = await updateStudent(initialData.id, dataToSubmit);
            } else {
                result = await addStudent(dataToSubmit);
            }

            if (result.success) {
                toast.success(initialData ? 'Student updated successfully' : 'Student registered successfully');
                onSuccess();
            } else {
                toast.error((result as any).error || 'Failed to save student record');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            console.error(error);
        }
    };

    // Check if any previous academic details are filled
    const isPreviousAcademicFilled = [
        formData.previousSchool,
        formData.previousLastClass,
        formData.affiliatedBoard,
        formData.tcNo,
        formData.tcDate,
        formData.result,
        formData.marksObtained,
        formData.percentageCGPA
    ].some(val => val && val.toString().trim() !== '');

    if (loading) {
        return (
            <div className={isFullPage ? "w-full min-h-[400px]" : "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"}>
                <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-12 flex flex-col items-center justify-center text-center shadow-2xl">
                    <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
                        <ArrowUp className="w-10 h-10 text-indigo-600 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Initializing Form</h3>
                    <p className="text-sm text-slate-500 font-medium mt-2">Fetching school specific rules and field styles...</p>
                    <div className="mt-8 flex gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                    </div>
                </div>
            </div>
        );
    }

    // Helper to render sections
    return (
        <div className={isFullPage ? "w-full" : "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"}>
            <div className={isFullPage ? "bg-white rounded-[2rem] w-full shadow-sm" : "bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300"}>

                {/* Header - Styled for 'Exact Copy' requirement */}
                {!isFullPage && (
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white sticky top-0 z-10 rounded-t-[2rem]">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                                    {schoolName}
                                </h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    {templateName}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {formData.enrolledSession && (
                                <div className="hidden md:flex items-center px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">SESSION</span>
                                    <span className="text-sm font-bold text-indigo-700">{formData.enrolledSession}</span>
                                </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                                <X className="w-6 h-6 text-slate-400" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
                    <form id="student-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* 1. Admission Details */}
                        <FormSection title="Admission Details" icon={<FileText />} variant="indigo" defaultOpen={true} gridCols={getGridCols('Admission Details')}>
                            {formConfig
                                .filter(f => isVisible(f.fieldName) && f.sectionName === 'Admission Details')
                                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                                .map(field => renderDynamicField(field))}
                        </FormSection>

                        {/* 2. Personal Information */}
                        <FormSection title="Personal Information" icon={<User />} variant="blue" defaultOpen={true} gridCols={getGridCols('Personal Information')}>
                            {formConfig
                                .filter(f => isVisible(f.fieldName) && f.sectionName === 'Personal Information')
                                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                                .map(field => renderDynamicField(field))}
                        </FormSection>

                        {/* 3. Parent / Guardian Information */}
                        <FormSection
                            title="Parent & Guardian Details"
                            icon={<Users />}
                            variant="emerald"
                            defaultOpen={true}
                            noGrid={true}
                        >
                            <div className="space-y-12">
                                {/* Dynamic Parent Sections */}
                                {(() => {
                                    const parentFields = formConfig.filter(f =>
                                        isVisible(f.fieldName) && (f.fieldName.startsWith('father') || f.fieldName.startsWith('mother') || f.fieldName.startsWith('guardian'))
                                    );

                                    const groups = [
                                        { id: 'father', title: "Father's Information", color: 'bg-indigo-500', prefix: 'father' },
                                        { id: 'mother', title: "Mother's Information", color: 'bg-rose-500', prefix: 'mother' },
                                        { id: 'guardian', title: "Guardian Information", color: 'bg-amber-500', prefix: 'guardian', isGuardian: true }
                                    ];

                                    return groups.map(group => {
                                        const groupFields = parentFields
                                            .filter(f => f.fieldName.startsWith(group.prefix))
                                            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

                                        if (groupFields.length === 0 && !group.isGuardian) return null;

                                        if (group.isGuardian) {
                                            return (
                                                <div key={group.id} className="pt-6 border-t border-slate-100">
                                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                                    <Shield size={16} className="text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Guardian Identity</h4>
                                                                    <p className="text-xs font-bold text-slate-700">Primary contact responsible for child</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                                                                {['Father', 'Mother', 'Other'].map((option) => (
                                                                    <label key={option}
                                                                        className={`flex items-center px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all
                                                                            ${formData.guardianSelection === option ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}>
                                                                        <input type="radio" value={option} checked={formData.guardianSelection === option}
                                                                            onChange={(e) => setFormData(p => ({ ...p, guardianSelection: e.target.value as any }))}
                                                                            className="hidden" />
                                                                        {option}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {formData.guardianSelection === 'Other' && (
                                                        <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                                {groupFields.map(field => renderDynamicField(field))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (group.id === 'guardian' && siblingSync.guardian) {
                                            return (
                                                <div key={group.id} className="bg-emerald-50 border border-dashed border-emerald-200 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                        <Users className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Guardian Details Synced</h4>
                                                        <p className="text-[10px] text-emerald-700/70">Using data from sibling <b>{formData.siblingName}</b></p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (group.id !== 'guardian' && siblingSync.parents) {
                                            return (
                                                <div key={group.id} className="bg-emerald-50 border border-dashed border-emerald-200 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                        <Users className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">{group.id === 'father' ? "Father's" : "Mother's"} Details Synced</h4>
                                                        <p className="text-[10px] text-emerald-700/70">Using data from sibling <b>{formData.siblingName}</b></p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={group.id} className="space-y-6">
                                                <div className="flex items-center gap-3 pb-2 border-b border-black/5">
                                                    <div className={`h-6 w-1 ${group.color} rounded-full`} />
                                                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest">{group.title}</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    {groupFields.map(field => renderDynamicField(field))}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                                )()}
                            </div>
                        </FormSection>

                        {/* 4. Address Information */}
                        <FormSection
                            title="Residential Address"
                            icon={<MapPin />}
                            variant="amber"
                            defaultOpen={true}
                            noGrid={true}
                        >
                            {siblingSync.address ? (
                                <div className="bg-amber-50 border border-dashed border-amber-200 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
                                    <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                                        <MapPin className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Address Details Synced</h4>
                                    <p className="text-xs text-amber-700/70 mt-1 max-w-sm">
                                        Residential address information has been copied from <b>{formData.siblingName}</b>.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 mb-8">
                                        <div className="flex items-center justify-end gap-4 bg-white/40 px-5 py-2 rounded-2xl border border-black/5 inline-flex float-right shadow-sm">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Same as current</span>
                                            <ToggleSwitch enabled={isSameAsCurrent} onChange={setIsSameAsCurrent} labelOff="No" labelOn="Yes" />
                                        </div>
                                        <div className="clear-both" />
                                    </div>
                                    <div className="space-y-12">
                                        {/* Current Address Section */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-2 border-b border-black/5">
                                                <div className="h-6 w-1 bg-indigo-500 rounded-full" />
                                                <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest">Current Residence</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {formConfig
                                                    .filter(f => isVisible(f.fieldName) && (
                                                        f.fieldName === 'currentAddress' ||
                                                        (['village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country'].includes(f.fieldName))
                                                    ))
                                                    .sort((a, b) => {
                                                        const order = ['currentAddress', 'village', 'locality', 'postOffice', 'policeStation', 'city', 'district', 'state', 'pincode', 'country'];
                                                        const indexA = order.indexOf(a.fieldName);
                                                        const indexB = order.indexOf(b.fieldName);
                                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                        return (a.orderIndex || 0) - (b.orderIndex || 0);
                                                    })
                                                    .map(field => renderDynamicField(field))}
                                            </div>
                                        </div>

                                        {/* Permanent Address Section */}
                                        {!isSameAsCurrent && (
                                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-3 pb-2 border-b border-black/5">
                                                    <div className="h-6 w-1 bg-amber-500 rounded-full" />
                                                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest">Permanent Residence</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {formConfig
                                                        .filter(f => isVisible(f.fieldName) && f.fieldName.startsWith('permanent'))
                                                        .sort((a, b) => {
                                                            const order = ['permanentAddress', 'permanentVillage', 'permanentLocality', 'permanentPostOffice', 'permanentPoliceStation', 'permanentCity', 'permanentDistrict', 'permanentState', 'permanentPincode', 'permanentCountry'];
                                                            const indexA = order.indexOf(a.fieldName);
                                                            const indexB = order.indexOf(b.fieldName);
                                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                            return (a.orderIndex || 0) - (b.orderIndex || 0);
                                                        })
                                                        .map(field => renderDynamicField(field))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </FormSection>

                        {/* 5. Previous Academic Details */}
                        <FormSection title="Previous Academic Details" icon={<BookOpen />} variant="violet" gridCols={getGridCols('Previous Academic Details')}>
                            {formConfig
                                .filter(f => isVisible(f.fieldName) && f.sectionName === 'Previous Academic Details')
                                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                                .map(field => renderDynamicField(field))}
                        </FormSection>

                        {/* 6. Bank & Govt IDs */}
                        <FormSection title="Bank & Govt IDs" icon={<IndianRupee />} variant="rose" gridCols={getGridCols('Bank & Govt IDs')}>
                            {formConfig
                                .filter(f => isVisible(f.fieldName) && f.sectionName === 'Bank & Govt IDs')
                                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                                .map(field => renderDynamicField(field))}
                        </FormSection>

                        {/* 7. Miscellaneous */}
                        <FormSection title="Miscellaneous" icon={<FileText />} variant="slate" gridCols={getGridCols('Miscellaneous')}>
                            {formConfig
                                .filter(f => isVisible(f.fieldName) && f.sectionName === 'Miscellaneous')
                                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                                .map(field => renderDynamicField(field))}
                        </FormSection>

                        {/* 8. Miscellaneous Documents */}
                        {isVisible('miscDocuments') && (
                            <FormSection
                                title="Upload Documents"
                                icon={<Upload />}
                                variant="rose"
                                noGrid={true}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    {[0, 1, 2, 3].map((idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="text-xs font-black text-slate-900 w-4 shrink-0">{idx + 1}.</div>
                                            <input
                                                type="text"
                                                placeholder="Title"
                                                className="w-1/2 h-10 px-4 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400 text-slate-900"
                                                value={formData.miscDocuments?.[idx]?.title || ''}
                                                onChange={(e) => {
                                                    const newDocs = [...(formData.miscDocuments || [])];
                                                    newDocs[idx] = { ...newDocs[idx], title: e.target.value };
                                                    setFormData(prev => ({ ...prev, miscDocuments: newDocs }));
                                                }}
                                            />
                                            <div className="relative flex-1 group/misc">
                                                <div
                                                    className={`flex-1 h-10 border border-slate-300 border-dashed rounded-lg bg-white/60 flex items-center justify-center gap-2 cursor-pointer transition-all group ${isDragging === `misc-${idx}` ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : 'hover:bg-white hover:border-indigo-400'}`}
                                                    onClick={() => document.getElementById(`misc-doc-${idx}`)?.click()}
                                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(`misc-${idx}`); }}
                                                    onDragLeave={() => setIsDragging(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setIsDragging(null);
                                                        const file = e.dataTransfer.files?.[0];
                                                        if (file) {
                                                            setIsReadingField(`misc-${idx}`);
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                const res = reader.result as string;
                                                                const newDocs = [...(formData.miscDocuments || [])];
                                                                newDocs[idx] = { ...newDocs[idx], file: file.name, content: res };
                                                                setFormData(prev => ({ ...prev, miscDocuments: newDocs }));
                                                                setIsReadingField(null);
                                                                toast.success(`Document ${idx + 1} processed`);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                >
                                                    <Upload size={14} className="text-slate-500 group-hover:text-indigo-600" />
                                                    <span className="text-[10px] font-black text-slate-800 truncate max-w-[150px]">
                                                        {isReadingField === `misc-${idx}` ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Loader2 size={10} className="animate-spin" /> Reading...
                                                            </span>
                                                        ) : (
                                                            formData.miscDocuments?.[idx]?.file ? formData.miscDocuments[idx].file : "CHOOSE FILE"
                                                        )}
                                                    </span>
                                                    <input
                                                        id={`misc-doc-${idx}`}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setIsReadingField(`misc-${idx}`);
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    const res = reader.result as string;
                                                                    const newDocs = [...(formData.miscDocuments || [])];
                                                                    newDocs[idx] = {
                                                                        ...newDocs[idx],
                                                                        file: file.name,
                                                                        content: res
                                                                    };
                                                                    setFormData(prev => ({ ...prev, miscDocuments: newDocs }));
                                                                    setIsReadingField(null);
                                                                    toast.success(`Document ${idx + 1} processed`);
                                                                };
                                                                reader.onerror = () => {
                                                                    setIsReadingField(null);
                                                                    toast.error("Failed to read document");
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Misc Remove Button */}
                                                {formData.miscDocuments?.[idx]?.file && isReadingField !== `misc-${idx}` && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newDocs = [...(formData.miscDocuments || [])];
                                                            newDocs[idx] = { ...newDocs[idx], file: '', content: '' };
                                                            setFormData(p => ({ ...p, miscDocuments: newDocs }));
                                                            const input = document.getElementById(`misc-doc-${idx}`) as HTMLInputElement;
                                                            if (input) input.value = '';
                                                        }}
                                                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/misc:opacity-100 transition-opacity"
                                                    >
                                                        <X size={8} strokeWidth={4} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </FormSection>
                        )}

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 rounded-b-[2rem] flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-12 px-6 font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 shadow-lg shadow-indigo-100 font-bold flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        {initialData ? 'Update Profile' : 'Complete Admission'}
                    </Button>
                </div>

                {/* Modals */}
                <AddSiblingModal
                    isOpen={isSiblingModalOpen}
                    onClose={() => setIsSiblingModalOpen(false)}
                    schoolId={schoolId}
                    classes={academicSettings?.useCustomClasses ? academicSettings?.classes : INITIAL_CLASS_SETUPS}
                    onAdd={async (siblingId, siblingName, className, syncSettings) => {
                        setFormData(prev => ({ ...prev, siblingId, siblingName }));
                        // Fetch sibling details for sync
                        try {
                            const { getStudentById } = await import('@/app/actions');
                            const res = await getStudentById(siblingId);
                            if (res.success && res.student) {
                                setSiblingData(res.student);
                                // Apply sync settings from the modal
                                setSiblingSync(syncSettings);
                                toast.success(`Sibling details synced: ${siblingName}`);
                            }
                        } catch (e) {
                            console.error("Failed to fetch sibling details");
                        }
                    }}
                />

                <ImageCropper
                    image={cropImage}
                    open={isCropperOpen}
                    aspect={3 / 4}
                    onClose={() => setIsCropperOpen(false)}
                    onCropComplete={handleCropComplete}
                />

            </div>
        </div>
    );
};

export default StudentRegistrationForm;
