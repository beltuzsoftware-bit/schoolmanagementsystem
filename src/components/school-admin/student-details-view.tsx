'use client';

import React, { useState } from 'react';
import {
    X, User, FileText, Home, Users, Phone, Mail, Calendar, 
    MapPin, Award, IdCard, 
    Sparkles, Activity, Fingerprint, Globe, Landmark, 
    ShieldCheck, LayoutDashboard, Database, HardDrive,
    ExternalLink, CheckCircle2, ChevronRight, UserCircle2,
    GraduationCap as SchoolIcon, IndianRupee, ClipboardList,
    FileUp, HeartPulse, History, Briefcase as JobIcon,
    Wallet as FeesIcon, CalendarCheck as AttendanceIcon,
    KeyRound, Eye, EyeOff, Copy, RefreshCw, Plus, Loader2,
    Printer, Edit3, Trash2, Camera, QrCode as QrIcon, Barcode as BarcodeIcon, Clock, ThumbsDown, MoreVertical, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { cn } from "@/lib/utils";
import AttendanceTab from './student-details/attendance-tab';
import DocumentsTab from './student-details/documents-tab';
import { 
    generateStudentCredentials, resetStudentCredentials, 
    generateParentCredentials, resetParentCredentials,
    disableStudent, enableStudent, getDisableReasons,
    getStudentProfileTemplateForSchool, getAdmissionFormConfigForSchool
} from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Student, StudentProfileTemplate, StudentFormConfig } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StudentDetailsViewProps {
    student: Student;
    onClose: () => void;
    onUpdate?: () => void;
}

const formatDateDDMMYYYY = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
};

type TabId = 'profile' | 'fees' | 'exam' | 'attendance' | 'documents' | 'timeline';

const ICON_MAP: Record<string, any> = {
    feeSummary: FeesIcon,
    documents: FileUp,
    healthFitness: HeartPulse
};

const StudentDetailsView: React.FC<StudentDetailsViewProps> = ({ student, onClose, onUpdate }) => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [template, setTemplate] = useState<StudentProfileTemplate | null>(null);
    const [admConfig, setAdmConfig] = useState<StudentFormConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const rawStatus = student.status;
    const normalizedStatus = (rawStatus && rawStatus.toLowerCase() === 'disabled') ? 'Disabled' : 'Active';
    const [studentStatus, setStudentStatus] = useState(normalizedStatus);
    
    // Disable Modal State
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    const [disableReasons, setDisableReasons] = useState<string[]>([]);
    const [selectedReason, setSelectedReason] = useState<string | undefined>(undefined);
    const [disableDate, setDisableDate] = useState(new Date().toISOString().split('T')[0]);
    const [disableNote, setDisableNote] = useState('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [localUsername, setLocalUsername] = useState<string | undefined>(student.studentUsername);
    const [localPassword, setLocalPassword] = useState<string | undefined>(student.loginPassword);
    const [isParentGenerating, setIsParentGenerating] = useState(false);
    const [isParentResetting, setIsParentResetting] = useState(false);
    const [localParentUsername, setLocalParentUsername] = useState<string | undefined>(student.parentUsername);
    const [localParentPassword, setLocalParentPassword] = useState<string | undefined>(student.parentLoginPassword);
    const [showParentPassword, setShowParentPassword] = useState(false);
    const [credentialMsg, setCredentialMsg] = useState<string | null>(null);

    const handlePrint = () => {
        toast.info("Preparing print view...");
        window.print();
    };

    const triggerDownload = (fileName: string, title: string, content?: string) => {
        if (!fileName && !content) return;
        const ext = fileName?.split('.').pop()?.toLowerCase() || 'pdf';
        let url: string;
        
        if (content && content.startsWith('data:')) {
            url = content;
        } else {
            // Fallback to mock content for demo
            let blob: Blob;
            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
            } else if (ext === 'pdf') {
                const pdfBase64 = 'JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqMiAwIG9iajw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+ZW5kb2JqMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+ZW5kb2JqNCAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqNSAwIG9iajw8L0xlbmd0aCA0ND4+c3RyZWFtCkJULy9GMSAxMiBUZiAxMDAgNTAwIFRkIChLdU1NaSBTY2hvb2wgRVJQIC0gRG9jdW1lbnQpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTIgMDAwMDAgbiAKMDAwMDAwMDEwOCAwMDAwMCBuIAowMDAwMDAwMjEyIDAwMDAwIG4gCjAwMDAwMDAyOTYgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjM5MAolJUVPRgo=';
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            } else {
                blob = new Blob([`Mock content for: ${title}`], { type: 'text/plain' });
            }
            url = URL.createObjectURL(blob);
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `${title}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (!content?.startsWith('data:')) {
            // Delay revocation to ensure browser has started the download
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
        toast.success(`Opening document: ${title}`);
    };

    const handleEdit = () => {
        toast.info("Opening student editor...");
        router.push(`/school-admin/students/${student.id}/edit`);
    };

    const handleToggleStatus = async () => {
        console.log("[CLIENT] handleToggleStatus clicked. Current studentStatus:", studentStatus);
        // Open modal immediately for better responsiveness
        setIsDisableModalOpen(true);
        
        // Reset form for re-entry
        setSelectedReason(student.disableReason || undefined);
        setDisableDate(student.disableDate || new Date().toISOString().split('T')[0]);
        setDisableNote(student.disableNote || '');
        console.log("[CLIENT] studentStatus state:", studentStatus, "| student.status from DB:", student.status);

        // Always fetch reasons to ensure they are fresh from the school settings
        console.log("[CLIENT] Fetching disable reasons from server for schoolId:", student.schoolId);
        try {
            const reasons = await getDisableReasons(student.schoolId);
            console.log("[CLIENT] Received from server:", reasons);
            const finalReasons = (reasons && reasons.length > 0) 
                ? reasons 
                : ['Parents Request', 'Transfer', 'Fees Pending', 'Other'];
            setDisableReasons(finalReasons);
        } catch (error) {
            console.error("[CLIENT] getDisableReasons failed:", error);
            // Fallback to defaults only on error
            if (disableReasons.length === 0) {
                setDisableReasons(['Parents Request', 'Transfer', 'Fees Pending', 'Other']);
            }
        }
    };

    const handleSaveStatus = async () => {
        if (studentStatus === 'Active' && !selectedReason) {
            toast.error("Please select a reason");
            return;
        }

        setIsSavingStatus(true);
        console.log("Saving student status...", { id: student.id, status: studentStatus, reason: selectedReason });
        try {
            let res;
            if (studentStatus === 'Active') {
                res = await disableStudent(student.id, selectedReason || '', disableDate, disableNote);
            } else {
                res = await enableStudent(student.id, disableNote);
            }
            console.log("Server response:", res);
            if (res.success) {
                setStudentStatus(studentStatus === 'Active' ? 'Disabled' : 'Active');
                toast.success(`Student status updated to ${studentStatus === 'Active' ? 'Disabled' : 'Active'}`);
                if (onUpdate) {
                    console.log("Triggering onUpdate callback...");
                    onUpdate();
                }
                setIsDisableModalOpen(false);
            } else {
                toast.error(res.error || "Failed to update status");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSavingStatus(false);
        }
    };

    const handleGenerateCredentials = async () => {
        setIsGenerating(true);
        setCredentialMsg(null);
        const res = await generateStudentCredentials(student.id);
        setIsGenerating(false);
        if (res.success) {
            setLocalUsername(res.username);
            setLocalPassword(res.password);
            setShowPassword(true);
            setCredentialMsg('Credentials generated successfully!');
        } else {
            setCredentialMsg(res.error || 'Failed to generate credentials.');
        }
    };

    const handleResetCredentials = async () => {
        setIsResetting(true);
        setCredentialMsg(null);
        const res = await resetStudentCredentials(student.id);
        setIsResetting(false);
        if (res.success) {
            setLocalUsername(res.username);
            setLocalPassword(res.password);
            setShowPassword(true);
            setCredentialMsg('Password reset successfully!');
        } else {
            setCredentialMsg(res.error || 'Failed to reset password.');
        }
    };

    const handleGenerateParentCredentials = async () => {
        setIsParentGenerating(true);
        setCredentialMsg(null);
        const res = await generateParentCredentials(student.id);
        setIsParentGenerating(false);
        if (res.success) {
            setLocalParentUsername(res.username);
            setLocalParentPassword(res.password);
            setShowParentPassword(true);
            setCredentialMsg('Parent credentials generated successfully!');
        } else {
            setCredentialMsg(res.error || 'Failed to generate parent credentials.');
        }
    };

    const handleResetParentCredentials = async () => {
        setIsParentResetting(true);
        setCredentialMsg(null);
        const res = await resetParentCredentials(student.id);
        setIsParentResetting(false);
        if (res.success) {
            setLocalParentUsername(res.username);
            setLocalParentPassword(res.password);
            setShowParentPassword(true);
            setCredentialMsg('Parent password reset successfully!');
        } else {
            setCredentialMsg(res.error || 'Failed to reset parent password.');
        }
    };

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [t, ac] = await Promise.all([
                    getStudentProfileTemplateForSchool(student.schoolId),
                    getAdmissionFormConfigForSchool(student.schoolId)
                ]);
                setTemplate(t || null);
                setAdmConfig(ac.config || []);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [student.schoolId]);

    const getFieldLabel = (fieldName: string, defaultLabel: string) => {
        const field = admConfig.find(f => f.fieldName === fieldName);
        return field?.label || defaultLabel;
    };

    const visibleTabs = template?.config.filter(c => c.visible) || [];


    const InfoRow = ({ label, value, className = '' }: { label: string; value?: string | number | null; className?: string }) => (
        <div className={cn("grid grid-cols-[200px_1fr] py-3 px-4", className)}>
            <div className="text-xs font-black text-slate-900 flex items-center uppercase tracking-tight">
                {label}
            </div>
            <div className="text-xs font-bold text-slate-700 flex items-center">
                {value || '---'}
            </div>
        </div>
    );

    const DocRow = ({ label, value, fileName }: { label: string; value?: string | null; fileName?: string }) => (
        <div className="grid grid-cols-[200px_1fr] py-3 px-4 border-b border-slate-50 last:border-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                {label}
            </div>
            <div className="flex items-center">
                {value ? (
                    <Button 
                        variant="link" 
                        className="p-0 h-auto text-teal-600 font-bold text-[11px] gap-1.5 hover:text-teal-700 bg-teal-50/50 px-3 py-1 rounded-lg border border-teal-100/50"
                        onClick={() => triggerDownload(fileName || (label + '.pdf'), label, value)}
                    >
                        <Download size={12} />
                        View / Download
                    </Button>
                ) : (
                    <span className="text-[11px] text-slate-300 italic font-medium ml-1">Not Attached</span>
                )}
            </div>
        </div>
    );

    const VaultDocItem = ({ label, value, fileName, isMisc = false }: { label: string; value?: string | null; fileName?: string; isMisc?: boolean }) => (
        <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${value ? 'bg-white border-teal-100 shadow-sm hover:shadow-md' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${value ? 'bg-teal-50 text-teal-600' : 'bg-slate-200 text-slate-400'}`}>
                        {isMisc ? <FileUp size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{isMisc ? 'Supporting Document' : 'Official Certificate'}</h4>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">{label}</p>
                    </div>
                </div>
                {value && (
                    <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {value ? 'Verified String Data' : 'Pending Upload'}
                </span>
                {value ? (
                    <Button 
                        variant="link" 
                        className="p-0 h-auto text-teal-600 font-black text-[10px] gap-1.5 hover:text-teal-700 uppercase tracking-widest"
                        onClick={() => triggerDownload(fileName || (label + '.pdf'), label, value)}
                    >
                        <Download size={14} />
                        Download
                    </Button>
                ) : (
                    <Badge variant="outline" className="text-[8px] font-black text-slate-300 border-slate-200 uppercase px-2 py-0">NA</Badge>
                )}
            </div>
        </div>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <div className="bg-teal-600/5 px-4 py-2 border-l-4 border-teal-600 mb-4 mt-8 first:mt-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-teal-700">{title}</h3>
        </div>
    );

    const SidebarRow = ({ label, value, icon }: { label: string; value: string | React.ReactNode; icon: React.ReactNode }) => (
        <div className="flex justify-between items-center group">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-slate-200/50 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    {icon}
                </div>
                <span className="font-bold text-slate-700 text-xs uppercase tracking-tight">{label}</span>
            </div>
            <div className="bg-teal-50 border border-teal-200 px-3 py-1 rounded-md text-xs font-black text-teal-700 min-w-[36px] text-center shadow-sm">
                {value}
            </div>
        </div>
    );

    const TabButton = ({ id, label, icon }: { id: TabId, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative border-r border-slate-200 last:border-r-0",
                activeTab === id 
                    ? "bg-white text-teal-600" 
                    : "bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            )}
        >
            {icon}
            {label}
            {activeTab === id && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
            )}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-6 overflow-hidden select-none">
            <div className="bg-white w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-[0.99] fade-in duration-300 rounded-lg overflow-hidden border border-slate-200 relative">
                
                {/* Close Button */}
                <Button 
                    onClick={onClose} 
                    variant="ghost" 
                    className="absolute top-2 right-2 z-[70] text-slate-600 hover:text-rose-500 h-8 w-8 p-0 no-print"
                >
                    <X size={20} />
                </Button>


<div className="flex-1 flex overflow-hidden">
                    {/* --- SIDEBAR --- */}
                    <div className="w-[280px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm mb-4">
                            <div className="flex flex-col items-center pb-6 border-b border-slate-100">
                                <div className="h-44 w-44 rounded-xl border-4 border-white shadow-xl overflow-hidden bg-slate-50 mb-4 ring-1 ring-slate-200">
                                    {student.photo ? (
                                        <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300 bg-slate-100 italic text-[10px]">
                                            <div className="flex flex-col items-center gap-2">
                                                <UserCircle2 size={48} />
                                                <span>No Photo Available</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center px-2">
                                    <h4 className="text-[18px] font-bold text-slate-900 leading-tight mb-1 tracking-tight" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                                        {student.name}
                                    </h4>
                                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] opacity-80">
                                        Student ID: <span className="text-slate-800">{student.admissionNumber}</span>
                                    </p>
                                </div>
                            </div>
                            
                            {/* Action Icons Row */}
                            <div className="flex items-center justify-between py-3 border-b border-slate-100 px-1 no-print">
                                <Button 
                                    onClick={handlePrint}
                                    variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-teal-600" title="Print Profile"
                                >
                                    <Printer size={15} />
                                </Button>
                                <Button 
                                    onClick={handleEdit}
                                    variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-teal-600" title="Edit Profile"
                                >
                                    <Edit3 size={15} />
                                </Button>
                                <Button 
                                    onClick={() => setActiveTab('fees')}
                                    variant="ghost" size="icon" className={cn("h-8 w-8 text-slate-500 hover:text-teal-600", activeTab === 'fees' && "bg-teal-50 text-teal-600")} title="Collect Fees"
                                >
                                    <IndianRupee size={15} />
                                </Button>
                                <Button 
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    variant="ghost" size="icon" className={cn("h-8 w-8 text-slate-500 hover:text-teal-600", showCredentials && "bg-teal-50 text-teal-600")} title="Login Details"
                                >
                                    <KeyRound size={15} />
                                </Button>
                                <Button 
                                    onClick={handleToggleStatus}
                                    variant="ghost" size="icon" className={cn("h-8 w-8 transition-colors", studentStatus === 'Active' ? "text-slate-500 hover:text-rose-600" : "text-rose-600 hover:text-emerald-600")} 
                                    title={studentStatus === 'Active' ? "Disable Student" : "Enable Student"}
                                >
                                    <ThumbsDown size={15} className={studentStatus !== 'Active' ? "rotate-180" : ""} />
                                </Button>
                                <div className="h-5 w-[1px] bg-slate-200 mx-1" />
                                <div className="relative">
                                    <Button 
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-8 w-8 text-slate-500 hover:text-teal-600", showMoreMenu && "bg-slate-100 text-teal-600")}
                                        title="Account Actions"
                                    >
                                        <MoreVertical size={15} />
                                    </Button>
                                    
                                    {showMoreMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-md z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={async () => {
                                                    await handleGenerateCredentials();
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                                            >
                                                Send Student Password
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    await handleGenerateParentCredentials();
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors border-t border-slate-50"
                                            >
                                                Send Parent Password
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Credentials Section (Conditional) */}
                            {showCredentials && (
                                <div className="p-4 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-1 duration-300 no-print">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal Credentials</h4>
                                        <button onClick={() => setShowCredentials(false)}><X size={12} className="text-slate-400" /></button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Student Access</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[11px] font-mono font-bold text-slate-700">{localUsername || 'Not Generated'}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                                    navigator.clipboard.writeText(localUsername || '');
                                                    toast.success("Username copied!");
                                                }}>
                                                    <Copy size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Guardian Access</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[11px] font-mono font-bold text-slate-700">{localParentUsername || 'Not Generated'}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                                    navigator.clipboard.writeText(localParentUsername || '');
                                                    toast.success("Parent Username copied!");
                                                }}>
                                                    <Copy size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-[10px] font-bold" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? "Hide Passwords" : "View Passwords"}
                                    </Button>
                                    {showPassword && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-[10px] font-mono">
                                            <div className="flex justify-between"><span>STU:</span> <span className="font-bold">{localPassword || '****'}</span></div>
                                            <div className="flex justify-between"><span>PAR:</span> <span className="font-bold">{localParentPassword || '****'}</span></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sidebar Details List */}
                            <div className="py-4 space-y-3.5">
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-slate-200/50 flex items-center justify-center text-slate-500">
                                            <Activity size={12} />
                                        </div>
                                        <span className="font-bold text-slate-700 text-xs uppercase tracking-tight">Status</span>
                                    </div>
                                    <Badge variant={studentStatus === 'Active' ? "default" : "destructive"} className="text-[10px] px-2 h-5 font-black uppercase shadow-sm">
                                        {studentStatus}
                                    </Badge>
                                </div>
                                <SidebarRow label="Class" value={student.className} icon={<SchoolIcon size={12} />} />
                                <SidebarRow label="Section" value={student.section} icon={<Users size={12} />} />
                                <SidebarRow label="Roll No." value={student.rollNumber || '---'} icon={<ClipboardList size={12} />} />
                                <SidebarRow label="Gender" value={student.gender} icon={<UserCircle2 size={12} />} />
                                <SidebarRow label="RTE" value={(student.rte === 'Yes' || (student as any).isRte) ? 'Yes' : 'No'} icon={<Fingerprint size={12} />} />
                            </div>

                            {/* Barcode & QR Row */}
                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-[11px] font-bold text-slate-900 mb-1">Barcode</p>
                                    <div className="w-full h-14 bg-white rounded flex flex-col items-center justify-center border border-slate-200 overflow-hidden relative group p-1">
                                        <BarcodeIcon size={46} className="text-slate-900" />
                                        <span className="text-[9px] font-mono text-slate-900 font-bold mt-[-2px]">{student.admissionNumber}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                                     <p className="text-[11px] font-bold text-slate-900">QR Code</p>
                                     <div className="p-1 border border-slate-200 rounded bg-white shadow-sm">
                                        <QRCode value={student.admissionNumber} size={60} />
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Login Creds Section in Sidebar for convenience */}
                        <div className="bg-slate-900 text-white p-4 rounded border border-slate-800 mb-4 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-1 opacity-20"><KeyRound size={40} /></div>
                            <h5 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldCheck size={12} className="text-teal-400" />
                                Portal Access
                            </h5>
                            {localUsername ? (
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-bold">User: {localUsername}</p>
                                        <p className="text-[10px] font-mono font-bold tracking-widest">
                                            {showPassword ? localPassword : '••••••••'}
                                            <button onClick={() => setShowPassword(!showPassword)} className="ml-2 text-teal-400"><Eye size={10} /></button>
                                        </p>
                                    </div>
                                    <Button onClick={handleResetCredentials} disabled={isResetting} size="sm" className="w-full h-7 text-[9px] bg-white/10 hover:bg-white/20 border-white/10">
                                        {isResetting ? '...' : 'Reset Key'}
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleGenerateCredentials} disabled={isGenerating} size="sm" className="w-full h-8 text-[9px] bg-teal-600 hover:bg-teal-500 font-black">
                                    {isGenerating ? 'Generating...' : 'Setup Access'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* --- MAIN CONTENT AREA --- */}
                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                        
                        {/* TOP TABS */}
                        <div className="bg-slate-100 border-b border-slate-200 shadow-sm shrink-0 flex overflow-x-auto no-scrollbar">
                           <TabButton id="profile" label="Profile" icon={<User size={13} />} />
                           <TabButton id="fees" label="Fees" icon={<FeesIcon size={13} />} />
                           <TabButton id="exam" label="Exam" icon={<FileText size={13} />} />
                           <TabButton id="attendance" label="Attendance" icon={<AttendanceIcon size={13} />} />
                           <TabButton id="documents" label="Documents" icon={<FileUp size={13} />} />
                           <TabButton id="timeline" label="Timeline" icon={<Clock size={13} />} />
                        </div>

                        {/* CONTENT VIEW */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 lg:p-4">
                            <div className="max-w-6xl mx-auto bg-white border border-slate-200 shadow-sm rounded overflow-hidden">
                                
                                {activeTab === 'profile' && (
                                    <div className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-400">

                                        {/* === BASIC INFO === */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 bg-white">
                                            <div className="border-r border-slate-100">
                                                <InfoRow label="Admission Date" value={formatDateDDMMYYYY(student.admissionDate)} />
                                                <InfoRow label="Date Of Birth" value={formatDateDDMMYYYY(student.dob)} />
                                                <InfoRow label="Category" value={student.category} />
                                                <InfoRow label="Mobile Number" value={student.phone} />
                                                <InfoRow label="WhatsApp" value={(student as any).whatsappNo} />
                                                <InfoRow label="ADM No" value={student.admissionNumber} />
                                                <InfoRow label="Religion" value={student.religion} />
                                                <InfoRow label="Caste" value={(student as any).caste} />
                                                <InfoRow label="Email" value={student.email} />
                                                <InfoRow label="Referred By" value={(student as any).referredBy} />
                                                <InfoRow label="Enrolled Year" value={(student as any).enrolledYear} />
                                            </div>
                                            <div>
                                                <InfoRow label="APAAR ID" value={(student as any).apaarId} />
                                                <InfoRow label="PEN Number" value={(student as any).penNo} />
                                                <InfoRow label="Reg Number" value={(student as any).registrationNo} />
                                                <InfoRow label="Enroll Number" value={(student as any).enrollmentNo} />
                                                <InfoRow label="SR Number" value={(student as any).srNo} />
                                                <InfoRow label="Student Type" value={(student as any).studentType} />
                                                <InfoRow label="Stream" value={(student as any).stream} />
                                                <InfoRow label="House" value={(student as any).house} />
                                                <InfoRow label="RTE" value={student.rte} />
                                            </div>
                                        </div>

                                        <div className="px-4 py-4 bg-slate-50 border-t border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <DocRow label="Aadhar Card" value={student.attachAadharContent || student.attachAadhar} fileName={student.attachAadhar} />
                                            <DocRow label="Category Certificate" value={student.categoryCertificateFileContent || student.categoryCertificate} fileName={student.categoryCertificate} />
                                        </div>

                                        {/* === ADDRESS === */}
                                        <SectionHeader title="Address Details" />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <div className="border-r border-slate-100">
                                                <div className="px-4 py-2 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Current Address</div>
                                                <InfoRow label="Full Address" value={student.currentAddress} />
                                                <InfoRow label="Village" value={(student as any).village} />
                                                <InfoRow label="Locality" value={(student as any).locality} />
                                                <InfoRow label="Post Office" value={(student as any).postOffice} />
                                            </div>
                                            <div>
                                                <div className="px-4 py-2 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Region</div>
                                                <InfoRow label="Police Station" value={(student as any).policeStation} />
                                                <InfoRow label="District" value={(student as any).district} />
                                                <InfoRow label="State" value={(student as any).state} />
                                                <InfoRow label="Pincode" value={(student as any).pincode} />
                                            </div>
                                        </div>

                                        {/* === PARENT / GUARDIAN === */}
                                        <SectionHeader title="Parent Guardian Detail" />
                                        <div className="grid grid-cols-1 gap-0">
                                            <div className="flex">
                                                <div className="flex-1">
                                                    <InfoRow label="Father Name" value={student.fatherName} />
                                                    <InfoRow label="Father Phone" value={student.fatherPhone} />
                                                    <InfoRow label="Father Occupation" value={student.fatherOccupation} />
                                                    <InfoRow label="Mother Name" value={student.motherName} />
                                                    <InfoRow label="Mother Phone" value={student.motherPhone} />
                                                    <InfoRow label="Mother Occupation" value={student.motherOccupation} />
                                                </div>
                                                <div className="w-[120px] bg-slate-50 border-l border-slate-100 flex flex-col items-center justify-center gap-4 py-4 shrink-0">
                                                    <div className="h-16 w-16 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center text-slate-300">
                                                        {student.fatherPhoto ? <img src={student.fatherPhoto} className="w-full h-full object-cover" alt="Father" /> : <Camera size={24} />}
                                                    </div>
                                                    <div className="h-16 w-16 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center text-slate-300">
                                                        {student.motherPhoto ? <img src={student.motherPhoto} className="w-full h-full object-cover" alt="Mother" /> : <Camera size={24} />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4 border-b border-slate-100 flex gap-4">
                                                <div className="flex-1">
                                                    <DocRow label="Father ID" value={student.fatherDocFileContent || student.fatherDocFile} fileName={student.fatherDocFile} />
                                                </div>
                                                <div className="flex-1">
                                                    <DocRow label="Mother ID" value={student.motherDocFileContent || student.motherDocFile} fileName={student.motherDocFile} />
                                                </div>
                                            </div>
                                            <div className="flex border-t border-slate-100">
                                                <div className="flex-1">
                                                    <InfoRow label="Guardian Name" value={student.guardianName || (student.guardianSelection === 'Father' ? student.fatherName : student.motherName)} />
                                                    <InfoRow label="Guardian Relation" value={student.guardianRelation || student.guardianSelection} />
                                                    <InfoRow label="Guardian Email" value={student.guardianEmail || student.email} />
                                                    <InfoRow label="Guardian Phone" value={student.guardianPhone || (student.guardianSelection === 'Father' ? student.fatherPhone : student.motherPhone)} />
                                                    <InfoRow label="Guardian Occupation" value={student.guardianOccupation} />
                                                    <InfoRow label="Guardian Address" value={student.guardianAddress} />
                                                </div>
                                                <div className="w-[120px] bg-slate-50 border-l border-slate-100 flex items-center justify-center shrink-0">
                                                    <div className="h-16 w-16 border rounded bg-white overflow-hidden shadow-sm flex items-center justify-center text-slate-300">
                                                        {student.guardianPhoto ? <img src={student.guardianPhoto} className="w-full h-full object-cover" alt="Guardian" /> : <Camera size={24} />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4">
                                                <DocRow label="Guardian ID" value={student.guardianDocFileContent || student.guardianDocFile} fileName={student.guardianDocFile} />
                                            </div>
                                        </div>

                                        {/* === BANK DETAILS === */}
                                        <SectionHeader title="Bank and Financial Details" />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <div className="border-r border-slate-100">
                                                <InfoRow label="Bank Name" value={(student as any).bankName} />
                                                <InfoRow label="Account Number" value={(student as any).bankAccountNo} />
                                            </div>
                                            <div>
                                                <InfoRow label="IFSC Code" value={(student as any).ifscCode} />
                                                <InfoRow label="Account Holder" value={student.name} />
                                            </div>
                                        </div>

                                        {/* === HEALTH AND IDENTITY === */}
                                        <SectionHeader title="Health and Identity" />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <div className="border-r border-slate-100">
                                                <InfoRow label="Blood Group" value={student.bloodGroup} />
                                                <InfoRow label="1st Language" value={(student as any).firstLanguage} />
                                                <InfoRow label="2nd Language" value={(student as any).secondLanguage} />
                                                <InfoRow label="3rd Language" value={(student as any).thirdLanguage} />
                                            </div>
                                            <div>
                                                <InfoRow label="Height" value={(student as any).height ? `${(student as any).height} cm` : undefined} />
                                                <InfoRow label="Weight" value={(student as any).weight ? `${(student as any).weight} Kg` : undefined} />
                                                <InfoRow label="Aadhaar No" value={student.aadhaarNo} />
                                                <InfoRow label="Samagra ID" value={(student as any).samagraId} />
                                                <InfoRow label="Special Needs" value={(student as any).specialNeeds || (student as any).hasSpecialNeeds} />
                                                <InfoRow label="Special Needs Info" value={(student as any).specialNeedsDetails} />
                                                <InfoRow label="Weight/Height Date" value={(student as any).recordDateHeightWeight || (student as any).measurementDate} />
                                            </div>
                                        </div>

                                        {/* === EXIT RECORDS === */}
                                        <SectionHeader title="Institutional Exit Records" />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <div className="border-r border-slate-100">
                                                <InfoRow label="Previous School" value={student.previousSchool} />
                                                <InfoRow label="TC Number" value={(student as any).tcNo} />
                                            </div>
                                            <div>
                                                <InfoRow label="TC Date" value={formatDateDDMMYYYY((student as any).tcDate)} />
                                                <InfoRow label="Last Class (Prev)" value={(student as any).previousLastClass || (student as any).previousClass} />
                                                <InfoRow label="Affiliated Board" value={(student as any).affiliatedBoard || (student as any).lastSchoolAffiliatedTo} />
                                                <InfoRow label="Marks Obtained" value={(student as any).marksObtained || (student as any).obtMarks} />
                                                <InfoRow label="Percentage/CGPA" value={(student as any).percentageCGPA || (student as any).percentage} />
                                                <InfoRow label="Result" value={(student as any).result || (student as any).qualification} />
                                                <InfoRow label="Note" value={student.info} />
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeTab === 'fees' && (
                                    <div className="p-12 text-center space-y-4">
                                        <FeesIcon size={48} className="mx-auto text-slate-200" />
                                        <h3 className="text-lg font-black text-slate-900">Fee Ledger</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">Detailed transaction history and outstanding fee summaries appear here.</p>
                                    </div>
                                )}

                                {activeTab === 'documents' && (
                                    <div className="bg-slate-50/50 min-h-[500px]">
                                        <DocumentsTab student={student} />
                                    </div>
                                )}

                                {activeTab === 'attendance' && (
                                    <div className="p-4 bg-slate-50/50 min-h-[500px]">
                                        <AttendanceTab 
                                            studentId={student.id} 
                                            sessionId={student.currentSessionId} 
                                            schoolId={student.schoolId} 
                                        />
                                    </div>
                                )}

                                {(activeTab === 'exam' || activeTab === 'timeline') && (
                                    <div className="p-20 text-center text-slate-300 italic text-sm">
                                        Section "{activeTab}" content is coming soon...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CORE FEATURE: Student Archival (Disable/Enable) Workflow --- */}
            <Dialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
                <DialogContent className="sm:max-w-[450px] p-0 border-none shadow-2xl rounded-xl z-[100]">
                    <DialogHeader className="bg-teal-600 border-b border-teal-700/20 p-5 rounded-t-xl">
                        <DialogTitle className="text-lg font-bold text-white">
                            {studentStatus === 'Active' ? 'Disable Student' : 'Enable Student'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-6 space-y-5 overflow-visible bg-teal-50/50">
                        {studentStatus === 'Active' ? (
                            <>
                                <div className="space-y-1.5 p-3 bg-teal-50/30 border border-teal-100/50 rounded-lg">
                                    <Label className="text-[13px] font-bold text-teal-900">Reason <span className="text-rose-500">*</span></Label>
                                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                                        <SelectTrigger className="w-full h-10 border-teal-200 focus:ring-teal-500 bg-white shadow-sm">
                                            <SelectValue placeholder="Select Reason" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[200]">
                                            {disableReasons.map((reason) => (
                                                <SelectItem key={reason} value={reason} className="text-xs font-bold uppercase tracking-tight">
                                                    {reason}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 p-3 bg-slate-50/50 border border-slate-100 rounded-lg">
                                    <Label className="text-[13px] font-bold text-gray-700">Date <span className="text-rose-500">*</span></Label>
                                    <Input 
                                        type="date" 
                                        value={disableDate} 
                                        onChange={(e) => setDisableDate(e.target.value)}
                                        className="h-10 border-gray-200 focus:ring-teal-500 bg-white shadow-sm"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-emerald-800 text-[11px] font-medium leading-relaxed">
                                You are about to re-enable this student. They will be able to access the student portal and appear in active lists.
                            </div>
                        )}

                        <div className="space-y-1.5 p-3 bg-white/50 border border-teal-100/50 rounded-lg shadow-sm">
                            <Label className="text-[13px] font-bold text-gray-700">Note</Label>
                            <Textarea 
                                placeholder="Add any internal remarks here..." 
                                value={disableNote}
                                onChange={(e) => setDisableNote(e.target.value)}
                                className="min-h-[100px] border-gray-200 focus:ring-teal-500 resize-none bg-white p-3 text-[13px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-end gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsDisableModalOpen(false)}
                            className="text-xs font-bold text-gray-500 hover:text-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button 
                            disabled={isSavingStatus}
                            onClick={handleSaveStatus}
                            className={cn(
                                "text-xs font-black uppercase tracking-widest px-6 h-9 shadow-sm transition-all",
                                studentStatus === 'Active' 
                                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            {isSavingStatus ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                studentStatus === 'Active' ? 'Confirm Disable' : 'Confirm Enable'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default StudentDetailsView;
