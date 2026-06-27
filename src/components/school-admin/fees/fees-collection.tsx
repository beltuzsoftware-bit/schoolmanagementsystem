'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Calculator, CheckCircle2, AlertCircle, IndianRupee, FileText, Printer, QrCode, Loader2, FileSpreadsheet, FileJson, Download, ChevronUp, ChevronDown, Calendar, User, Trash2, Zap, Banknote, History } from 'lucide-react';
import { Student } from '@/types';
import {
    FeeGroup,
    Transaction,
    FeeInGroup,
    PaymentFrequency,
    INITIAL_FEES_MASTER_ITEMS,
    PAYMENT_MODES
} from '@/types/fees';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS } from '@/lib/student-constants';
import {
    SESSION_MONTHS,
    getOrderedSessionMonths,
    getFrequencyMultiplier,
    isFeeApplicableForMonth,
    calculateMonthFinancials as calculateMonthFinancialsBase,
    calculateFineAmount,
    getStudentType
} from '@/lib/fees-helper';
import FeeReceiptModal from './fee-receipt-modal';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/components/school-admin/settings/invoice-settings-manager';
import { getSchools, getFeeGroups, getFeeTransactions, addFeeTransaction, revertFeeTransaction, getPackages, addQRTransaction, getInvoiceSettings, updateInvoiceSettings, addFeeTransactionsBatch, getStudents } from '@/app/actions';
import { School, QRTransaction, SaasPackage } from '@/types';
import QRCode from 'react-qr-code';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface FeesCollectionProps {
    students: Student[];
}

import { useSearchParams, useRouter } from 'next/navigation';

export default function FeesCollection({ students }: FeesCollectionProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedId = searchParams.get('studentId');

    // -------------------------------------------------------------------------
    // STATE: Global Data (Synced with LocalStorage)
    // -------------------------------------------------------------------------
    const [localStudents, setLocalStudents] = useState<Student[]>(students);
    const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
    const [saasPackage, setSaasPackage] = useState<SaasPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);

    // -------------------------------------------------------------------------
    // STATE: UI & Selection
    // -------------------------------------------------------------------------
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTransactionForPrint, setSelectedTransactionForPrint] = useState<Transaction[] | null>(null);
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
    const [revertConfirmTxnId, setRevertConfirmTxnId] = useState<string | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState<string>('');
    const [invoiceGenerateMode, setInvoiceGenerateMode] = useState<'Auto' | 'Manual'>('Auto');
    const [manualInvoiceNo, setManualInvoiceNo] = useState<string>('');

    // Filters & Sorting state
    const [classFilter, setClassFilter] = useState<string>('Select');
    const [sectionFilter, setSectionFilter] = useState<string>('Select');
    const [keyword, setKeyword] = useState<string>('');
    const [tableKeyword, setTableKeyword] = useState<string>('');
    const [appliedFilters, setAppliedFilters] = useState<{
        hasSearched: boolean;
        classString: string;
        sectionString: string;
        keywordString: string;
    }>({ hasSearched: false, classString: 'Select', sectionString: 'Select', keywordString: '' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

    const handleClassSectionSearch = () => {
        if (classFilter === 'Select') {
            toast.error("Please select a Class to search");
            return;
        }
        if (selectedClassHasSections && sectionFilter === 'Select') {
            toast.error("Please select a Section, or choose 'All Sections'");
            return;
        }
        setAppliedFilters({ hasSearched: true, classString: classFilter, sectionString: sectionFilter, keywordString: '' });
        setKeyword(''); // Clear keyword form
        setTableKeyword(''); // Reset table search
    };

    const handleKeywordSearch = () => {
        if (!keyword.trim()) {
            toast.error("Please enter a keyword to search");
            return;
        }
        setAppliedFilters({ hasSearched: true, keywordString: keyword.trim(), classString: 'Select', sectionString: 'Select' });
        setClassFilter('Select'); // Clear class selections
        setSectionFilter('Select');
        setTableKeyword(''); // Reset table search
    };

    const requestSort = (key: keyof Student) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Student) => {
        if (sortConfig?.key !== key) {
            return <svg className="ml-1.5 inline-block w-4 h-4 text-slate-500 opacity-70 group-hover:opacity-100 group-hover:text-slate-900 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 16-3 3-3-3"/><path d="m9 8 3-3 3 3"/></svg>;
        }
        if (sortConfig.direction === 'asc') {
            return <ChevronUp className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
        }
        return <ChevronDown className="inline-block w-4 h-4 ml-1.5 text-slate-900" strokeWidth={3} />;
    };

    // Dynamic class and section lists derived from schoolDetails
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(false);

    // Auto-select effect
    useEffect(() => {
        if (preSelectedId && localStudents.length > 0 && !selectedStudent) {
            const found = localStudents.find(s => s.id === preSelectedId);
            if (found) setSelectedStudent(found);
        }
    }, [preSelectedId, localStudents]);

    // 'new' or 'old' student type determination (simplified: new if admission date is recent?) 
    // For now, defaulting to 'new' or selectable manually, or determined by student data if available.
    // The source used a toggle. Let's start with a default and maybe add a toggle.
    const [collectionStudentType, setCollectionStudentType] = useState<'new' | 'old'>('new');

    const [collectionAmountView, setCollectionAmountView] = useState<'monthly' | 'yearly'>('monthly');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState<string>('None');
    const [selectedMonthIndices, setSelectedMonthIndices] = useState<number[]>([]);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [overallDiscount, setOverallDiscount] = useState<string>('');
    const [paymentReference, setPaymentReference] = useState<string>('');
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');
    const [lineDiscounts, setLineDiscounts] = useState<Record<string, string>>({}); // feeName -> string
    const [excludedFees, setExcludedFees] = useState<Record<string, boolean>>({});

    // QR Specific State
    const [showQRModal, setShowQRModal] = useState(false);
    const [currentQRTransaction, setCurrentQRTransaction] = useState<QRTransaction | null>(null);
    const [isProcessingQR, setIsProcessingQR] = useState(false);

    // -------------------------------------------------------------------------
    // EFFECTS: Load Data
    // -------------------------------------------------------------------------
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const storedUser = localStorage.getItem('kummi_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.schoolId) {
                        const sid = user.schoolId;
                        const [groups, allTxns, schools, packages, settings, fetchedStudents] = await Promise.all([
                            getFeeGroups(sid),
                            getFeeTransactions(sid),
                            getSchools(),
                            getPackages(),
                            getInvoiceSettings(sid),
                            getStudents(sid)
                        ]);
                        
                        setFeeGroups(groups);
                        setTransactions(allTxns);
                        if (settings) {
                            setInvoiceSettings(settings);
                            setPaymentMode(settings.defaultPaymentMode || 'Cash');
                        }

                        const school = schools.find((s: any) => s.id === sid);
                        if (school) {
                            setSchoolDetails(school);
                            const pkg = packages.find((p: any) => p.id === school.packageId);
                            if (pkg) setSaasPackage(pkg);
                        }

                        if (fetchedStudents) {
                            setLocalStudents(fetchedStudents.filter((s: any) => (s.status || 'Active') === 'Active'));
                        }
                    }
                }
            } catch (err: any) {
                toast.error("Failed to load fee configuration");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const sessionStartYear = useMemo(() => {
        // First, try to get the year from the active session's startDate
        if (schoolDetails?.sessions && schoolDetails.sessions.length > 0) {
            const activeSession = schoolDetails.sessions.find(s => s.isCurrent || s.status === 'Active');
            if (activeSession?.startDate) {
                const d = new Date(activeSession.startDate);
                if (!isNaN(d.getTime())) return d.getFullYear();
            }
        }
        // Fallback: extract from session name like "2026-2027"
        const val = schoolDetails?.currentSession;
        if (!val) return undefined;
        const match = val.match(/\d{4}/);
        return match ? parseInt(match[0], 10) : undefined;
    }, [schoolDetails]);

    const calculateMonthFinancials = useCallback((studentId: string, monthIdx: number, applicableGroups: any, transactions: any, studentType: any, startMonth: any) => {
        return calculateMonthFinancialsBase(studentId, monthIdx, applicableGroups, transactions, studentType, startMonth, sessionStartYear);
    }, [sessionStartYear]);

    // Reset state when student changes
    useEffect(() => {
        setLineDiscounts({});
        if (selectedStudent) {
            // Standardize student type using central helper
            const sType = getStudentType(selectedStudent, schoolDetails?.currentSession);
            setCollectionStudentType(sType);

            if (transactions.length >= 0) {
                // Auto-select the first unpaid month for this student in session order
                const firstUnpaid = sessionMonths.find(m => {
                    const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, transactions, sType, startMonth);
                return fin.remainingDue > 0;
            });

            if (firstUnpaid) {
                setSelectedMonthIndices([firstUnpaid.index]);
            } else {
                // If all paid, default to current month or April
                const currentMonthIdx = new Date().getMonth();
                setSelectedMonthIndices([currentMonthIdx]);
            }
        }
    }}, [selectedStudent?.id]); // Only trigger when student changes to avoid loops

    // -------------------------------------------------------------------------
    // HELPERS: Calculation Logic (Uses Shared Helper)
    // -------------------------------------------------------------------------

    // Get applicable groups for selected student
    const applicableGroups = useMemo(() => {
        if (!selectedStudent) return [];
        // Match student class to group assignedClasses
        // Logic: Checks if group.assignedClasses includes student.className (or similar field)
        // We'll try to match vaguely if exact match fails
        return feeGroups.filter(g =>
            g.assignedClasses.some(c =>
                selectedStudent.className?.includes(c) ||
                c.includes(selectedStudent.className || '___') // loose match
            )
        );
    }, [selectedStudent, feeGroups]);

    const startMonth = useMemo(() => {
        const val = (schoolDetails as any)?.sessionStartMonth;
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (!val) return 4;
        const str = String(val).toLowerCase();
        const ALL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const idx = ALL_MONTHS.findIndex(m => m.startsWith(str.substring(0, 3)));
        if (idx >= 0) return idx + 1;
        const num = Number(val);
        return isNaN(num) ? 4 : num;
    }, [schoolDetails]);
    const sessionMonths = useMemo(() => getOrderedSessionMonths(startMonth), [startMonth]);



    const currentMonthFinancials = useMemo(() => {
        if (!selectedStudent) return { totalDue: 0, totalPaid: 0, fineTotal: 0, remainingDue: 0, status: 'no_fees' };
        
        let aggregate = { totalDue: 0, totalPaid: 0, fineTotal: 0, remainingDue: 0 };
        selectedMonthIndices.forEach(idx => {
            const filteredGroupsForMonth = applicableGroups.map(group => ({
                ...group,
                fees: group.fees.filter(fee => !excludedFees[`${idx}_${fee.feeName}`])
            }));
            const fin = calculateMonthFinancials(selectedStudent.id, idx, filteredGroupsForMonth, transactions, collectionStudentType, startMonth);
            aggregate.totalDue += fin.totalDue;
            aggregate.totalPaid += fin.totalPaid;
            aggregate.fineTotal += fin.fineTotal;
            aggregate.remainingDue += fin.remainingDue;
        });

        return {
            ...aggregate,
            status: aggregate.remainingDue === 0 ? 'paid' : (aggregate.totalPaid > 0 ? 'partial' : 'unpaid')
        };
    }, [selectedStudent, selectedMonthIndices, applicableGroups, transactions, collectionStudentType, startMonth, excludedFees]);

    const minMonthIndex = useMemo(() => {
        if (selectedMonthIndices.length === 0) return new Date().getMonth();
        return selectedMonthIndices.reduce((min, curr) => {
            const relMin = (min - (startMonth - 1) + 12) % 12;
            const relCurr = (curr - (startMonth - 1) + 12) % 12;
            return relCurr < relMin ? curr : min;
        }, selectedMonthIndices[0]);
    }, [selectedMonthIndices, startMonth]);

    const maxMonthIndex = useMemo(() => {
        if (selectedMonthIndices.length === 0) return new Date().getMonth();
        return selectedMonthIndices.reduce((max, curr) => {
            const relMax = (max - (startMonth - 1) + 12) % 12;
            const relCurr = (curr - (startMonth - 1) + 12) % 12;
            return relCurr > relMax ? curr : max;
        }, selectedMonthIndices[0]);
    }, [selectedMonthIndices, startMonth]);

    const previousDues = useMemo(() => {
        if (!selectedStudent) return 0;
        let total = 0;
        const currentMinPos = sessionMonths.findIndex(m => m.index === minMonthIndex);
        for (let i = 0; i < currentMinPos; i++) {
            const mIdx = sessionMonths[i].index;
            if (!selectedMonthIndices.includes(mIdx)) {
                const fin = calculateMonthFinancials(selectedStudent.id, mIdx, applicableGroups, transactions, collectionStudentType, startMonth);
                total += fin.remainingDue;
            }
        }
        return total;
    }, [selectedStudent, minMonthIndex, selectedMonthIndices, sessionMonths, applicableGroups, transactions, collectionStudentType, startMonth]);

    // AUTO-SELECT UNPAID MONTHS EFFECT
    // Automatically include all unpaid months UP TO the latest selected month
    useEffect(() => {
        if (!selectedStudent || selectedMonthIndices.length === 0) return;

        const latestPos = sessionMonths.findIndex(m => m.index === maxMonthIndex);
        if (latestPos < 0) return;

        const monthsToAutoSelect: number[] = [];
        for (let i = 0; i <= latestPos; i++) {
            const mIdx = sessionMonths[i].index;
            if (selectedMonthIndices.includes(mIdx)) continue;
            
            const fin = calculateMonthFinancials(selectedStudent.id, mIdx, applicableGroups, transactions, collectionStudentType, startMonth);
            if (fin.remainingDue > 0) {
                monthsToAutoSelect.push(mIdx);
            }
        }

        if (monthsToAutoSelect.length > 0) {
            setSelectedMonthIndices(prev => {
                const combined = Array.from(new Set([...prev, ...monthsToAutoSelect]));
                return combined.sort((a, b) => {
                    const relA = (a - (startMonth - 1) + 12) % 12;
                    const relB = (b - (startMonth - 1) + 12) % 12;
                    return relA - relB;
                });
            });
            toast.info(`Missing months were automatically added to your selection.`);
        }
    }, [selectedStudent?.id, selectedMonthIndices, sessionMonths, maxMonthIndex, applicableGroups, transactions, collectionStudentType, startMonth]);

    // AUTO-APPLY SYSTEM DISCOUNTS
    useEffect(() => {
        if (!selectedStudent || !schoolDetails?.feeDiscounts) return;

        setLineDiscounts(prev => {
            const next = { ...prev };
            let changed = false;

            selectedMonthIndices.forEach(mIdx => {
                // Get fees applicable for this month
                const monthFees = applicableGroups.flatMap(g => g.fees.filter(f => {
                    if (collectionStudentType === 'new' && f.appliesTo === 'old') return false;
                    if (collectionStudentType === 'old' && f.appliesTo === 'new') return false;
                    return isFeeApplicableForMonth(f, mIdx, startMonth);
                }));

                // Check if any key for this month is already user-set
                const anyKeySet = monthFees.some(f => next[`${mIdx}_${f.feeName}`] !== undefined);
                if (anyKeySet) return; // User already touched this month's discounts

                // Collect all eligible discount rules for this month + student
                const eligibleRules: { rule: typeof schoolDetails.feeDiscounts extends (infer T)[] ? T : never; }[] = [];
                schoolDetails.feeDiscounts?.forEach(d => {
                    let eligible = false;
                    if (d.targetType === 'ALL') {
                        if (!d.assignedClasses || d.assignedClasses.length === 0 || d.assignedClasses.includes(selectedStudent.className || '')) {
                            eligible = true;
                        }
                    } else if (d.targetType === 'SPECIFIC') {
                        if (d.studentIds?.includes(selectedStudent.id)) {
                            eligible = true;
                        }
                    }
                    if (eligible && (!d.months || d.months.length === 0 || d.months.includes(mIdx))) {
                        eligibleRules.push({ rule: d });
                    }
                });

                if (eligibleRules.length === 0) {
                    // No discount rules match — set empty for all fees
                    monthFees.forEach(fee => {
                        const key = `${mIdx}_${fee.feeName}`;
                        next[key] = "";
                        changed = true;
                    });
                    return;
                }

                // For each fee, calculate discount from PERCENTAGE rules (per-fee)
                // For FIXED rules, accumulate a budget and distribute across eligible fees
                const perFeeDiscounts: Record<string, number> = {};
                monthFees.forEach(f => { perFeeDiscounts[f.feeName] = 0; });

                eligibleRules.forEach(({ rule: d }) => {
                    // Filter fees this rule applies to
                    const targetFees = monthFees.filter(f => {
                        if (d.feeTypes && d.feeTypes.length > 0 && !d.feeTypes.includes(f.feeName)) return false;
                        return true;
                    });

                    if (d.type === 'PERCENTAGE') {
                        // Percentage: apply to each eligible fee independently
                        targetFees.forEach(f => {
                            const dVal = (f.amount * d.value) / 100;
                            perFeeDiscounts[f.feeName] = Math.max(perFeeDiscounts[f.feeName], dVal);
                        });
                    } else {
                        // FIXED: distribute ₹value as a budget across eligible fees in order
                        let remaining = d.value;
                        targetFees.forEach(f => {
                            if (remaining <= 0) return;
                            const alloc = Math.min(remaining, f.amount);
                            perFeeDiscounts[f.feeName] = Math.max(perFeeDiscounts[f.feeName], alloc);
                            remaining -= alloc;
                        });
                    }
                });

                // Write the calculated discounts
                monthFees.forEach(fee => {
                    const key = `${mIdx}_${fee.feeName}`;
                    const disc = Math.min(perFeeDiscounts[fee.feeName] || 0, fee.amount);
                    next[key] = disc > 0 ? disc.toString() : "";
                    changed = true;
                });
            });

            return changed ? next : prev;
        });
    }, [selectedMonthIndices, selectedStudent, schoolDetails?.feeDiscounts, applicableGroups, transactions, collectionStudentType, startMonth, calculateMonthFinancials]);

    // Track state to set default payment amount ONLY when student, month, or discount changes
    const lastContextRef = useRef<{ studentId?: string, monthIndices?: string, discounts?: string, manualDiscount?: string }>({});

    useEffect(() => {
        const currentSid = selectedStudent?.id;
        const discountTracker = JSON.stringify(lineDiscounts);
        
        const manualDiscTracker = overallDiscount;
        
        if (currentSid !== lastContextRef.current.studentId || 
            JSON.stringify(selectedMonthIndices) !== lastContextRef.current.monthIndices || 
            discountTracker !== lastContextRef.current.discounts ||
            manualDiscTracker !== lastContextRef.current.manualDiscount) {
            
            const adHocDiscountSum = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            const manualDisc = parseFloat(overallDiscount) || 0;
            const totalToCollect = Math.max(0, currentMonthFinancials.remainingDue + previousDues - adHocDiscountSum - manualDisc);
            
            if (selectedStudent && (totalToCollect > 0 || Object.keys(lineDiscounts).length > 0)) {
                setPaymentAmount(totalToCollect.toString());
            } else if (selectedStudent && totalToCollect === 0) {
                 setPaymentAmount('0');
            } else {
                setPaymentAmount('');
            }
            lastContextRef.current = { 
                studentId: currentSid, 
                monthIndices: JSON.stringify(selectedMonthIndices), 
                discounts: discountTracker,
                manualDiscount: manualDiscTracker
            };
        }
    }, [selectedStudent?.id, selectedMonthIndices, currentMonthFinancials.remainingDue, lineDiscounts, previousDues, overallDiscount]);

    // AUTO-SCROLL TO SELECTED MONTH
    useEffect(() => {
        if (selectedMonthIndices.length > 0 && selectedStudent) {
            // Find the session-relative earliest selected month WITHOUT mutating state
            const sortedIndices = [...selectedMonthIndices].sort((a,b) => {
                const relA = (a - (startMonth - 1) + 12) % 12;
                const relB = (b - (startMonth - 1) + 12) % 12;
                return relA - relB;
            });
            const firstIdx = sortedIndices[0];

            // Use a slightly longer delay to ensure DOM is fully ready
            const timer = setTimeout(() => {
                const el = document.getElementById(`month-btn-${firstIdx}`);
                if (el) {
                    // Using 'center' to give context, but 'start' if user really wants to skip past paid months
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedMonthIndices, selectedStudent?.id, startMonth]);

    // Calculate Total Session Outstanding
    const sessionTotalDue = useMemo(() => {
        if (!selectedStudent) return 0;
        let total = 0;
        sessionMonths.forEach(m => {
            const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, transactions, collectionStudentType, startMonth);
            total += fin.remainingDue;
        });
        return total;
    }, [selectedStudent, transactions, applicableGroups, collectionStudentType, sessionMonths, startMonth]);

    const upcomingMonthInfo = useMemo(() => {
        if (!selectedStudent) return { name: '', due: 0 };
        const now = new Date();
        const curMonthIdx = now.getMonth();
        const curMonthOrderIdx = sessionMonths.findIndex(m => m.index === curMonthIdx);
        const nextMonth = sessionMonths[curMonthOrderIdx + 1];
        
        if (!nextMonth) return { name: '', due: 0 };
        
        const fin = calculateMonthFinancials(selectedStudent.id, nextMonth.index, applicableGroups, transactions, collectionStudentType, startMonth);
        return { name: nextMonth.name, due: fin.remainingDue };
    }, [selectedStudent, transactions, applicableGroups, collectionStudentType, sessionMonths, startMonth]);

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------
    const handleStudentSelect = (student: Student) => {
        setSelectedStudent(student);
        setSearchTerm(''); // Clear search or keep it?
        setPaymentAmount('');
    };

    const handleProcessPayment = () => {
        if (!selectedStudent || !paymentAmount) return;
        const amt = parseFloat(paymentAmount);
        const manualDiscountVal = parseFloat(overallDiscount) || 0;

        if (isNaN(amt) || amt < 0) {
            toast.error("Invalid amount");
            return;
        }

        if (manualDiscountVal > 0 && !paymentRemarks.trim()) {
            toast.error("Remarks are mandatory when applying 'Over All Discount'");
            return;
        }

        // Create transaction
        // NOTE: Here is where the "Waterfall" logic should technically apply if we want to auto-distribute.
        let txnId = `TXN-${Date.now()}`;
        if (invoiceGenerateMode === 'Auto') {
            const nextSeq = Math.max(invoiceSettings.startFrom, invoiceSettings.currentSequence + 1);
            txnId = `${invoiceSettings.prefix}${nextSeq.toString().padStart(invoiceSettings.padding, '0')}`;
            invoiceSettings.currentSequence = nextSeq;
            localStorage.setItem('fees_invoice_settings', JSON.stringify(invoiceSettings));
        } else {
            if (!manualInvoiceNo.trim()) {
                toast.error("Please enter a manual invoice number");
                return;
            }
            txnId = manualInvoiceNo.trim();
        }

        let remainingToAllocate = amt;
        const newTransactions: Transaction[] = [];
        const now = new Date();

        // Check if QR mode
        if (paymentMode === 'QR Code') {
            const seq = Math.max(invoiceSettings.startFrom, invoiceSettings.currentSequence + 1);
            handleQRGeneration(amt, seq, txnId, invoiceSettings);
            return;
        }

        // 1. Clear Backlogs First (Chronologically before the first selected month)
        const currentMonthPos = sessionMonths.findIndex(m => m.index === minMonthIndex);
        for (let i = 0; i < currentMonthPos; i++) {
            if (remainingToAllocate <= 0) break;
            const m = sessionMonths[i];
            const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, transactions, collectionStudentType, startMonth);
            if (fin.remainingDue > 0) {
                const alloc = Math.min(remainingToAllocate, fin.remainingDue);
                newTransactions.push({
                    id: txnId,
                    schoolId: selectedStudent.schoolId,
                    studentId: selectedStudent.id,
                    monthIndex: m.index,
                    year: now.getFullYear(),
                    amount: alloc,
                    overallDiscount: i === 0 ? manualDiscountVal : undefined, // store on the first backlog txn
                    date: paymentDate,
                    mode: paymentMode,
                    reference: paymentReference,
                    remarks: paymentRemarks
                });
                remainingToAllocate -= alloc;
            }
        }

        // 2. Allocate to Selected Months in order
        const totalDiscountToStore = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        let discountRemaining = totalDiscountToStore;

        for (const mIdx of selectedMonthIndices) {
            if (remainingToAllocate <= 0 && discountRemaining <= 0) break;
            const filteredGroupsForMonth = applicableGroups.map(group => ({
                ...group,
                fees: group.fees.filter(fee => !excludedFees[`${mIdx}_${fee.feeName}`])
            }));
            const fin = calculateMonthFinancials(selectedStudent.id, mIdx, filteredGroupsForMonth, transactions, collectionStudentType, startMonth);
            
            if (fin.remainingDue > 0 || (mIdx === minMonthIndex && discountRemaining > 0)) {
                const alloc = Math.min(remainingToAllocate, fin.remainingDue);
                const discAlloc = Math.min(discountRemaining, Math.max(0, fin.remainingDue - alloc));
                
                newTransactions.push({
                    id: txnId,
                    schoolId: selectedStudent.schoolId,
                    studentId: selectedStudent.id,
                    monthIndex: mIdx,
                    year: now.getFullYear(),
                    amount: alloc,
                    discount: discAlloc > 0 ? discAlloc : undefined,
                    overallDiscount: (newTransactions.length === 0) ? manualDiscountVal : undefined, // if first txn
                    date: paymentDate,
                    mode: paymentMode,
                    reference: paymentReference,
                    remarks: paymentRemarks,
                    invoiceNo: txnId // Explicitly set invoiceNo for bulk handler
                });
                remainingToAllocate -= alloc;
                discountRemaining -= discAlloc;
            }
        }

        // Apply any leftover discount to the last transaction or create a zero-amount txn if needed
        if (discountRemaining > 0 && newTransactions.length > 0) {
            const lastTxn = newTransactions[newTransactions.length - 1];
            lastTxn.discount = (lastTxn.discount || 0) + discountRemaining;
        } else if (discountRemaining > 0) {
             newTransactions.push({
                    id: txnId,
                    schoolId: selectedStudent.schoolId,
                    studentId: selectedStudent.id,
                    monthIndex: selectedMonthIndices[0],
                    year: now.getFullYear(),
                    amount: 0,
                    discount: discountRemaining,
                    date: paymentDate,
                    mode: paymentMode,
                    reference: paymentReference
                });
        }

        // 3. Dump remaining surplus into the last selected month
        if (remainingToAllocate > 0) {
            const lastMonthIdx = selectedMonthIndices[selectedMonthIndices.length - 1];
            newTransactions.push({
                id: txnId,
                schoolId: selectedStudent.schoolId,
                studentId: selectedStudent.id,
                monthIndex: lastMonthIdx,
                year: now.getFullYear(),
                amount: remainingToAllocate,
                overallDiscount: (newTransactions.length === 0) ? manualDiscountVal : undefined,
                date: paymentDate,
                mode: paymentMode,
                reference: paymentReference,
                remarks: paymentRemarks
            });
        }
        
        // Apply invoiceNo to all to ensure safety overrides
        newTransactions.forEach(t => t.invoiceNo = txnId);

        addFeeTransactionsBatch(newTransactions).then((res) => {
            if (res.success && res.transactions) {
                const updatedTxns = [...transactions, ...res.transactions];
                setTransactions(updatedTxns);
                toast.success(`Payment of ₹${amt} collected! Receipt: ${txnId}`);
                setSelectedTransactionForPrint(res.transactions);
                setPaymentAmount('');
                setOverallDiscount('');
                setPaymentReference('');
                setPaymentRemarks('');
                if (invoiceGenerateMode === 'Manual') setManualInvoiceNo('');
            } else {
                toast.error("Failed to process payment");
            }
        });
    };

    const handleQRGeneration = async (amt: number, seq: number, txnId: string, invoiceSettings: InvoiceSettings) => {
        if (!selectedStudent || !schoolDetails) return;

        const rate = saasPackage?.transactionRate || 0;
        const totalQR = amt + rate;

        const newQR: QRTransaction = {
            id: `txn_${Date.now()}`,
            schoolId: schoolDetails.id,
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            className: selectedStudent.className,
            amount: totalQR,
            baseAmount: amt,
            month: selectedMonthIndices.map(idx => sessionMonths.find(m => m.index === idx)?.name).join('+'),
            monthIndex: minMonthIndex,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remarks: `Fee Receipt: ${txnId} (Base: ${amt}, Svc: ${rate})`,
            paymentReference: txnId // Store planned receipt ID
        };

        try {
            await addQRTransaction(newQR);
            setCurrentQRTransaction(newQR);
            setShowQRModal(true);
            
            await updateInvoiceSettings(selectedStudent.schoolId, { ...invoiceSettings, currentSequence: seq });
            setInvoiceSettings(prev => ({ ...prev, currentSequence: seq }));
            
            toast.info("QR Code generated for ₹" + totalQR);
        } catch (error) {
            console.error("Failed to generate QR:", error);
            toast.error("Failed to generate QR");
        }
    };

    const handleConfirmQRPayment = async () => {
        if (!currentQRTransaction || !selectedStudent) return;
        setIsProcessingQR(true);
        
        // Simulate bank delay
        await new Promise(r => setTimeout(r, 2000));
        
        const amt = currentQRTransaction.baseAmount || currentQRTransaction.amount || 0;
        let remainingToAllocate = amt;
        const newTransactions: Transaction[] = [];
        const now = new Date();
        const txnId = currentQRTransaction.paymentReference || `txn_${Date.now()}`;

        // 1. Clear Backlogs First
        const currentMonthPos = sessionMonths.findIndex(m => m.index === minMonthIndex);
        for (let i = 0; i < currentMonthPos; i++) {
            if (remainingToAllocate <= 0) break;
            const m = sessionMonths[i];
            const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, transactions, collectionStudentType, startMonth);
            if (fin.remainingDue > 0) {
                const alloc = Math.min(remainingToAllocate, fin.remainingDue);
                newTransactions.push({
                    id: txnId,
                    schoolId: selectedStudent.schoolId,
                    studentId: selectedStudent.id,
                    monthIndex: m.index,
                    year: now.getFullYear(),
                    amount: alloc,
                    date: new Date().toISOString().split('T')[0],
                    mode: 'QR Code',
                    reference: `AUTO_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                });
                remainingToAllocate -= alloc;
            }
        }

        // 2. Allocate to Selected Months
        const totalDiscountToStore = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        let discountRemaining = totalDiscountToStore;

        for (const mIdx of selectedMonthIndices) {
            if (remainingToAllocate <= 0 && discountRemaining <= 0) break;
            const filteredGroupsForMonth = applicableGroups.map(group => ({
                ...group,
                fees: group.fees.filter(fee => !excludedFees[`${mIdx}_${fee.feeName}`])
            }));
            const fin = calculateMonthFinancials(selectedStudent.id, mIdx, filteredGroupsForMonth, transactions, collectionStudentType, startMonth);
            if (fin.remainingDue > 0 || (mIdx === minMonthIndex && discountRemaining > 0)) {
                const alloc = Math.min(remainingToAllocate, fin.remainingDue);
                const discAlloc = Math.min(discountRemaining, Math.max(0, fin.remainingDue - alloc));

                newTransactions.push({
                    id: txnId,
                    schoolId: selectedStudent.schoolId,
                    studentId: selectedStudent.id,
                    monthIndex: mIdx,
                    year: now.getFullYear(),
                    amount: alloc,
                    discount: discAlloc > 0 ? discAlloc : undefined,
                    date: new Date().toISOString().split('T')[0],
                    mode: 'QR Code',
                    reference: `AUTO_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                });
                remainingToAllocate -= alloc;
                discountRemaining -= discAlloc;
            }
        }

        if (discountRemaining > 0 && newTransactions.length > 0) {
            const lastTxn = newTransactions[newTransactions.length - 1];
            lastTxn.discount = (lastTxn.discount || 0) + discountRemaining;
        }

        // 3. Surplus to last selected
        if (remainingToAllocate > 0) {
            const lastMonthIdx = selectedMonthIndices[selectedMonthIndices.length - 1];
            newTransactions.push({
                id: txnId,
                schoolId: selectedStudent.schoolId,
                studentId: selectedStudent.id,
                monthIndex: lastMonthIdx,
                year: now.getFullYear(),
                amount: remainingToAllocate,
                date: new Date().toISOString().split('T')[0],
                mode: 'QR Code',
                reference: `AUTO_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            });
        }

        Promise.all(newTransactions.map(t => addFeeTransaction(t))).then(() => {
            const updatedTxns = [...transactions, ...newTransactions];
            setTransactions(updatedTxns);
            toast.success(`Payment of ₹${amt} verified automatically! Receipt: ${txnId}`);
            setSelectedTransactionForPrint(newTransactions);
            setShowQRModal(false);
            setPaymentAmount('');
            setPaymentReference('');
            setPaymentRemarks('');
            setCurrentQRTransaction(null);
            setIsProcessingQR(false);
        });
    };

    const handleDeleteTransaction = (txnId: string) => {
        setRevertConfirmTxnId(txnId);
    };

    const executeRevert = async () => {
        if (!revertConfirmTxnId) return;
        const txnId = revertConfirmTxnId;
        setRevertConfirmTxnId(null);
        
        const loadingToast = toast.loading("Reverting transaction...");
        try {
            const res = await revertFeeTransaction(txnId);
            if (res.success) {
                setTransactions(prev => prev.filter(t => t.id !== txnId));
                toast.success("Receipt successfully reverted.", { id: loadingToast });
            } else {
                toast.error(`Revert failed: ${res.error}`, { id: loadingToast });
            }
        } catch (e) {
            toast.error("Network error while trying to revert transaction.", { id: loadingToast });
        }
    };

    const upiUri = useMemo(() => {
        if (!currentQRTransaction || !schoolDetails?.upiId) return '';
        const note = encodeURIComponent(`${currentQRTransaction.month}_${selectedStudent?.name}`.replace(/\s+/g, '').substring(0, 50));
        const name = encodeURIComponent(schoolDetails.name.substring(0, 50));
        return `upi://pay?pa=${schoolDetails.upiId}&pn=${name}&am=${currentQRTransaction.amount}&cu=INR&tn=${note}`;
    }, [currentQRTransaction, schoolDetails, selectedStudent]);

    useEffect(() => {
        if (schoolDetails) {
            const ms = schoolDetails as any;
            let classes: string[] = [];
            if (ms.useCustomClasses && ms.classes) {
                classes = ms.classes.map((c: any) => c.name);
            } else {
                classes = INITIAL_CLASS_SETUPS.map(c => c.name);
            }
            
            let sections: string[] = [];
            if (ms.useCustomSections && ms.sections) {
                sections = ms.sections;
            } else {
                sections = INITIAL_SECTIONS;
            }
            
            setAvailableClasses(classes);
            setAvailableSections(sections);
        } else {
            setAvailableClasses(INITIAL_CLASS_SETUPS.map(c => c.name));
            setAvailableSections(INITIAL_SECTIONS);
        }
    }, [schoolDetails]);

    useEffect(() => {
        if (classFilter && classFilter !== 'Select') {
            let hasSections = false;
            let classSections: string[] = [];
            
            const ms = schoolDetails as any;
            if (ms?.useCustomClasses && ms.classes) {
                const selectedClass = ms.classes.find((c: any) => c.name === classFilter);
                if (selectedClass) {
                    hasSections = !!(selectedClass.sections && selectedClass.sections.length > 0);
                    classSections = selectedClass.sections || [];
                }
            } else {
                const selectedClass = INITIAL_CLASS_SETUPS.find(c => c.name === classFilter);
                if (selectedClass) {
                    hasSections = !!(selectedClass.sections && selectedClass.sections.length > 0);
                    classSections = selectedClass.sections || [];
                }
            }
            
            setSelectedClassHasSections(hasSections);
            if (hasSections) {
                setAvailableSections(classSections);
            } else {
                setAvailableSections(ms?.useCustomSections && ms.sections ? ms.sections : INITIAL_SECTIONS);
            }
             
            if (!hasSections || (sectionFilter !== 'Select' && !classSections.includes(sectionFilter))) {
                setSectionFilter('Select');
            }
        } else {
            setSelectedClassHasSections(false);
            const ms = schoolDetails as any;
            setAvailableSections(ms?.useCustomSections && ms.sections ? ms.sections : INITIAL_SECTIONS);
            setSectionFilter('Select');
        }
    }, [classFilter, schoolDetails]);

    // Filter Students
    const filteredStudents = useMemo(() => {
        if (!appliedFilters.hasSearched && !tableKeyword) return []; // Don't show students until searched

        let result = localStudents;

        if (appliedFilters.classString && appliedFilters.classString !== 'Select' && appliedFilters.classString !== 'all') {
            result = result.filter(s => s.className === appliedFilters.classString);
        }

        if (appliedFilters.sectionString && selectedClassHasSections && appliedFilters.sectionString !== 'Select' && appliedFilters.sectionString !== 'all') {
            result = result.filter(s => s.section === appliedFilters.sectionString);
        }

        if (appliedFilters.keywordString) {
            const lower = appliedFilters.keywordString.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lower)) ||
                (s.rollNumber && s.rollNumber.toLowerCase().includes(lower)) ||
                ((s as any).nationalId && (s as any).nationalId.toLowerCase().includes(lower)) ||
                ((s as any).localId && (s as any).localId.toLowerCase().includes(lower)) ||
                (s.fatherName && s.fatherName.toLowerCase().includes(lower))
            );
        }

        // Apply table quick search
        if (tableKeyword) {
            const lowerQuick = tableKeyword.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lowerQuick) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(lowerQuick)) ||
                (s.fatherName && s.fatherName.toLowerCase().includes(lowerQuick)) ||
                (s.phone && s.phone.toLowerCase().includes(lowerQuick))
            );
        }

        if (sortConfig) {
             result = result.sort((a, b) => {
                 const aVal = (a[sortConfig.key] || '').toString();
                 const bVal = (b[sortConfig.key] || '').toString();
                 const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                 return sortConfig.direction === 'asc' ? comparison : -comparison;
             });
         }

        return result;
    }, [appliedFilters, tableKeyword, selectedClassHasSections, localStudents, sortConfig]);

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (format === 'pdf') {
            handlePrint();
            return;
        }

        const headers = ["Class", "Section", "Student ID", "Student Name", "Father Name", "Date Of Birth", "Mobile No."];
        const csvRows = [headers.join(",")];

        filteredStudents.forEach(student => {
            const row = [
                `"${student.className || ''}"`,
                `"${student.section || ''}"`,
                `"${student.admissionNumber || ''}"`,
                `"${student.name || ''}"`,
                `"${student.fatherName || ''}"`,
                `"${student.dob || '—'}"`,
                `"${student.phone || ''}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `fees_collection_students_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported list to ${format.toUpperCase()}`);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('fees-student-table-container');
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Student List</title>');
                printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>');
                printWindow.document.write('</head><body >');
                printWindow.document.write('<h2>Student List for Fees Collection</h2>');
                printWindow.document.write(printContent.outerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };


    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    if (loading) {
        return <div className="p-10 text-center font-bold text-slate-400">Syncing with server...</div>;
    }

    if (!selectedStudent) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-full">
                {/* FILTER BAR - "Select Criteria" */}
                <Card className="shadow-sm border-t-2 border-t-indigo-600">
                    <CardContent className="p-5 pt-2">
                        <h2 className="text-lg text-slate-800 font-bold mb-3 mt-0">Select Criteria</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                            {/* Filter by Class & Section (GREEN REPLICA) */}
                            <div className="bg-green-50/70 border border-green-200 rounded-xl p-5 w-full" onKeyDown={(e) => { if (e.key === 'Enter') handleClassSectionSearch(); }}>
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 min-w-0 w-full">
                                        <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Class <span className="text-rose-500">*</span></Label>
                                        <Select value={classFilter} onValueChange={setClassFilter}>
                                            <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select</SelectItem>
                                                {availableClasses.map(c => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                                <SelectItem value="all">All Classes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1 min-w-0 w-full">
                                        <Label className="text-sm mb-1.5 block text-blue-900 font-extrabold h-5">Section</Label>
                                        <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                            <SelectTrigger className="w-full !h-12 bg-white border-blue-200 focus:ring-blue-500 rounded-lg shadow-sm text-sm font-semibold">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Select">Select</SelectItem>
                                                {availableSections.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                                <SelectItem value="all">All Sections</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleClassSectionSearch} className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(37,99,235,0.25)] shrink-0 transition-all w-full sm:w-auto">
                                        <Search className="w-4 h-4 mr-2" />
                                        Search
                                    </Button>
                                </div>
                            </div>

                            {/* Search by Keyword */}
                            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 w-full">
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 min-w-0 w-full">
                                        <Label className="text-sm mb-1.5 block text-indigo-900 font-extrabold h-5">Search By Keyword</Label>
                                        <Input 
                                            placeholder="Name, Roll No, National ID etc..." 
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleKeywordSearch();
                                            }}
                                            className="w-full h-12 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm text-sm font-semibold"
                                        />
                                    </div>
                                    <Button onClick={handleKeywordSearch} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] shrink-0 transition-all w-full sm:w-auto">
                                        <Search className="w-4 h-4 mr-2" />
                                        Search
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* STUDENT LIST TABLE */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b">
                        <CardTitle className="text-lg text-slate-700">Student List</CardTitle>
                        
                        <div className="flex gap-2 mt-4 sm:mt-0">
                            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="text-slate-600 border-slate-300 hover:bg-slate-50">
                                <FileSpreadsheet className="w-4 h-4 mr-1" />
                                CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="text-slate-600 border-slate-300 hover:bg-slate-50">
                                <FileSpreadsheet className="w-4 h-4 text-green-600 mr-1" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="text-slate-600 border-slate-300 hover:bg-slate-50">
                                <FileText className="w-4 h-4 text-red-500 mr-1" />
                                PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePrint} className="text-slate-600 border-slate-300 hover:bg-slate-50">
                                <Printer className="w-4 h-4 mr-1" />
                                Print
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50/50">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="Search..." 
                                    value={tableKeyword}
                                    onChange={(e) => setTableKeyword(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="w-full" id="fees-student-table-container">
                            <Table className="text-xs sm:text-sm">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('className')}>Class {getSortIcon('className')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none w-[40px] text-center cursor-pointer" onClick={() => requestSort('section')}>Sec {getSortIcon('section')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('rollNumber')}>Roll No. {getSortIcon('rollNumber')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('admissionNumber')}>ID {getSortIcon('admissionNumber')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('name')}>Student Name {getSortIcon('name')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('fatherName')}>Father Name {getSortIcon('fatherName')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('dob')}>DOB {getSortIcon('dob')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none cursor-pointer" onClick={() => requestSort('phone')}>Mobile No. {getSortIcon('phone')}</TableHead>
                                        <TableHead className="py-4 font-extrabold text-slate-900 text-[12px] uppercase tracking-tight select-none text-right print:hidden">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                                                No students found matching the criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <TableRow key={student.id} className="hover:bg-slate-50">
                                                <TableCell className="text-slate-600 px-2 py-2">{student.className}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2 w-[40px] text-center font-medium">{student.section || '-'}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2 font-medium">{student.rollNumber || '-'}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2 truncate max-w-[80px]">{student.admissionNumber || '-'}</TableCell>
                                                <TableCell className="font-bold text-indigo-700 px-2 py-2 min-w-[120px] whitespace-normal break-words leading-tight">{student.name}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2 min-w-[100px] whitespace-normal break-words leading-tight">{student.fatherName || '-'}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2 whitespace-nowrap">{student.dob || '-'}</TableCell>
                                                <TableCell className="text-slate-600 px-2 py-2">{student.phone || '-'}</TableCell>
                                                <TableCell className="text-right px-2 py-2 print:hidden w-[100px]">
                                                    <div className="w-full flex justify-center">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => router.push(`/school-admin/fees/collect/${student.id}`)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-[11px] sm:text-xs px-3 shadow-md font-bold whitespace-nowrap w-full transition-all"
                                                        >
                                                            Collect Fees
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4">

            {/* LEFT COLUMN: Fee Structure & Months */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Header: Smart Student Profile */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 shrink-0 transition-all border-l-4 border-l-indigo-600">
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h2 className="text-lg font-bold text-slate-800 tracking-tight">{selectedStudent.name}</h2>
                           <Badge variant="outline" className="text-[9px] uppercase font-bold bg-slate-50 text-slate-500 border-slate-200">ID: {selectedStudent.rollNumber}</Badge>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                            Class: <span className="text-slate-600">{selectedStudent.className}</span> <span className="mx-1 text-slate-200">/</span> Section: <span className="text-slate-600">{selectedStudent.section}</span> <span className="mx-1 text-slate-200">/</span> Adm: <span className="text-slate-600 font-mono">{selectedStudent.admissionNumber}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedStudent(null)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest"
                        >
                            Change Student
                        </Button>
                    </div>
                </div>

                {/* Smart Month Bar */}
                <div className="bg-white p-3 rounded-2xl border shadow-sm shrink-0 overflow-hidden">
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {sessionMonths.map(m => {
                            const fin = calculateMonthFinancials(selectedStudent.id, m.index, applicableGroups, transactions, collectionStudentType, startMonth);
                            const isActive = selectedMonthIndices.includes(m.index);
                            
                            let statusClass = "bg-slate-50 text-slate-500 border-slate-200";
                            let dotColor = "bg-slate-300";

                            if (fin.status === 'paid') {
                                statusClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                dotColor = "bg-emerald-500";
                            } else if (fin.status === 'partial') {
                                statusClass = "bg-amber-50 text-amber-700 border-amber-100";
                                dotColor = "bg-amber-500";
                            } else if (fin.status === 'unpaid' && fin.totalDue > 0) {
                                statusClass = "bg-white text-slate-800 border-slate-300";
                                dotColor = "bg-slate-400";
                            }

                            if (isActive) {
                                statusClass = "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105 z-10 ring-4 ring-indigo-50 ring-offset-1";
                                dotColor = "bg-white";
                            }

                            return (
                                <button
                                    key={m.index}
                                    id={`month-btn-${m.index}`}
                                    onClick={() => {
                                        setSelectedMonthIndices(prev => {
                                            if (prev.includes(m.index)) {
                                                if (prev.length === 1) return prev;
                                                return prev.filter(i => i !== m.index).sort((a,b) => {
                                                    const relA = (a - (startMonth - 1) + 12) % 12;
                                                    const relB = (b - (startMonth - 1) + 12) % 12;
                                                    return relA - relB;
                                                });
                                            }
                                            return [...prev, m.index].sort((a,b) => {
                                                const relA = (a - (startMonth - 1) + 12) % 12;
                                                const relB = (b - (startMonth - 1) + 12) % 12;
                                                return relA - relB;
                                            });
                                        });
                                    }}
                                    className={cn(
                                        "px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-tighter transition-all whitespace-nowrap flex flex-col items-center min-w-[85px] group relative overflow-hidden",
                                        isActive 
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105 z-10 ring-4 ring-indigo-50 ring-offset-1"
                                            : statusClass
                                    )}
                                >
                                    <span className="mb-1">{m.name}</span>
                                    <div className="flex items-center gap-1">
                                        <div className={cn("w-2 h-2 rounded-full ring-2 ring-white/50", isActive ? "bg-white" : dotColor)} />
                                        {fin.status !== 'unpaid' && fin.status !== 'no_fees' && (
                                            <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-indigo-200" : "opacity-80")}>
                                                {fin.status}
                                            </span>
                                        )}
                                    </div>
                                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white opacity-40" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tabs for Fee List and Payment History */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs defaultValue="fees" className="h-full flex flex-col">
                        <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent">
                            <TabsTrigger
                                value="fees"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-4 py-3"
                            >
                                Fees
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-4 py-3"
                            >
                                Payment History
                                {currentMonthFinancials.totalPaid > 0 && (
                                    <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                        ₹{currentMonthFinancials.totalPaid}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="fees" className="flex-1 overflow-y-auto p-4 bg-white rounded-b-xl border border-t-0 shadow-sm mt-0 data-[state=inactive]:hidden">
                            <h3 className="font-semibold text-slate-700 mb-4 sticky top-0 bg-white pb-2 border-b">
                                Fees for {selectedMonthIndices.map(idx => sessionMonths.find(m => m.index === idx)?.full).join(', ')}
                            </h3>

                            {applicableGroups.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    No fee groups applicable for this student's class.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedMonthIndices.map(monthIdx => {
                                        const monthName = sessionMonths.find(m => m.index === monthIdx)?.full || 'Current';
                                        const monthFees = applicableGroups.flatMap(g => g.fees.filter(f => isFeeApplicableForMonth(f, monthIdx, startMonth)));
                                        
                                        if (monthFees.length === 0) return null;

                                        return (
                                            <div key={monthIdx} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                                                    <div className="flex items-center gap-2.5">
                                                        <h4 className="text-sm font-bold text-slate-700 tracking-tight">Period: {monthName}</h4>
                                                    </div>
                                                </div>

                                                <div className="p-0">
                                                    <Table className="border-collapse">
                                                        <TableHeader className="bg-white">
                                                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                                                <TableHead className="text-slate-900 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] w-[5%] text-center">Select</TableHead>
                                                                <TableHead className="text-slate-900 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] w-1/3">Fees Description</TableHead>
                                                                <TableHead className="text-slate-900 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] text-right px-4">Amount</TableHead>
                                                                <TableHead className="text-slate-900 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] text-right px-4">Fine</TableHead>
                                                                <TableHead className="text-slate-900 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] text-right px-4">Discount</TableHead>
                                                                <TableHead className="text-indigo-600 font-bold uppercase tracking-widest py-2.5 h-auto text-[10px] text-right px-4">Net Payable</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {applicableGroups.map(group => (
                                                                <React.Fragment key={group.id}>
                                                                    {group.fees.map(fee => {
                                                                        if (collectionStudentType === 'new' && fee.appliesTo === 'old') return null;
                                                                        if (collectionStudentType === 'old' && fee.appliesTo === 'new') return null;
                                                                        if (!isFeeApplicableForMonth(fee, monthIdx, startMonth)) return null;

                                                                        const fine = calculateFineAmount(fee, monthIdx, startMonth, new Date(), sessionStartYear);
                                                                        const discKey = `${monthIdx}_${fee.feeName}`;
                                                                        const isExcluded = !!excludedFees[discKey];
                                                                        const discStr = lineDiscounts[discKey] || '';
                                                                        const lineDisc = parseFloat(discStr) || 0;
                                                                        const total = isExcluded ? 0 : Math.max(0, fee.amount + fine - lineDisc);

                                                                        return (
                                                                            <TableRow key={fee.feeName} className={cn("hover:bg-slate-50/50 transition-colors border-b border-slate-50 group last:border-0", isExcluded && "opacity-50 bg-slate-50/20")}>
                                                                                <TableCell className="py-2.5 text-center">
                                                                                    <input 
                                                                                        type="checkbox"
                                                                                        checked={!isExcluded}
                                                                                        onChange={(e) => {
                                                                                            const checked = e.target.checked;
                                                                                            setExcludedFees(prev => ({
                                                                                                ...prev,
                                                                                                [discKey]: !checked
                                                                                            }));
                                                                                        }}
                                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="py-2.5">
                                                                                    <div className="font-semibold text-slate-700 text-[13px] leading-tight">
                                                                                       {fee.feeName}
                                                                                    </div>
                                                                                    <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                                                                                        TYPE: {fee.paymentFrequency.replace('_', ' ')}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right px-4">
                                                                                    <div className={cn("text-[13px] font-semibold font-mono", isExcluded ? "text-slate-300 line-through" : "text-slate-600")}>₹{fee.amount.toFixed(2)}</div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right px-4">
                                                                                    <div className={cn("text-[13px] font-semibold font-mono", isExcluded ? "text-slate-200 line-through" : (fine > 0 ? "text-slate-900" : "text-slate-200"))}>
                                                                                        + ₹{fine.toFixed(2)}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right px-4 w-28">
                                                                                    <div className="relative group/input">
                                                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
                                                                                        <input 
                                                                                            type="text"
                                                                                            value={isExcluded ? "" : discStr}
                                                                                            disabled={isExcluded}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                                                setLineDiscounts(prev => ({ ...prev, [discKey]: val }));
                                                                                            }}
                                                                                            placeholder="0.00"
                                                                                            className="w-full bg-slate-50 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white text-right pr-2 pl-5 py-1 rounded text-[13px] font-semibold font-mono text-slate-600 transition-all outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                                                                                        />
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right px-4 bg-indigo-50/10 transition-colors">
                                                                                    <div className={cn("text-sm font-bold tracking-tight font-mono", isExcluded ? "text-slate-300 line-through" : "text-indigo-600")}>
                                                                                        ₹{total.toFixed(2)}
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </React.Fragment>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 overflow-y-auto p-4 bg-white rounded-b-xl border border-t-0 shadow-sm mt-0 data-[state=inactive]:hidden">
                            <div className="sticky top-0 bg-white pb-3 border-b z-10 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-slate-700">Payment History (All)</span>
                                    {transactions.filter(t => t.studentId === selectedStudent?.id).length > 0 && (
                                        <div className="flex items-center gap-2">
                                        {selectedTransactionIds.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const selected = transactions.filter(t => selectedTransactionIds.includes(t.id));
                                                    setSelectedTransactionForPrint(selected); // Pass all selected
                                                }}
                                                className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                            >
                                                <Printer className="w-3 h-3" />
                                                Print Selected ({selectedTransactionIds.length})
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-xs text-slate-500"
                                            onClick={() => {
                                                const visibleTxns = transactions.filter(t => t.studentId === selectedStudent?.id);
                                                if (selectedTransactionIds.length === visibleTxns.length) {
                                                    setSelectedTransactionIds([]);
                                                } else {
                                                    setSelectedTransactionIds(visibleTxns.map(t => t.id));
                                                }
                                            }}
                                        >
                                            {selectedTransactionIds.length === transactions.filter(t => t.studentId === selectedStudent?.id).length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                )}
                                </div>
                                <div className="relative mt-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Search by Invoice / Receipt ID..."
                                        value={invoiceSearch}
                                        onChange={(e) => setInvoiceSearch(e.target.value)}
                                        className="pl-8 h-8 text-xs"
                                    />
                                </div>
                            </div>

                            {transactions.filter(t => t.studentId === selectedStudent.id).length === 0 ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                                    <FileText className="w-8 h-8 opacity-20" />
                                    <span>No payments recorded yet.</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions
                                        .filter(t => t.studentId === selectedStudent.id)
                                        .filter(t => !invoiceSearch.trim() || t.id.toLowerCase().includes(invoiceSearch.trim().toLowerCase()))
                                        .sort((a, b) => {
                                            const dateA = new Date(a.date).getTime();
                                            const dateB = new Date(b.date).getTime();
                                            if (dateA !== dateB) return dateB - dateA;
                                            return b.id.localeCompare(a.id);
                                        })
                                        .map((txn, index) => (
                                            <div
                                                key={`${txn.id}-${index}`}
                                                className={cn(
                                                    "border rounded-lg p-3 flex justify-between items-center transition-colors group",
                                                    selectedTransactionIds.includes(txn.id)
                                                        ? "bg-indigo-50 border-indigo-200"
                                                        : "bg-slate-50 border-slate-100 hover:border-indigo-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                                            checked={selectedTransactionIds.includes(txn.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                if (e.target.checked) {
                                                                    setSelectedTransactionIds(prev => [...prev, txn.id]);
                                                                } else {
                                                                    setSelectedTransactionIds(prev => prev.filter(id => id !== txn.id));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-800">{txn.id}</span>
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1 py-0">{SESSION_MONTHS[txn.monthIndex]?.name}</Badge>
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{txn.date} • {txn.mode}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right mr-2">
                                                        <div className="text-emerald-700 font-bold font-mono text-lg">
                                                            + ₹{txn.amount}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-full" onClick={(e) => { e.stopPropagation(); setSelectedTransactionForPrint([txn]); }}>
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                    <button 
                                                        className="inline-flex items-center justify-center rounded-full border border-red-200 bg-transparent text-[10px] text-red-600 cursor-pointer hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-widest px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                                        onClick={(e) => { 
                                                            e.preventDefault();
                                                            e.stopPropagation(); 
                                                            handleDeleteTransaction(txn.id); 
                                                        }}
                                                    >
                                                        Revert
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Print Modal */}
            {selectedTransactionForPrint && selectedStudent && (
                <FeeReceiptModal
                    transactions={selectedTransactionForPrint}
                    allTransactions={transactions}
                    student={selectedStudent}
                    schoolDetails={schoolDetails}
                    feeGroups={applicableGroups}
                    lineDiscounts={lineDiscounts}
                    excludedFees={excludedFees}
                    onClose={() => setSelectedTransactionForPrint(null)}
                />
            )}

            {/* RIGHT COLUMN: Payment Action */}
            <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto pb-4 pr-1">
                <Card className="border-t-4 border-t-indigo-600 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-indigo-600" />
                            Payment Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Slim Summary HUD */}
                        <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/30">
                            <div className="p-3.5 space-y-2.5">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span>Selected Month(s)</span>
                                    <span className="text-slate-700 font-mono text-xs">₹{currentMonthFinancials.remainingDue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span className={cn(previousDues > 0 && "text-red-500")}>Previous Backlog</span>
                                    <span className={cn("font-mono text-xs", previousDues > 0 ? "text-red-600" : "text-slate-400")}>₹{previousDues.toFixed(2)}</span>
                                </div>
                                {upcomingMonthInfo.name && !selectedMonthIndices.includes(sessionMonths.find(m => m.name === upcomingMonthInfo.name)?.index ?? -1) && (
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-blue-400/80">
                                        <span>Upcoming ({upcomingMonthInfo.name})</span>
                                        <span className="font-mono text-xs">₹{upcomingMonthInfo.due.toFixed(2)}</span>
                                    </div>
                                )}
                                {Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-green-600">
                                        <span>Discount Amount</span>
                                        <span className="font-mono text-xs">- ₹{Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900">Immediate Payable</span>
                                    <span className="text-lg font-bold text-slate-900 font-mono tracking-tighter">
                                        ₹{(Math.max(0, currentMonthFinancials.remainingDue + previousDues - Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0))).toFixed(2)}
                                    </span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <span>Total Session Balance</span>
                                    <span className="text-slate-900 font-mono">₹{sessionTotalDue.toFixed(2)}</span>
                                </div>
                                {paymentMode === 'QR Code' && saasPackage?.transactionRate && (
                                    <div className="pt-2 flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-indigo-400">
                                        <span>+ QR Gateway Fee</span>
                                        <span className="bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">₹{saasPackage.transactionRate}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-5 pt-2">
                            <div className="relative group">
                                <Label className="absolute -top-2 left-3 bg-white px-1.5 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                    Receipt Number
                                </Label>
                                <div className="h-12 border border-slate-200 rounded-md bg-white flex w-full items-center pl-1.5 pr-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm group-hover:border-slate-300">
                                    
                                    {/* Micro Segmented Control */}
                                    <div className="flex bg-slate-100 p-0.5 rounded shrink-0 mr-3">
                                        <button 
                                            className={cn("px-2.5 py-1 text-[9px] font-bold rounded uppercase tracking-wider transition-all", invoiceGenerateMode === 'Auto' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                            onClick={() => setInvoiceGenerateMode('Auto')}
                                        >
                                            Auto
                                        </button>
                                        <button 
                                            className={cn("px-2.5 py-1 text-[9px] font-bold rounded uppercase tracking-wider transition-all", invoiceGenerateMode === 'Manual' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                            onClick={() => setInvoiceGenerateMode('Manual')}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                    
                                    {/* Input Presentation */}
                                    <div className="flex-1 min-w-0">
                                        {invoiceGenerateMode === 'Auto' ? (
                                            <div className="w-full text-[13px] font-mono font-medium text-slate-400 truncate flex items-center gap-2 cursor-not-allowed select-none">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse shrink-0" />
                                                <span className="opacity-80">
                                                    {invoiceSettings.prefix}{String(Math.max(invoiceSettings.startFrom, invoiceSettings.currentSequence + 1)).padStart(invoiceSettings.padding, '0')}
                                                </span>
                                            </div>
                                        ) : (
                                            <input 
                                                type="text" 
                                                placeholder="Type custom receipt ID..."
                                                className="w-full text-[13px] font-mono font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300"
                                                value={manualInvoiceNo}
                                                onChange={e => setManualInvoiceNo(e.target.value)}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                             <div className="relative">
                                <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                    Over All Discount
                                </Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        className="pl-9 font-bold text-lg h-12 bg-white text-green-600"
                                        placeholder="0"
                                        value={overallDiscount}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (parseFloat(val) < 0) return; // Prevent negative
                                            setOverallDiscount(val);
                                        }}
                                    />
                                </div>
                            </div>

                             <div className="relative">
                                <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                    Amount Paying
                                </Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="number"
                                        className="pl-9 font-bold text-lg h-12 bg-white"
                                        placeholder="0"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                                <div className="mt-2 pt-1 border-t border-slate-100/50">
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                         <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Quick Presets</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            type="button"
                                            className="group flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-950 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
                                            onClick={() => {
                                                const discountSum = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                                                setPaymentAmount((Math.max(0, currentMonthFinancials.remainingDue + previousDues - discountSum)).toString());
                                                toast.info("Amount set to Whole Due");
                                            }}
                                        >
                                            <History className="w-3.5 h-3.5 mb-1 text-indigo-500 group-hover:text-white transition-colors" />
                                            <span className="text-[10px] font-bold">Whole Due</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="group flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-950 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
                                            onClick={() => {
                                                const discountSum = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                                                setPaymentAmount((Math.max(0, currentMonthFinancials.remainingDue - discountSum)).toString());
                                                toast.info("Amount set to Month Only");
                                            }}
                                        >
                                            <Calendar className="w-3.5 h-3.5 mb-1 text-emerald-500 group-hover:text-white transition-colors" />
                                            <span className="text-[10px] font-bold">Month Only</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="group flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-950 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
                                            onClick={() => {
                                                const discountSum = Object.values(lineDiscounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                                                setPaymentAmount((Math.max(0, sessionTotalDue - discountSum)).toString());
                                                toast.info("Amount set to Yearly Total");
                                            }}
                                        >
                                            <Banknote className="w-3.5 h-3.5 mb-1 text-amber-500 group-hover:text-white transition-colors" />
                                            <span className="text-[10px] font-bold">Yearly</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                        Mode
                                    </Label>
                                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                                        <SelectTrigger className={cn("h-11 w-full bg-white", paymentMode === 'None' && "border-red-300 bg-red-50")}>
                                            <SelectValue placeholder="Select Mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None" disabled className="text-slate-400">Select Mode</SelectItem>
                                            {PAYMENT_MODES.map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative">
                                    <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                        Date
                                    </Label>
                                    <div className="relative group">
                                        <div className="h-11 w-full bg-white border border-input rounded-md flex items-center px-3 hover:border-indigo-300 transition-all cursor-pointer">
                                            <span className="text-sm text-slate-700 font-medium">
                                                {paymentDate ? (() => {
                                                    const d = new Date(paymentDate);
                                                    const day = d.getDate().toString().padStart(2, '0');
                                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                    const month = months[d.getMonth()];
                                                    const year = d.getFullYear().toString().slice(-2);
                                                    return `${day}-${month}-${year}`;
                                                })() : 'Select Date'}
                                            </span>
                                            <div className="flex-1" />
                                            <Calendar className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <Input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer hide-native-calendar w-full h-full"
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                        />
                                    </div>
                                </div>
                            </div>
                            {paymentMode === 'None' && <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">Please select a payment mode !</p>}

                                <div className="relative">
                                    <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">
                                        Reference / Auth Code
                                    </Label>
                                    <Input
                                        placeholder="Check No. / UPI ID"
                                        className="h-11 bg-white"
                                        value={paymentReference}
                                        onChange={e => setPaymentReference(e.target.value)}
                                    />
                                </div>

                            <div className="relative">
                                <Label className="absolute -top-2 left-3 bg-white px-1 z-10 text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1">
                                    <span className={cn(parseFloat(overallDiscount) > 0 ? "text-red-500" : "text-slate-500")}>Remarks</span>
                                    {parseFloat(overallDiscount) > 0 && <span className="text-red-500 animate-pulse">(Required)</span>}
                                </Label>
                                <Textarea
                                    placeholder={parseFloat(overallDiscount) > 0 ? "Enter reason for discount (Mandatory)..." : "Optional notes..."}
                                    className={cn("h-20 resize-none bg-white transition-all", parseFloat(overallDiscount) > 0 && !paymentRemarks.trim() && "border-red-200 focus-visible:ring-red-100")}
                                    value={paymentRemarks}
                                    onChange={e => setPaymentRemarks(e.target.value)}
                                />
                            </div>

                            <Button
                                className={cn(
                                    "w-full font-bold py-6 text-lg shadow-lg transition-all",
                                    paymentMode === 'QR Code' 
                                        ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" 
                                        : (paymentMode === 'None' ? "bg-slate-300 cursor-not-allowed text-slate-500" : "bg-green-600 hover:bg-green-700 shadow-green-100")
                                )}
                                onClick={handleProcessPayment}
                                disabled={paymentMode === 'None'}
                            >
                                {paymentMode === 'None' ? 'Choose Payment Mode' : (paymentMode === 'QR Code' ? 'Generate QR Receipt' : 'Collect Payment')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* QR Code Modal */}
            <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-indigo-900 text-white border-none shadow-2xl p-0 overflow-hidden">
                    <div className="p-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                                <QrCode className="w-8 h-8 text-indigo-300" />
                                UPI QR Payment
                            </DialogTitle>
                            <DialogDescription className="text-indigo-200 font-medium">
                                Student scan this code to pay fees securely.
                            </DialogDescription>
                        </DialogHeader>
                        
                        {currentQRTransaction && (
                            <div className="mt-8 flex flex-col items-center">
                                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 w-full text-center mb-8 border border-white/10">
                                    <div className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Total to Pay (inc. Service Fee)</div>
                                    <div className="text-5xl font-black text-white tracking-widest mb-2">₹{currentQRTransaction.amount}</div>
                                    <div className="text-sm font-bold text-indigo-300">{selectedStudent.name} • {currentQRTransaction.month}</div>
                                </div>

                                <div className="bg-white p-4 rounded-3xl shadow-2xl relative">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                        Scan with any UPI App
                                    </div>
                                    <QRCode 
                                        value={upiUri} 
                                        size={220} 
                                        level="H" 
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="bg-white/5 p-6 backdrop-blur-xl border-t border-white/10 flex sm:justify-center gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowQRModal(false)}
                            className="text-white hover:bg-white/10 rounded-2xl font-bold"
                            disabled={isProcessingQR}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmQRPayment}
                            disabled={isProcessingQR}
                            className="bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl font-black px-10 shadow-xl flex items-center gap-2"
                        >
                            {isProcessingQR ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {isProcessingQR ? 'Verifying...' : 'Verify & Mark Paid'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Confirmation Dialog */}
            <Dialog open={!!revertConfirmTxnId} onOpenChange={(open) => { if (!open) setRevertConfirmTxnId(null); }}>
                <DialogContent className="max-w-md border-red-200 bg-white">
                    <DialogHeader>
                        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center text-red-700 text-lg font-bold">Confirm Revert</DialogTitle>
                        <DialogDescription className="text-center text-slate-600 text-sm mt-1">
                            Are you sure you want to <span className="font-bold text-red-600">Revert</span> this payment?<br />
                            This will restore the student&apos;s dues and generate a revert log.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                        <Button variant="outline" className="rounded-lg" onClick={() => setRevertConfirmTxnId(null)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold" onClick={executeRevert}>Yes, Revert</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Helper to show month
// Move helper functions outside to avoid re-creation if possible, but they depend on props, so inside or customized hook is fine.
// Kept logic inside for simplicity as per existing patterns.
