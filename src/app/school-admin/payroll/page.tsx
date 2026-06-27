'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Calculator,
    Banknote,
    Download,
    Search,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Printer,
    CheckCircle2,
    Check,
    Clock,
    HandCoins,
    ReceiptText,
    ChevronDown,
    Plus,
    Pencil,
    Trash2,
    Save,
    Play,
    Info,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    getStaffProfiles,
    getUsers,
    getSchool,
    updateSchool,
    addLoan,
    repayLoan,
    settleLoan,
    updateReimbursements,
    updateSchoolConfig,
    updatePayslipStatus,
    updateStaffProfile
} from '@/app/actions';
import { CalculationMode, StaffProfile } from '@/types/staff';
import { School, User } from '@/types';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/lib/utils';

// Import New Components
import LoanModal from '@/components/payroll/loan-modal';
import ReimbursementModal from '@/components/payroll/reimbursement-modal';
import PayslipModal from '@/components/payroll/payslip-modal';
import SettingsSection from '@/components/payroll/settings-section';

export default function PayrollPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [staff, setStaff] = useState<(StaffProfile & { user: User })[]>([]);
    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);
    const [overrides, setOverrides] = useState<Record<string, any>>({});
    const [currency, setCurrency] = useState<string>('₹');
    const [mounted, setMounted] = useState(false);

    // View State
    const [view, setView] = useState<'LEDGER' | 'SETTINGS'>('LEDGER');
    const [pendingStaffUpdates, setPendingStaffUpdates] = useState<Record<string, Partial<StaffProfile>>>({});
    const [pendingSchoolUpdates, setPendingSchoolUpdates] = useState<Partial<School> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [bulkMode, setBulkMode] = useState<string>('None');
    const [activeModal, setActiveModal] = useState<{
        type: 'LOAN' | 'REIMBURSEMENT' | 'PAYSLIP';
        staff: (StaffProfile & { user: User });
    } | null>(null);
    
    // Select Month State (defaulting to previous month for standard payroll cutoff)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1); // Default to previous month
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const maxMonth = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const monthStats = useMemo(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr) || new Date().getFullYear();
        const month = isNaN(parseInt(monthStr)) ? new Date().getMonth() : parseInt(monthStr) - 1; // 0-indexed

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let workingDays = 26; // Default
        const config = school?.payrollConfig;

        if (config) {
            if (config.mode === CalculationMode.FIXED_DAYS) {
                workingDays = config.fixedValue;
            } else if (config.mode === CalculationMode.CALENDAR_DAYS || (config.mode as string) === 'CALENDAR_INCLUDE_ALL_DAYS') {
                workingDays = daysInMonth;
            } else if (config.mode === CalculationMode.CALENDAR_EXCLUDE_SUNDAY) {
                workingDays = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(year, month, d);
                    if (date.getDay() !== 0) workingDays++;
                }
            }
        }

        const dateObj = new Date(year, month, 1);
        return {
            workingDays,
            monthName: dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            monthYear: selectedMonth
        };
    }, [school, selectedMonth]);

    useEffect(() => {
        setMounted(true);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                loadData(user.schoolId);
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const handleModeChange = (staffId: string, mode: string) => {
        setPendingStaffUpdates(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || {}),
                paymentMode: mode as any
            }
        }));
        setStaff(prev => prev.map(s => s.id === staffId ? { ...s, paymentMode: mode as any } : s));
    };

    const handleAddMode = () => {
        const newMode = window.prompt('Enter new Payment Mode (e.g., Mobile Money):');
        if (!newMode || !school) return;

        const currentModes = school.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque'];
        if (currentModes.includes(newMode)) {
            toast.error('Mode already exists');
            return;
        }

        const updatedModes = [...currentModes, newMode];

        // Update Local State
        const updatedConfig = {
            ...school.payrollConfig,
            paymentModes: updatedModes,
            mode: school.payrollConfig?.mode || CalculationMode.CALENDAR_DAYS,
            fixedValue: school.payrollConfig?.fixedValue || 26
        };

        setSchool({ ...school, payrollConfig: updatedConfig } as any);
        setPendingSchoolUpdates(prev => ({
            ...prev,
            payrollConfig: updatedConfig
        }));
        setBulkMode(newMode);
        toast.info('New mode added (Unsaved)');
    };

    const handleEditMode = () => {
        const currentModes = school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque'];
        if (bulkMode === 'None' || !school) {
            toast.error('Cannot edit standard "None" mode');
            return;
        }

        const newName = window.prompt(`Rename "${bulkMode}" to:`, bulkMode);
        if (!newName || newName === bulkMode) return;

        const updatedModes = currentModes.map(m => m === bulkMode ? newName : m);

        // Update Local State
        const updatedConfig = {
            ...school.payrollConfig,
            paymentModes: updatedModes,
            mode: school.payrollConfig?.mode || CalculationMode.CALENDAR_DAYS,
            fixedValue: school.payrollConfig?.fixedValue || 26
        };

        // Update affected staff in pending state
        const affectedStaff = staff.filter(s => s.paymentMode === bulkMode);
        if (affectedStaff.length > 0) {
            const newPendingStaff = { ...pendingStaffUpdates };
            affectedStaff.forEach(s => {
                newPendingStaff[s.id] = { ...newPendingStaff[s.id], paymentMode: newName as any };
            });
            setPendingStaffUpdates(newPendingStaff);
            setStaff(prev => prev.map(s => s.paymentMode === bulkMode ? { ...s, paymentMode: newName as any } : s));
        }

        setSchool({ ...school, payrollConfig: updatedConfig } as any);
        setPendingSchoolUpdates(prev => ({
            ...prev,
            payrollConfig: updatedConfig
        }));
        setBulkMode(newName);
        toast.info('Mode renamed (Unsaved)');
    };

    const handleDeleteMode = () => {
        const currentModes = school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque'];
        if (bulkMode === 'None' || !school) {
            toast.error('Cannot delete "None" mode');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${bulkMode}"? Affected staff will be reset to "None".`)) return;

        const updatedModes = currentModes.filter(m => m !== bulkMode);

        // Update Local State
        const updatedConfig = {
            ...school.payrollConfig,
            paymentModes: updatedModes,
            mode: school.payrollConfig?.mode || CalculationMode.CALENDAR_DAYS,
            fixedValue: school.payrollConfig?.fixedValue || 26
        };

        // Reset affected staff to "None" locally
        const affectedStaff = staff.filter(s => s.paymentMode === bulkMode);
        if (affectedStaff.length > 0) {
            const newPendingStaff = { ...pendingStaffUpdates };
            affectedStaff.forEach(s => {
                newPendingStaff[s.id] = { ...newPendingStaff[s.id], paymentMode: 'None' };
            });
            setPendingStaffUpdates(newPendingStaff);
            setStaff(prev => prev.map(s => s.paymentMode === bulkMode ? { ...s, paymentMode: 'None' as any } : s));
        }

        setSchool({ ...school, payrollConfig: updatedConfig } as any);
        setPendingSchoolUpdates(prev => ({
            ...prev,
            payrollConfig: updatedConfig
        }));
        setBulkMode('None');
        toast.info('Mode deleted (Unsaved)');
    };

    const handleBulkModeUpdate = () => {
        if (!staff.length) return;
        const updates: Record<string, Partial<StaffProfile>> = {};
        staff.forEach(s => {
            updates[s.id] = {
                ...(pendingStaffUpdates[s.id] || {}),
                paymentMode: bulkMode as any
            };
        });
        setPendingStaffUpdates(prev => ({ ...prev, ...updates }));
        setStaff(prev => prev.map(s => ({ ...s, paymentMode: bulkMode as any })));
        toast.info(`Set all modes to ${bulkMode} (unsaved)`);
    };

    const loadData = async (schId: string) => {
        setLoading(true);
        try {
            const [profiles, users, sch] = await Promise.all([
                getStaffProfiles(schId),
                getUsers({ schoolId: schId }),
                getSchool(schId)
            ]);

            if (sch) {
                setSchool(sch);
                setCurrency(getCurrencySymbol(sch.currency));
            }

            const merged = (profiles as StaffProfile[]).map(p => ({
                ...p,
                user: users.find((u: User) => u.id === p.userId) as User
            }));

            setStaff(merged);

            // Initialize overrides from persisted data
            const initialOverrides: Record<string, any> = {};
            merged.forEach(p => {
                if (p.lastMonthAbsents !== undefined || p.salary !== undefined) {
                    initialOverrides[p.id] = {
                        basic: p.salary,
                        absents: p.lastMonthAbsents
                    };
                }
            });
            setOverrides(initialOverrides);
        } catch (error) {
            toast.error('Failed to load payroll database');
        }
        setLoading(false);
    };

    if (!mounted) return null;

    const handleOverride = (staffId: string, field: string, value: string) => {
        const numValue = value === '' ? undefined : parseFloat(value);
        setOverrides(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || {}),
                [field]: numValue
            }
        }));

        setPendingStaffUpdates(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || {}),
                // Map local overrides to StaffProfile attributes for persistence
                ...(field === 'basic' ? { salary: numValue } : {}),
                ...(field === 'absents' ? { lastMonthAbsents: numValue } : {}) // Note: We might need a proper place for absents in StaffProfile
            }
        }));
    };

    const calculateRow = (item: StaffProfile) => {
        const ov = overrides[item.id] || {};

        const basic = ov.basic ?? item.salary;
        const hra = ov.hra ?? (item.allowances?.find(a => a.label.toUpperCase() === 'HRA')?.amount || 0);
        const da = ov.da ?? (item.allowances?.find(a => a.label.toUpperCase() === 'DA')?.amount || 0);
        const conv = ov.conveyance ?? (item.allowances?.find(a => a.label.toUpperCase() === 'CONVEYANCE')?.amount || 0);
        const otherProfileAllowances = item.allowances?.filter(a => !['HRA', 'DA', 'CONVEYANCE'].includes(a.label.toUpperCase())).reduce((sum, a) => sum + a.amount, 0) || 0;

        const absents = ov.absents ?? 0;
        const fixedGross = basic + hra + da + conv + otherProfileAllowances;

        const dailyRate = fixedGross / monthStats.workingDays;
        const lossOfPay = absents * dailyRate;

        const otEarnings = (ov.otHours ?? 0) * (item.overtimeRate || 0);
        const reimbursementTotal = item.reimbursements?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const otherPlus = ov.otherEarnings ?? 0;

        const pf = ov.pf ?? (item.isPfEnabled ? (basic * (item.pfRate || 0)) / 100 : 0);
        const esi = ov.esi ?? (item.isEsiEnabled ? (basic * (item.esiRate || 0)) / 100 : 0);
        const pt = ov.profTax ?? (item.customDeductions?.find(d => d.label.toUpperCase().includes('PROF'))?.amount || 0);
        const otherProfileDeductions = item.customDeductions?.filter(d => !d.label.toUpperCase().includes('PROF')).reduce((sum, d) => sum + d.amount, 0) || 0;
        const loanEMI = item.loans?.reduce((acc, l) => l.remainingAmount > 0 ? acc + l.emi : acc, 0) || 0;
        const otherMinus = ov.otherDeductions ?? 0;

        const totalDeductions = Math.round(pf + esi + pt + otherProfileDeductions + loanEMI + otherMinus);

        // Arrears Calculation from previous unpaid months
        let arrears = 0;
        if (item.payslipStatus) {
            Object.entries(item.payslipStatus).forEach(([mYear, status]) => {
                if (mYear < monthStats.monthYear && status === 'Unpaid') {
                    const pastBasic = item.salary;
                    const pastAllowances = item.allowances?.reduce((sum, a) => sum + a.amount, 0) || 0;
                    const pastDeductions = (item.isPfEnabled ? (pastBasic * (item.pfRate || 0)) / 100 : 0) + 
                                           (item.isEsiEnabled ? (pastBasic * (item.esiRate || 0)) / 100 : 0) + 
                                           (item.customDeductions?.reduce((sum, d) => sum + d.amount, 0) || 0);
                    const pastNet = Math.max(0, pastBasic + pastAllowances - pastDeductions);
                    arrears += pastNet;
                }
            });
        }

        const grossSalary = fixedGross + otEarnings + reimbursementTotal + otherPlus + arrears - lossOfPay;
        const roundedGross = Math.round(grossSalary);
        const netSalary = roundedGross - totalDeductions;

        return {
            basic, hra, da, conv, grossSalary: roundedGross, pf, esi, pt, totalDeductions, netSalary,
            otEarnings, reimbursementTotal, lossOfPay, loanEMI, absents, arrears,
            monthlyWorkingDays: monthStats.workingDays,
            daysPresent: monthStats.workingDays - absents,
            pfDeduction: pf, esiDeduction: esi,
            totalAllowances: hra + da + conv + otherProfileAllowances,
            totalCustomDeductions: pt + otherProfileDeductions
        };
    };

    const filteredStaff = staff.filter(s => {
        const matchesSearch = s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (s.joiningDate) {
            try {
                const joinDate = new Date(s.joiningDate);
                const [selYear, selMonthStr] = selectedMonth.split('-');
                const selYearNum = parseInt(selYear);
                const selMonthNum = parseInt(selMonthStr);
                const cutoffDate = new Date(selYearNum, selMonthNum, 1);
                if (joinDate >= cutoffDate) {
                    return false;
                }
            } catch (e) {
                // Default to showing if parsing fails
            }
        }
        return true;
    });

    const handleUpdateSchool = (updates: Partial<School>) => {
        setPendingSchoolUpdates(prev => ({
            ...(prev || {}),
            ...updates
        }));
        if (school) setSchool({ ...school, ...updates });
        toast.info('Settings changed (unsaved)');
    };

    const handleLoanAction = async (type: 'add' | 'repay' | 'settle', staffId: string, data: any) => {
        try {
            let res;
            if (type === 'add') res = await addLoan(staffId, data);
            else if (type === 'repay') res = await repayLoan(staffId, data.loanId, data.amount);
            else if (type === 'settle') res = await settleLoan(staffId, data);

            if (res && res.success) {
                toast.success(type === 'add' ? 'Loan added' : 'Repayment processed');
                if (school) loadData(school.id);
            }
            return res;
        } catch (e) {
            toast.error('Action failed');
        }
    };

    const handleReimbursementUpdate = (staffId: string, reimbursements: any) => {
        setPendingStaffUpdates(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || {}),
                reimbursements
            }
        }));
        setStaff(prev => prev.map(s => s.id === staffId ? { ...s, reimbursements } : s));
        toast.info('Reimbursements updated (unsaved)');
        return { success: true };
    };

    const saveAllChanges = async () => {
        if (!school) return;
        setIsSaving(true);
        const toastId = toast.loading('Saving payroll changes...');

        try {
            const promises = [];

            // Save School Updates
            if (pendingSchoolUpdates?.payrollConfig) {
                promises.push(updateSchoolConfig(school.id, pendingSchoolUpdates.payrollConfig));
            }

            // Save Staff Updates
            Object.entries(pendingStaffUpdates).forEach(([staffId, updates]) => {
                promises.push(updateStaffProfile(staffId, updates));
            });

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r?.success);

            if (failed.length === 0) {
                toast.success('All payroll changes saved successfully', { id: toastId });
                setPendingStaffUpdates({});
                setPendingSchoolUpdates(null);
                loadData(school.id);
            } else {
                toast.error(`Saved with ${failed.length} errors`, { id: toastId });
            }
        } catch (e) {
            toast.error('Failed to save changes. Please try again.', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const generateIndividualSalary = async (item: any) => {
        const modes = school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque'];
        const chosenMode = window.prompt(
            `Confirm Payment Mode for ${item.user?.name}:\nOptions: ${modes.join(', ')}`,
            item.paymentMode || 'Bank Transfer'
        );
        if (chosenMode === null) return; // Cancelled

        const finalMode = chosenMode.trim() || 'None';

        setIsSaving(true);
        try {
            if (Object.keys(pendingStaffUpdates).length > 0) {
                // Save other pending overrides first
                const promises = Object.entries(pendingStaffUpdates).map(([staffId, updates]) => 
                    updateStaffProfile(staffId, updates)
                );
                await Promise.all(promises);
                setPendingStaffUpdates({});
            }

            await updateStaffProfile(item.id, { paymentMode: finalMode as any });
            const res = await updatePayslipStatus(item.id, monthStats.monthYear, 'Paid');
            if (res.success) {
                toast.success('Salary generated and marked as Paid');
                loadData(school!.id);
            }
        } catch (e) {
            toast.error('Failed to generate salary');
        } finally {
            setIsSaving(false);
        }
    };

    const generateBulkSalary = async () => {
        if (selectedStaffIds.length === 0) {
            toast.info('Process individual or bulk select staff members first.');
            return;
        }

        const modes = school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque'];
        const chosenMode = window.prompt(
            `Confirm Payment Mode for selected (${selectedStaffIds.length}) staff:\nOptions: ${modes.join(', ')}`,
            'Bank Transfer'
        );
        if (chosenMode === null) return; // Cancelled

        const finalMode = chosenMode.trim() || 'None';

        setIsSaving(true);
        const toastId = toast.loading('Generating bulk salaries...');
        try {
            if (Object.keys(pendingStaffUpdates).length > 0) {
                const promises = Object.entries(pendingStaffUpdates).map(([staffId, updates]) => 
                    updateStaffProfile(staffId, updates)
                );
                await Promise.all(promises);
                setPendingStaffUpdates({});
            }

            await Promise.all(selectedStaffIds.map(async (id) => {
                await updateStaffProfile(id, { paymentMode: finalMode as any });
                await updatePayslipStatus(id, monthStats.monthYear, 'Paid');
            }));
            
            toast.success(`Bulk salaries generated via ${finalMode} and marked as Paid`, { id: toastId });
            setSelectedStaffIds([]);
            loadData(school!.id);
        } catch (e) {
            toast.error('Bulk generation failed', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading payroll ledger...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Modal Switcher Area */}
            {activeModal?.type === 'LOAN' && (
                <LoanModal
                    staff={activeModal.staff}
                    user={activeModal.staff.user}
                    school={school!}
                    onClose={() => setActiveModal(null)}
                    onAddLoan={async (id, data) => handleLoanAction('add', id, data)}
                    onRepayLoan={async (id, lid, amt) => handleLoanAction('repay', id, { loanId: lid, amount: amt })}
                    onSettleLoan={async (id, lid) => handleLoanAction('settle', id, lid)}
                />
            )}
            {activeModal?.type === 'REIMBURSEMENT' && (
                <ReimbursementModal
                    staff={activeModal.staff}
                    user={activeModal.staff.user}
                    school={school!}
                    onClose={() => setActiveModal(null)}
                    onUpdate={async (id, reimbursements) => handleReimbursementUpdate(id, reimbursements)}
                />
            )}
            {activeModal?.type === 'PAYSLIP' && (
                <PayslipModal
                    staff={activeModal.staff}
                    user={activeModal.staff.user}
                    school={school!}
                    monthYear={monthStats.monthYear}
                    payroll={calculateRow(activeModal.staff)}
                    onClose={() => setActiveModal(null)}
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Calculator className="text-indigo-600" /> Payroll <span className="text-indigo-600">Center</span>
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {monthStats.monthName} Ledger & Payslips
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Month Picker Selection */}
                    <div className="flex bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 items-center gap-3">
                        <Calendar size={14} className="text-slate-400" />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Salary Month</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                max={maxMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-slate-700 dark:text-slate-300 outline-none p-0 w-28 cursor-pointer focus:ring-0"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setView(view === 'LEDGER' ? 'SETTINGS' : 'LEDGER')}
                        className={`flex bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 items-center gap-3 hover:bg-slate-100 transition-all ${view === 'SETTINGS' ? 'border-indigo-600 ring-2 ring-indigo-50' : ''}`}
                    >
                        <Settings size={14} className={view === 'SETTINGS' ? 'text-indigo-600' : 'text-slate-400'} />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] font-black text-slate-400 uppercase leading-none">
                                Config: {
                                    school?.payrollConfig?.mode === 'CALENDAR_EXCLUDE_SUNDAY' ? 'DYNAMIC (NO SUNDAYS)' :
                                    (school?.payrollConfig?.mode === 'CALENDAR_DAYS' || school?.payrollConfig?.mode === 'CALENDAR_INCLUDE_ALL_DAYS') ? 'FULL CALENDAR' :
                                    'FIXED STANDARD'
                                }
                            </span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{monthStats.workingDays} Active Days</span>
                        </div>
                    </button>
                    {(Object.keys(pendingStaffUpdates).length > 0 || pendingSchoolUpdates) && (
                        <Button
                            onClick={saveAllChanges}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 animate-in zoom-in duration-300"
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                    <Button
                        onClick={generateBulkSalary}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    >
                        <Banknote className="mr-2 h-4 w-4" /> {selectedStaffIds.length > 0 ? `Process (${selectedStaffIds.length})` : 'Process Payroll'}
                    </Button>
                </div>
            </div>

            {view === 'SETTINGS' && school ? (
                <SettingsSection 
                    school={school} 
                    onUpdateSchool={async (updates) => { 
                        if (updates.payrollConfig) {
                            const res = await updateSchoolConfig(school.id, updates.payrollConfig);
                            if (res?.success) {
                                setSchool(prev => prev ? { ...prev, ...updates } : null);
                                setPendingSchoolUpdates(null);
                                return { success: true };
                            }
                        }
                        return { success: false };
                    }} 
                />
            ) : (
                <>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-grow">
                                <Search className="h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search employee for salary review..."
                                    className="border-none bg-transparent focus-visible:ring-0 text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {selectedStaffIds.length > 0 && (
                                <div className="flex items-center gap-2 px-4 py-1 bg-indigo-50 border border-indigo-100 rounded-lg animate-in fade-in slide-in-from-right-2">
                                    <span className="text-[10px] font-black text-indigo-700 uppercase">{selectedStaffIds.length} Selected</span>
                                    <div className="w-[1px] h-4 bg-indigo-200 mx-1" />
                                    <button
                                        onClick={generateBulkSalary}
                                        className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                                    >
                                        Generate Salary
                                    </button>
                                    <button
                                        onClick={() => setSelectedStaffIds([])}
                                        className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-600"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 uppercase text-[10px] font-black tracking-tighter">
                                        <TableHead className="w-10 pl-6 sticky left-0 bg-slate-50 z-20">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600"
                                                checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedStaffIds(filteredStaff.map(s => s.id));
                                                    else setSelectedStaffIds([]);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-48 sticky left-10 bg-slate-50 z-20">Employee</TableHead>
                                        <TableHead className="text-center">Base ({currency})</TableHead>
                                        <TableHead className="text-center">Absents</TableHead>
                                        <TableHead className="text-center">Earnings</TableHead>
                                        <TableHead className="text-center">Deductions</TableHead>
                                        <TableHead className="text-center bg-indigo-50/30 text-indigo-700">Net Payable ({currency})</TableHead>
                                        <TableHead className="text-center">
                                            <div className="flex flex-col items-center gap-1 group py-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Mode</span>
                                                    <button
                                                        onClick={handleAddMode}
                                                        className="no-print p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Add Mode"
                                                    >
                                                        <Plus size={10} strokeWidth={3} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                                    <select
                                                        value={bulkMode}
                                                        onChange={(e) => setBulkMode(e.target.value)}
                                                        className="text-[9px] font-black border rounded bg-white text-slate-600 outline-none p-0.5 focus:ring-1 focus:ring-indigo-500"
                                                    >
                                                        {(school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque']).map(m => (
                                                            <option key={m} value={m}>{m === 'Bank Transfer' ? 'Bank' : m}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleBulkModeUpdate}
                                                        title="Set to all"
                                                        className="p-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm"
                                                    >
                                                        <CheckCircle2 size={8} />
                                                    </button>
                                                    <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                                                    <button
                                                        onClick={handleEditMode}
                                                        title="Edit this mode"
                                                        className="p-0.5 bg-white border text-slate-400 hover:text-indigo-600 rounded shadow-sm transition-colors"
                                                    >
                                                        <Pencil size={8} />
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteMode}
                                                        title="Delete this mode"
                                                        className="p-0.5 bg-white border text-slate-400 hover:text-red-600 rounded shadow-sm transition-colors"
                                                    >
                                                        <Trash2 size={8} />
                                                    </button>
                                                </div>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStaff.map((item) => {
                                        const p = calculateRow(item);
                                        const ov = overrides[item.id] || {};
                                        return (
                                            <TableRow key={item.id} className="hover:bg-slate-50/50 text-[13px]">
                                                <TableCell className="sticky left-0 bg-white z-10 pl-6">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-indigo-600"
                                                        checked={selectedStaffIds.includes(item.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedStaffIds(prev => [...prev, item.id]);
                                                            else setSelectedStaffIds(prev => prev.filter(id => id !== item.id));
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold sticky left-10 bg-white z-10">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span>{item.user?.name}</span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 uppercase leading-none mt-1">{item.staffId || item.id}</span>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {item.payslipStatus?.[monthStats.monthYear] && !['Paid', 'Unpaid'].includes(item.payslipStatus?.[monthStats.monthYear]) && (
                                                                <div className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[7px] font-black uppercase flex items-center gap-0.5">
                                                                    <CheckCircle2 size={7} /> {item.payslipStatus?.[monthStats.monthYear]}
                                                                </div>
                                                            )}
                                                            <select
                                                                value={item.payslipStatus?.[monthStats.monthYear] === 'Paid' || item.payslipStatus?.[monthStats.monthYear] === 'Generated' ? 'Paid' : 'Unpaid'}
                                                                disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                                onChange={async (e) => {
                                                                    const status = e.target.value as any;
                                                                    const res = await updatePayslipStatus(item.id, monthStats.monthYear, status);
                                                                    if (res.success) {
                                                                        toast.success(`Payment marked as ${status}`);
                                                                        loadData(school!.id);
                                                                    }
                                                                }}
                                                                className={`text-[8px] font-black uppercase px-1 py-0.5 rounded border outline-none cursor-pointer leading-none transition-all ${
                                                                    ['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                }`}
                                                            >
                                                                <option value="Paid">Paid</option>
                                                                <option value="Unpaid">Unpaid</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <input
                                                        type="number"
                                                        value={ov.basic ?? item.salary}
                                                        disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                        onChange={e => handleOverride(item.id, 'basic', e.target.value)}
                                                        className="w-20 text-center bg-transparent border-b border-transparent hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <input
                                                        type="number"
                                                        value={ov.absents ?? ''}
                                                        placeholder="0"
                                                        disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                        onChange={e => handleOverride(item.id, 'absents', e.target.value)}
                                                        className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center group relative">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-bold text-slate-800">{currency}{p.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                            <Info size={10} className="text-slate-400 cursor-help" />
                                                        </div>

                                                        {/* Breakup Tooltip */}
                                                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white p-2 rounded text-[10px] z-50 shadow-xl">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                                                                    <span>Base (Basic)</span>
                                                                    <span>{currency}{p.basic.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Allowances</span>
                                                                    <span>{currency}{p.totalAllowances.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Variable/Reimb.</span>
                                                                    <span>{currency}{p.reimbursementTotal.toLocaleString()}</span>
                                                                </div>
                                                                {p.lossOfPay > 0 && (
                                                                    <div className="flex justify-between text-rose-300">
                                                                        <span>Loss of Pay</span>
                                                                        <span>-{currency}{p.lossOfPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between border-t border-slate-700 pt-1 mt-1 font-bold text-indigo-300">
                                                                    <span>Total Earnings</span>
                                                                    <span>{currency}{p.grossSalary.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                                                        </div>

                                                        <button
                                                            onClick={() => setActiveModal({ type: 'REIMBURSEMENT', staff: item })}
                                                            disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                            className="text-[9px] text-indigo-600 font-bold uppercase hover:underline flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                                        >
                                                            <ReceiptText size={10} /> + Extra / OT / DA ({currency}{p.reimbursementTotal})
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-slate-500">{currency}{p.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                        <button
                                                            onClick={() => setActiveModal({ type: 'LOAN', staff: item })}
                                                            disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                            className="text-[9px] text-amber-600 font-bold uppercase hover:underline flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                                        >
                                                            <HandCoins size={10} /> Loans ({currency}{p.loanEMI})
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-black text-indigo-700 bg-indigo-50/30">
                                                    {currency}{p.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <select
                                                        value={item.paymentMode || 'None'}
                                                        disabled={['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '')}
                                                        onChange={(e) => handleModeChange(item.id, e.target.value)}
                                                        className="text-[11px] font-bold text-slate-600 bg-slate-50 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {(school?.payrollConfig?.paymentModes || ['None', 'Bank Transfer', 'Cash', 'Cheque']).map(m => (
                                                            <option key={m} value={m}>{m === 'Bank Transfer' ? 'Bank' : m}</option>
                                                        ))}
                                                    </select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <Button
                                                            onClick={() => setActiveModal({ type: 'PAYSLIP', staff: item })}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 gap-1.5"
                                                        >
                                                            <FileText size={14} /> VIEW SALARY
                                                        </Button>
                                                        {['Paid', 'Generated'].includes(item.payslipStatus?.[monthStats.monthYear] || '') ? (
                                                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                                                <Check size={10} strokeWidth={3} /> LOCKED
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                onClick={() => generateIndividualSalary(item)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-2.5 text-[10px] font-bold shadow-sm"
                                                            >
                                                                GENERATE SALARY
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-indigo-600" />
                            <p className="text-[10px] font-black text-indigo-900 uppercase">
                                Policy: {school?.payrollConfig?.mode?.replace(/_/g, ' ') || 'FIXED DAYS'} ({monthStats.workingDays} Calculation Divisor)
                            </p>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold italic">
                            Note: Absents affect Gross Pay via Loss of Pay (LOP) formula.
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
}
