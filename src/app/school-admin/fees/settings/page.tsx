'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { INITIAL_CLASS_SETUPS } from '@/lib/student-constants';
import { ClassSetup } from '@/types/student-settings';
import { getSchools, getFeeGroups, addFeeGroup, updateFeeGroup, deleteFeeGroup, updateSchool, getPlatformConfig } from '@/app/actions';
import SimpleListManager from '@/components/school-admin/settings/simple-list-manager';
import AdvancedSettingsManager from '@/components/school-admin/settings/advanced-settings-manager';
import FeeAssignmentModal from '@/components/school-admin/settings/fee-assignment-modal';
import FeesMasterManager from '@/components/school-admin/settings/fees/fees-master-manager';
import FeeAssignmentWorkspace from '@/components/school-admin/settings/fees/fee-assignment-workspace';
import FeesDiscountManager from '@/components/school-admin/settings/fees/fees-discount-manager';
import SelectCriteriaFilter from '@/components/school-admin/settings/fees/select-criteria-filter';
import {
    FeeGroup,
    INITIAL_FEES_MASTER_ITEMS,
    FeeDiscount,
    FeeReminder,
    MONTHS
} from '@/types/fees';
import { School } from '@/types';
import { INITIAL_SECTIONS } from '@/lib/student-constants';
import StudentSelectionGrid from '@/components/school-admin/settings/fees/student-selection-grid';
import { getStudents } from '@/app/actions';
import { Student } from '@/types';

import InvoiceSettingsManager from '@/components/school-admin/settings/invoice-settings-manager';
import { LayoutGrid, Table, Check, Eye } from 'lucide-react';

export default function FeesSettingsPage() {
    // -------------------------------------------------------------------------
    // STATE: Fees Master / Type
    // -------------------------------------------------------------------------
    const [feesTypes, setFeesTypes] = useState<string[]>([]);
    const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
    const [schoolClasses, setSchoolClasses] = useState<ClassSetup[]>(INITIAL_CLASS_SETUPS);

    // -------------------------------------------------------------------------
    // STATE: Other Settings
    // -------------------------------------------------------------------------
    const [feesDiscounts, setFeesDiscounts] = useState<FeeDiscount[]>([]);
    const [feesReminders, setFeesReminders] = useState<FeeReminder[]>([]);
    const [platformConfig, setPlatformConfig] = useState<{ defaultFeeTemplate: string; disabledFeeTemplates: string[] }>({ defaultFeeTemplate: 'template_1', disabledFeeTemplates: [] });
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);

    // Assignment Modal State
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<any>(null);
    const [assignType, setAssignType] = useState<'discount' | 'reminder'>('discount');

    // -------------------------------------------------------------------------
    // EFFECTS: Load / Save (Simulated Persistence with Server Actions)
    // -------------------------------------------------------------------------
    const [students, setStudents] = useState<Student[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Workspace State
    const [activeWorkspaceItem, setActiveWorkspaceItem] = useState<FeeDiscount | FeeReminder | null>(null);
    const [workspaceType, setWorkspaceType] = useState<'discount' | 'reminder'>('discount');

    // Helper to get months sorted by session start
    const getSortedMonths = () => {
        const ALL_MONTHS = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        let startMonth = 0;
        if (schoolDetails?.sessionStartMonth != null) {
            if (typeof schoolDetails.sessionStartMonth === 'string') {
                const idx = ALL_MONTHS.findIndex(m => m.toLowerCase() === (schoolDetails.sessionStartMonth as unknown as string).toLowerCase().slice(0, m.length));
                startMonth = idx >= 0 ? idx : 0;
            } else {
                startMonth = Number(schoolDetails.sessionStartMonth) - 1;
                if (isNaN(startMonth)) startMonth = 0;
            }
        }
        
        return Array.from({ length: 12 }, (_, i) => {
            const index = (i + startMonth) % 12;
            return {
                name: ALL_MONTHS[index],
                index: index
            };
        });
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const storedUser = localStorage.getItem('kummi_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    const schoolId = user.schoolId;
                    
                    const [mySchools, allStudents, cfg] = await Promise.all([
                        getSchools(),
                        getStudents(schoolId),
                        getPlatformConfig()
                    ]);
                    
                    setStudents(allStudents);
                    setPlatformConfig(cfg);
                    const mySchool = mySchools.find((s: any) => s.id === schoolId);
                    
                    if (mySchool) {
                        setSchoolDetails(mySchool);
                        
                        const migrateLegacy = (arr: any[], type: 'discount' | 'reminder') => {
                            return arr.map(item => {
                                if (typeof item === 'string') {
                                    const name = item;
                                    const code = name.toUpperCase().replace(/\s+/g, '_');
                                    return type === 'discount' ? {
                                        id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                        name,
                                        code,
                                        type: 'FIXED',
                                        value: 0,
                                        frequency: 'ONE_TIME',
                                        assignedClasses: [],
                                        targetType: 'ALL',
                                        months: [0,1,2,3,4,5,6,7,8,9,10,11]
                                    } : {
                                        id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                        name,
                                        triggerDays: 0,
                                        assignedClasses: [],
                                        targetType: 'ALL',
                                        months: [0,1,2,3,4,5,6,7,8,9,10,11]
                                    };
                                }
                                return {
                                    ...item,
                                    code: item.code || item.name?.toUpperCase().replace(/\s+/g, '_') || 'DISCOUNT',
                                    months: item.months || [0,1,2,3,4,5,6,7,8,9,10,11]
                                };
                            });
                        };

                        // Initialize Fee Types
                        if (mySchool.feeTypes && mySchool.feeTypes.length > 0) {
                            setFeesTypes(mySchool.feeTypes);
                        } else {
                            const savedTypes = localStorage.getItem('fees_types');
                            const initialTypes = savedTypes ? JSON.parse(savedTypes) : INITIAL_FEES_MASTER_ITEMS;
                            setFeesTypes(initialTypes);
                            await updateSchool(schoolId, { feeTypes: initialTypes });
                        }

                        // Initialize Discounts
                        if (mySchool.feeDiscounts && mySchool.feeDiscounts.length > 0) {
                            setFeesDiscounts(mySchool.feeDiscounts);
                        } else {
                            const savedDiscounts = localStorage.getItem('fees_discounts');
                            const initialStrings = savedDiscounts ? JSON.parse(savedDiscounts) : ['Sibling Discount', 'Staff Child', 'Early Bird'];
                            const migrated = migrateLegacy(initialStrings, 'discount');
                            setFeesDiscounts(migrated);
                            await updateSchool(schoolId, { feeDiscounts: migrated });
                        }

                        // Initialize Reminders
                        if (mySchool.feeReminders && mySchool.feeReminders.length > 0) {
                            setFeesReminders(mySchool.feeReminders);
                        } else {
                            const savedReminders = localStorage.getItem('fees_reminders');
                            const initialStrings = savedReminders ? JSON.parse(savedReminders) : ['Before 3 Days', 'On Due Date', 'After 3 Days'];
                            const migrated = migrateLegacy(initialStrings, 'reminder');
                            setFeesReminders(migrated);
                            await updateSchool(schoolId, { feeReminders: migrated });
                        }

                        // Classes
                        if (mySchool.useCustomClasses && mySchool.classes && mySchool.classes.length > 0) {
                            setSchoolClasses(mySchool.classes);
                        } else {
                            setSchoolClasses(INITIAL_CLASS_SETUPS);
                        }

                        // Load real fee groups from DB
                        const groups = await getFeeGroups(schoolId);
                        setFeeGroups(groups);
                    }
                }
            } catch (error) {
                console.error('Failed to load school data:', error);
                toast.error('Failed to load settings from server.');
            }
        };

        loadInitialData();
    }, []);

    // Save Handlers
    const saveFeesTypes = async (newTypes: string[]) => {
        setFeesTypes(newTypes);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                await updateSchool(user.schoolId, { feeTypes: newTypes });
                toast.success('Fee types updated successfully.');
            }
        }
    };

    const saveFeeGroups = async (newGroups: FeeGroup[]) => {
        const storedUser = localStorage.getItem('kummi_user');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        const schoolId = user.schoolId;
        if (!schoolId) return;

        try {
            // Re-fetch to see what's actually on the server, to avoid double-adding
            const oldGroups = await getFeeGroups(schoolId);
            const oldIds = new Set(oldGroups.map((g: any) => g.id));
            const newIds = new Set(newGroups.map((g: any) => g.id));

            // 1. Handle Deletions
            for (const oldG of oldGroups) {
                if (!newIds.has(oldG.id)) {
                    await deleteFeeGroup(oldG.id);
                }
            }

            // 2. Handle Adds / Updates
            for (const newG of newGroups) {
                if (!oldIds.has(newG.id)) {
                    // New Group, automatically assign schoolId
                    await addFeeGroup({ ...newG, schoolId });
                } else {
                    // Possible update, check if content changed
                    const oldG = oldGroups.find((og: any) => og.id === newG.id);
                    if (JSON.stringify(oldG) !== JSON.stringify(newG)) {
                        await updateFeeGroup(newG.id, newG);
                    }
                }
            }

            // Sync local state
            const finalGroups = await getFeeGroups(schoolId);
            setFeeGroups(finalGroups);
            toast.success('Fee groups successfully synchronized with server.');

        } catch (error) {
            console.error('Failed to sync fee groups:', error);
            toast.error('Data synchronization failed.');
        }
    };

    const saveFeesDiscounts = async (newItems: FeeDiscount[]) => {
        setFeesDiscounts(newItems);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                await updateSchool(user.schoolId, { feeDiscounts: newItems });
                toast.success('Discounts updated successfully.');
            }
        }
    };

    const saveFeesReminders = async (newItems: FeeReminder[]) => {
        setFeesReminders(newItems);
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.schoolId) {
                await updateSchool(user.schoolId, { feeReminders: newItems });
                toast.success('Reminders updated successfully.');
            }
        }
    };

    const saveFeeCollectionTemplate = async (template: string) => {
        if (!schoolDetails) return;
        try {
            const res = await updateSchool(schoolDetails.id, { feeCollectionTemplate: template });
            if (res.success) {
                setSchoolDetails({ ...schoolDetails, feeCollectionTemplate: template });
                toast.success('Fee collection template updated successfully.');
            } else {
                toast.error(res.error || 'Failed to update template.');
            }
        } catch (error) {
            console.error('Failed to update fee template:', error);
            toast.error('An unexpected error occurred.');
        }
    };

    const handleOpenWorkspace = (item: any, type: 'discount' | 'reminder') => {
        setActiveWorkspaceItem(item);
        setWorkspaceType(type);
    };

    const handleSaveAssignment = async (updatedItem: any) => {
        if (workspaceType === 'discount') {
            const newDiscounts = feesDiscounts.map(d => d.id === updatedItem.id ? updatedItem : d);
            await saveFeesDiscounts(newDiscounts);
        } else {
            const newReminders = feesReminders.map(r => r.id === updatedItem.id ? updatedItem : r);
            await saveFeesReminders(newReminders);
        }
        setActiveWorkspaceItem(null);
        toast.success("Assignment saved successfully.");
    };

    const handleOpenAssignModal = (item: any, type: 'discount' | 'reminder') => {
        setAssignTarget(item);
        setAssignType(type);
        setAssignModalOpen(true);
    };

    // -------------------------------------------------------------------------
    // RENDER: Discount Form State
    // -------------------------------------------------------------------------
    const [discForm, setDiscForm] = useState<Partial<FeeDiscount>>({ name: '', code: '', type: 'FIXED', value: 0, feeTypes: [] });

    // Derive unique fee type names from all fee groups
    const availableFeeTypeNames = useMemo(() => {
        const names = new Set<string>();
        feeGroups.forEach(g => g.fees.forEach(f => names.add(f.feeName)));
        return Array.from(names);
    }, [feeGroups]);

    const handleAddDiscount = () => {
        if (!discForm.name || !discForm.code) {
            toast.error("Please enter Name and Code");
            return;
        }
        
        if (discForm.id) {
            // Update mode
            const updatedDiscounts = feesDiscounts.map(d => 
                d.id === discForm.id 
                    ? { ...d, name: discForm.name!, code: discForm.code!, type: discForm.type || 'FIXED', value: discForm.value || 0, months: discForm.months || [0,1,2,3,4,5,6,7,8,9,10,11], feeTypes: discForm.feeTypes || [] }
                    : d
            );
            saveFeesDiscounts(updatedDiscounts);
            toast.success("Discount updated");
        } else {
            // Add mode
            const newItem: FeeDiscount = {
                id: `disc_${Date.now()}`,
                name: discForm.name,
                code: discForm.code,
                type: discForm.type || 'FIXED',
                value: discForm.value || 0,
                frequency: 'ONE_TIME',
                assignedClasses: [],
                targetType: 'ALL',
                months: discForm.months || [0,1,2,3,4,5,6,7,8,9,10,11],
                feeTypes: discForm.feeTypes || []
            };
            saveFeesDiscounts([...feesDiscounts, newItem]);
        }
        setDiscForm({ name: '', code: '', type: 'FIXED', value: 0, feeTypes: [] });
    };

    // -------------------------------------------------------------------------
    // RENDER: Reminder Form State
    // -------------------------------------------------------------------------
    const [remForm, setRemForm] = useState<Partial<FeeReminder>>({ name: '', triggerDays: 0 });
    const handleAddReminder = () => {
        if (!remForm.name) {
            toast.error("Please enter Name");
            return;
        }
        
        if (remForm.id) {
            // Update mode
            const updatedReminders = feesReminders.map(r => 
                r.id === remForm.id 
                    ? { ...r, name: remForm.name!, triggerDays: remForm.triggerDays || 0, months: remForm.months || [0,1,2,3,4,5,6,7,8,9,10,11] }
                    : r
            );
            saveFeesReminders(updatedReminders);
            toast.success("Reminder updated");
        } else {
            // Add mode
            const newItem: FeeReminder = {
                id: `rem_${Date.now()}`,
                name: remForm.name,
                triggerDays: remForm.triggerDays || 0,
                assignedClasses: [],
                targetType: 'ALL',
                months: remForm.months || [0,1,2,3,4,5,6,7,8,9,10,11]
            };
            saveFeesReminders([...feesReminders, newItem]);
        }
        setRemForm({ name: '', triggerDays: 0 });
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Fees Settings</h1>
                    <p className="text-slate-500 mt-1">Configure your fee structure, types, and automated rules.</p>
                </div>
            </div>

            <Tabs defaultValue="master" className="space-y-4">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1.5 h-auto flex flex-wrap gap-1.5 w-full md:w-fit justify-start bg-muted/50 rounded-xl">
                    <TabsTrigger value="master" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Fees Master</TabsTrigger>
                    <TabsTrigger value="type" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Fees Type</TabsTrigger>
                    <TabsTrigger value="discount" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Fees Discount</TabsTrigger>
                    <TabsTrigger value="reminder" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Fees Reminder</TabsTrigger>
                    <TabsTrigger value="invoice" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Invoice Settings</TabsTrigger>
                    <TabsTrigger value="template" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold">Fee Template</TabsTrigger>
                </TabsList>

                <TabsContent value="master">
                    <Card className="border-t-4 border-t-indigo-500">
                        <CardContent className="p-6">
                            <FeesMasterManager
                                classSetups={schoolClasses}
                                feesTypes={feesTypes}
                                feeGroups={feeGroups}
                                onUpdateGroups={saveFeeGroups}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="type">
                    <Card className="border-t-4 border-t-indigo-500">
                        <CardContent className="p-6">
                            <SimpleListManager
                                title="Fees Types"
                                description="Define different types of fees (e.g., Tuition, Exam) to be used in Fee Groups."
                                items={feesTypes}
                                onUpdate={saveFeesTypes}
                                placeholder="Enter fees type"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="discount">
                    {activeWorkspaceItem && workspaceType === 'discount' ? (
                        <FeeAssignmentWorkspace
                            item={activeWorkspaceItem as FeeDiscount}
                            type="discount"
                            school={schoolDetails!}
                            onSave={handleSaveAssignment}
                            onBack={() => setActiveWorkspaceItem(null)}
                        />
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Add Form */}
                                <Card className="h-fit shadow-sm border border-slate-200">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                        <h3 className="text-sm font-bold text-slate-700 font-urbanist">Add Fees Discount</h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Name</Label>
                                            <Input 
                                                value={discForm.name}
                                                onChange={(e) => setDiscForm({...discForm, name: e.target.value})}
                                                className="h-10 rounded-xl"
                                                placeholder="e.g. Sibling Discount"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Discount Code</Label>
                                            <Input 
                                                value={discForm.code}
                                                onChange={(e) => setDiscForm({...discForm, code: e.target.value})}
                                                className="h-10 rounded-xl"
                                                placeholder="e.g. DISC10"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Type</Label>
                                                <Select value={discForm.type} onValueChange={(val: any) => setDiscForm({...discForm, type: val})}>
                                                    <SelectTrigger className="h-10 rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Amount</Label>
                                                <Input 
                                                    type="number"
                                                    value={discForm.value}
                                                    onChange={(e) => setDiscForm({...discForm, value: parseFloat(e.target.value) || 0})}
                                                    className="h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* Fee Type Selection */}
                                        <div className="pt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Applicable Fee Types</Label>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] font-bold text-red-600 hover:bg-red-50" 
                                                    onClick={() => {
                                                        const allSelected = (discForm.feeTypes || []).length === availableFeeTypeNames.length;
                                                        setDiscForm({...discForm, feeTypes: allSelected ? [] : [...availableFeeTypeNames]});
                                                    }}
                                                >
                                                    {(discForm.feeTypes || []).length > 0 ? 'Clear' : 'All Types'}
                                                </Button>
                                            </div>
                                            {availableFeeTypeNames.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 italic">No fee groups configured yet. Add fee groups first.</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {availableFeeTypeNames.map(ft => (
                                                        <div key={ft} className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-all ${(discForm.feeTypes || []).includes(ft) ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => {
                                                            const current = discForm.feeTypes || [];
                                                            const updated = current.includes(ft) ? current.filter(x => x !== ft) : [...current, ft];
                                                            setDiscForm({...discForm, feeTypes: updated});
                                                        }}>
                                                            <Checkbox checked={(discForm.feeTypes || []).includes(ft)} className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                                                            <span className={`text-[10px] font-bold truncate ${(discForm.feeTypes || []).includes(ft) ? 'text-indigo-700' : 'text-slate-600'}`}>{ft}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-[9px] text-slate-400 italic">Leave empty to apply discount to all fee types.</p>
                                        </div>

                                        {/* Month Selection Grid */}
                                        <div className="pt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Beneficiary Months</Label>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] font-bold text-red-600 hover:bg-red-50" 
                                                    onClick={() => {
                                                        const allSelected = (discForm.months || []).length === 12;
                                                        setDiscForm({...discForm, months: allSelected ? [] : [0,1,2,3,4,5,6,7,8,9,10,11]});
                                                    }}
                                                >
                                                    {(discForm.months || []).length > 0 ? 'Deselect All' : 'Select All'}
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {getSortedMonths().map((m) => (
                                                    <div key={`month-${m.index}`} className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-all ${discForm.months?.includes(m.index) ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => {
                                                        const current = discForm.months || [];
                                                        const updated = current.includes(m.index) ? current.filter(x => x !== m.index) : [...current, m.index];
                                                        setDiscForm({...discForm, months: updated});
                                                    }}>
                                                        <Checkbox checked={(discForm.months || []).includes(m.index)} className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                                                        <span className={`text-[10px] font-bold truncate ${discForm.months?.includes(m.index) ? 'text-red-700' : 'text-slate-600'}`}>{(m.name || 'Mon').slice(0, 3)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center gap-3">
                                            {discForm.id && (
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => setDiscForm({ name: '', code: '', type: 'FIXED', value: 0 })}
                                                    className="w-1/3 h-11 font-bold rounded-xl text-slate-500 hover:text-slate-700"
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            <Button onClick={handleAddDiscount} className="flex-1 bg-red-600 hover:bg-red-700 h-11 font-bold rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95">
                                                {discForm.id ? "Update Discount" : "Save Discount"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="lg:col-span-2 mt-0">
                                    <FeesDiscountManager
                                        items={feesDiscounts}
                                        onUpdate={saveFeesDiscounts}
                                        onAssign={(item) => handleOpenWorkspace(item, 'discount')}
                                        onViewStudents={(item) => handleOpenWorkspace(item, 'discount')}
                                        onEdit={(item) => setDiscForm(item)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="reminder">
                    {activeWorkspaceItem && workspaceType === 'reminder' ? (
                        <FeeAssignmentWorkspace
                            item={activeWorkspaceItem as FeeReminder}
                            type="reminder"
                            school={schoolDetails!}
                            onSave={handleSaveAssignment}
                            onBack={() => setActiveWorkspaceItem(null)}
                        />
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Add Form */}
                                <Card className="h-fit shadow-sm border border-slate-200">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                        <h3 className="text-sm font-bold text-slate-700 font-urbanist">Add Fees Reminder</h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Name</Label>
                                            <Input 
                                                value={remForm.name}
                                                onChange={(e) => setRemForm({...remForm, name: e.target.value})}
                                                className="h-10 rounded-xl"
                                                placeholder="e.g. 3 Days Before"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Days Before/After Due</Label>
                                            <Input 
                                                type="number"
                                                value={remForm.triggerDays}
                                                onChange={(e) => setRemForm({...remForm, triggerDays: parseInt(e.target.value) || 0})}
                                                className="h-10 rounded-xl"
                                            />
                                            <p className="text-[10px] text-slate-400 italic">0 = Due Date, -3 = 3 days before</p>
                                        </div>

                                        {/* Month Selection Grid */}
                                        <div className="pt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Active Months</Label>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] font-bold text-red-600 hover:bg-red-50" 
                                                    onClick={() => {
                                                        const allSelected = (remForm.months || []).length === 12;
                                                        setRemForm({...remForm, months: allSelected ? [] : [0,1,2,3,4,5,6,7,8,9,10,11]});
                                                    }}
                                                >
                                                    {(remForm.months || []).length > 0 ? 'Deselect All' : 'Select All'}
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {getSortedMonths().map((m) => (
                                                    <div key={`month-${m.index}`} className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-all ${remForm.months?.includes(m.index) ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => {
                                                        const current = remForm.months || [];
                                                        const updated = current.includes(m.index) ? current.filter(x => x !== m.index) : [...current, m.index];
                                                        setRemForm({...remForm, months: updated});
                                                    }}>
                                                        <Checkbox checked={(remForm.months || []).includes(m.index)} className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                                                        <span className={`text-[10px] font-bold truncate ${remForm.months?.includes(m.index) ? 'text-red-700' : 'text-slate-600'}`}>{(m.name || 'Mon').slice(0, 3)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center gap-3">
                                            {remForm.id && (
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => setRemForm({ name: '', triggerDays: 0 })}
                                                    className="w-1/3 h-11 font-bold rounded-xl text-slate-500 hover:text-slate-700"
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            <Button onClick={handleAddReminder} className="flex-1 bg-red-600 hover:bg-red-700 h-11 font-bold rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95">
                                                {remForm.id ? "Update Reminder" : "Save Reminder"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="lg:col-span-2 mt-0">
                                    <FeesDiscountManager
                                        items={feesReminders as any}
                                        onUpdate={(items) => saveFeesReminders(items as any)}
                                        onAssign={(item) => handleOpenWorkspace(item, 'reminder')}
                                        onViewStudents={(item) => handleOpenWorkspace(item, 'reminder')}
                                        onEdit={(item) => setRemForm(item)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="invoice">
                    <Card className="border-t-4 border-t-indigo-500">
                        <CardContent className="p-6">
                            <InvoiceSettingsManager />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="template">
                    <Card className="border-t-4 border-t-indigo-500 overflow-hidden shadow-md">
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="flex items-start justify-between flex-wrap gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Fee Collection Template</h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Choose the layout and user experience interface used for collecting student fees.
                                    </p>
                                </div>
                                {(platformConfig.disabledFeeTemplates || []).length > 0 && (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                                        🔒 {platformConfig.disabledFeeTemplates.length} template(s) disabled by Admin
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Template 1 */}
                                {(() => {
                                    const isT1Disabled = (platformConfig.disabledFeeTemplates || []).includes('template_1');
                                    const isT1Active = schoolDetails?.feeCollectionTemplate === 'template_1' || !schoolDetails?.feeCollectionTemplate;
                                    return (
                                        <div
                                            onClick={() => !isT1Disabled && saveFeeCollectionTemplate('template_1')}
                                            className={`relative flex flex-col justify-between p-6 rounded-2xl border-2 transition-all duration-300 group overflow-hidden ${
                                                isT1Disabled
                                                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                    : isT1Active
                                                        ? 'border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-100/50 cursor-pointer'
                                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:bg-slate-50/30 cursor-pointer'
                                            }`}
                                        >
                                            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-100/30 group-hover:scale-125 transition-transform duration-500" />

                                            {isT1Disabled && (
                                                <div className="absolute inset-0 bg-slate-100/80 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl">
                                                    <div className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-center shadow-sm">
                                                        <p className="text-slate-600 font-black text-sm">🔒 Disabled by SaaS Admin</p>
                                                        <p className="text-slate-400 text-xs mt-1">This template is not available for selection.</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4 relative z-10">
                                                <div className="flex items-center justify-between">
                                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                                        <Table size={24} />
                                                    </div>
                                                    {isT1Active && !isT1Disabled && (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                                                            <Check size={14} className="stroke-[3]" /> Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800">Template 1: Granular Interface</h3>
                                                    <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                                                        A traditional, table-centric ledger review. Best for detailed administrative balance sheet review and manual multi-month splits.
                                                    </p>
                                                </div>
                                                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Granular month-by-month balance grid</li>
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Direct ledger modification</li>
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Structured standard tables</li>
                                                </ul>
                                            </div>
                                            <div className="mt-6 pt-4 relative z-10 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                                                <span>Standard Layout</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Eye size={14} /> Preview
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Template 2 */}
                                {(() => {
                                    const isT2Disabled = (platformConfig.disabledFeeTemplates || []).includes('template_2');
                                    const isT2Active = schoolDetails?.feeCollectionTemplate === 'template_2';
                                    return (
                                        <div
                                            onClick={() => !isT2Disabled && saveFeeCollectionTemplate('template_2')}
                                            className={`relative flex flex-col justify-between p-6 rounded-2xl border-2 transition-all duration-300 group overflow-hidden ${
                                                isT2Disabled
                                                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                    : isT2Active
                                                        ? 'border-emerald-600 bg-emerald-50/30 shadow-lg shadow-emerald-100/50 cursor-pointer'
                                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:bg-slate-50/30 cursor-pointer'
                                            }`}
                                        >
                                            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-100/30 group-hover:scale-125 transition-transform duration-500" />

                                            {isT2Disabled && (
                                                <div className="absolute inset-0 bg-slate-100/80 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl">
                                                    <div className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-center shadow-sm">
                                                        <p className="text-slate-600 font-black text-sm">🔒 Disabled by SaaS Admin</p>
                                                        <p className="text-slate-400 text-xs mt-1">This template is not available for selection.</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4 relative z-10">
                                                <div className="flex items-center justify-between">
                                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                                        <LayoutGrid size={24} />
                                                    </div>
                                                    {isT2Active && !isT2Disabled && (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                                            <Check size={14} className="stroke-[3]" /> Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800">Template 2: Modern Interface</h3>
                                                    <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                                                        A visual card-based layout featuring rapid-pay widgets and modern design components. Engineered for streamlined counter workflows.
                                                    </p>
                                                </div>
                                                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Beautiful summary widgets</li>
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Dynamic sidebar invoice previews</li>
                                                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Accelerated one-click collection</li>
                                                </ul>
                                            </div>
                                            <div className="mt-6 pt-4 relative z-10 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
                                                <span>New Experience</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Eye size={14} /> Preview
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>            </Tabs>

            {schoolDetails && assignTarget && (
                <FeeAssignmentModal 
                    isOpen={assignModalOpen}
                    onClose={() => setAssignModalOpen(false)}
                    item={assignTarget}
                    type={assignType}
                    school={schoolDetails}
                    onSave={handleSaveAssignment}
                />
            )}
        </div>
    );
}

