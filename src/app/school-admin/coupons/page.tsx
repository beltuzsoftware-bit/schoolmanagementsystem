'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { 
    Printer, 
    Ticket, 
    GraduationCap, 
    Utensils, 
    CheckSquare, 
    Square, 
    Building2, 
    User, 
    FileText,
    Palette,
    Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getIDCardsPageData } from '@/app/actions';
import { School, Student } from '@/types';
import { toast } from 'sonner';

// Theme Configurations
const THEMES: Record<string, {
    name: string;
    border: string;
    headerBg: string;
    headerText: string;
    badgeBg: string;
    badgeText: string;
    highlightText: string;
    seatBadgeBg: string;
    tokenFooterBg: string;
    tokenTextColor: string;
}> = {
    bw: {
        name: '🖤 Black & White (Mono - Save Ink)',
        border: 'border-slate-900',
        headerBg: 'bg-black',
        headerText: 'text-white',
        badgeBg: 'bg-black',
        badgeText: 'text-white',
        highlightText: 'text-slate-950 font-black',
        seatBadgeBg: 'bg-black text-white',
        tokenFooterBg: 'bg-black',
        tokenTextColor: 'text-yellow-400'
    },
    indigo: {
        name: '💙 Indigo Modern',
        border: 'border-indigo-900',
        headerBg: 'bg-indigo-950',
        headerText: 'text-white',
        badgeBg: 'bg-indigo-600',
        badgeText: 'text-white',
        highlightText: 'text-indigo-700 font-black',
        seatBadgeBg: 'bg-indigo-600 text-white',
        tokenFooterBg: 'bg-indigo-950',
        tokenTextColor: 'text-yellow-300'
    },
    emerald: {
        name: '💚 Emerald Green',
        border: 'border-emerald-900',
        headerBg: 'bg-emerald-950',
        headerText: 'text-white',
        badgeBg: 'bg-emerald-600',
        badgeText: 'text-white',
        highlightText: 'text-emerald-700 font-black',
        seatBadgeBg: 'bg-emerald-600 text-white',
        tokenFooterBg: 'bg-emerald-950',
        tokenTextColor: 'text-yellow-300'
    },
    crimson: {
        name: '❤️ Crimson Red',
        border: 'border-rose-900',
        headerBg: 'bg-rose-950',
        headerText: 'text-white',
        badgeBg: 'bg-rose-600',
        badgeText: 'text-white',
        highlightText: 'text-rose-700 font-black',
        seatBadgeBg: 'bg-rose-600 text-white',
        tokenFooterBg: 'bg-rose-950',
        tokenTextColor: 'text-yellow-300'
    },
    purple: {
        name: '💜 Royal Purple',
        border: 'border-purple-900',
        headerBg: 'bg-purple-950',
        headerText: 'text-white',
        badgeBg: 'bg-purple-600',
        badgeText: 'text-white',
        highlightText: 'text-purple-700 font-black',
        seatBadgeBg: 'bg-purple-600 text-white',
        tokenFooterBg: 'bg-purple-950',
        tokenTextColor: 'text-yellow-300'
    }
};

// Reusable Exam Desk Slip Card Component (100% visual parity between preview & print)
function ExamDeskSlipCard({
    student,
    seatNo,
    examName,
    examHall,
    examDate,
    school,
    theme,
    isCompact = false
}: {
    student: Student;
    seatNo: string;
    examName: string;
    examHall: string;
    examDate?: string;
    school: School | null;
    theme: typeof THEMES['bw'];
    isCompact?: boolean;
}) {
    const qrPayload = JSON.stringify({
        type: 'EXAM_SLIP',
        school: school?.name,
        student: student.name,
        admNo: student.admissionNumber,
        rollNo: student.rollNumber,
        seatNo,
        exam: examName,
        hall: examHall
    });

    return (
        <div className={`exam-desk-card border-2 ${theme.border} rounded-lg p-2.5 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm box-border w-full h-full`}>
            {/* Top Banner Header */}
            <div className={`border-b-2 ${theme.border} pb-1.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    {school?.logo ? (
                        <img src={school.logo} alt="Logo" className="w-7 h-7 object-contain flex-shrink-0" />
                    ) : (
                        <Building2 className="w-6 h-6 text-slate-900 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                        <h4 className="font-extrabold text-[11px] uppercase leading-tight text-slate-950 truncate max-w-[170px]">
                            {school?.name || 'KuMMi School System'}
                        </h4>
                        <p className={`text-[9px] ${theme.highlightText} uppercase leading-tight truncate max-w-[170px]`}>
                            {examName}
                        </p>
                    </div>
                </div>
                <div className={`${theme.badgeBg} ${theme.badgeText} text-[9px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0`}>
                    DESK SLIP
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-2 my-1.5 items-center flex-1">
                {/* Photo Frame (Fixed Aspect Ratio - Never Distorts) */}
                <div className="col-span-3 border-2 border-slate-900 rounded overflow-hidden h-[72px] bg-slate-50 flex items-center justify-center flex-shrink-0">
                    {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-8 h-8 text-slate-400" />
                    )}
                </div>

                {/* Details Column */}
                <div className="col-span-6 space-y-0.5 text-slate-950 pr-1">
                    <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-extrabold">Student Name</span>
                        <span className="text-xs font-black leading-snug block truncate text-slate-950">{student.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div>
                            <span className="text-[7px] text-slate-500 uppercase block font-extrabold">Class & Sec</span>
                            <span className="font-bold text-slate-900">{student.className || '-'} {student.section ? `(${student.section})` : ''}</span>
                        </div>
                        <div>
                            <span className="text-[7px] text-slate-500 uppercase block font-extrabold">Roll No</span>
                            <span className="font-bold text-slate-900">{student.rollNumber || '-'}</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[7px] text-slate-500 uppercase block font-extrabold">Hall / Room</span>
                        <span className="text-[10px] font-black text-slate-950 block truncate">{examHall}</span>
                    </div>
                </div>

                {/* QR Code Column */}
                <div className="col-span-3 flex flex-col items-center justify-center border-l-2 border-slate-900 pl-1">
                    <div className="p-0.5 bg-white border border-slate-800 rounded flex-shrink-0">
                        <QRCode value={qrPayload} size={48} />
                    </div>
                    <span className="text-[7.5px] font-bold text-slate-700 mt-1 font-mono text-center truncate max-w-full">
                        {student.admissionNumber || 'ADM-001'}
                    </span>
                </div>
            </div>

            {/* Bottom Seat Badge Footer */}
            <div className={`bg-slate-100 border-t-2 ${theme.border} pt-1 flex items-center justify-between px-2 -mx-2.5 -mb-2.5 pb-1.5 mt-auto`}>
                <div className="text-[8.5px] font-extrabold text-slate-700">
                    {examDate ? <span>Date: {examDate}</span> : <span>Verified Admit Slip</span>}
                </div>
                <div className={`${theme.seatBadgeBg} font-black text-[11px] px-2.5 py-0.5 rounded shadow-sm tracking-wide`}>
                    SEAT: {seatNo}
                </div>
            </div>
        </div>
    );
}

// Reusable Food/Functional Coupon Card Component (100% visual parity)
function FoodCouponCard({
    item,
    token,
    couponTitle,
    couponDescription,
    couponValDate,
    couponPrice,
    school,
    theme
}: {
    item: any;
    token: string;
    couponTitle: string;
    couponDescription: string;
    couponValDate: string;
    couponPrice: string;
    school: School | null;
    theme: typeof THEMES['bw'];
}) {
    const qrPayload = JSON.stringify({
        type: 'COUPON',
        title: couponTitle,
        token,
        recipient: item.name,
        validDate: couponValDate,
        school: school?.name
    });

    return (
        <div className={`food-coupon-card border-2 border-dashed ${theme.border} rounded-lg p-2.5 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm box-border w-full h-full`}>
            {/* Scissor Cut Line */}
            <div className="absolute top-1 right-2 text-[8px] text-slate-500 font-mono flex items-center gap-1 font-extrabold">
                ✂️ CUT HERE
            </div>

            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-1 flex items-center justify-between pr-14">
                <div className="flex items-center gap-1.5">
                    <Utensils className={`w-4 h-4 ${theme.highlightText}`} />
                    <div className="min-w-0">
                        <h4 className="font-extrabold text-[10.5px] leading-tight text-slate-950 truncate max-w-[160px]">{couponTitle}</h4>
                        <p className="text-[8px] font-bold text-slate-600">{school?.name || 'KuMMi School System'}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="my-1.5 grid grid-cols-12 gap-1.5 items-center flex-1">
                <div className="col-span-9 space-y-0.5">
                    <div className="text-[9.5px] text-slate-800 font-medium leading-tight line-clamp-2">
                        {couponDescription}
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-900">
                        Issued To: <span className={`font-black ${theme.highlightText}`}>{item.name}</span> {item.className ? `(${item.className})` : ''}
                    </div>
                    <div className="flex items-center gap-3 text-[8.5px] text-slate-600 font-semibold pt-0.5">
                        <span>📅 Valid: {couponValDate}</span>
                        <span className="font-black text-slate-950">💵 {couponPrice}</span>
                    </div>
                </div>
                <div className="col-span-3 flex flex-col items-center justify-center">
                    <div className="p-0.5 bg-white border-2 border-slate-800 rounded">
                        <QRCode value={qrPayload} size={42} />
                    </div>
                </div>
            </div>

            {/* Token Footer */}
            <div className={`${theme.tokenFooterBg} text-white flex items-center justify-between px-2 py-1 -mx-2.5 -mb-2.5 rounded-b-md`}>
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider">OFFICIAL VOUCHER</span>
                <span className={`text-[11px] font-black font-mono tracking-widest ${theme.tokenTextColor}`}>{token}</span>
            </div>
        </div>
    );
}

export default function ExamAndCouponsPage() {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'exam-slips' | 'coupons'>('exam-slips');

    // System Data
    const [school, setSchool] = useState<School | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [staffList, setStaffList] = useState<Student[]>([]);

    // Shared Design Theme (Defaults to Black & White)
    const [cardTheme, setCardTheme] = useState<string>('bw');

    // Selection Filters (Exam Desk Slips)
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSection, setSelectedSection] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Exam Slip Config
    const [examName, setExamName] = useState<string>("Annual Board Examination 2026");
    const [examHall, setExamHall] = useState<string>("Hall A - Main Block");
    const [seatPrefix, setSeatPrefix] = useState<string>("DESK-");
    const [startSeatNum, setStartSeatNum] = useState<number>(1);
    const [examDate, setExamDate] = useState<string>("");
    const [slipLayout, setSlipLayout] = useState<'6_per_page' | '4_per_page' | '10_per_page'>('6_per_page');

    // Functional & Food Coupons Config
    const [couponCategory, setCouponCategory] = useState<'food' | 'canteen' | 'event' | 'sports' | 'activity'>('food');
    const [couponTitle, setCouponTitle] = useState<string>("Annual Feast - Lunch Pass");
    const [couponDescription, setCouponDescription] = useState<string>("Valid for 1 Veg Thali + Dessert at Canteen Counter #1");
    const [couponValDate, setCouponValDate] = useState<string>("15th Sept 2026");
    const [couponPrice, setCouponPrice] = useState<string>("COMPLIMENTARY");
    const [tokenPrefix, setTokenPrefix] = useState<string>("MEAL-2026-");
    const [recipientType, setRecipientType] = useState<'students' | 'staff' | 'guest_batch'>('students');
    const [guestCount, setGuestCount] = useState<number>(20);
    const [couponLayout, setCouponLayout] = useState<'10_per_page' | '12_stub_page'>('10_per_page');
    const [selectedCouponRecipientIds, setSelectedCouponRecipientIds] = useState<Set<string>>(new Set());

    // Printing Trigger State
    const [itemsToPrint, setItemsToPrint] = useState<any[]>([]);
    const [printMode, setPrintMode] = useState<'exam' | 'coupon'>('exam');

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            let userSchoolId = "";
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user.schoolId) userSchoolId = user.schoolId;
                } catch (e) {
                    console.error('Failed to parse user session:', e);
                }
            }

            try {
                const data = await getIDCardsPageData(userSchoolId);
                if (data.school) setSchool(data.school as School);
                if (data.students) setStudents(data.students as Student[]);

                // Map staff profiles
                if (data.staffProfiles && data.users) {
                    const usersMap = new Map<string, any>();
                    (data.users as any[]).forEach((u: any) => usersMap.set(u.id, u));
                    const mapped: Student[] = (data.staffProfiles as any[]).map((profile: any) => {
                        const user = usersMap.get(profile.userId) || {};
                        const pd = profile.personalDetails || {};
                        return {
                            id: profile.id,
                            schoolId: userSchoolId,
                            name: user.name || profile.designation || 'Staff Member',
                            firstName: (user.name || '').split(' ')[0] || '',
                            lastName: (user.name || '').split(' ').slice(1).join(' ') || '',
                            admissionNumber: profile.staffId || profile.id,
                            rollNumber: '',
                            className: profile.designation || 'Staff',
                            section: profile.department || '',
                            phone: pd.phone || '',
                            currentAddress: pd.address || '',
                            bloodGroup: pd.bloodGroup || '',
                            dob: pd.dob || '',
                            gender: pd.gender || '',
                            fatherName: pd.fatherName || '',
                            motherName: pd.motherName || '',
                            photo: user.photo || profile.photo || '',
                            status: (profile.status === 'Active' ? 'Active' : 'Inactive') as any,
                            currentSessionId: ''
                        };
                    });
                    setStaffList(mapped);
                }
            } catch (err) {
                console.error("Failed to load page data:", err);
            }
        };
        fetchData();
    }, []);

    const theme = THEMES[cardTheme] || THEMES.bw;

    // Unique Classes & Sections
    const uniqueClasses = Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort();
    const uniqueSections = Array.from(new Set(students.map(s => s.section).filter(Boolean))).sort();

    // Filtered Students for Exam Slips
    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClass === "all" || s.className === selectedClass;
        const matchesSection = selectedSection === "all" || s.section === selectedSection;
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return (s.status || 'Active') === 'Active' && matchesClass && matchesSection && matchesSearch;
    });

    // Filtered Recipients for Coupons
    const activeCouponRecipients = recipientType === 'staff' 
        ? staffList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : filteredStudents;

    // Selection Handlers
    const handleToggleStudent = (id: string) => {
        const next = new Set(selectedStudentIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedStudentIds(next);
    };

    const handleToggleSelectAllStudents = () => {
        if (selectedStudentIds.size === filteredStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleToggleCouponRecipient = (id: string) => {
        const next = new Set(selectedCouponRecipientIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCouponRecipientIds(next);
    };

    const handleToggleSelectAllCouponRecipients = () => {
        if (selectedCouponRecipientIds.size === activeCouponRecipients.length) {
            setSelectedCouponRecipientIds(new Set());
        } else {
            setSelectedCouponRecipientIds(new Set(activeCouponRecipients.map(s => s.id)));
        }
    };

    // Clean String Sanitizer
    const sanitizeName = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

    // Trigger Print Exam Slips
    const handlePrintExamSlips = () => {
        const toPrint = students.filter(s => selectedStudentIds.has(s.id));
        if (toPrint.length === 0) {
            toast.error("Please select at least one student for exam desk slips.");
            return;
        }
        setPrintMode('exam');
        setItemsToPrint(toPrint);
    };

    // Trigger Print Coupons
    const handlePrintCoupons = () => {
        let toPrint: any[] = [];
        if (recipientType === 'guest_batch') {
            if (!guestCount || guestCount <= 0) {
                toast.error("Please enter a valid guest coupon count.");
                return;
            }
            toPrint = Array.from({ length: guestCount }, (_, i) => ({
                id: `guest_${i + 1}`,
                name: `Guest Pass #${i + 1}`,
                admissionNumber: `GST-${(i + 1).toString().padStart(3, '0')}`,
                className: 'Guest',
                isGuest: true
            }));
        } else if (recipientType === 'staff') {
            toPrint = staffList.filter(s => selectedCouponRecipientIds.has(s.id));
        } else {
            toPrint = students.filter(s => selectedCouponRecipientIds.has(s.id));
        }

        if (toPrint.length === 0) {
            toast.error("Please select at least one recipient for coupons.");
            return;
        }
        setPrintMode('coupon');
        setItemsToPrint(toPrint);
    };

    // Execute Print Effect
    useEffect(() => {
        if (itemsToPrint.length > 0) {
            let printed = false;
            const trigger = () => {
                if (printed) return;
                printed = true;

                const origTitle = document.title;
                const cleanSchool = sanitizeName(school?.name || 'School');

                if (printMode === 'exam') {
                    const clsStr = selectedClass !== 'all' ? `_Class_${sanitizeName(selectedClass)}` : '';
                    document.title = `${cleanSchool}_Exam_Desk_Slips${clsStr}_${itemsToPrint.length}_Students`;
                } else {
                    const titleStr = sanitizeName(couponTitle || 'Coupons');
                    document.title = `${cleanSchool}_Food_Coupons_${titleStr}_${itemsToPrint.length}_Items`;
                }

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.print();
                        const restore = () => {
                            document.title = origTitle;
                            window.removeEventListener('afterprint', restore);
                        };
                        window.addEventListener('afterprint', restore);
                        setTimeout(() => { document.title = origTitle; }, 3000);
                        setItemsToPrint([]);
                    });
                });
            };

            const timer = setTimeout(trigger, 250);
            return () => clearTimeout(timer);
        }
    }, [itemsToPrint, printMode, school?.name, selectedClass, couponTitle]);

    if (!mounted) return null;

    // Sample student for live preview box
    const sampleStudent: Student = filteredStudents[0] || {
        id: 'sample',
        schoolId: school?.id || 's1',
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        lastName: 'Sharma',
        admissionNumber: 'ADM2026-001',
        rollNumber: '12',
        className: 'Grade 10',
        section: 'A',
        phone: '9876543210',
        currentAddress: 'Sample Street',
        bloodGroup: 'B+',
        dob: '2010-05-15',
        gender: 'Male',
        fatherName: 'Sanjay Sharma',
        motherName: 'Anjali Sharma',
        photo: '',
        status: 'Active',
        currentSessionId: ''
    };

    // Calculate Page Chunk Size for Print Page Breaks
    const getChunkSize = () => {
        if (printMode === 'exam') {
            if (slipLayout === '6_per_page') return 6;
            if (slipLayout === '4_per_page') return 4;
            return 10;
        } else {
            if (couponLayout === '10_per_page') return 10;
            return 12;
        }
    };

    const chunkSize = getChunkSize();
    const pagesToPrint: any[][] = [];
    for (let i = 0; i < itemsToPrint.length; i += chunkSize) {
        pagesToPrint.push(itemsToPrint.slice(i, i + chunkSize));
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-slate-900 dark:text-slate-100" />
                        Exam Slips & Event Coupons
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Generate and print Exam Desk Seating Slips, Hall Passes, Food Coupons, Canteen Passes & Event Tickets.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('exam-slips')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 flex items-center gap-2 ${
                        activeTab === 'exam-slips'
                            ? 'border-black text-black dark:text-white dark:border-white font-extrabold'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <GraduationCap className="h-4 w-4" /> 📝 Exam Desk Slips & Hall Passes
                </button>
                <button
                    onClick={() => setActiveTab('coupons')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 flex items-center gap-2 ${
                        activeTab === 'coupons'
                            ? 'border-black text-black dark:text-white dark:border-white font-extrabold'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Utensils className="h-4 w-4" /> 🎟 Food Passes & Functional Coupons
                </button>
            </div>

            {/* TAB 1: EXAM DESK SLIPS */}
            {activeTab === 'exam-slips' && (
                <div className="grid gap-6 md:grid-cols-4">
                    {/* Config Panel */}
                    <Card className="md:col-span-1 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-800" /> Exam Setup
                            </CardTitle>
                            <CardDescription className="text-xs">Configure seating & styling</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {/* Theme Selector */}
                            <div className="space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Palette className="h-3.5 w-3.5 text-slate-700" /> Design Style & Color
                                </label>
                                <Select value={cardTheme} onValueChange={setCardTheme}>
                                    <SelectTrigger className="bg-white text-xs font-semibold border-slate-300">
                                        <SelectValue placeholder="Theme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(THEMES).map(([k, t]) => (
                                            <SelectItem key={k} value={k} className="text-xs font-medium">
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Exam Title</label>
                                <Input 
                                    value={examName} 
                                    onChange={e => setExamName(e.target.value)}
                                    placeholder="e.g. Annual Board Exam 2026"
                                    className="bg-slate-50 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Hall / Room Number</label>
                                <Input 
                                    value={examHall} 
                                    onChange={e => setExamHall(e.target.value)}
                                    placeholder="e.g. Hall A - Main Block"
                                    className="bg-slate-50 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Seat Prefix</label>
                                    <Input 
                                        value={seatPrefix} 
                                        onChange={e => setSeatPrefix(e.target.value)}
                                        placeholder="DESK-"
                                        className="bg-slate-50 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Start No.</label>
                                    <Input 
                                        type="number"
                                        value={startSeatNum} 
                                        onChange={e => setStartSeatNum(parseInt(e.target.value) || 1)}
                                        className="bg-slate-50 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Exam Date / Note (Optional)</label>
                                <Input 
                                    value={examDate} 
                                    onChange={e => setExamDate(e.target.value)}
                                    placeholder="e.g. Sep 10 - Sep 25, 2026"
                                    className="bg-slate-50 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Print Format</label>
                                <Select value={slipLayout} onValueChange={(val: any) => setSlipLayout(val)}>
                                    <SelectTrigger className="bg-white text-xs">
                                        <SelectValue placeholder="Format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="6_per_page">6 Desk Slips / A4 Page (Medium Desk Tag)</SelectItem>
                                        <SelectItem value="4_per_page">4 Admit Passes / A4 Page (Detailed Ticket)</SelectItem>
                                        <SelectItem value="10_per_page">10 Desk Slips / A4 Page (Compact Badge)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Live Card Sample Preview */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5 text-slate-600" /> Live Design Preview
                                </div>
                                <div className="h-[145px] w-full">
                                    <ExamDeskSlipCard 
                                        student={sampleStudent}
                                        seatNo={`${seatPrefix}01`}
                                        examName={examName}
                                        examHall={examHall}
                                        examDate={examDate}
                                        school={school}
                                        theme={theme}
                                    />
                                </div>
                            </div>

                            <Button 
                                className="w-full gap-2 bg-slate-900 hover:bg-black text-white font-bold shadow mt-2"
                                disabled={selectedStudentIds.size === 0}
                                onClick={handlePrintExamSlips}
                            >
                                <Printer className="h-4 w-4" /> Print Exam Slips ({selectedStudentIds.size})
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Student Selection Table */}
                    <Card className="md:col-span-3 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-800">Select Students</CardTitle>
                                    <CardDescription className="text-xs">
                                        Selected: {selectedStudentIds.size} of {filteredStudents.length} students
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50">
                                            <SelectValue placeholder="All Classes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                                        <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-50">
                                            <SelectValue placeholder="All Sec" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sec</SelectItem>
                                            {uniqueSections.map(s => <SelectItem key={s} value={s}>Sec {s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input 
                                        placeholder="Search name/roll..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-[140px] h-8 text-xs bg-slate-50"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[550px] overflow-y-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 w-10 text-center">
                                                <button onClick={handleToggleSelectAllStudents} className="text-slate-600 hover:text-black">
                                                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                                                        <CheckSquare className="h-4 w-4 text-black" />
                                                    ) : (
                                                        <Square className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="p-3 font-semibold text-slate-700">Student Name</th>
                                            <th className="p-3 font-semibold text-slate-700">Class & Sec</th>
                                            <th className="p-3 font-semibold text-slate-700">Roll No</th>
                                            <th className="p-3 font-semibold text-slate-700">Adm No</th>
                                            <th className="p-3 font-semibold text-slate-700 text-right">Assigned Seat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-slate-400">No students found matching filter criteria.</td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((s, idx) => {
                                                const isSelected = selectedStudentIds.has(s.id);
                                                const autoSeatNo = `${seatPrefix}${(startSeatNum + idx).toString().padStart(2, '0')}`;
                                                return (
                                                    <tr 
                                                        key={s.id} 
                                                        onClick={() => handleToggleStudent(s.id)}
                                                        className={`cursor-pointer transition-colors hover:bg-slate-100/70 ${isSelected ? 'bg-slate-100/80' : ''}`}
                                                    >
                                                        <td className="p-3 text-center">
                                                            {isSelected ? (
                                                                <CheckSquare className="h-4 w-4 text-black mx-auto" />
                                                            ) : (
                                                                <Square className="h-4 w-4 text-slate-300 mx-auto" />
                                                            )}
                                                        </td>
                                                        <td className="p-3 font-bold text-slate-800">{s.name}</td>
                                                        <td className="p-3 text-slate-600">{s.className || '-'} {s.section ? `(${s.section})` : ''}</td>
                                                        <td className="p-3 text-slate-600">{s.rollNumber || '-'}</td>
                                                        <td className="p-3 text-slate-500 font-mono text-[11px]">{s.admissionNumber || '-'}</td>
                                                        <td className="p-3 text-right font-black text-slate-900 font-mono">{autoSeatNo}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 2: FUNCTIONAL & FOOD COUPONS */}
            {activeTab === 'coupons' && (
                <div className="grid gap-6 md:grid-cols-4">
                    {/* Coupon Config Panel */}
                    <Card className="md:col-span-1 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Ticket className="h-4 w-4 text-slate-800" /> Coupon Setup
                            </CardTitle>
                            <CardDescription className="text-xs">Configure title, validity & serials</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {/* Theme Selector */}
                            <div className="space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Palette className="h-3.5 w-3.5 text-slate-700" /> Design Style & Color
                                </label>
                                <Select value={cardTheme} onValueChange={setCardTheme}>
                                    <SelectTrigger className="bg-white text-xs font-semibold border-slate-300">
                                        <SelectValue placeholder="Theme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(THEMES).map(([k, t]) => (
                                            <SelectItem key={k} value={k} className="text-xs font-medium">
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Coupon Category</label>
                                <Select value={couponCategory} onValueChange={(val: any) => setCouponCategory(val)}>
                                    <SelectTrigger className="bg-white text-xs">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="food">🍱 Food / Meal Pass</SelectItem>
                                        <SelectItem value="canteen">🍔 Canteen Voucher</SelectItem>
                                        <SelectItem value="event">🎉 Annual Day / Event Pass</SelectItem>
                                        <SelectItem value="sports">🏆 Sports Day Ticket</SelectItem>
                                        <SelectItem value="activity">🎨 Extra-Curricular Activity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Coupon Title</label>
                                <Input 
                                    value={couponTitle} 
                                    onChange={e => setCouponTitle(e.target.value)}
                                    placeholder="e.g. Lunch Pass - Veg Thali"
                                    className="bg-slate-50 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Description / Terms</label>
                                <Input 
                                    value={couponDescription} 
                                    onChange={e => setCouponDescription(e.target.value)}
                                    placeholder="e.g. Valid at Counter #1"
                                    className="bg-slate-50 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Valid Date</label>
                                    <Input 
                                        value={couponValDate} 
                                        onChange={e => setCouponValDate(e.target.value)}
                                        placeholder="15 Sep 2026"
                                        className="bg-slate-50 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Value / Note</label>
                                    <Input 
                                        value={couponPrice} 
                                        onChange={e => setCouponPrice(e.target.value)}
                                        placeholder="Free / ₹ 150"
                                        className="bg-slate-50 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Token Prefix</label>
                                <Input 
                                    value={tokenPrefix} 
                                    onChange={e => setTokenPrefix(e.target.value)}
                                    placeholder="MEAL-2026-"
                                    className="bg-slate-50 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Recipient Mode</label>
                                <Select value={recipientType} onValueChange={(val: any) => setRecipientType(val)}>
                                    <SelectTrigger className="bg-white text-xs">
                                        <SelectValue placeholder="Recipient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="students">🎓 Students List</SelectItem>
                                        <SelectItem value="staff">💼 Staff Members</SelectItem>
                                        <SelectItem value="guest_batch">🎟 Anonymous / Guest Bulk Batch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {recipientType === 'guest_batch' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Guest Coupon Quantity</label>
                                    <Input 
                                        type="number"
                                        value={guestCount} 
                                        onChange={e => setGuestCount(parseInt(e.target.value) || 1)}
                                        className="bg-slate-50 text-xs"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Print Sheet Layout</label>
                                <Select value={couponLayout} onValueChange={(val: any) => setCouponLayout(val)}>
                                    <SelectTrigger className="bg-white text-xs">
                                        <SelectValue placeholder="Layout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10_per_page">10 Coupons / A4 Sheet (5×2 Grid)</SelectItem>
                                        <SelectItem value="12_stub_page">12 Scissor Cut Tickets / Sheet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Live Coupon Sample Preview */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5 text-slate-600" /> Live Coupon Preview
                                </div>
                                <div className="h-[125px] w-full">
                                    <FoodCouponCard 
                                        item={sampleStudent}
                                        token={`${tokenPrefix}001`}
                                        couponTitle={couponTitle}
                                        couponDescription={couponDescription}
                                        couponValDate={couponValDate}
                                        couponPrice={couponPrice}
                                        school={school}
                                        theme={theme}
                                    />
                                </div>
                            </div>

                            <Button 
                                className="w-full gap-2 bg-slate-900 hover:bg-black text-white font-bold shadow mt-2"
                                disabled={recipientType !== 'guest_batch' && selectedCouponRecipientIds.size === 0}
                                onClick={handlePrintCoupons}
                            >
                                <Printer className="h-4 w-4" /> Print Coupons ({recipientType === 'guest_batch' ? guestCount : selectedCouponRecipientIds.size})
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recipient Selection Table / Guest Preview */}
                    <Card className="md:col-span-3 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-800">
                                        {recipientType === 'guest_batch' ? 'Guest Coupon Preview' : `Select ${recipientType === 'staff' ? 'Staff' : 'Students'}`}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {recipientType === 'guest_batch' 
                                            ? `Will generate ${guestCount} numbered vouchers with unique QR verification codes` 
                                            : `Selected: ${selectedCouponRecipientIds.size} of ${activeCouponRecipients.length}`}
                                    </CardDescription>
                                </div>
                                {recipientType !== 'guest_batch' && (
                                    <Input 
                                        placeholder="Search name/ID..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-[180px] h-8 text-xs bg-slate-50"
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recipientType === 'guest_batch' ? (
                                <div className="p-8 text-center space-y-3">
                                    <div className="text-4xl">🎟️</div>
                                    <h3 className="font-bold text-slate-800 text-lg">Anonymous Guest Voucher Batch</h3>
                                    <p className="text-slate-500 text-xs max-w-md mx-auto">
                                        {guestCount} custom coupons will be created with serial tokens from <span className="font-mono font-bold">{tokenPrefix}001</span> to <span className="font-mono font-bold">{tokenPrefix}{guestCount.toString().padStart(3, '0')}</span>.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-h-[550px] overflow-y-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 w-10 text-center">
                                                    <button onClick={handleToggleSelectAllCouponRecipients} className="text-slate-600 hover:text-black">
                                                        {selectedCouponRecipientIds.size === activeCouponRecipients.length && activeCouponRecipients.length > 0 ? (
                                                            <CheckSquare className="h-4 w-4 text-black" />
                                                        ) : (
                                                            <Square className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="p-3 font-semibold text-slate-700">Name</th>
                                                <th className="p-3 font-semibold text-slate-700">{recipientType === 'staff' ? 'Department' : 'Class'}</th>
                                                <th className="p-3 font-semibold text-slate-700">{recipientType === 'staff' ? 'Designation' : 'Roll No'}</th>
                                                <th className="p-3 font-semibold text-slate-700">ID / Adm No</th>
                                                <th className="p-3 font-semibold text-slate-700 text-right">Coupon Token</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeCouponRecipients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-8 text-slate-400">No records found.</td>
                                                </tr>
                                            ) : (
                                                activeCouponRecipients.map((item, idx) => {
                                                    const isSelected = selectedCouponRecipientIds.has(item.id);
                                                    const token = `${tokenPrefix}${(idx + 1).toString().padStart(3, '0')}`;
                                                    return (
                                                        <tr 
                                                            key={item.id} 
                                                            onClick={() => handleToggleCouponRecipient(item.id)}
                                                            className={`cursor-pointer transition-colors hover:bg-slate-100/70 ${isSelected ? 'bg-slate-100/80' : ''}`}
                                                        >
                                                            <td className="p-3 text-center">
                                                                {isSelected ? (
                                                                    <CheckSquare className="h-4 w-4 text-black mx-auto" />
                                                                ) : (
                                                                    <Square className="h-4 w-4 text-slate-300 mx-auto" />
                                                                )}
                                                            </td>
                                                            <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                                            <td className="p-3 text-slate-600">{item.section || item.className || '-'}</td>
                                                            <td className="p-3 text-slate-600">{item.rollNumber || item.className || '-'}</td>
                                                            <td className="p-3 text-slate-500 font-mono text-[11px]">{item.admissionNumber || '-'}</td>
                                                            <td className="p-3 text-right font-black text-slate-900 font-mono">{token}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* PRINTABLE RENDER CONTAINER (STRICT A4 CHUNKED PRINT MATRIX) */}
            <div id="printable-coupons-container" className="hidden print:block">
                {/* EXAM DESK SLIPS PRINT PAGES */}
                {printMode === 'exam' && (
                    <>
                        {pagesToPrint.map((pageItems, pageIdx) => (
                            <div key={`page_${pageIdx}`} className={`print-a4-page ${slipLayout}`}>
                                {pageItems.map((student, idx) => {
                                    const globalIdx = pageIdx * chunkSize + idx;
                                    const seatNo = `${seatPrefix}${(startSeatNum + globalIdx).toString().padStart(2, '0')}`;
                                    return (
                                        <div key={student.id} className="print-card-wrapper">
                                            <ExamDeskSlipCard 
                                                student={student}
                                                seatNo={seatNo}
                                                examName={examName}
                                                examHall={examHall}
                                                examDate={examDate}
                                                school={school}
                                                theme={theme}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </>
                )}

                {/* FUNCTIONAL / FOOD COUPONS PRINT PAGES */}
                {printMode === 'coupon' && (
                    <>
                        {pagesToPrint.map((pageItems, pageIdx) => (
                            <div key={`page_${pageIdx}`} className={`print-a4-page ${couponLayout}`}>
                                {pageItems.map((item, idx) => {
                                    const globalIdx = pageIdx * chunkSize + idx;
                                    const token = `${tokenPrefix}${(globalIdx + 1).toString().padStart(3, '0')}`;
                                    return (
                                        <div key={item.id} className="print-card-wrapper">
                                            <FoodCouponCard 
                                                item={item}
                                                token={token}
                                                couponTitle={couponTitle}
                                                couponDescription={couponDescription}
                                                couponValDate={couponValDate}
                                                couponPrice={couponPrice}
                                                school={school}
                                                theme={theme}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Strict Print Engine Layout CSS */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 5mm;
                    }
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-coupons-container, #printable-coupons-container * {
                        visibility: visible !important;
                    }
                    #printable-coupons-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-a4-page {
                        display: grid !important;
                        grid-template-columns: repeat(2, 94mm) !important;
                        justify-content: center !important;
                        align-content: start !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        box-sizing: border-box !important;
                        padding: 3mm 0 !important;
                    }
                    .print-a4-page:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }

                    /* 6 Slips / A4 Page (3 rows x 2 cols) */
                    .print-a4-page.6_per_page {
                        gap: 6mm 8mm !important;
                    }
                    .print-a4-page.6_per_page .print-card-wrapper {
                        width: 94mm !important;
                        height: 82mm !important;
                    }

                    /* 4 Admit Passes / A4 Page (2 rows x 2 cols) */
                    .print-a4-page.4_per_page {
                        gap: 10mm 8mm !important;
                    }
                    .print-a4-page.4_per_page .print-card-wrapper {
                        width: 94mm !important;
                        height: 128mm !important;
                    }

                    /* 10 Slips or 10 Coupons / A4 Page (5 rows x 2 cols) */
                    .print-a4-page.10_per_page {
                        gap: 4mm 8mm !important;
                    }
                    .print-a4-page.10_per_page .print-card-wrapper {
                        width: 94mm !important;
                        height: 51mm !important;
                    }

                    /* 12 Stub Tickets / A4 Page (6 rows x 2 cols) */
                    .print-a4-page.12_stub_page {
                        gap: 3mm 8mm !important;
                    }
                    .print-a4-page.12_stub_page .print-card-wrapper {
                        width: 94mm !important;
                        height: 42mm !important;
                    }
                }
            `}</style>
        </div>
    );
}
