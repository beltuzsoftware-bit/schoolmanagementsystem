'use client';

import { cn } from "@/lib/utils";
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Printer, 
    History, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle,
    UserCircle,
    Wallet,
    Calendar,
    ArrowRightCircle,
    ArrowLeftRight,
    Calculator,
    Filter,
    RotateCcw,
    Trash2,
    Camera,
    Loader2
} from 'lucide-react';
import { addFeeTransactionsBatch, getInvoiceSettings, revertFeeTransaction, updateStudent } from '@/app/actions';
import { getStudentTransportInfo, StudentTransportFeeInfo } from '@/app/actions/transport';
import { toast } from 'sonner';
import { Student, School } from '@/types';
import { Transaction, FeeGroup } from '@/types/fees';
import { 
    getStudentType, 
    getOrderedSessionMonths, 
    isFeeApplicableForMonth, 
    calculateFineAmount, 
    calculateMonthFinancials,
    calculateTotalOutstandingDues
} from '@/lib/fees-helper';
import FeeReceiptModal from './fee-receipt-modal';

interface StudentFeeDetailsV2Props {
    student: Student;
    schoolDetails: School | null;
    allGroups: FeeGroup[];
    allTransactions: Transaction[];
}

export default function StudentFeeDetailsV2({ 
    student, 
    schoolDetails, 
    allGroups, 
    allTransactions 
}: StudentFeeDetailsV2Props) {
    const router = useRouter();
    // --- STATE ---
    const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(student.photo);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');
    const [isSaving, setIsSaving] = useState(false);
    const [activeMonthIndex, setActiveMonthIndex] = useState<number>(new Date().getMonth());
    const [selectedMonthIndices, setSelectedMonthIndices] = useState<number[]>([new Date().getMonth()]);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [manualDiscounts, setManualDiscounts] = useState<Record<string, number>>({});
    const [overallDiscount, setOverallDiscount] = useState<string>('0');
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<string>('');
    const [receiptMode, setReceiptMode] = useState<'auto' | 'custom'>('auto');
    const [invoiceSettings, setInvoiceSettings] = useState<any>(null);
    const [customReceiptNo, setCustomReceiptNo] = useState<string>('');
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [activeReceiptTxns, setActiveReceiptTxns] = useState<Transaction[] | null>(null);
    const [selectedFeesByMonth, setSelectedFeesByMonth] = useState<Record<number, string[]>>({});
    // Revert state
    const [revertingId, setRevertingId] = useState<string | null>(null);
    const [revertConfirmId, setRevertConfirmId] = useState<string | null>(null);
    const [revertReason, setRevertReason] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<{ name?: string, role?: string } | null>(null);
    const [needsRefresh, setNeedsRefresh] = useState(false);
    const [transportInfo, setTransportInfo] = useState<StudentTransportFeeInfo | null>(null);
    const prevTransportInfoRef = React.useRef<any>(null);
    const [transportDays, setTransportDays] = useState<Record<number, number>>({}); // monthIndex -> days used
    const [transportDates, setTransportDates] = useState<Record<number, { start: string, end: string }>>({});
    const [selectedHistoryInvoices, setSelectedHistoryInvoices] = useState<string[]>([]);

    const historyGroups = useMemo(() => {
        const studentTxns = allTransactions.filter(t => t.studentId === student.id);
        const groups: Record<string, Transaction[]> = {};
        studentTxns.forEach(t => {
            const key = t.invoiceNo || t.id;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return Object.values(groups)
            .sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
    }, [allTransactions, student.id]);

    const handleToggleAllHistory = (checked: boolean) => {
        if (checked) {
            setSelectedHistoryInvoices(historyGroups.map(g => g[0].invoiceNo || g[0].id));
        } else {
            setSelectedHistoryInvoices([]);
        }
    };

    const handleToggleOneHistory = (key: string, checked: boolean) => {
        if (checked) {
            setSelectedHistoryInvoices(prev => [...prev, key]);
        } else {
            setSelectedHistoryInvoices(prev => prev.filter(k => k !== key));
        }
    };

    const handlePrintBulkInvoices = () => {
        const txnsToPrint: Transaction[] = [];
        historyGroups.forEach(g => {
            const key = g[0].invoiceNo || g[0].id;
            if (selectedHistoryInvoices.includes(key)) {
                txnsToPrint.push(...g);
            }
        });
        if (txnsToPrint.length === 0) return;
        setActiveReceiptTxns(txnsToPrint);
        setIsReceiptModalOpen(true);
    };

    const hasInitializedSelection = React.useRef(false);

    // --- HELPERS ---
    const startMonth = (schoolDetails as any)?.sessionStartMonth || 4;
    const sessionMonths = useMemo(() => getOrderedSessionMonths(startMonth), [startMonth]);
    const applicableGroups = useMemo(() => allGroups.filter(g => g.assignedClasses.includes(student.className)), [allGroups, student.className]);
    const studentType = useMemo(() => getStudentType(student, schoolDetails?.currentSession), [student, schoolDetails?.currentSession]);

    // Initial Month Setup: Auto-select current month + any previous unpaid months
    useEffect(() => {
        if (hasInitializedSelection.current) return;
        if (applicableGroups.length === 0) return;

        const currentMonthIdx = new Date().getMonth();
        const autoSelected: number[] = [];
        const currentRelIdx = sessionMonths.findIndex(m => m.index === currentMonthIdx);

        // Scan from start of session up to current month
        for (let i = 0; i <= currentRelIdx; i++) {
            const m = sessionMonths[i];
            if (!m) continue;
            
            const fin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
            if (fin.remainingDue > 0) {
                autoSelected.push(m.index);
            }
        }

        // If no previous dues and current month not already in list, at least select current month
        if (autoSelected.length === 0) {
            autoSelected.push(currentMonthIdx);
        }

        setActiveMonthIndex(currentMonthIdx);
        setSelectedMonthIndices(Array.from(new Set(autoSelected)));
        hasInitializedSelection.current = true;
    }, [student.id, applicableGroups, allTransactions, studentType, startMonth, sessionMonths]);

    // Load Initial Data (Settings & User)
    useEffect(() => {
        const loadInitialData = async () => {
            if (student.schoolId) {
                const settings = await getInvoiceSettings(student.schoolId);
                if (settings) {
                    setInvoiceSettings(settings);
                    setReceiptMode(settings.autoGenerate ? 'auto' : 'custom');
                    if (settings.defaultPaymentMode && settings.defaultPaymentMode !== 'Select') {
                        setPaymentMode(settings.defaultPaymentMode);
                    } else {
                        setPaymentMode('');
                    }
                }
            }
            
            // Fetch transport allocation for this student
            const tInfo = await getStudentTransportInfo(student.id);
            setTransportInfo(tInfo);

            if (tInfo) {
                const initialDays: Record<number, number> = {};
                sessionMonths.forEach(m => {
                    const days = getOverlappingDaysInMonth(m.index, tInfo.effectiveFrom, tInfo.effectiveUntil);
                    if (days < 30) {
                        initialDays[m.index] = days;
                    }
                    // If it's a date range within the month, set the date inputs too
                    if (tInfo.effectiveFrom || tInfo.effectiveUntil) {
                        const mStart = new Date(new Date().getFullYear(), m.index, 1);
                        const mEnd = new Date(new Date().getFullYear(), m.index + 1, 0);
                        
                        let start = '';
                        let end = '';
                        
                        if (tInfo.effectiveFrom) {
                            const d = new Date(tInfo.effectiveFrom);
                            if (d.getMonth() === m.index) start = tInfo.effectiveFrom.split('T')[0];
                        }
                        if (tInfo.effectiveUntil) {
                            const d = new Date(tInfo.effectiveUntil);
                            if (d.getMonth() === m.index) end = tInfo.effectiveUntil.split('T')[0];
                        }
                        
                        if (start || end) {
                            setTransportDates(prev => ({ ...prev, [m.index]: { start, end } }));
                        }
                    }
                });
                if (Object.keys(initialDays).length > 0) {
                    setTransportDays(prev => ({ ...prev, ...initialDays }));
                }
            }

            // Get user from localStorage
            const stored = localStorage.getItem('kummi_user');
            if (stored) {
                try {
                    setCurrentUser(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse user data", e);
                }
            }
        };
        
        loadInitialData();
    }, [student.schoolId, student.id]);

    // Financial Data for all Selected Months
    const selectedMonthsData = useMemo(() => {
        // Sort selectedMonthIndices based on their order in sessionMonths
        const sortedIndices = [...selectedMonthIndices].sort((a, b) => {
            const idxA = sessionMonths.findIndex(m => m.index === a);
            const idxB = sessionMonths.findIndex(m => m.index === b);
            return idxA - idxB;
        });
        return sortedIndices.map(mIdx => {
            const month = sessionMonths.find(m => m.index === mIdx);
            if (!month) return null;
            
            const financials = calculateMonthFinancials(student.id, mIdx, applicableGroups, allTransactions, studentType, startMonth);
            
            const fees: any[] = [];
            applicableGroups.forEach(group => {
                group.fees.forEach(f => {
                    if (isFeeApplicableForMonth(f, mIdx, startMonth)) {
                        fees.push(f);
                    }
                });
            });
            
            const perFeeDiscounts: Record<string, number> = {};
            if (schoolDetails?.feeDiscounts) {
                const eligibleRules = schoolDetails.feeDiscounts.filter((d: any) => {
                    let eligible = false;
                    if (d.targetType === 'ALL') {
                        if (!d.assignedClasses || d.assignedClasses.length === 0 || d.assignedClasses.includes(student.className || '')) {
                            eligible = true;
                        }
                    } else if (d.targetType === 'SPECIFIC') {
                        if (d.studentIds?.includes(student.id)) {
                            eligible = true;
                        }
                    }
                    return eligible && (!d.months || d.months.length === 0 || d.months.includes(mIdx));
                });

                fees.forEach(f => { perFeeDiscounts[f.feeName] = 0; });
                eligibleRules.forEach((d: any) => {
                    const targetFees = fees.filter(f => !d.feeTypes || d.feeTypes.length === 0 || d.feeTypes.includes(f.feeName));
                    if (d.type === 'PERCENTAGE') {
                        targetFees.forEach(f => {
                            perFeeDiscounts[f.feeName] = Math.max(perFeeDiscounts[f.feeName] || 0, (f.amount * d.value) / 100);
                        });
                    } else {
                        let rem = d.value;
                        targetFees.forEach(f => {
                            if (rem <= 0) return;
                            const alloc = Math.min(rem, f.amount);
                            perFeeDiscounts[f.feeName] = Math.max(perFeeDiscounts[f.feeName] || 0, alloc);
                            rem -= alloc;
                        });
                    }
                });
            }

            // Group by feeName to prevent cross-fee stealing
            const standardTxns = allTransactions.filter(t => 
                t.studentId === student.id && t.monthIndex === mIdx
            );

            const matchedPaid: Record<string, number> = {};
            let legacyPooledSettled = 0;

            standardTxns.forEach(t => {
                const settled = t.amount + (t.discount || 0);
                if (t.feeName) {
                    matchedPaid[t.feeName] = (matchedPaid[t.feeName] || 0) + settled;
                } else {
                    legacyPooledSettled += settled;
                }
            });

            const feeDetails: any[] = fees.map(f => {
                const fineAmt = calculateFineAmount(f, mIdx, startMonth, new Date());
                const confDisc = perFeeDiscounts[f.feeName] || 0;
                const userDisc = manualDiscounts[`${mIdx}_${f.feeName}`] ?? confDisc;
                // Validation: Discount cannot be less than the standard defined one
                const finalDisc = Math.max(confDisc, userDisc);

                const totalFeeDue = Math.max(0, f.amount + fineAmt - finalDisc);
                
                // 1. Take from explicitly matched payments
                const matched = matchedPaid[f.feeName] || 0;
                let settledForThisFee = Math.min(totalFeeDue, matched);
                
                // 2. If still due, take from legacy pooled payments
                const remainingAfterMatch = totalFeeDue - settledForThisFee;
                if (remainingAfterMatch > 0 && legacyPooledSettled > 0) {
                    const fromPool = Math.min(remainingAfterMatch, legacyPooledSettled);
                    settledForThisFee += fromPool;
                    legacyPooledSettled -= fromPool;
                }

                const remainingForThisFee = totalFeeDue - settledForThisFee;

                return {
                    name: f.feeName,
                    type: f.paymentFrequency.toUpperCase().replace('_', ' '),
                    baseAmount: f.amount,
                    fine: fineAmt,
                    discount: finalDisc,
                    standardDiscount: confDisc,
                    totalDue: totalFeeDue,
                    paidAlready: settledForThisFee,
                    netPayable: remainingForThisFee,
                    isFullyPaid: remainingForThisFee === 0,
                    monthIndex: mIdx,
                    monthName: month.name
                };
            });

            // --- TRANSPORT FEE INJECTION ---
            let transportRemainingDue = 0;
            if (transportInfo && transportInfo.monthlyFee > 0) {
                const transportTxns = allTransactions.filter(t =>
                    t.studentId === student.id &&
                    t.monthIndex === mIdx &&
                    (t as any).feeName === 'Transport Fee'
                );
                const transportPaid = transportTxns.reduce((sum, t) => sum + t.amount, 0);
                const transportDiscount = transportTxns.reduce((sum, t) => sum + ((t as any).discount || 0), 0);
                const transportSettled = transportPaid + transportDiscount;

                // Calculate Pro-rata fee
                const daysUsed = transportDays[mIdx] ?? 30;
                const adjustedMonthlyFee = (transportInfo.monthlyFee / 30) * daysUsed;

                // --- TRANSPORT LATE FINE ---
                let transportFine = 0;
                if (transportSettled < adjustedMonthlyFee) {
                    const graceDays = transportInfo.lateFineGraceDays ?? 10;
                    const fineAmt = transportInfo.lateFineAmount || 0;
                    const fineType = transportInfo.lateFineType || 'fixed';
                    const effectiveDateStr = transportInfo.lateFineEffectiveDate;
                    
                    if (fineAmt > 0) {
                        // Effective Date Check
                        let isEffective = true;
                        if (effectiveDateStr) {
                            const effectiveDate = new Date(effectiveDateStr);
                            if (!isNaN(effectiveDate.getTime()) && new Date() < effectiveDate) {
                                isEffective = false;
                            }
                        }

                        if (isEffective) {
                            // Fine applies from 1st of the month + grace days
                            const safeStart = (schoolDetails as any)?.sessionStartMonth || 4;
                            const currentYear = new Date().getFullYear();
                            const year = (mIdx < safeStart - 1) ? currentYear + 1 : currentYear;
                            const dueDate = new Date(year, mIdx, 1 + graceDays);
                            if (new Date() > dueDate) {
                                if (fineType === 'percentage') {
                                    // Percentage of the pro-rata adjusted monthly fee
                                    transportFine = Math.round((adjustedMonthlyFee * fineAmt) / 100);
                                } else {
                                    // Fixed flat amount
                                    transportFine = fineAmt;
                                }
                            }
                        }
                    }
                }

                transportRemainingDue = Math.max(0, adjustedMonthlyFee + transportFine - transportSettled);

                feeDetails.push({
                    name: 'Transport Fee',
                    type: 'MONTHLY',
                    baseAmount: adjustedMonthlyFee,
                    originalMonthlyFee: transportInfo.monthlyFee,
                    daysUsed,
                    fine: transportFine,
                    discount: 0,
                    standardDiscount: 0,
                    totalDue: adjustedMonthlyFee + transportFine,
                    paidAlready: transportSettled,
                    netPayable: transportRemainingDue,
                    isFullyPaid: transportRemainingDue < 1,
                    monthIndex: mIdx,
                    monthName: month.name,
                    isTransport: true,
                    transportStopName: transportInfo.stopName,
                    transportRouteName: transportInfo.routeName,
                });
            }

            return {
                monthIndex: mIdx,
                monthName: month.name,
                feeDetails,
                totalDue: financials.totalDue + (transportInfo && transportInfo.monthlyFee > 0 ? (transportInfo.monthlyFee / 30 * (transportDays[mIdx] ?? 30)) : 0),
                totalPaid: financials.totalPaid,
                totalDiscount: financials.totalDiscount,
                remainingDue: financials.remainingDue + transportRemainingDue
            };
        }).filter(m => m !== null && m.remainingDue > 0);
    }, [selectedMonthIndices, student.id, applicableGroups, allTransactions, studentType, startMonth, schoolDetails?.feeDiscounts, manualDiscounts, transportInfo, transportDays]);

    const combinedSummary = useMemo(() => {
        let totalDue = 0;
        let totalPaid = 0;
        let totalDiscount = 0;
        let remainingDue = 0;

        (selectedMonthsData as any[]).forEach((m: any) => {
            m.feeDetails.forEach((fee: any) => {
                totalDue += (fee.baseAmount + fee.fine);
                totalPaid += fee.paidAlready;
                totalDiscount += fee.discount;
                remainingDue += fee.netPayable;
            });
        });

        return { totalDue, totalPaid, totalDiscount, remainingDue };
    }, [selectedMonthsData]);

    // Automatically select all fees when a NEW month is added to selection
    const prevSelectedMonthsRef = React.useRef<number[]>([]);
    React.useEffect(() => {
        const newlyAdded = selectedMonthIndices.filter(m => !prevSelectedMonthsRef.current.includes(m));
        
        // Detect if transport info just arrived
        const transportJustLoaded = transportInfo && !prevTransportInfoRef.current;
        
        if (newlyAdded.length > 0 || transportJustLoaded) {
            setSelectedFeesByMonth(prev => {
                const next = { ...prev };
                
                // For newly added months, select everything
                newlyAdded.forEach(mIdx => {
                    const monthData = (selectedMonthsData as any[]).find(m => m?.monthIndex === mIdx);
                    if (monthData) {
                        next[mIdx] = monthData.feeDetails.map((f: any) => f.name);
                    }
                });

                // For existing months, if transport just loaded, add it to the selection
                if (transportJustLoaded) {
                    selectedMonthIndices.forEach(mIdx => {
                        // Only add if we haven't already initialized this month (handled above)
                        if (!newlyAdded.includes(mIdx)) {
                            const monthData = (selectedMonthsData as any[]).find(m => m?.monthIndex === mIdx);
                            const transportFee = monthData?.feeDetails.find((f: any) => f.isTransport);
                            if (transportFee && next[mIdx]) {
                                // Add if not already present
                                if (!next[mIdx].includes(transportFee.name)) {
                                    next[mIdx] = [...next[mIdx], transportFee.name];
                                }
                            } else if (transportFee && !next[mIdx]) {
                                // If for some reason next[mIdx] wasn't initialized, initialize it now
                                next[mIdx] = monthData.feeDetails.map((f: any) => f.name);
                            }
                        }
                    });
                }
                
                return next;
            });
        }

        // Cleanup: remove months that are no longer selected
        const removed = prevSelectedMonthsRef.current.filter(m => !selectedMonthIndices.includes(m));
        if (removed.length > 0) {
            setSelectedFeesByMonth(prev => {
                const next = { ...prev };
                removed.forEach(mIdx => delete next[mIdx]);
                return next;
            });
        }

        prevSelectedMonthsRef.current = selectedMonthIndices;
        prevTransportInfoRef.current = transportInfo;
    }, [selectedMonthIndices, selectedMonthsData, transportInfo]);

    // Calculate total outstanding transport fees for the session
    const transportOutstandingInfo = useMemo(() => {
        if (!transportInfo) return { total: 0, backlog: 0, upcoming: 0 };
        let total = 0;
        let backlog = 0;
        let upcoming = 0;
        const activeRelIdx = sessionMonths.findIndex(am => am.index === activeMonthIndex);

        sessionMonths.forEach((m, idx) => {
            const monthTxns = allTransactions.filter(t => 
                t.studentId === student.id && 
                t.monthIndex === m.index && 
                (t as any).feeName === 'Transport Fee'
            );
            const settled = monthTxns.reduce((sum, t) => sum + t.amount + ((t as any).discount || 0), 0);
            const due = Math.max(0, transportInfo.monthlyFee - settled);
            total += due;

            // Backlog is anything before the currently active month in the UI
            if (idx < activeRelIdx) {
                backlog += due;
            } else if (idx === activeRelIdx + 1) {
                // Upcoming is the month immediately following the active month
                upcoming = due;
            }
        });
        return { total, backlog, upcoming };
    }, [transportInfo, allTransactions, student.id, sessionMonths, activeMonthIndex]);


    // Payment Sidebar Summary
    const paymentSummary = useMemo(() => {
        let selectedTotal = 0;
        let backlogTotal = 0;
        let upcomingTotal = 0;

        // Calculate backlog and upcoming based on all months
        const activeRelIdx = sessionMonths.findIndex(am => am.index === activeMonthIndex);
        sessionMonths.forEach((m, idx) => {
            const fin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
            if (idx < activeRelIdx && fin.remainingDue > 0) {
                backlogTotal += fin.remainingDue;
            } else if (idx === activeRelIdx + 1 && fin.remainingDue > 0) {
                // Only the immediate next month is counted as "Upcoming"
                upcomingTotal = fin.remainingDue;
            }
        });

        // Add transport components
        backlogTotal += transportOutstandingInfo.backlog;
        upcomingTotal += transportOutstandingInfo.upcoming;

        // Calculate selectedTotal from the active selections in the left panel
        selectedMonthsData.forEach((m: any) => {
            const selectedForMonth = selectedFeesByMonth[m.monthIndex] || [];
            m.feeDetails.forEach((fee: any) => {
                if (selectedForMonth.includes(fee.name)) {
                    selectedTotal += fee.netPayable;
                }
            });
        });

        const manualDiscountAmt = parseFloat(overallDiscount) || 0;
        const totalDisc = combinedSummary.totalDiscount + manualDiscountAmt;
        const payable = Math.max(0, selectedTotal - manualDiscountAmt);

        // Calculate "Till Today" totals
        const currentMonthIdx = new Date().getMonth();
        const currentRealRelIdx = sessionMonths.findIndex(m => m.index === currentMonthIdx) !== -1 
            ? sessionMonths.findIndex(m => m.index === currentMonthIdx) 
            : sessionMonths.findIndex(am => am.index === activeMonthIndex);

        let totalToPayTillToday = 0;
        let totalPaidTillToday = 0;

        sessionMonths.forEach((m, idx) => {
            if (idx <= currentRealRelIdx) {
                const fin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
                totalToPayTillToday += fin.totalDue;
                totalPaidTillToday += fin.totalPaid + fin.totalDiscount;

                // Include transport fees
                if (transportInfo && transportInfo.monthlyFee > 0) {
                    const daysUsed = transportDays[m.index] ?? 30;
                    const adjustedFee = (transportInfo.monthlyFee / 30) * daysUsed;
                    totalToPayTillToday += adjustedFee;

                    const tTxns = allTransactions.filter(t => 
                        t.studentId === student.id && 
                        t.monthIndex === m.index && 
                        (t as any).feeName === 'Transport Fee'
                    );
                    const tSettled = tTxns.reduce((s, t) => s + t.amount + ((t as any).discount || 0) + ((t as any).overallDiscount || 0), 0);
                    totalPaidTillToday += tSettled;
                }
            }
        });

        const actualBalance = Math.max(0, totalToPayTillToday - totalPaidTillToday);

        return {
            selected: selectedTotal,
            backlog: backlogTotal,
            upcoming: upcomingTotal,
            totalDiscount: totalDisc,
            immediatePayable: payable,
            totalToPayTillToday,
            totalPaidTillToday,
            totalOutstanding: actualBalance
        };
    }, [selectedMonthIndices, activeMonthIndex, student.id, applicableGroups, allTransactions, selectedFeesByMonth, selectedMonthsData, combinedSummary, overallDiscount, transportOutstandingInfo, sessionMonths, studentType, startMonth, transportInfo, transportDays]);

    // Check if all due fees in all selected months are selected
    const isAllFeesSelected = useMemo(() => {
        if (selectedMonthsData.length === 0) return false;
        
        return selectedMonthsData.every((m: any) => {
            const selectedForMonth = selectedFeesByMonth[m.monthIndex] || [];
            // We only care about fees that are not already fully paid
            const itemsToSelect = m.feeDetails.filter((f: any) => !f.isFullyPaid);
            if (itemsToSelect.length === 0) return true;
            
            return itemsToSelect.every((f: any) => selectedForMonth.includes(f.name));
        });
    }, [selectedMonthsData, selectedFeesByMonth]);

    // Reset overall discount if selection changes and not all fees are selected
    useEffect(() => {
        if (!isAllFeesSelected) {
            setOverallDiscount('0');
        }
    }, [isAllFeesSelected]);

    // Auto-fetch "Amount Paying" whenever selection or manual discount changes
    React.useEffect(() => {
        setPaymentAmount(paymentSummary.immediatePayable.toString());
    }, [paymentSummary.immediatePayable]);

    // --- HANDLERS ---
    const toggleMonthSelection = (mIdx: number) => {
        const fin = calculateMonthFinancials(student.id, mIdx, applicableGroups, allTransactions, studentType, startMonth);
        if (fin.status === 'paid' && !selectedMonthIndices.includes(mIdx)) return;

        const relIdx = sessionMonths.findIndex(m => m.index === mIdx);
        const isSelecting = !selectedMonthIndices.includes(mIdx);

        if (isSelecting) {
            // Selecting month: must also select all previous unpaid months
            const toAdd: number[] = [];
            for (let i = 0; i <= relIdx; i++) {
                const m = sessionMonths[i];
                const mFin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
                if (mFin.status !== 'paid') {
                    toAdd.push(m.index);
                }
            }
            setSelectedMonthIndices(prev => Array.from(new Set([...prev, ...toAdd])));
        } else {
            // Unselecting month: must also unselect all future months
            const toRemove: number[] = [];
            for (let i = relIdx; i < sessionMonths.length; i++) {
                toRemove.push(sessionMonths[i].index);
            }
            setSelectedMonthIndices(prev => prev.filter(i => !toRemove.includes(i)));
        }
    };

    const handleQuickPreset = (type: 'whole' | 'month' | 'yearly') => {
        if (type === 'month') {
            setSelectedMonthIndices([activeMonthIndex]);
        } else if (type === 'whole') {
            const allDueIndices = sessionMonths
                .filter(m => calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth).remainingDue > 0)
                .map(m => m.index);
            setSelectedMonthIndices(allDueIndices);
        } else if (type === 'yearly') {
            setSelectedMonthIndices(sessionMonths.map(m => m.index));
        }
    };

    const handleRevert = async (txnId: string) => {
        if (!revertReason.trim()) {
            toast.error('Please provide a reason for reverting this payment.');
            return;
        }
        setRevertingId(txnId);
        try {
            const result = await revertFeeTransaction(txnId, revertReason.trim());
            if (result.success) {
                toast.success(`Payment reverted successfully. ${result.count} record(s) removed.`);
                setRevertConfirmId(null);
                setRevertReason('');
                window.location.reload();
            } else {
                toast.error(result.error || 'Failed to revert payment');
            }
        } catch (err) {
            console.error('Revert error:', err);
            toast.error('An unexpected error occurred while reverting.');
        } finally {
            setRevertingId(null);
        }
    };

    const getOverlappingDaysInMonth = (monthIdx: number, startStr?: string, endStr?: string) => {
        const safeStart = (schoolDetails as any)?.sessionStartMonth || 4;
        const currentYear = new Date().getFullYear();
        // Simple year logic for session
        const year = (monthIdx < safeStart - 1) ? currentYear + 1 : currentYear;

        const monthStart = new Date(year, monthIdx, 1);
        const monthEnd = new Date(year, monthIdx + 1, 0);
        const totalDaysInMonth = monthEnd.getDate();

        if (!startStr && !endStr) return 30;

        const rangeStart = startStr ? new Date(startStr) : new Date(year - 5, 0, 1);
        const rangeEnd = endStr ? new Date(endStr) : new Date(year + 5, 0, 1);

        const intersectStart = new Date(Math.max(monthStart.getTime(), rangeStart.getTime()));
        const intersectEnd = new Date(Math.min(monthEnd.getTime(), rangeEnd.getTime()));

        if (intersectStart > intersectEnd) return 0;

        const diffTime = intersectEnd.getTime() - intersectStart.getTime();
        const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        return actualDays >= totalDaysInMonth ? 30 : actualDays;
    };

    const handleTransportDateChange = (monthIdx: number, type: 'start' | 'end', value: string) => {
        setTransportDates(prev => {
            const current = prev[monthIdx] || { start: '', end: '' };
            const nextDates = { ...current, [type]: value };
            
            // Calculate days if both days are present
            if (nextDates.start && nextDates.end) {
                const startDate = new Date(nextDates.start);
                const endDate = new Date(nextDates.end);
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    const diffTime = endDate.getTime() - startDate.getTime();
                    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                    setTransportDays(prevDays => ({ ...prevDays, [monthIdx]: diffDays }));
                }
            }
            
            return { ...prev, [monthIdx]: nextDates };
        });
    };

    const handlePayment = async () => {
        if (paymentSummary.immediatePayable <= 0) return;
        
        if (!paymentMode || paymentMode === 'none') {
            toast.error('Please select a payment mode to proceed.');
            return;
        }
        
        setIsSaving(true);
        try {
            const overallDiscountAmt = parseFloat(overallDiscount) || 0;
            const txns: any[] = [];
            let remainingOverallDiscount = overallDiscountAmt;
            let remainingPaymentAmount = parseFloat(paymentAmount);
            if (isNaN(remainingPaymentAmount) || remainingPaymentAmount < 0) remainingPaymentAmount = paymentSummary.immediatePayable;
            
            selectedMonthsData.forEach((m: any, mIdx: number) => {
                const selectedForMonth = selectedFeesByMonth[m.monthIndex] || [];
                
                m.feeDetails.forEach((fee: any) => {
                    if (!selectedForMonth.includes(fee.name)) return;
                    if (fee.netPayable <= 0 && fee.discount <= 0) return;

                    const discountToApply = Math.min(remainingOverallDiscount, fee.netPayable);
                    const netAmountAfterOverall = Math.max(0, fee.netPayable - discountToApply);
                    remainingOverallDiscount -= discountToApply;

                    const amountToPay = Math.min(remainingPaymentAmount, netAmountAfterOverall);
                    remainingPaymentAmount -= amountToPay;

                    if (amountToPay > 0 || fee.discount > 0 || discountToApply > 0) {
                        txns.push({
                            schoolId: student.schoolId,
                            studentId: student.id,
                            monthIndex: m.monthIndex,
                            year: new Date().getFullYear(),
                            amount: amountToPay,
                            discount: fee.discount,
                            fine: fee.fine || 0,
                            baseAmount: fee.baseAmount || 0,
                            feeName: fee.name,
                            overallDiscount: discountToApply,
                            date: new Date().toISOString(),
                            mode: paymentMode,
                            invoiceNo: receiptMode === 'custom' ? customReceiptNo : undefined,
                            remarks: paymentRemarks || `Payment for ${m.monthName}`,
                            collectedBy: currentUser?.name || 'System Admin'
                        });
                    }
                });
            });

            if (txns.length === 0) return;

            const result = await addFeeTransactionsBatch(txns);
            if (result.success) {
                toast.success(`Payment Successful! Invoice #${result.invoiceNo} generated.`);
                const txnsWithInvoice = (result.transactions || txns).map(t => ({
                    ...t,
                    invoiceNo: result.invoiceNo
                }));
                setActiveReceiptTxns(txnsWithInvoice as any);
                setIsReceiptModalOpen(true);
                setNeedsRefresh(true);
                setOverallDiscount('0');
                setPaymentRemarks('');
            } else {
                toast.error(result.error || 'Failed to save payment');
            }
        } catch (error) {
            console.error('Payment Error:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file.');
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = reader.result as string;
                const result = await updateStudent(student.id, { photo: base64Data });
                if (result.success) {
                    setStudentPhotoUrl(base64Data);
                    toast.success('Student profile photo updated successfully!');
                } else {
                    toast.error((result as any).error || 'Failed to update student photo.');
                }
                setIsUploadingPhoto(false);
            };
            reader.onerror = () => {
                toast.error('Failed to read image file.');
                setIsUploadingPhoto(false);
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            console.error('Photo upload error:', err);
            toast.error(err.message || 'An error occurred while uploading.');
            setIsUploadingPhoto(false);
        }
    };

    // --- RENDER HELPERS ---
    const getStatusBadge = (monthIdx: number) => {
        const fin = calculateMonthFinancials(student.id, monthIdx, applicableGroups, allTransactions, studentType, startMonth);

        // Also check transport due (not included in calculateMonthFinancials)
        let transportRemainingDue = 0;
        if (transportInfo && transportInfo.monthlyFee > 0) {
            const transportTxns = allTransactions.filter(t =>
                t.studentId === student.id &&
                t.monthIndex === monthIdx &&
                (t as any).feeName === 'Transport Fee'
            );
            const transportSettled = transportTxns.reduce((sum, t) => sum + t.amount + ((t as any).discount || 0) + ((t as any).overallDiscount || 0), 0);
            const daysUsed = transportDays[monthIdx] ?? 30;
            const adjustedFee = (transportInfo.monthlyFee / 30) * daysUsed;
            transportRemainingDue = Math.max(0, adjustedFee - transportSettled);
        }

        const effectiveStatus = fin.status === 'paid' && transportRemainingDue >= 1
            ? 'partial'
            : fin.status;

        if (effectiveStatus === 'paid') return <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600 group-hover:text-emerald-700">Paid</span>;
        if (effectiveStatus === 'partial') return <span className="text-[9px] font-black uppercase tracking-tighter text-amber-600 group-hover:text-amber-700">Partial</span>;
        if (effectiveStatus === 'no_fees') return null;
        return <span className="text-[9px] font-black uppercase tracking-tighter text-rose-600 group-hover:text-rose-700">Due</span>;
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
            
            {/* MAIN CONTENT AREA */}
            <div className="space-y-6">
                {/* 1. Header & Student Info */}
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 font-urbanist tracking-tight">Collect Fees</h1>
                    </div>
                </div>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                            <div className="relative">
                                <div className="h-20 w-20 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-400 overflow-hidden relative shadow-inner">
                                    {studentPhotoUrl ? (
                                        <img src={studentPhotoUrl} alt={student.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <UserCircle size={48} strokeWidth={1.5} />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-4 border-white z-10"></div>
                            </div>
                            
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">{student.name}</h2>
                                    <Badge variant="outline" className="w-fit mx-auto md:mx-0 text-[10px] font-bold border-slate-200 text-slate-500">ID: {student.admissionNumber}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-1 text-sm font-medium text-slate-500">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-400" /> CLASS: <b className="text-slate-700">{student.className}</b></span>
                                    <span className="flex items-center gap-1.5"><ArrowRightCircle size={14} className="text-indigo-400" /> SECTION: <b className="text-slate-700">{student.section || 'N/A'}</b></span>
                                    <span className="flex items-center gap-1.5"><Wallet size={14} className="text-indigo-400" /> ADM: <b className="text-slate-700">{student.admissionNumber}</b></span>
                                </div>
                            </div>

                            <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-50 border-slate-200" onClick={() => window.location.href='/school-admin/fees/collect'}>
                                Change Student
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Month Selector Grid */}
                <div className="bg-slate-50 p-1.5 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-1">
                        {sessionMonths.map((m) => {
                            const isActive = activeMonthIndex === m.index;
                            const isSelected = selectedMonthIndices.includes(m.index);
                            return (
                                <div
                                    key={m.index}
                                    onClick={() => setActiveMonthIndex(m.index)}
                                    className={`relative py-2 px-1 rounded-2xl flex flex-col items-center gap-0.5 transition-all duration-300 border-2 cursor-pointer ${
                                        isActive 
                                        ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 shadow-md shadow-indigo-100/40 scale-105 z-10' 
                                        : (() => {
                                            const fin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
                                            let transportRem = 0;
                                            if (transportInfo && transportInfo.monthlyFee > 0) {
                                                const tTxns = allTransactions.filter(t => t.studentId === student.id && t.monthIndex === m.index && (t as any).feeName === 'Transport Fee');
                                                const tSettled = tTxns.reduce((s, t) => s + t.amount + ((t as any).discount || 0) + ((t as any).overallDiscount || 0), 0);
                                                const daysUsed = transportDays[m.index] ?? 30;
                                                transportRem = Math.max(0, (transportInfo.monthlyFee / 30) * daysUsed - tSettled);
                                            }
                                            const effStatus = fin.status === 'paid' && transportRem >= 1 ? 'partial' : fin.status;
                                            if (effStatus === 'paid') return 'bg-emerald-100 border-emerald-200 text-emerald-800';
                                            if (effStatus === 'partial') return 'bg-amber-100 border-amber-200 text-amber-800';
                                            if (isSelected) return 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm';
                                            return 'bg-white border-transparent text-slate-600 hover:bg-slate-50';
                                        })()
                                    }`}
                                >
                                    <div className="absolute top-1 right-1 z-20">
                                        {(() => {
                                            const fin = calculateMonthFinancials(student.id, m.index, applicableGroups, allTransactions, studentType, startMonth);
                                            if (fin.status === 'paid') return null;
                                            return (
                                                <Checkbox 
                                                    checked={isSelected} 
                                                    onCheckedChange={() => toggleMonthSelection(m.index)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-full"
                                                />
                                            );
                                        })()}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-indigo-600' : 'text-current'}`}>{m.name}</span>
                                    {getStatusBadge(m.index)}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Sub-Tabs (Fees / History) */}
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl h-14">
                        <TabsTrigger value="fees" className="rounded-xl font-bold text-sm uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                            Fees Breakdown
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-xl font-bold text-sm uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm flex items-center gap-2">
                            Payment History <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold">₹{allTransactions.filter(t => t.studentId === student.id).reduce((s, t) => s + t.amount, 0)}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        {activeTab === 'fees' ? (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-4 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                            <Calculator size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Payment Breakdown</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMonthIndices.length} Months Selected</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Due</div>
                                            <div className="text-sm font-black text-slate-800">₹{combinedSummary.totalDue.toFixed(2)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600">Total Paid</div>
                                            <div className="text-sm font-black text-emerald-600">₹{(combinedSummary.totalPaid + combinedSummary.totalDiscount).toFixed(2)}</div>
                                        </div>
                                        <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-indigo-600">Net Payable</div>
                                            <div className={`text-sm font-black ${combinedSummary.remainingDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{combinedSummary.remainingDue.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="py-4 px-4 w-10 text-left">
                                                            <Checkbox 
                                                                className="border-slate-300 rounded-md h-5 w-5"
                                                                onClick={(e) => e.stopPropagation()}
                                                                checked={selectedMonthsData.length > 0 && selectedMonthsData.every((m: any) => m.feeDetails.every((f: any) => f.isFullyPaid || selectedFeesByMonth[m.monthIndex]?.includes(f.name)))}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        const newSelected: Record<number, string[]> = {};
                                                                        selectedMonthsData.forEach((m: any) => {
                                                                            newSelected[m.monthIndex] = m.feeDetails.map((f: any) => f.name);
                                                                        });
                                                                        setSelectedFeesByMonth(newSelected);
                                                                    } else {
                                                                        setSelectedFeesByMonth({});
                                                                    }
                                                                }}
                                                            />
                                                        </th>
                                                        <th className="text-left py-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Fees Description</th>
                                                        <th className="text-right py-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Amount</th>
                                                        <th className="text-right py-4 px-2 text-[10px] font-bold text-rose-400 uppercase tracking-tight">Fine</th>
                                                        <th className="text-right py-4 px-2 text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Disc.</th>
                                                        <th className="text-right py-4 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total</th>
                                                        <th className="text-right py-4 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Paid</th>
                                                        <th className="text-right py-4 px-4 text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Net Payable</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {selectedMonthsData.map((month: any) => (
                                                        <React.Fragment key={month.monthIndex}>
                                                            <tr className="bg-indigo-50/30">
                                                                <td colSpan={8} className="py-2 px-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest border-y border-indigo-100/50">
                                                                    {month.monthName}
                                                                </td>
                                                            </tr>
                                                            {month.feeDetails.map((fee: any, idx: number) => (
                                                                <tr key={`${month.monthIndex}-${idx}`} className={`group transition-colors ${fee.isTransport ? 'bg-sky-50/40 hover:bg-sky-50/60' : fee.netPayable > 0 ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                                                                    <td className="py-4 px-4 text-left">
                                                                        <Checkbox 
                                                                            checked={selectedFeesByMonth[month.monthIndex]?.includes(fee.name) || fee.isFullyPaid}
                                                                            disabled={fee.isFullyPaid}
                                                                            onCheckedChange={(checked) => {
                                                                                setSelectedFeesByMonth(prev => {
                                                                                    const current = prev[month.monthIndex] || [];
                                                                                    if (checked) return { ...prev, [month.monthIndex]: [...current, fee.name] };
                                                                                    return { ...prev, [month.monthIndex]: current.filter((n: string) => n !== fee.name) };
                                                                                });
                                                                            }}
                                                                            className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md h-5 w-5"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </td>
                                                                    <td className="py-4 px-2 text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="font-bold text-slate-700">{fee.name}</div>
                                                                            {fee.isFullyPaid ? (
                                                                                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black py-0 px-1.5 uppercase tracking-tighter">PAID</Badge>
                                                                            ) : fee.paidAlready > 0 ? (
                                                                                <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] font-black py-0 px-1.5 uppercase tracking-tighter">PARTIAL</Badge>
                                                                            ) : (
                                                                                <Badge className="bg-rose-50 text-rose-600 border-none text-[8px] font-black py-0 px-1.5 uppercase tracking-tighter">DUE</Badge>
                                                                            )}
                                                                            {fee.isTransport && (
                                                                                <Badge className="bg-sky-50 text-sky-600 border-sky-100 border text-[8px] font-black py-0 px-1.5 uppercase tracking-tighter">🚌 BUS</Badge>
                                                                            )}
                                                                        </div>
                                                                            {fee.isTransport && (
                                                                                <div className="mt-2 p-1.5 bg-sky-50/40 rounded-xl border border-sky-100/50 w-fit">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest ml-1">Days Used:</span>
                                                                                        <div className="px-2 py-0.5 bg-white border border-sky-200 rounded text-[10px] font-bold text-sky-700">
                                                                                            {transportDays[month.monthIndex] ?? 30}
                                                                                        </div>
                                                                                        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-tighter">Days</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                                                                            TYPE: {fee.type}
                                                                            {fee.isTransport && fee.transportStopName && (
                                                                                <span className="ml-2 text-sky-500">· {fee.transportRouteName} → {fee.transportStopName}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-2 text-right font-bold text-slate-600 text-xs">₹{fee.baseAmount.toFixed(0)}</td>
                                                                    <td className="py-4 px-2 text-right font-bold text-rose-500 text-xs">₹{fee.fine.toFixed(0)}</td>
                                                                    <td className="py-4 px-2 text-right font-bold text-emerald-500">
                                                                        <div className="flex flex-col items-end">
                                                                            {fee.isTransport ? (
                                                                                <span className="w-20 text-right text-xs text-slate-400 italic">N/A</span>
                                                                            ) : (
                                                                                <>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={manualDiscounts[`${month.monthIndex}_${fee.name}`] ?? fee.standardDiscount}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                                                            setManualDiscounts(prev => ({
                                                                                                ...prev,
                                                                                                [`${month.monthIndex}_${fee.name}`]: val
                                                                                            }));
                                                                                        }}
                                                                                        onBlur={(e) => {
                                                                                            const val = parseFloat(e.target.value) || 0;
                                                                                            if (val < fee.standardDiscount) {
                                                                                                setManualDiscounts(prev => ({
                                                                                                    ...prev,
                                                                                                    [`${month.monthIndex}_${fee.name}`]: fee.standardDiscount
                                                                                                }));
                                                                                            }
                                                                                        }}
                                                                                        className="w-20 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-emerald-500 outline-none transition-all duration-200"
                                                                                    />
                                                                                    {fee.discount > fee.standardDiscount && (
                                                                                        <span className="text-[8px] uppercase tracking-tighter text-emerald-400 mt-1 animate-pulse">Manual Extra</span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    <td className="py-4 px-3 text-right font-bold text-slate-800 text-xs">₹{fee.totalDue.toFixed(0)}</td>
                                                                    <td className="py-4 px-3 text-right font-bold text-emerald-600 text-xs">₹{fee.paidAlready.toFixed(0)}</td>
                                                                    <td className="py-4 px-4 text-right">
                                                                        <span className="inline-block py-1 px-2 bg-indigo-50 text-indigo-700 rounded-lg font-black text-xs">₹{fee.netPayable.toFixed(0)}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                    {selectedMonthsData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={8} className="py-20 text-center">
                                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                                    <AlertCircle size={40} strokeWidth={1} />
                                                                    <p className="font-bold text-sm uppercase tracking-widest">No months selected</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="w-12 py-4 px-6 text-center">
                                            <Checkbox 
                                                checked={historyGroups.length > 0 && selectedHistoryInvoices.length === historyGroups.length}
                                                onCheckedChange={(checked) => handleToggleAllHistory(!!checked)}
                                            />
                                        </th>
                                        <th className="text-left py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="text-left py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Receipt / Invoice</th>
                                        <th className="text-left py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Month</th>
                                        <th className="text-left py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mode</th>
                                        <th className="text-right py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-indigo-600">Amount</th>
                                        <th className="py-4 px-6 text-right">
                                            {selectedHistoryInvoices.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    onClick={handlePrintBulkInvoices}
                                                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-100 active:scale-[0.98] transition-all"
                                                >
                                                    <Printer size={12} className="mr-1.5" /> Print Selected ({selectedHistoryInvoices.length})
                                                </Button>
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {historyGroups.map((txnGroup, i) => {
                                        const firstTxn = txnGroup[0];
                                        const totalAmt = txnGroup.reduce((sum, t) => sum + t.amount, 0);
                                        const key = firstTxn.invoiceNo || firstTxn.id;
                                        
                                        // Get unique month names in this group
                                        const monthNames = Array.from(new Set(
                                            txnGroup.map(t => sessionMonths.find(m => m.index === t.monthIndex)?.name || 'N/A')
                                        ));

                                        const isSelected = selectedHistoryInvoices.includes(key);

                                        return (
                                            <tr key={i} className={cn("group hover:bg-slate-50 transition-colors", isSelected && "bg-indigo-50/20")}>
                                                <td className="py-4 px-6 w-12 text-center">
                                                    <Checkbox 
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => handleToggleOneHistory(key, !!checked)}
                                                    />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-700">{new Date(firstTxn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(firstTxn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-600 uppercase tracking-tight">#{firstTxn.invoiceNo || firstTxn.id.substring(0, 8)}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-wrap gap-1">
                                                        {monthNames.map((name, idx) => (
                                                            <Badge key={idx} variant="outline" className="bg-slate-50 border-slate-100 text-[10px] font-bold text-slate-500">{name}</Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-block py-1 px-3 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{firstTxn.mode}</span>
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-slate-800 text-sm">₹{totalAmt.toFixed(2)}</td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                            onClick={() => { setActiveReceiptTxns(txnGroup); setIsReceiptModalOpen(true); }}
                                                        >
                                                            Receipt
                                                        </Button>
                                                        {revertConfirmId === firstTxn.id ? (
                                                            <div className="flex flex-col gap-2 items-end bg-rose-50 border border-rose-200 rounded-2xl p-3 min-w-[220px] shadow-lg z-10">
                                                                <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider w-full">Reason for reverting:</p>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="e.g. Wrong amount entered"
                                                                    value={revertReason}
                                                                    onChange={e => setRevertReason(e.target.value)}
                                                                    className="w-full text-xs px-3 py-2 rounded-xl border border-rose-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                                                                />
                                                                <div className="flex gap-2 w-full">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="flex-1 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100"
                                                                        onClick={() => { setRevertConfirmId(null); setRevertReason(''); }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 rounded-xl text-[10px] font-black uppercase bg-rose-600 hover:bg-rose-700 text-white"
                                                                        disabled={revertingId === firstTxn.id || !revertReason.trim()}
                                                                        onClick={() => handleRevert(firstTxn.id)}
                                                                    >
                                                                        {revertingId === firstTxn.id ? 'Reverting...' : 'Confirm'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                                onClick={() => { setRevertConfirmId(firstTxn.id); setRevertReason(''); }}
                                                            >
                                                                <RotateCcw size={13} className="mr-1" />
                                                                Revert
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {historyGroups.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-medium italic">No payment history found for this student.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                </Tabs>
            </div>

            {/* PAYMENT SIDEBAR */}
            <div className="space-y-6">
                <Card className="border-none shadow-xl bg-white rounded-[32px] overflow-hidden sticky top-8">
                    <div className="bg-emerald-50 p-5 text-slate-900 rounded-t-[32px] border-b border-emerald-100">
                        <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-2">
                                <div className="h-6 w-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <CreditCard size={12} className="text-white" />
                                </div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-800/60">Payment Summary</h3>
                             </div>
                             <div className="px-2 py-0.5 bg-indigo-600 rounded-full text-[9px] font-black text-white shadow-sm">
                                Bal: ₹{paymentSummary.totalOutstanding.toFixed(0)}
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                             <div className="bg-white/80 border border-emerald-100 p-2.5 rounded-2xl shadow-sm">
                                 <div className="text-[9px] font-bold uppercase text-emerald-800/40 tracking-wider mb-0.5">Selected</div>
                                 <div className="text-sm font-black text-emerald-900">₹{paymentSummary.selected.toFixed(0)}</div>
                             </div>
                             <div className="bg-white/80 border border-emerald-100 p-2.5 rounded-2xl shadow-sm">
                                 <div className="text-[9px] font-bold uppercase text-emerald-800/40 tracking-wider mb-0.5">Backlog</div>
                                 <div className="text-sm font-black text-rose-600">₹{paymentSummary.backlog.toFixed(0)}</div>
                             </div>
                        </div>

                        <div className="flex justify-between items-center bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-500">
                             <div>
                                 <div className="text-[9px] font-black uppercase text-indigo-100 tracking-widest mb-0.5">Immediate Payable</div>
                                 <div className="text-2xl font-black text-white leading-none">₹{paymentSummary.immediatePayable.toFixed(0)}</div>
                             </div>
                             <div className="text-right">
                                 <div className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">Over All Discount</div>
                                 <div className="text-sm font-black text-cyan-300">-₹{paymentSummary.totalDiscount.toFixed(0)}</div>
                             </div>
                        </div>
                    </div>

                    <CardContent className="p-5 space-y-4 bg-white">
                        {/* Receipt Inputs */}
                        <div className="grid grid-cols-[1fr_120px] gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center h-4">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">Receipt No.</Label>
                                </div>
                                <div className="relative mt-1.5">
                                    <Input 
                                        placeholder={receiptMode === 'auto' ? "Auto-Generated" : "Enter No..."} 
                                        value={receiptMode === 'auto' 
                                            ? (invoiceSettings?.autoGenerate 
                                                ? `${invoiceSettings.prefix}${Math.max(invoiceSettings.startFrom, invoiceSettings.currentSequence + 1).toString().padStart(invoiceSettings.padding, '0')}`
                                                : "AUTO") 
                                            : customReceiptNo} 
                                        onChange={e => setCustomReceiptNo(e.target.value)} 
                                        disabled={receiptMode === 'auto'}
                                        className={cn(
                                            "h-11 rounded-2xl text-xs font-black transition-all border border-slate-200",
                                            receiptMode === 'auto' 
                                                ? "bg-slate-50 text-indigo-600/70 border-dashed border-indigo-200/50 cursor-not-allowed select-none font-bold" 
                                                : "bg-white text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        )} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center h-4">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">Mode</Label>
                                </div>
                                <div className="flex p-1 bg-slate-100 rounded-2xl h-11 border border-slate-200/60 shadow-inner mt-1.5">
                                    <button 
                                        type="button"
                                        className={`flex-1 rounded-xl text-[9px] font-black transition-all ${receiptMode === 'auto' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setReceiptMode('auto')}
                                    >
                                        AUTO
                                    </button>
                                    <button 
                                        type="button"
                                        className={`flex-1 rounded-xl text-[9px] font-black transition-all ${receiptMode === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setReceiptMode('custom')}
                                    >
                                        EDIT
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                            {/* Discount Override */}
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center justify-between h-4">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">Over All Discount</Label>
                                    {!isAllFeesSelected && selectedMonthIndices.length > 0 && (
                                        <Badge className="h-3.5 px-1 bg-amber-50 text-[7px] font-black text-amber-600 border border-amber-200/50 uppercase rounded-md shadow-none">Full Only</Badge>
                                    )}
                                </div>
                                <div className="relative mt-1.5">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">₹</span>
                                    <Input 
                                        value={overallDiscount} 
                                        onChange={e => setOverallDiscount(e.target.value)} 
                                        disabled={!isAllFeesSelected}
                                        className={cn(
                                            "pl-8 h-11 rounded-2xl text-xs font-black transition-all border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
                                            isAllFeesSelected ? "bg-white text-slate-700 shadow-sm" : "bg-slate-50 text-slate-300 opacity-50 cursor-not-allowed"
                                        )} 
                                    />
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center justify-between h-4">
                                    <Label className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.12em]">Paying</Label>
                                </div>
                                <div className="relative mt-1.5">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-bold text-xs select-none">₹</span>
                                    <Input 
                                        placeholder="0" 
                                        value={paymentAmount} 
                                        onChange={e => setPaymentAmount(e.target.value)} 
                                        className="pl-8 h-11 rounded-2xl bg-white border border-indigo-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-xs font-black text-indigo-700 transition-all shadow-sm" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Mode & Presets (Side-by-side grid) */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            {/* Payment Mode Select */}
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center h-4">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">Payment Mode</Label>
                                </div>
                                <div className="relative mt-1.5">
                                    <Select value={paymentMode || "none"} onValueChange={(val) => setPaymentMode(val === 'none' ? '' : val)}>
                                        <SelectTrigger className="w-full h-11 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all focus:ring-2 focus:ring-indigo-500">
                                            <SelectValue placeholder="Select Mode" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-150">
                                            <SelectItem value="none" className="font-medium text-slate-400 italic text-xs rounded-xl">Select Payment Mode</SelectItem>
                                            {(invoiceSettings?.paymentMethods || ['Cash', 'Online', 'Check']).map((m: string) => (
                                                <SelectItem key={m} value={m} className="text-xs font-black uppercase text-slate-700 rounded-xl">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Presets Selector */}
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <div className="flex items-center h-4">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">Presets</Label>
                                </div>
                                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl h-11 border border-slate-200/60 shadow-inner mt-1.5">
                                    <button 
                                        type="button"
                                        onClick={() => handleQuickPreset('month')} 
                                        className="rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-white transition-all duration-200 active:scale-95 flex items-center justify-center"
                                    >
                                        Month
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleQuickPreset('whole')} 
                                        className="rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-white transition-all duration-200 active:scale-95 flex items-center justify-center"
                                    >
                                        Whole
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleQuickPreset('yearly')} 
                                        className="rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-white transition-all duration-200 active:scale-95 flex items-center justify-center"
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Note Input */}
                        <div className="space-y-1.5 mt-4">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Note</Label>
                            <Input 
                                placeholder="Add custom payment remarks..." 
                                value={paymentRemarks} 
                                onChange={e => setPaymentRemarks(e.target.value)} 
                                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-700 transition-all shadow-sm focus:border-indigo-600 focus:bg-white"
                            />
                        </div>

                        <Button 
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all uppercase tracking-[0.2em] mt-4"
                            onClick={handlePayment}
                            disabled={isSaving || paymentSummary.immediatePayable <= 0}
                        >
                            {isSaving ? 'Processing...' : 'Pay & Print'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* RECEIPT MODAL */}
            {isReceiptModalOpen && activeReceiptTxns && (
                <FeeReceiptModal 
                    onClose={() => {
                        setIsReceiptModalOpen(false);
                        if (needsRefresh) {
                            window.location.reload();
                        }
                    }}
                    student={student}
                    schoolDetails={schoolDetails}
                    transactions={activeReceiptTxns}
                    allTransactions={allTransactions}
                    feeGroups={allGroups}
                    studentTransportInfo={transportInfo}
                />
            )}
        </div>
    );
}
