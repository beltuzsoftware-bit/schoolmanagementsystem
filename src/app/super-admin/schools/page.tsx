'use client';

import { useState, useEffect } from 'react';

import { getSchools, addSchool, toggleSchoolStatus, getPackages, updateSchool, deleteSchool, getSchoolAdmin, getSchoolSubscription, getSchoolSubscriptions, upsertSchoolSubscription, createSubscriptionFromPackage, migrateSchoolsToSubscriptions } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Download, LogOut, ExternalLink, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SchoolSubscription } from '@/types';
import { MODULES } from '@/lib/mock-data';

export default function SchoolsPage() {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtering would be real in a full app
    const [schools, setSchools] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]); // Dynamic packages state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newSchool, setNewSchool] = useState({ name: '', schoolId: '', email: '', packageId: '', password: '', maxStudents: '', criticalExpiryDays: '30', warningExpiryDays: '60' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [printingSchool, setPrintingSchool] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // ─── SUBSCRIPTION STATE ───────────────────────────────────────────────────
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [subSchool, setSubSchool] = useState<any>(null); // the school being managed
    const [subData, setSubData] = useState<Partial<SchoolSubscription>>({
        price: 0,
        billingCycle: 'monthly',
        maxStudents: 500,
        qrTransactionLimit: 100,
        modules: [],
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        renewalDate: '',
        autoRenew: false,
        status: 'Active',
        notes: '',
    });
    const [subSaving, setSubSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            // Automatically migrate any legacy package-based schools on load
            await migrateSchoolsToSubscriptions();
            
            const [s, p, subs] = await Promise.all([getSchools(), getPackages(), getSchoolSubscriptions()]);
            const schoolsWithSubs = s.map((sch: any) => ({
                ...sch,
                subscription: subs.find(sub => sub.schoolId === sch.id) || null
            }));
            setSchools(schoolsWithSubs);
            setPackages(p);
        };
        loadData();
    }, []);

    // ─── SUBSCRIPTION HANDLERS ────────────────────────────────────────────────
    const openManageSubscription = async (school: any) => {
        setSubSchool(school);
        const existing = await getSchoolSubscription(school.id);
        if (existing) {
            setSubData({
                ...existing,
                startDate: existing.startDate?.slice(0, 10),
                endDate: existing.endDate?.slice(0, 10),
                renewalDate: existing.renewalDate?.slice(0, 10) || '',
            });
        } else {
            // Pre-fill from current package as template
            const pkg = packages.find((p: any) => p.id === school.packageId);
            const today = new Date().toISOString().slice(0, 10);
            const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            setSubData({
                price: pkg?.price ?? 0,
                billingCycle: (pkg?.duration >= 12 ? 'yearly' : 'monthly') as any,
                maxStudents: school.maxStudents ?? pkg?.maxStudents ?? 500,
                qrTransactionLimit: pkg?.qrTransactionLimit ?? 100,
                modules: pkg?.modules ?? [],
                startDate: today,
                endDate: nextYear,
                renewalDate: '',
                autoRenew: false,
                status: 'Active',
                templatePackageId: pkg?.id,
                admissionFormTemplateId: pkg?.admissionFormTemplateId || '',
                staffFormTemplateId: pkg?.staffFormTemplateId || '',
                notes: '',
            });
        }
        setIsSubOpen(true);
    };

    const handleSaveSubscription = async () => {
        if (!subSchool) return;
        setSubSaving(true);
        try {
            await upsertSchoolSubscription(subSchool.id, {
                ...subData,
                startDate: subData.startDate ? new Date(subData.startDate).toISOString() : undefined,
                endDate: subData.endDate ? new Date(subData.endDate).toISOString() : undefined,
                renewalDate: subData.renewalDate ? new Date(subData.renewalDate).toISOString() : undefined,
            });
            toast.success(`Subscription saved for ${subSchool.name}`);
            setIsSubOpen(false);
            
            // Refresh schools list with new subscription data
            const [updatedSchools, subs] = await Promise.all([getSchools(), getSchoolSubscriptions()]);
            const schoolsWithSubs = updatedSchools.map((sch: any) => ({
                ...sch,
                subscription: subs.find(sub => sub.schoolId === sch.id) || null
            }));
            setSchools(schoolsWithSubs);
        } catch (e) {
            toast.error('Failed to save subscription');
        } finally {
            setSubSaving(false);
        }
    };

    const toggleSubModule = (modId: string) => {
        setSubData(prev => {
            const mods = prev.modules ?? [];
            return {
                ...prev,
                modules: mods.includes(modId) ? mods.filter(m => m !== modId) : [...mods, modId]
            };
        });
    };

    // Days remaining helper
    const getDaysRemaining = (endDate?: string) => {
        if (!endDate) return null;
        const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // Filtering would be real in a full app
    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveSchool = async () => {
        setErrorMsg('');
        if (!newSchool.name || !newSchool.schoolId || !newSchool.packageId) {
            setErrorMsg('Please fill in all required fields');
            return;
        }

        let result;
        if (editingId) {
            // Update
            result = await updateSchool(editingId, {
                name: newSchool.name,
                schoolId: newSchool.schoolId,
                email: newSchool.email,
                packageId: newSchool.packageId,
                maxStudents: newSchool.maxStudents ? parseInt(newSchool.maxStudents) : undefined,
                transportConfig: {
                    criticalExpiryDays: parseInt(newSchool.criticalExpiryDays) || 30,
                    warningExpiryDays: parseInt(newSchool.warningExpiryDays) || 60
                }
            } as any, newSchool.password);
        } else {
            // Create
            const school = {
                id: `s_${Date.now()}`,
                name: newSchool.name,
                schoolId: newSchool.schoolId,
                code: '', // Default empty govt code
                address: 'New Location',
                contactNumber: '0000000000',
                email: newSchool.email,
                logo: '/logo_placeholder.png',
                packageId: newSchool.packageId,
                maxStudents: newSchool.maxStudents ? parseInt(newSchool.maxStudents) : undefined,
                studentCount: 0,
                isActive: true,
                admins: [newSchool.email],
                transportConfig: {
                    criticalExpiryDays: parseInt(newSchool.criticalExpiryDays) || 30,
                    warningExpiryDays: parseInt(newSchool.warningExpiryDays) || 60
                }
            };
            result = await addSchool(school as any, newSchool.password);
        }

        if (result.success) {
            toast.success(editingId ? 'School updated' : 'School onboarded');
            const [updated, subs] = await Promise.all([getSchools(), getSchoolSubscriptions()]);
            const schoolsWithSubs = updated.map((sch: any) => ({
                ...sch,
                subscription: subs.find(sub => sub.schoolId === sch.id) || null
            }));
            setSchools(schoolsWithSubs);

            setNewSchool({ name: '', schoolId: '', email: '', packageId: '', password: '', maxStudents: '', criticalExpiryDays: '30', warningExpiryDays: '60' });
            setEditingId(null);
            setIsCreateOpen(false);
        } else {
            setErrorMsg(result.error || 'Failed to save school');
            toast.error(result.error || 'Failed to save school');
        }
    };

    const handleDeleteSchool = async (id: string) => {
        if (confirm('Are you sure you want to delete this school?')) {
            const result = await deleteSchool(id);
            if (result.success) {
                toast.success('School deleted successfully');
                const [updated, subs] = await Promise.all([getSchools(), getSchoolSubscriptions()]);
                const schoolsWithSubs = updated.map((sch: any) => ({
                    ...sch,
                    subscription: subs.find(sub => sub.schoolId === sch.id) || null
                }));
                setSchools(schoolsWithSubs);
            } else {
                toast.error(result.error || 'Failed to delete school');
            }
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setErrorMsg('');
        setNewSchool({ name: '', schoolId: '', email: '', packageId: '', password: '', maxStudents: '', criticalExpiryDays: '30', warningExpiryDays: '60' });
        setIsCreateOpen(true);
    };

    const openEdit = async (school: any) => {
        setEditingId(school.id);
        setErrorMsg('');

        // Fetch current admin password
        const adminUser = await getSchoolAdmin(school.id);
        const transportConfig = school.transportConfig || { criticalExpiryDays: 30, warningExpiryDays: 60 };

        setNewSchool({
            name: school.name,
            schoolId: school.schoolId || school.code,
            email: school.email,
            packageId: school.packageId,
            password: adminUser?.password || '',
            maxStudents: school.maxStudents?.toString() || '',
            criticalExpiryDays: transportConfig.criticalExpiryDays?.toString() || '30',
            warningExpiryDays: transportConfig.warningExpiryDays?.toString() || '60',
        });
        setIsCreateOpen(true);
    };

    const handleToggleStatus = async (schoolId: string, currentStatus: boolean) => {
        // Optimistic update
        setSchools(schools.map(s => s.id === schoolId ? { ...s, isActive: !currentStatus } : s));

        await toggleSchoolStatus(schoolId, !currentStatus);
        // Background refresh to ensure consistency
        const updated = await getSchools();
        setSchools(updated);
    };

    const handleDownloadProfile = (school: any) => {
        setPrintingSchool(school);
        setTimeout(() => {
            window.print();
            setPrintingSchool(null);
        }, 100);
    };

    const handleLoginAsSchool = async (schoolId: string) => {
        // Open the tab immediately to prevent popup blocker
        const newTab = window.open('about:blank', '_blank');
        if (!newTab) {
            toast.error('Popup blocked! Please allow popups for this site.');
            return;
        }

        newTab.document.write(
            '<div style="font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background-color: #f8fafc; color: #4f46e5;">' +
            '<div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>' +
            '<p style="font-size: 16px; font-weight: 600; color: #334155; margin: 0;">Accessing school admin portal...</p>' +
            '<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>' +
            '</div>'
        );

        try {
            const adminUser = await getSchoolAdmin(schoolId);
            if (adminUser) {
                const impersonateUrl = `/school-admin?impersonate=${encodeURIComponent(JSON.stringify(adminUser))}`;
                newTab.location.href = impersonateUrl;
                toast.success(`Opening portal for ${adminUser.name} in a new tab`);
            } else {
                newTab.close();
                toast.error('No admin found for this school');
            }
        } catch (error) {
            newTab.close();
            toast.error('Failed to switch to school admin');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Schools Management</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Add New School
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit School' : 'Onboard New School'}</DialogTitle>
                            <DialogDescription>
                                {editingId ? 'Update school details.' : 'Create a new school profile and assign initial package.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="schoolName" className="text-right">School Name</Label>
                                <Input
                                    id="schoolName"
                                    className="col-span-3"
                                    placeholder="Sunshine High School"
                                    value={newSchool.name}
                                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="schoolId" className="text-right">School ID</Label>
                                <Input
                                    id="schoolId"
                                    className="col-span-3"
                                    placeholder="Unique tracking ID"
                                    value={newSchool.schoolId}
                                    onChange={(e) => setNewSchool({ ...newSchool, schoolId: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="adminEmail" className="text-right">Admin Email</Label>
                                <Input
                                    id="adminEmail"
                                    type="email"
                                    className="col-span-3"
                                    placeholder="admin@sunshine.edu"
                                    value={newSchool.email}
                                    onChange={(e) => setNewSchool({ ...newSchool, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="adminPassword" className="text-right">Password</Label>
                                <Input
                                    id="adminPassword"
                                    type="text"
                                    className="col-span-3"
                                    placeholder="Set admin password"
                                    value={newSchool.password}
                                    onChange={(e) => setNewSchool({ ...newSchool, password: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="package" className="text-right">Package</Label>
                                <Select value={newSchool.packageId} onValueChange={(val) => {
                                    const pkg = packages.find((p: any) => p.id === val);
                                    setNewSchool({
                                        ...newSchool,
                                        packageId: val,
                                        // Auto-fill max students from the selected package if the field is empty
                                        maxStudents: newSchool.maxStudents || pkg?.maxStudents?.toString() || ''
                                    });
                                }}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} (Default: {p.maxStudents})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="maxStudents" className="text-right text-indigo-600 font-bold pt-2">
                                    Max Students
                                </Label>
                                <div className="col-span-3 space-y-1.5">
                                    <Input
                                        id="maxStudents"
                                        type="number"
                                        min={0}
                                        className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-400/20"
                                        placeholder="e.g. 500 — overrides package limit"
                                        value={newSchool.maxStudents}
                                        onChange={(e) => setNewSchool({ ...newSchool, maxStudents: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 italic">
                                        Override the package&apos;s default limit for this specific school. Leave blank to use the package default.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-semibold text-rose-600">Expiry (Critical)</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={newSchool.criticalExpiryDays}
                                        onChange={(e) => setNewSchool({ ...newSchool, criticalExpiryDays: e.target.value })}
                                        className="w-24"
                                    />
                                    <span className="text-xs text-slate-500 font-bold">days (flashing red alert)</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-semibold text-amber-600">Expiry (Warning)</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={newSchool.warningExpiryDays}
                                        onChange={(e) => setNewSchool({ ...newSchool, warningExpiryDays: e.target.value })}
                                        className="w-24"
                                    />
                                    <span className="text-xs text-slate-500 font-bold">days (solid amber alert)</span>
                                </div>
                            </div>
                        </div>
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 flex items-center">
                                <span className="mr-2">⚠️</span> {errorMsg}
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" onClick={handleSaveSchool}>{editingId ? 'Update School' : 'Create School'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border">
                <Search className="h-4 w-4 text-slate-400 ml-2" />
                <Input
                    placeholder="Search schools by name or code..."
                    className="border-none focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-900">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>School Name</TableHead>
                            <TableHead>School ID</TableHead>
                            <TableHead>Package</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Subscription</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSchools.map((school) => {
                            const pkg = packages.find(p => p.id === school.packageId);
                            return (
                                <TableRow key={school.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/super-admin/schools/${encodeURIComponent(school.schoolId || school.code || school.id)}`}
                                            className="hover:text-indigo-600 hover:underline transition-colors"
                                            title={`Open ${school.name} admin portal`}
                                        >
                                            {school.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/super-admin/schools/${encodeURIComponent(school.schoolId || school.code || school.id)}`}
                                            title={`Open ${school.name} admin portal`}
                                        >
                                            <Badge variant="secondary" className="font-mono hover:bg-indigo-100 cursor-pointer">{school.schoolId}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={pkg?.color ? `text-white ${pkg.color} border-none` : ''}>
                                            {pkg?.name || 'Custom'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {school.studentCount}
                                        <span className="text-slate-400 font-normal">
                                            {' / '}
                                            {(school.maxStudents != null)
                                                ? school.maxStudents
                                                : (pkg?.maxStudents == null || pkg?.maxStudents === -1)
                                                    ? <span className="font-bold text-indigo-500">∞</span>
                                                    : pkg?.maxStudents
                                            }
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={school.isActive ? "default" : "destructive"} className={school.isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                                            {school.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            const sub = school.subscription;
                                            if (!sub) {
                                                return <Badge variant="outline" className="text-slate-400 border-slate-200">Default Plan</Badge>;
                                            }
                                            const days = getDaysRemaining(sub.endDate);
                                            if (sub.status !== 'Active') {
                                                const statusMap: Record<string, string> = {
                                                    Trial: 'bg-indigo-500 hover:bg-indigo-600 text-white border-none',
                                                    Expired: 'bg-rose-500 hover:bg-rose-600 text-white border-none',
                                                    Suspended: 'bg-slate-500 hover:bg-slate-600 text-white border-none',
                                                    Cancelled: 'bg-red-700 hover:bg-red-800 text-white border-none'
                                                };
                                                return <Badge className={statusMap[sub.status] || 'bg-slate-500'}>{sub.status}</Badge>;
                                            }
                                            if (days !== null) {
                                                if (days <= 0) {
                                                    return <Badge className="bg-rose-600 text-white border-none">Expired</Badge>;
                                                } else if (days <= 7) {
                                                    return (
                                                        <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none animate-pulse">
                                                            ⚠️ {days}d left
                                                        </Badge>
                                                    );
                                                } else if (days <= 30) {
                                                    return (
                                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">
                                                            {days}d left
                                                        </Badge>
                                                    );
                                                } else {
                                                    return (
                                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                                                            Active ({days}d)
                                                        </Badge>
                                                    );
                                                }
                                            }
                                            return <Badge variant="outline">Active</Badge>;
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <a
                                                        href={`/super-admin/schools/${encodeURIComponent(school.schoolId || school.code || school.id)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center cursor-pointer"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openEdit(school)}>
                                                    Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openManageSubscription(school)} className="text-indigo-600 font-bold">
                                                    <CalendarClock className="mr-2 h-4 w-4" /> Manage Subscription
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDownloadProfile(school)}>
                                                    <Download className="mr-2 h-4 w-4" /> Download Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleLoginAsSchool(school.id)}>
                                                    <LogOut className="mr-2 h-4 w-4 rotate-180" /> Login as Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>Manage Admins</DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className={school.isActive ? "text-orange-600 cursor-pointer" : "text-green-600 cursor-pointer"}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleToggleStatus(school.id, school.isActive);
                                                    }}
                                                >
                                                    {school.isActive ? "Deactivate" : "Activate"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 cursor-pointer"
                                                    onClick={() => handleDeleteSchool(school.id)}
                                                >
                                                    Delete School
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* ─── SUBSCRIPTION MANAGEMENT DIALOG ─────────────────────────────────── */}
            <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
                <DialogContent className="sm:max-w-[680px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
                    <DialogHeader className="p-7 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                        <DialogTitle className="text-xl font-black">
                            📦 Subscription — {subSchool?.name}
                        </DialogTitle>
                        <DialogDescription className="text-indigo-200 font-medium">
                            Configure this school&apos;s independent subscription. Changes apply only to this school.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-7 max-h-[75vh] overflow-y-auto space-y-6">

                        {/* Pricing & Billing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Price (₹)</Label>
                                <Input type="number" value={subData.price} onChange={e => setSubData(p => ({ ...p, price: Number(e.target.value) }))} className="h-10 font-bold" placeholder="e.g. 28000" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Billing Cycle</Label>
                                <Select value={subData.billingCycle} onValueChange={v => setSubData(p => ({ ...p, billingCycle: v as any }))}>
                                    <SelectTrigger className="h-10 font-semibold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                        <SelectItem value="one-time">One-time</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Max Students</Label>
                                <Input type="number" value={subData.maxStudents} onChange={e => setSubData(p => ({ ...p, maxStudents: Number(e.target.value) }))} className="h-10 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">QR Limit / Month</Label>
                                <Input type="number" value={subData.qrTransactionLimit} onChange={e => setSubData(p => ({ ...p, qrTransactionLimit: Number(e.target.value) }))} className="h-10 font-bold" />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Start Date</Label>
                                <Input type="date" value={subData.startDate?.slice(0,10)} onChange={e => setSubData(p => ({ ...p, startDate: e.target.value }))} className="h-10 font-semibold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">End Date</Label>
                                <Input type="date" value={subData.endDate?.slice(0,10)} onChange={e => setSubData(p => ({ ...p, endDate: e.target.value }))} className="h-10 font-semibold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Renewal Reminder</Label>
                                <Input type="date" value={subData.renewalDate?.slice(0,10) || ''} onChange={e => setSubData(p => ({ ...p, renewalDate: e.target.value }))} className="h-10 font-semibold" />
                            </div>
                        </div>

                        {/* Status & Auto-Renew */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Status</Label>
                                <Select value={subData.status} onValueChange={v => setSubData(p => ({ ...p, status: v as any }))}>
                                    <SelectTrigger className="h-10 font-semibold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">✅ Active</SelectItem>
                                        <SelectItem value="Trial">🔬 Trial</SelectItem>
                                        <SelectItem value="Expired">⏰ Expired</SelectItem>
                                        <SelectItem value="Suspended">⏸️ Suspended</SelectItem>
                                        <SelectItem value="Cancelled">❌ Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Auto Renew</Label>
                                <Select value={subData.autoRenew ? 'yes' : 'no'} onValueChange={v => setSubData(p => ({ ...p, autoRenew: v === 'yes' }))}>
                                    <SelectTrigger className="h-10 font-semibold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">🔄 Yes — Auto Renew</SelectItem>
                                        <SelectItem value="no">⬜ No — Manual Renewal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Modules */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex justify-between">
                                Active Modules
                                <span className="text-indigo-600">{(subData.modules ?? []).length} selected</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-xl border max-h-48 overflow-y-auto">
                                {MODULES.map(mod => (
                                    <label key={mod.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all ${
                                        (subData.modules ?? []).includes(mod.id)
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={(subData.modules ?? []).includes(mod.id)}
                                            onChange={() => toggleSubModule(mod.id)}
                                            className="accent-indigo-600 h-4 w-4"
                                        />
                                        <span className="text-xs font-bold">{mod.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Internal Notes</Label>
                            <Input value={subData.notes ?? ''} onChange={e => setSubData(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Negotiated rate, special deal, contact person..." className="h-10" />
                        </div>

                    </div>

                    <DialogFooter className="p-5 bg-slate-50 border-t flex gap-3">
                        <Button variant="ghost" onClick={() => setIsSubOpen(false)} className="font-bold text-slate-500">Cancel</Button>
                        <Button
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-100"
                            onClick={handleSaveSubscription}
                            disabled={subSaving}
                        >
                            {subSaving ? 'Saving...' : '💾 Save Subscription'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Professional Profile Print View (Shared Logic) --- */}
            {printingSchool && (
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-auto p-0">
                    <div className="max-w-[800px] mx-auto p-10 bg-white min-h-screen relative border-[10px] border-indigo-600/5">
                        <div className="border-b-2 border-indigo-600 pb-8 mb-8 flex justify-between items-start">
                            <div className="space-y-2 max-w-[70%]">
                                <h1 className="text-4xl font-serif font-bold text-slate-900 leading-tight">
                                    {printingSchool.name}
                                </h1>
                                {printingSchool.tagline && (
                                    <p className="text-lg text-indigo-600 font-medium italic">{printingSchool.tagline}</p>
                                )}
                                <div className="flex flex-wrap gap-4 mt-4 text-slate-600 font-medium">
                                    <Badge variant="outline" className="border-indigo-200">System ID: {printingSchool.schoolId}</Badge>
                                    {printingSchool.code && (
                                        <Badge variant="outline" className="border-indigo-200">Reg. Code: {printingSchool.code}</Badge>
                                    )}
                                </div>
                            </div>
                            {printingSchool.logo && (
                                <img src={printingSchool.logo} alt="Logo" className="w-24 h-24 object-contain shadow-sm rounded-xl border p-2 bg-white" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                            <section className="space-y-4">
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 border-b pb-1">Institutional Profile</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Affiliation</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.affiliation || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">City / State</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.city || 'N/A'}, {printingSchool.state || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Current Session</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.currentSession || 'N/A'}</span>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 border-b pb-1">Contact Metadata</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Primary Email</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.email}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Contact No.</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.contactNumber}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Website</span>
                                        <span className="font-semibold text-slate-700">{printingSchool.website || 'N/A'}</span>
                                    </div>
                                </div>
                            </section>

                            <section className="col-span-2 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600">Official Location</h2>
                                <p className="text-slate-700 leading-relaxed font-medium">
                                    {printingSchool.address || 'No address provided.'}
                                </p>
                            </section>
                        </div>

                        <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t pt-6 text-slate-400">
                            <div className="flex items-center gap-2 text-xs">
                                <div className="bg-indigo-600 text-white p-1 rounded font-bold text-[8px]">K</div>
                                <p>Generated via <span className="font-bold text-indigo-600/60">KuMMi School System</span></p>
                            </div>
                            <p className="text-[10px] font-medium">Date Generated: {new Date().toLocaleDateString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
