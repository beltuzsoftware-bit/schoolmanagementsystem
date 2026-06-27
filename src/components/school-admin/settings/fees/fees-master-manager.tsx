import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FeeGroup, FeeInGroup, FREQUENCY_OPTIONS, FeeApplicability } from '@/types/fees';
import { ClassSetup } from '@/types/student-settings';

interface FeesMasterManagerProps {
    classSetups: ClassSetup[];
    feesTypes: string[];
    feeGroups: FeeGroup[];
    onUpdateGroups: (groups: FeeGroup[]) => void;
}

export default function FeesMasterManager({ classSetups, feesTypes, feeGroups, onUpdateGroups }: FeesMasterManagerProps) {
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<FeeGroup | null>(null);
    const [currentGroupName, setCurrentGroupName] = useState('');
    const [currentAssignedClasses, setCurrentAssignedClasses] = useState<string[]>([]);
    const [selectedFeesForGroup, setSelectedFeesForGroup] = useState<Map<string, FeeInGroup>>(new Map());
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

    const openGroupModal = (group: FeeGroup | null) => {
        if (group) {
            setEditingGroup(group);
            setCurrentGroupName(group.name);
            setCurrentAssignedClasses(group.assignedClasses || []);
            const feesMap = new Map<string, FeeInGroup>();
            group.fees.forEach(f => feesMap.set(f.feeName, f));
            setSelectedFeesForGroup(feesMap);
        } else {
            setEditingGroup(null);
            setCurrentGroupName('');
            setCurrentAssignedClasses([]);
            setSelectedFeesForGroup(new Map());
        }
        setGroupModalOpen(true);
    };

    const closeGroupModal = () => {
        setGroupModalOpen(false);
        setEditingGroup(null);
        setCurrentGroupName('');
        setCurrentAssignedClasses([]);
        setSelectedFeesForGroup(new Map());
    };

    const handleDuplicateGroup = (group: FeeGroup) => {
        const newGroup: FeeGroup = {
            ...group,
            id: `group-${Date.now()}`,
            name: `${group.name} (Copy)`,
        };
        onUpdateGroups([...feeGroups, newGroup]);
    };

    const handleDeleteGroup = (groupId: string) => {
        if (window.confirm("Are you sure you want to delete this fee group?")) {
            onUpdateGroups(feeGroups.filter(g => g.id !== groupId));
        }
    };

    const performSaveGroup = () => {
        const feesForGroup: FeeInGroup[] = Array.from(selectedFeesForGroup.values());
        if (editingGroup) {
            onUpdateGroups(feeGroups.map(g =>
                g.id === editingGroup.id
                    ? { ...g, name: currentGroupName.trim(), assignedClasses: currentAssignedClasses, fees: feesForGroup }
                    : g
            ));
        } else {
            const newGroup = {
                id: `group-${Date.now()}`,
                name: currentGroupName.trim(),
                assignedClasses: currentAssignedClasses,
                fees: feesForGroup,
                schoolId: '', // assigned by parent saveFeeGroups before DB write
            } as FeeGroup;
            onUpdateGroups([...feeGroups, newGroup]);
        }
        closeGroupModal();
    };

    const handleSaveGroup = () => {
        if (currentGroupName.trim() === '') return;
        if (currentAssignedClasses.length === 0) {
            alert("Please select at least one class for this fee group.");
            return;
        }
        performSaveGroup();
    };

    const handleToggleClass = (className: string) => {
        setCurrentAssignedClasses(prev => {
            if (prev.includes(className)) {
                return prev.filter(c => c !== className);
            } else {
                return [...prev, className];
            }
        });
    };

    const handleFeeSelectionForGroup = (feeName: string) => {
        setSelectedFeesForGroup(prev => {
            const newMap = new Map<string, FeeInGroup>(prev);
            if (newMap.has(feeName)) {
                newMap.delete(feeName);
            } else {
                newMap.set(feeName, {
                    feeName,
                    appliesTo: 'all',
                    amount: 0,
                    dueDate: '',
                    fineAmount: 0,
                    fineType: 'fixed',
                    fineInterval: 1,
                    paymentFrequency: 'one_time',
                    hasCustomScheduler: false,
                    customDates: []
                });
            }
            return newMap;
        });
    };

    const handleFeeDetailChange = (feeName: string, field: keyof FeeInGroup, value: any) => {
        setSelectedFeesForGroup(prev => {
            const newMap = new Map<string, FeeInGroup>(prev);
            const existingFee = newMap.get(feeName);
            if (existingFee) {
                newMap.set(feeName, { ...existingFee, [field]: value });
            }
            return newMap;
        });
    };

    const toggleGroupDetails = (groupId: string) => {
        setExpandedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const formatFrequency = (freq: string) => FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;

    const applicabilityText = (appliesTo: FeeApplicability) => {
        switch (appliesTo) {
            case 'new': return '(New Students Only)';
            case 'old': return '(Old Students Only)';
            default: return '';
        }
    };

    const calculateFeeTotal = (fees: FeeInGroup[], studentType: 'new' | 'old') => {
        return fees.reduce((acc, fee) => {
            if (studentType === 'new' && fee.appliesTo === 'old') return acc;
            if (studentType === 'old' && fee.appliesTo === 'new') return acc;
            let multiplier = 1;
            switch (fee.paymentFrequency) {
                case 'monthly': multiplier = 12; break;
                case 'quarterly': multiplier = 4; break;
                case 'half_yearly': multiplier = 2; break;
                default: multiplier = 1;
            }
            return acc + ((fee.amount || 0) * multiplier);
        }, 0);
    };

    const inr = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Fees Group</h3>
                    <p className="text-slate-500 text-sm mt-1">Create packages of fees with defined amounts, due dates, and frequencies.</p>
                </div>
                <Button
                    onClick={() => openGroupModal(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Group
                </Button>
            </div>

            <div className="mt-6">
                {feeGroups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {feeGroups.map((group, idx) => {
                            const colorVariants = [
                                "bg-blue-100 border-blue-200 hover:border-blue-300",
                                "bg-indigo-100 border-indigo-200 hover:border-indigo-300",
                                "bg-fuchsia-100 border-fuchsia-200 hover:border-fuchsia-300",
                                "bg-emerald-100 border-emerald-200 hover:border-emerald-300",
                                "bg-rose-100 border-rose-200 hover:border-rose-300",
                                "bg-amber-100 border-amber-200 hover:border-amber-300",
                            ];
                            const colorClass = colorVariants[idx % colorVariants.length];

                            const totalNew = calculateFeeTotal(group.fees, 'new');
                            const totalOld = calculateFeeTotal(group.fees, 'old');
                            const isExpanded = expandedGroupIds.has(group.id);

                            return (
                                <div key={group.id} className={`border rounded-xl shadow-sm p-5 flex flex-col transition-all duration-200 hover:shadow-md ${colorClass}`}>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow">
                                                <h4 className="text-xl font-bold text-slate-800 mb-1">{group.name}</h4>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {group.assignedClasses && group.assignedClasses.length > 0 ? (
                                                        group.assignedClasses.map(cls => (
                                                            <span key={cls} className="px-2 py-0.5 text-xs font-semibold bg-white/70 text-slate-700 rounded-full border border-white/50 shadow-sm">
                                                                {cls}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-500 italic bg-white/60 px-2 py-0.5 rounded border border-white/40">No classes assigned</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-3 mt-2">
                                                    <span className="bg-white/70 text-green-800 px-3 py-1 rounded border border-white/50 text-lg font-bold shadow-sm">
                                                        New: {inr(totalNew)}
                                                    </span>
                                                    <span className="bg-white/70 text-blue-800 px-3 py-1 rounded border border-white/50 text-lg font-bold shadow-sm">
                                                        Old: {inr(totalOld)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-start ml-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 bg-white/60 hover:bg-white/90 hover:text-indigo-600 shadow-sm border border-white/30" onClick={() => handleDuplicateGroup(group)} title="Duplicate">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 bg-white/60 hover:bg-white/90 hover:text-blue-600 shadow-sm border border-white/30" onClick={() => openGroupModal(group)} title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 bg-white/60 hover:bg-white/90 hover:text-rose-600 shadow-sm border border-white/30" onClick={() => handleDeleteGroup(group.id)} title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleGroupDetails(group.id)}
                                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                            >
                                                {isExpanded ? 'Hide Fee Breakdown' : 'View Fee Breakdown'}
                                                {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                                            </Button>
                                        </div>

                                        {isExpanded && (
                                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                                                {group.fees.map(fee => (
                                                    <div key={fee.feeName} className="text-base border-l-2 border-indigo-200 pl-3 py-1">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="font-medium text-gray-700">{fee.feeName}</span>
                                                            <span className="font-mono font-semibold text-lg text-gray-900">
                                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(fee.amount)}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 mt-1">
                                                            <span>Freq: {formatFrequency(fee.paymentFrequency)}</span>
                                                            {fee.dueDate && <span>Due: {new Date(fee.dueDate).toLocaleDateString()}</span>}
                                                            {fee.fineAmount > 0 && (
                                                                <span className="text-red-600 font-medium">
                                                                    Fine: {fee.fineType === 'fixed' ? '₹' : ''}{fee.fineAmount}{fee.fineType === 'percentage' ? '%' : ''}
                                                                    <span className="text-gray-400 font-normal ml-1">(Every {fee.fineInterval} Day{fee.fineInterval > 1 ? 's' : ''})</span>
                                                                </span>
                                                            )}
                                                            <span className="italic block w-full mt-0.5">{applicabilityText(fee.appliesTo)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {group.fees.length === 0 && <div className="text-center italic text-gray-400 py-2">No fees assigned</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                        <p>No fee groups created yet.</p>
                        <p className="text-sm">Click "Add Group" to create your first fee package.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Dialog open={isGroupModalOpen} onOpenChange={setGroupModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingGroup ? 'Edit' : 'Add'} Fee Group</DialogTitle>
                        <DialogDescription className="sr-only">
                            Form to {editingGroup ? 'edit' : 'add'} a fee group with assigned classes and fee types.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        {/* Group Name */}
                        <div>
                            <Label htmlFor="groupName" className="font-semibold">Group Name</Label>
                            <Input
                                id="groupName"
                                value={currentGroupName}
                                onChange={e => setCurrentGroupName(e.target.value)}
                                placeholder="e.g. SaRA Class Fees"
                                className="mt-1"
                            />
                        </div>

                        {/* Assign to Classes */}
                        <div>
                            <Label className="font-semibold">Assign to Classes</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto mt-1">
                                {classSetups.map(cls => (
                                    <div key={cls.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`class-${cls.id}`}
                                            checked={currentAssignedClasses.includes(cls.name)}
                                            onCheckedChange={() => handleToggleClass(cls.name)}
                                        />
                                        <label
                                            htmlFor={`class-${cls.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {cls.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Configure Fees */}
                        <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-3 uppercase tracking-wider">Configure Fees</h4>
                            <div className="space-y-3">
                                {feesTypes.length > 0 ? (
                                    feesTypes.map(fee => {
                                        const feeDetails = selectedFeesForGroup.get(fee);
                                        const isSelected = !!feeDetails;

                                        return (
                                            <div key={fee} className={cn("border rounded-lg transition-all duration-200", isSelected ? "border-indigo-500 bg-indigo-50/40 shadow-sm" : "border-gray-200 bg-white")}>
                                                {/* Fee header row: checkbox + applicability toggle */}
                                                <div className="p-3 flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`fee-${fee}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleFeeSelectionForGroup(fee)}
                                                        />
                                                        <label htmlFor={`fee-${fee}`} className="text-sm font-semibold cursor-pointer">{fee}</label>
                                                    </div>

                                                    {isSelected && feeDetails && (
                                                        <div className="flex bg-gray-100 rounded p-1 ml-auto">
                                                            {(['all', 'new', 'old'] as const).map((opt) => (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleFeeDetailChange(fee, 'appliesTo', opt);
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1 text-xs font-bold rounded-sm transition-all",
                                                                        feeDetails.appliesTo === opt
                                                                            ? "bg-white text-indigo-700 shadow-sm"
                                                                            : "text-gray-500 hover:text-gray-800"
                                                                    )}
                                                                >
                                                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Fee detail fields */}
                                                {isSelected && feeDetails && (
                                                    <div className="px-4 pb-4 pt-1 space-y-3 animate-in slide-in-from-top-1">
                                                        {/* Row 1: Amount, Frequency, Due Date */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div>
                                                                <Label className="text-xs font-semibold text-gray-600">Amount (₹)</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={feeDetails.amount || ''}
                                                                    onChange={(e) => handleFeeDetailChange(fee, 'amount', parseFloat(e.target.value) || 0)}
                                                                    className="h-9 mt-1"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-semibold text-gray-600">Payment Frequency</Label>
                                                                <Select
                                                                    value={feeDetails.paymentFrequency}
                                                                    onValueChange={(val) => handleFeeDetailChange(fee, 'paymentFrequency', val)}
                                                                >
                                                                    <SelectTrigger className="h-9 mt-1">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {FREQUENCY_OPTIONS.map(opt => (
                                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-semibold text-gray-600">Due Date</Label>
                                                                <Input
                                                                    type="date"
                                                                    value={feeDetails.dueDate || ''}
                                                                    onChange={(e) => handleFeeDetailChange(fee, 'dueDate', e.target.value)}
                                                                    className="h-9 mt-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Late Fine Settings */}
                                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                                                                Late Fine Settings
                                                                <span className="text-gray-400 font-normal normal-case ml-1">(set Fine Amount to 0 for no fine)</span>
                                                            </p>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                <div>
                                                                    <Label className="text-xs font-semibold text-gray-600">Fine Amount</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={feeDetails.fineAmount || ''}
                                                                        onChange={(e) => handleFeeDetailChange(fee, 'fineAmount', parseFloat(e.target.value) || 0)}
                                                                        className="h-9 mt-1"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-semibold text-gray-600">Fine Type</Label>
                                                                    <Select
                                                                        value={feeDetails.fineType}
                                                                        onValueChange={(val) => handleFeeDetailChange(fee, 'fineType', val)}
                                                                    >
                                                                        <SelectTrigger className="h-9 mt-1">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent position="popper" sideOffset={4}>
                                                                            <SelectItem value="fixed">Fixed (₹)</SelectItem>
                                                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-semibold text-gray-600">Every (Days)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={feeDetails.fineInterval || ''}
                                                                        onChange={(e) => handleFeeDetailChange(fee, 'fineInterval', parseFloat(e.target.value) || 1)}
                                                                        className="h-9 mt-1"
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                                <div className="flex items-end pb-0.5">
                                                                    <p className="text-xs text-gray-400 italic leading-tight">
                                                                        Fine is charged every N days after due date
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No fee types defined. Go to the 'Fees Type' tab to add some first.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeGroupModal}>Cancel</Button>
                        <Button onClick={handleSaveGroup} className="bg-indigo-600 hover:bg-indigo-700">Save Group</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
