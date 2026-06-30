'use client';

import { useState, useEffect } from 'react';
import { PACKAGES, MODULES } from '@/lib/mock-data';
import { getPackagesWithSchoolCount, addPackage, updatePackage, deletePackage, getStaffFormTemplates, getAdmissionFormTemplates } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Copy, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StaffFormConfig, StaffFormTemplate, AdmissionFormTemplate } from '@/types';

export default function PackagesPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [formTemplates, setFormTemplates] = useState<StaffFormTemplate[]>([]);
    const [admTemplates, setAdmTemplates] = useState<AdmissionFormTemplate[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newPackage, setNewPackage] = useState<{
        name: string;
        price: string;
        maxStudents: string;
        duration: string;
        modules: string[];
        staffFormTemplateId?: string;
        admissionFormTemplateId?: string;
        qrTransactionLimit: string;
        transactionRate: string;
    }>({ name: '', price: '', maxStudents: '500', duration: '1', modules: [], qrTransactionLimit: '100', transactionRate: '0' });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        getPackagesWithSchoolCount().then(setPackages);
        getStaffFormTemplates().then(setFormTemplates);
        getAdmissionFormTemplates().then(setAdmTemplates);
    }, []);

    const handleSavePackage = async () => {
        if (!newPackage.name || !newPackage.price) return;

        if (editingId) {
            await updatePackage(editingId, {
                name: newPackage.name,
                price: Number(newPackage.price),
                maxStudents: Number(newPackage.maxStudents),
                duration: Number(newPackage.duration),
                modules: newPackage.modules,
                staffFormTemplateId: newPackage.staffFormTemplateId,
                admissionFormTemplateId: newPackage.admissionFormTemplateId,
                qrTransactionLimit: Number(newPackage.qrTransactionLimit),
                transactionRate: Number(newPackage.transactionRate)
            });
        } else {
            const pkg = {
                id: `p_${Date.now()}`,
                name: newPackage.name,
                price: Number(newPackage.price),
                color: 'bg-slate-500',
                description: 'Custom created package',
                maxStudents: Number(newPackage.maxStudents),
                duration: Number(newPackage.duration),
                modules: newPackage.modules,
                staffFormTemplateId: newPackage.staffFormTemplateId,
                admissionFormTemplateId: newPackage.admissionFormTemplateId,
                qrTransactionLimit: Number(newPackage.qrTransactionLimit),
                transactionRate: Number(newPackage.transactionRate)
            };
            await addPackage(pkg);
        }

        const updated = await getPackagesWithSchoolCount();
        setPackages(updated);

        setNewPackage({ name: '', price: '', maxStudents: '500', duration: '1', modules: [], qrTransactionLimit: '100', transactionRate: '0' });
        setEditingId(null);
        setIsCreateOpen(false);
    };

    const handleDeletePackage = async (id: string) => {
        if (confirm('Are you sure you want to delete this package?')) {
            await deletePackage(id);
            const updated = await getPackagesWithSchoolCount();
            setPackages(updated);
        }
    };

    const handleCopyPackage = async (pkg: any) => {
        const copyPkg = {
            ...pkg,
            id: `p_${Date.now()}`,
            name: `${pkg.name} (Copy)`
        };
        await addPackage(copyPkg);
        const updated = await getPackagesWithSchoolCount();
        setPackages(updated);
    };

    const openCreate = () => {
        setEditingId(null);
        setNewPackage({ name: '', price: '', maxStudents: '500', duration: '1', modules: [], staffFormTemplateId: undefined, admissionFormTemplateId: undefined, qrTransactionLimit: '100', transactionRate: '0' });
        setIsCreateOpen(true);
    };

    const openEdit = (pkg: any) => {
        setEditingId(pkg.id);
        setNewPackage({
            name: pkg.name,
            price: String(pkg.price),
            maxStudents: String(pkg.maxStudents ?? 500),
            duration: String(pkg.duration || '1'),
            modules: pkg.modules || [],
            staffFormTemplateId: pkg.staffFormTemplateId,
            admissionFormTemplateId: pkg.admissionFormTemplateId,
            qrTransactionLimit: String(pkg.qrTransactionLimit ?? 100),
            transactionRate: String(pkg.transactionRate ?? 0)
        });
        setIsCreateOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">SaaS Packages</h1>
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Create Package
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
                        <DialogHeader className="p-8 bg-slate-50 border-b">
                            <DialogTitle className="text-2xl font-bold text-slate-800">{editingId ? 'Edit Package' : 'Create New Package'}</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium pt-1">Define the limits and pricing for this SaaS tier.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-sm font-bold text-slate-700">Package Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="E.g. Enterprise Plan"
                                        value={newPackage.name}
                                        onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                                        className="h-11 border-slate-200 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="price" className="text-sm font-bold text-slate-700">Price (₹)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="15000"
                                        value={newPackage.price}
                                        onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                                        className="h-11"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="duration" className="text-sm font-bold text-slate-700">Billing Cycle</Label>
                                    <Select
                                        value={newPackage.duration}
                                        onValueChange={(val) => setNewPackage({ ...newPackage, duration: val })}
                                    >
                                        <SelectTrigger id="duration" className="h-11 border-slate-200 font-medium">
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Monthly</SelectItem>
                                            <SelectItem value="12">Yearly (12 Months)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="qrTransactionLimit" className="text-sm font-bold text-slate-700">QR Code Limit</Label>
                                        <Input
                                            id="qrTransactionLimit"
                                            type="number"
                                            placeholder="500"
                                            value={newPackage.qrTransactionLimit}
                                            onChange={(e) => setNewPackage({ ...newPackage, qrTransactionLimit: e.target.value })}
                                            className="h-11"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Per {newPackage.duration === '12' ? 'year' : 'month'}</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="transactionRate" className="text-sm font-bold text-slate-700">Flat Rate (₹/txn)</Label>
                                        <Input
                                            id="transactionRate"
                                            type="number"
                                            placeholder="0"
                                            value={newPackage.transactionRate}
                                            onChange={(e) => setNewPackage({ ...newPackage, transactionRate: e.target.value })}
                                            className="h-11"
                                        />
                                         <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Commission per payment</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="staffFormTemplate" className="text-sm font-bold text-slate-700">Staff Form Template</Label>
                                        <Select
                                            value={newPackage.staffFormTemplateId}
                                            onValueChange={(val) => setNewPackage({ ...newPackage, staffFormTemplateId: val })}
                                        >
                                            <SelectTrigger id="staffFormTemplate" className="bg-white border-slate-200 font-medium">
                                                <SelectValue placeholder="Standard Staff Form" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {formTemplates.map(tmpl => (
                                                    <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="admissionFormTemplate" className="text-sm font-bold text-slate-700">Admission Form Template</Label>
                                        <Select
                                            value={newPackage.admissionFormTemplateId}
                                            onValueChange={(val) => setNewPackage({ ...newPackage, admissionFormTemplateId: val })}
                                        >
                                            <SelectTrigger id="admissionFormTemplate" className="bg-white border-slate-200 font-medium">
                                                <SelectValue placeholder="Standard Admission Form" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {admTemplates.map(tmpl => (
                                                    <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-3 pt-2">
                                    <Label className="text-sm font-bold text-slate-700 flex justify-between">
                                        Included Modules
                                        <span className="text-[10px] text-slate-400 uppercase font-black">{newPackage.modules.length} selected</span>
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-xl p-4 bg-slate-50 shadow-inner max-h-[200px] overflow-y-auto">
                                        {MODULES.map(module => (
                                            <div key={module.id} className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 bg-white shadow-sm sm:bg-transparent sm:shadow-none">
                                                <input
                                                    type="checkbox"
                                                    id={`mod-${module.id}`}
                                                    checked={newPackage.modules.includes(module.id)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setNewPackage(prev => ({
                                                            ...prev,
                                                            modules: checked
                                                                ? [...prev.modules, module.id]
                                                                : prev.modules.filter(m => m !== module.id)
                                                        }));
                                                    }}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer accent-indigo-600 transition-all scale-110"
                                                />
                                                <div className="grid gap-0.5">
                                                    <label htmlFor={`mod-${module.id}`} className="text-sm font-bold text-slate-800 cursor-pointer select-none group-hover:text-indigo-700 transition-colors">
                                                        {module.name}
                                                    </label>
                                                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{module.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-8 bg-slate-50 border-t flex gap-3">
                             <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500">Cancel</Button>
                             <Button className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold h-12 shadow-lg shadow-indigo-100 transition-all border-none rounded-xl" type="submit" onClick={handleSavePackage}>
                                {editingId ? 'Save Changes' : 'Create Package'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {packages.map((pkg) => (
                    <Card key={pkg.id} className="flex flex-col shadow-xl border-none hover:translate-y-[-4px] transition-all duration-300 bg-white dark:bg-slate-900 group overflow-hidden rounded-2xl ring-1 ring-slate-200">
                        <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
                        <CardHeader className="pb-4">
                            <CardTitle className="text-2xl flex justify-between items-center text-slate-800 font-extrabold pb-1">
                                {pkg.name}
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black px-3 py-1 text-sm rounded-full">
                                    ₹{pkg.price}/{pkg.duration >= 12 ? 'yr' : 'mo'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium italic flex items-center justify-between mt-1">
                                <span>{pkg.description}</span>
                                {pkg.schoolsCount !== undefined && (
                                    <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                        🏫 {pkg.schoolsCount} school{pkg.schoolsCount !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-5 pt-0">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">QR Payments Limit</p>
                                    <p className="text-lg font-black text-slate-700">{pkg.qrTransactionLimit === -1 ? '∞' : pkg.qrTransactionLimit}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Per {pkg.duration >= 12 ? 'Year' : 'Month'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-2">
                                    Included Modules
                                    <div className="flex-1 h-[1px] bg-slate-100" />
                                </div>
                                <div className="grid gap-2">
                                    {pkg.modules.slice(0, 5).map((modId: string) => {
                                        const mod = MODULES.find(m => m.id === modId);
                                        return (
                                            <div key={modId} className="flex items-center text-xs text-slate-600 dark:text-slate-300 font-bold bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                                                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                                {mod?.name || modId}
                                            </div>
                                        );
                                    })}
                                    {pkg.modules.length > 5 && (
                                        <p className="text-[10px] text-slate-400 font-bold pl-4">+ {pkg.modules.length - 5} more modules</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2 p-4 bg-slate-50/80 mt-2">
                            <Button variant="outline" className="flex-1 font-bold text-slate-600 bg-white border-slate-200 hover:text-indigo-600 hover:border-indigo-300 transition-all rounded-xl" onClick={() => openEdit(pkg)}>
                                Edit Plan
                            </Button>
                            <Button variant="outline" size="icon" className="shrink-0 bg-white text-slate-400 hover:text-indigo-600 border-slate-200 transition-all rounded-xl" onClick={() => handleCopyPackage(pkg)} title="Duplicate Package">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="shrink-0 text-slate-300 hover:text-rose-500 transition-all hover:bg-rose-50" onClick={() => handleDeletePackage(pkg.id)}>
                                <span className="sr-only">Delete</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
