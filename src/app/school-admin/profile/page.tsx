'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload, Save, FileText, Loader2, Trash2, Calendar, Plus, Pencil, CheckCircle2, MoreHorizontal, Download } from 'lucide-react';
import { getSchools, updateSchool, manageSession } from '@/app/actions';
import { School, Session } from '@/types';
import { toast } from 'sonner';
import ImageCropper from '@/components/image-cropper';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'bn', label: 'Bengali' },
    { code: 'mr', label: 'Marathi' },
    { code: 'te', label: 'Telugu' },
    { code: 'ta', label: 'Tamil' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'pa', label: 'Punjabi' },
    { code: 'ur', label: 'Urdu' }
];

export default function SchoolProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [school, setSchool] = useState<School | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Form state
    const [formData, setFormData] = useState<Partial<School>>({});

    // Cropper state
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [currentField, setCurrentField] = useState<keyof School | null>(null);

    // Media error states
    const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});

    const handleMediaError = (field: string) => {
        setMediaErrors(prev => ({ ...prev, [field]: true }));
    };

    // Session Management State
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [sessionForm, setSessionForm] = useState<Partial<Session>>({
        name: '',
        startDate: '',
        endDate: '',
        status: 'Planned',
        isCurrent: false
    });


    useEffect(() => {
        const loadSchool = async () => {
            try {
                const storedUser = localStorage.getItem('kummi_user');
                if (!storedUser) return;

                const user = JSON.parse(storedUser);
                const schoolId = user.schoolId;

                if (schoolId) {
                    const schools = await getSchools();
                    const currentSchool = schools.find((s: School) => s.id === schoolId);
                    if (currentSchool) {
                        setSchool(currentSchool);
                        setFormData(currentSchool);
                        setMediaErrors({}); // Reset error states when loading new data
                    }
                }
            } catch (error) {
                console.error('Failed to load school data', error);
                toast.error('Failed to load school profile');
            } finally {
                setLoading(false);
            }
        };

        loadSchool();
    }, []);

    const handleChange = (field: keyof School, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: keyof School) => {
        const file = e.target.files?.[0];
        if (file) {
            setCurrentField(field);
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = (field: keyof School) => {
        handleChange(field, '');
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} removed!`);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Compute only changed fields to avoid sending large unmodified base64 image data
            const updates: Partial<School> = {};
            Object.keys(formData).forEach((key) => {
                const k = key as keyof School;
                if (formData[k] !== (school as any)?.[k]) {
                    updates[k] = formData[k] as any;
                }
            });

            if (Object.keys(updates).length === 0) {
                toast.success('No changes to save');
                setSaving(false);
                return;
            }

            const result = await updateSchool(school!.id, updates);
            if (result.success) {
                setErrorMsg('');
                toast.success('Profile updated successfully');
                const updated = await getSchools();
                const matched = updated.find((s: School) => s.id === school!.id);
                if (matched) {
                    setSchool(matched);
                    setFormData(matched);
                }
                // Notify layout to re-fetch school data (logo/name)
                window.dispatchEvent(new Event('profile-updated'));
            } else {
                setErrorMsg(result.error || 'Failed to update profile');
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'An error occurred while saving');
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadProfile = () => {
        const originalTitle = document.title;
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
        const cleanName = (school?.name || 'School_Portfolio').replace(/[^a-zA-Z0-9]/g, '_');
        document.title = `${cleanName}_${dateStr}`;
        window.print();
        document.title = originalTitle;
    };

    // --- Session Handlers ---
    const openSessionDialog = (session?: Session) => {
        if (session) {
            setEditingSession(session);
            setSessionForm(session);
        } else {
            setEditingSession(null);
            setSessionForm({
                name: '',
                startDate: '',
                endDate: '',
                status: 'Planned',
                isCurrent: false
            });
        }
        setIsSessionDialogOpen(true);
    };

    const handleSessionFormChange = (field: keyof Session, value: any) => {
        setSessionForm(prev => ({ ...prev, [field]: value }));
    };

    const handleManageSession = async (action: 'add' | 'edit' | 'delete' | 'setCurrent', data?: Partial<Session>) => {
        if (!school?.id) return;
        setIsSessionLoading(true);

        try {
            const result = await manageSession(school.id, action, data);
            if (result.success) {
                toast.success(`Session ${action === 'delete' ? 'deleted' : action === 'setCurrent' ? 'set as current' : 'saved'} successfully!`);

                // Refresh local school data
                const schools = await getSchools();
                const currentSchool = schools.find((s: School) => s.id === school.id);
                if (currentSchool) {
                    setSchool(currentSchool);
                    setFormData(currentSchool);
                }

                setIsSessionDialogOpen(false);
                if (action === 'setCurrent') {
                    window.dispatchEvent(new Event('profile-updated'));
                }
            } else {
                toast.error(result.error || `Failed to ${action} session`);
            }
        } catch (error) {
            console.error('Session error', error);
            toast.error('An error occurred');
        } finally {
            setIsSessionLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const getAcademicSessionLabel = () => {
        if (!school?.currentSession) return '-';
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const startMonth = school.sessionStartMonth ? (monthNames[school.sessionStartMonth - 1] || "Apr") : "Apr";
        const endMonthIdx = school.sessionStartMonth ? (school.sessionStartMonth - 2 + 12) % 12 : 2;
        const endMonth = monthNames[endMonthIdx] || "Mar";
        return `${school.currentSession} (${startMonth} - ${endMonth})`;
    };

    const getLanguageLabel = () => {
        if (!school?.language) return '-';
        const lang = school.language.toLowerCase();
        const found = LANGUAGES.find(l => l.code === lang || l.label.toLowerCase() === lang);
        return found ? found.label.toUpperCase() : lang.toUpperCase();
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">School Profile</h1>
                        <p className="text-slate-500">Manage your institution's details and settings.</p>
                    </div>
                    <div className="flex gap-3 print:hidden">
                        <Button variant="outline" onClick={handleDownloadProfile} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            <Download className="mr-2 h-4 w-4" />
                            Download Profile
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center font-bold">
                        <span className="mr-2">⚠️</span> {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <Tabs defaultValue="basic" className="space-y-4">
                        <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1.5 h-auto flex flex-wrap gap-1.5 w-full md:w-fit justify-start bg-muted/50 rounded-xl">
                            <TabsTrigger
                                value="basic"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Basic Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="contact"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Contact Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="media"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Logo & Sign
                            </TabsTrigger>
                            <TabsTrigger
                                value="session"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Academic Session
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Global STD
                            </TabsTrigger>
                            <TabsTrigger
                                value="others"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all px-4 py-2 rounded-lg font-semibold"
                            >
                                Others
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic">
                            <Card className="border-t-4 border-t-indigo-500">
                                <CardHeader>
                                    <CardTitle>Basic Institution Information</CardTitle>
                                    <CardDescription>Official details of the school.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    {/* --- System ID Header --- */}
                                    <div className="space-y-4 md:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 mb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">System School ID (Tracking)</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-black font-mono text-slate-800 tracking-tight">
                                                        {school?.schoolId || '---'}
                                                    </span>
                                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-2 py-0 h-5 text-[10px] font-bold uppercase">System Assigned</Badge>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium italic">Fixed identifier assigned by Super Admin</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-1">Account Status</div>
                                                <Badge variant="outline" className="text-[10px] font-bold border-green-200 text-green-700 bg-green-50/50">ACTIVE</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- Name & Tagline Side-by-Side (Row 1) --- */}
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="font-semibold text-slate-700">Full Name *</Label>
                                        <Input
                                            id="fullName"
                                            value={formData.name || ''}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="School Name"
                                            className="border-slate-300 h-11 text-lg font-bold text-indigo-900"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tagline" className="font-semibold text-slate-700">Tagline (Below Name)</Label>
                                        <Input
                                            id="tagline"
                                            value={formData.tagline || ''}
                                            onChange={(e) => handleChange('tagline', e.target.value)}
                                            placeholder="Knowledge. Innovation. Excellence."
                                            className="border-slate-300 h-11 italic font-medium"
                                        />
                                    </div>

                                    {/* --- Short Name, School Code & Established Year Side-by-Side (Row 2) --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="shortName" className="font-semibold text-slate-700">Short Name (For SMS/Reports)</Label>
                                            <Input
                                                id="shortName"
                                                value={formData.shortName || ''}
                                                onChange={(e) => handleChange('shortName', e.target.value)}
                                                placeholder="TMIS"
                                                className="border-slate-300 h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="schoolCode" className="font-semibold text-slate-700">School Code *</Label>
                                            <Input
                                                id="schoolCode"
                                                value={formData.code || ''}
                                                onChange={(e) => handleChange('code', e.target.value)}
                                                placeholder="1001"
                                                className="border-slate-300 h-11"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="establishedYear" className="font-semibold text-slate-700">Estb. Year</Label>
                                            <Input
                                                id="establishedYear"
                                                value={formData.establishedYear || ''}
                                                onChange={(e) => handleChange('establishedYear', e.target.value)}
                                                placeholder="2010"
                                                className="border-slate-300 h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* --- Academic Metadata Row (UDISE: 50% | Board: 25% | No: 25%) --- */}
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label htmlFor="udise" className="font-semibold text-slate-700">UDISE Code</Label>
                                            <Input
                                                id="udise"
                                                value={formData.udise || ''}
                                                onChange={(e) => handleChange('udise', e.target.value)}
                                                placeholder="98765"
                                                className="border-slate-300 h-11 w-full"
                                            />
                                        </div>
                                        <div className="md:col-span-1 space-y-2">
                                            <Label htmlFor="affiliation" className="font-semibold text-slate-700">Affiliated To</Label>
                                            <Select
                                                value={formData.affiliation}
                                                onValueChange={(v) => handleChange('affiliation', v)}
                                            >
                                                <SelectTrigger className="w-full !h-11 border-slate-300 bg-white ring-offset-0 focus:ring-0">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cbse">CBSE</SelectItem>
                                                    <SelectItem value="icse">ICSE</SelectItem>
                                                    <SelectItem value="state">State Board</SelectItem>
                                                    <SelectItem value="ib">IB</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-1 space-y-2">
                                            <Label htmlFor="affiliationCode" className="font-semibold text-slate-700">Affiliation No.</Label>
                                            <Input
                                                id="affiliationCode"
                                                value={formData.affiliationCode || ''}
                                                onChange={(e) => handleChange('affiliationCode', e.target.value)}
                                                placeholder="icse 2026"
                                                className="border-slate-300 h-11 w-full"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="contact">
                            <Card className="border-t-4 border-t-indigo-500">
                                <CardHeader>
                                    <CardTitle>Contact Information</CardTitle>
                                    <CardDescription>How parents and staff can reach the school.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="contactPerson">Contact Person Name</Label>
                                        <Input
                                            id="contactPerson"
                                            value={formData.contactPerson || ''}
                                            onChange={(e) => handleChange('contactPerson', e.target.value)}
                                            placeholder="Mr. Principal"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mobile">Mobile Number (School)</Label>
                                        <Input
                                            id="mobile"
                                            value={formData.contactNumber || ''}
                                            onChange={(e) => handleChange('contactNumber', e.target.value)}
                                            placeholder="+91 9000000000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number (Landline)</Label>
                                        <Input
                                            id="phone"
                                            value={formData.landline || ''}
                                            onChange={(e) => handleChange('landline', e.target.value)}
                                            placeholder="022-2456789"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp">WhatsApp Number</Label>
                                        <Input
                                            id="whatsapp"
                                            value={formData.whatsapp || ''}
                                            onChange={(e) => handleChange('whatsapp', e.target.value)}
                                            placeholder="9000000000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email ID (School)</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="info@school.edu"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            value={formData.website || ''}
                                            onChange={(e) => handleChange('website', e.target.value)}
                                            placeholder="https://www.school.edu"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Textarea
                                            id="address"
                                            value={formData.address || ''}
                                            onChange={(e) => handleChange('address', e.target.value)}
                                            placeholder="123, School Lane, Education City"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={formData.city || ''}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                            placeholder="Mumbai"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={formData.state || ''}
                                            onChange={(e) => handleChange('state', e.target.value)}
                                            placeholder="Maharashtra"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pincode">Pincode</Label>
                                        <Input
                                            id="pincode"
                                            value={formData.pincode || ''}
                                            onChange={(e) => handleChange('pincode', e.target.value)}
                                            placeholder="400001"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="media">
                            <Card className="border-t-4 border-t-indigo-500">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-lg">Logos, Signatures & Files</CardTitle>
                                    <CardDescription>Upload assets for reports and ID cards.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* School Logo */}
                                        <div className="space-y-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed border-indigo-100 relative group">
                                            <Label className="text-sm font-semibold text-indigo-700 mb-1 block">School Logo</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-20 w-20 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center relative">
                                                        <img
                                                            src={(!mediaErrors.logo && formData.logo) || '/kummi-icon.svg'}
                                                            alt="Logo"
                                                            className="h-full w-full object-cover"
                                                            onError={() => handleMediaError('logo')}
                                                        />
                                                    </div>
                                                    {formData.logo && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                                                            onClick={() => handleRemoveFile('logo')}
                                                            title="Delete Logo"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*,image/webp"
                                                        className="h-9 text-xs cursor-pointer bg-white border-slate-200"
                                                        onChange={(e) => handleFileSelect(e, 'logo')}
                                                    />
                                                    <p className="text-[10px] text-slate-400 italic">Recommended: 512x512px, PNG/SVG</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Watermark Logo */}
                                        <div className="space-y-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 relative group">
                                            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Watermark Logo</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-20 w-20 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center relative">
                                                        {formData.watermark && !mediaErrors.watermark ? (
                                                            <img
                                                                src={formData.watermark}
                                                                alt="Watermark"
                                                                className="h-full w-full object-cover opacity-50"
                                                                onError={() => handleMediaError('watermark')}
                                                            />
                                                        ) : (
                                                            <div className="text-slate-100 text-3xl font-bold">W</div>
                                                        )}
                                                    </div>
                                                    {formData.watermark && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                                                            onClick={() => handleRemoveFile('watermark')}
                                                            title="Delete Watermark"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*,image/webp"
                                                        className="h-9 text-xs cursor-pointer bg-white border-slate-200"
                                                        onChange={(e) => handleFileSelect(e, 'watermark')}
                                                    />
                                                    <p className="text-[10px] text-slate-400 italic">Used for backgrounds & certificates</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Principal Signature */}
                                        <div className="space-y-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 relative group">
                                            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Principal Signature</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-20 w-20 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center relative">
                                                        {formData.signature && !mediaErrors.signature ? (
                                                            <img
                                                                src={formData.signature}
                                                                alt="Signature"
                                                                className="h-full w-full object-contain"
                                                                onError={() => handleMediaError('signature')}
                                                            />
                                                        ) : (
                                                            <div className="text-slate-100 text-3xl font-bold">S</div>
                                                        )}
                                                    </div>
                                                    {formData.signature && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                                                            onClick={() => handleRemoveFile('signature')}
                                                            title="Delete Signature"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*,image/webp"
                                                        className="h-9 text-xs cursor-pointer bg-white border-slate-200"
                                                        onChange={(e) => handleFileSelect(e, 'signature')}
                                                    />
                                                    <p className="text-[10px] text-slate-400 italic">Prefer transparent PNG backgrounds</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Marksheet QR Code */}
                                        <div className="space-y-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 relative group">
                                            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Marksheet QR Code</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-20 w-20 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center relative">
                                                        {formData.qrCode && !mediaErrors.qrCode ? (
                                                            <img
                                                                src={formData.qrCode}
                                                                alt="QR Code"
                                                                className="h-full w-full object-cover"
                                                                onError={() => handleMediaError('qrCode')}
                                                            />
                                                        ) : (
                                                            <div className="text-slate-100 text-3xl font-bold">QR</div>
                                                        )}
                                                    </div>
                                                    {formData.qrCode && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                                                            onClick={() => handleRemoveFile('qrCode')}
                                                            title="Delete QR Code"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*,image/webp"
                                                        className="h-9 text-xs cursor-pointer bg-white border-slate-200"
                                                        onChange={(e) => handleFileSelect(e, 'qrCode')}
                                                    />
                                                    <p className="text-[10px] text-slate-400 italic">For digital verification systems</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="session">
                            <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-indigo-500" /> Academic Sessions</CardTitle>
                                        <CardDescription>View and manage institution sessions.</CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openSessionDialog()}
                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Session
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border border-slate-100 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow>
                                                    <TableHead className="w-[200px]">Session Name</TableHead>
                                                    <TableHead>Duration</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Current</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {school?.sessions && school.sessions.length > 0 ? (
                                                    school.sessions.map((session) => (
                                                        <TableRow key={session.id} className="group transition-colors">
                                                            <TableCell className="font-semibold text-slate-700">{session.name}</TableCell>
                                                            <TableCell className="text-slate-500 text-xs">
                                                                {session.startDate ? new Date(session.startDate).toLocaleDateString() : 'N/A'} - {session.endDate ? new Date(session.endDate).toLocaleDateString() : 'N/A'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={session.status === 'Active' ? 'default' : session.status === 'Completed' ? 'secondary' : 'outline'}
                                                                    className={session.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                                                                >
                                                                    {session.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {session.isCurrent ? (
                                                                    <Badge className="bg-indigo-600 flex items-center w-fit gap-1 pr-2">
                                                                        <CheckCircle2 className="h-3 w-3" /> Active
                                                                    </Badge>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleManageSession('setCurrent', { id: session.id })}
                                                                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-7 text-[10px] uppercase font-bold tracking-wider"
                                                                    >
                                                                        Set Current
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button 
                                                                        type="button"
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        onClick={() => openSessionDialog(session)}
                                                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                        title="Edit Session"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    
                                                                     <Button 
                                                                        type="button"
                                                                        variant="ghost" 
                                                                        size="icon"
                                                                        disabled={session.isCurrent}
                                                                        onClick={() => handleManageSession('delete', { id: session.id })}
                                                                        className={cn(
                                                                            "h-8 w-8",
                                                                            session.isCurrent ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                        )}
                                                                        title={session.isCurrent ? "Cannot delete current session" : "Delete Session"}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                                                            No sessions configured yet. Click "Add Session" to start.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="mt-8 space-y-2 border-t pt-6 bg-slate-50/30 p-4 rounded-b-xl border-dashed">
                                        <Label htmlFor="sessionStartMonth" className="text-indigo-900">Institution Default Session Start Month *</Label>
                                        <Select
                                            value={String(formData.sessionStartMonth || '4')}
                                            onValueChange={(v) => handleChange('sessionStartMonth', parseInt(v, 10))}
                                        >
                                            <SelectTrigger id="sessionStartMonth" className="bg-white max-w-[240px]">
                                                <SelectValue placeholder="Select starting month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[
                                                    { name: "January", val: 1 }, { name: "February", val: 2 }, { name: "March", val: 3 },
                                                    { name: "April", val: 4 }, { name: "May", val: 5 }, { name: "June", val: 6 },
                                                    { name: "July", val: 7 }, { name: "August", val: 8 }, { name: "September", val: 9 },
                                                    { name: "October", val: 10 }, { name: "November", val: 11 }, { name: "December", val: 12 }
                                                ].map(month => (
                                                    <SelectItem key={month.val} value={String(month.val)}>{month.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-slate-400 italic font-medium">Global setting defining when new academic years typically begin for your institution.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings">
                            <Card className="border-t-4 border-t-indigo-500">
                                <CardHeader>
                                    <CardTitle>Regional & Currency</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Select
                                            value={formData.country || 'india'}
                                            onValueChange={(v) => handleChange('country', v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="india">India</SelectItem>
                                                <SelectItem value="usa">USA</SelectItem>
                                                <SelectItem value="uk">UK</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="language">Language</Label>
                                        <Input
                                            id="language"
                                            value={formData.language || ''}
                                            onChange={(e) => handleChange('language', e.target.value)}
                                            placeholder="e.g. English, Hindi, Bengali"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Select
                                            value={formData.currency || 'inr'}
                                            onValueChange={(v) => handleChange('currency', v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                                                <SelectItem value="usd">US Dollar ($)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="defaultPaymentMode">Default Payment Mode</Label>
                                        <Select
                                            value={formData.defaultPaymentMode || 'Cash'}
                                            onValueChange={(v) => handleChange('defaultPaymentMode', v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="None">None (Force Manual Selection)</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="QR Code">QR Code</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="DD">DD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="others">
                            <Card className="border-t-4 border-t-indigo-500">
                                <CardHeader>
                                    <CardTitle>Additional Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold">Select Week Off Day(s)</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                                    const days = (formData.weekOff || '').split(',').filter(Boolean);
                                                    const isSelected = days.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => {
                                                                const newDays = isSelected
                                                                    ? days.filter(d => d !== day)
                                                                    : [...days, day];
                                                                handleChange('weekOff', newDays.join(','));
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isSelected
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'
                                                                }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic">Select all days that apply to your school's weekly holidays.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gst">GST No.</Label>
                                            <Input
                                                id="gst"
                                                value={formData.gstNo || ''}
                                                onChange={(e) => handleChange('gstNo', e.target.value)}
                                                placeholder="22AAAAA0000A1Z5"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="upiId" className="flex items-center gap-2">Official UPI ID <Badge className="bg-indigo-100 text-indigo-700 h-5 px-1.5 text-[10px] uppercase font-bold border-none hover:bg-indigo-200">Required for QR Fees</Badge></Label>
                                            <Input
                                                id="upiId"
                                                value={formData.upiId || ''}
                                                onChange={(e) => handleChange('upiId', e.target.value)}
                                                placeholder="e.g. schoolname@sbi"
                                            />
                                            <p className="text-[10px] text-slate-400 italic font-medium">This UPI ID is used by the QR Fee Collection module to dynamically generate payment slips.</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <Label htmlFor="about">About School / Institute</Label>
                                        <Textarea
                                            id="about"
                                            value={formData.about || ''}
                                            onChange={(e) => handleChange('about', e.target.value)}
                                            placeholder="Write a brief description..."
                                            className="min-h-[100px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admissionNote" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Admission Form Note</Label>
                                        <Textarea
                                            id="admissionNote"
                                            value={formData.admissionNote || ''}
                                            onChange={(e) => handleChange('admissionNote', e.target.value)}
                                            placeholder="Add important notes that should appear on the admission form (e.g., terms, conditions, required documents)..."
                                            className="min-h-[120px] bg-slate-50/50"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </form>

                <ImageCropper
                    image={imageToCrop}
                    open={isCropperOpen}
                    onClose={() => setIsCropperOpen(false)}
                    onCropComplete={(croppedImage) => {
                        if (currentField) {
                            handleChange(currentField, croppedImage);
                        }
                        toast.success('Image cropped successfully! Remember to save changes.');
                    }}
                    aspect={currentField === 'signature' ? 3 / 1 : 1}
                />
            </div>

            {/* Session Management Dialog */}
            <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700">
                            {editingSession ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                            {editingSession ? 'Edit Session' : 'Add New Session'}
                        </DialogTitle>
                        <DialogDescription>Enter the academic period details below.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="sess-name">Session Name *</Label>
                            <Input
                                id="sess-name"
                                value={sessionForm.name || ''}
                                onChange={(e) => handleSessionFormChange('name', e.target.value)}
                                placeholder="e.g., Session 2024-25"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sess-start">Start Date</Label>
                                <Input
                                    id="sess-start"
                                    type="date"
                                    value={sessionForm.startDate || ''}
                                    onChange={(e) => handleSessionFormChange('startDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sess-end">End Date</Label>
                                <Input
                                    id="sess-end"
                                    type="date"
                                    value={sessionForm.endDate || ''}
                                    onChange={(e) => handleSessionFormChange('endDate', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sess-status">Phase / Status</Label>
                            <Select
                                value={sessionForm.status}
                                onValueChange={(v) => handleSessionFormChange('status', v)}
                            >
                                <SelectTrigger id="sess-status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planned">Planned</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSessionDialogOpen(false)}>Cancel</Button>
                        <Button
                            disabled={isSessionLoading || !sessionForm.name}
                            onClick={() => handleManageSession(editingSession ? 'edit' : 'add', sessionForm)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSessionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingSession ? 'Update Session' : 'Create Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Professional Profile Print View --- */}
            {/* --- PROFESSIONAL SCHOOL PORTFOLIO (Print Only) --- */}
            {/* --- PROFESSIONAL SCHOOL PORTFOLIO (Print Only) --- */}
            {/* --- PROFESSIONAL SCHOOL PORTFOLIO (Print Only) --- */}
            <div id="school-portfolio-print" className="hidden print:block">
                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 0 !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: 100% !important;
                            overflow: hidden !important;
                        }
                        main, .md\:pl-64, #__next, [data-reactroot] {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: 100% !important;
                            min-height: 100% !important;
                            box-shadow: none !important;
                            filter: none !important;
                            transform: none !important;
                        }
                        .space-y-6 {
                            display: none !important;
                        }
                        body {
                            visibility: hidden;
                            background: white !important;
                        }
                        #school-portfolio-print {
                            visibility: visible;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 210mm;
                            height: 295mm; /* 1mm safety buffer to prevent rounding overflows */
                            overflow: hidden;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        #school-portfolio-print * {
                            visibility: visible;
                        }
                    }
                `}</style>
                <div className="w-[210mm] h-[296mm] mx-auto bg-white relative border-[1px] border-slate-200 overflow-hidden text-slate-900">

                    {/* Watermark Background */}
                    {school?.logo && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                            <img src={school.logo} alt="" className="w-[180mm] h-[180mm] object-contain grayscale" />
                        </div>
                    )}

                    {/* --- HEADER SECTION (Top 40mm) --- */}
                    <div className="h-[40mm] px-10 flex items-center justify-between border-b-[3px] border-indigo-700 bg-indigo-50/20 relative z-20">
                        <div className="space-y-1">
                            {school?.tagline && (
                                <p className="text-sm font-bold text-indigo-700 uppercase tracking-widest">{school.tagline}</p>
                            )}
                            <h1 className="text-4xl font-serif font-black text-slate-900 leading-none tracking-tight uppercase">
                                {school?.name || 'School Name'}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pt-1">Official Institutional Portfolio</p>
                        </div>
                        {school?.logo && (
                            <img src={school.logo} alt="Logo" className="h-[28mm] w-auto object-contain drop-shadow-sm mix-blend-multiply" />
                        )}
                    </div>

                    {/* --- KEY STATS BAND (30mm) --- */}
                    <div className="h-[30mm] bg-slate-900 text-white flex items-center px-10 relative z-20">
                        <div className="grid grid-cols-4 w-full gap-8 divide-x divide-slate-700/50">
                            <div className="px-4 first:pl-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">School Code</p>
                                <p className="text-2xl font-sans font-extrabold text-white tracking-wide">{school?.code || 'N/A'}</p>
                            </div>
                            <div className="px-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Established</p>
                                <p className="text-2xl font-sans font-extrabold text-white tracking-wide">{school?.establishedYear || 'N/A'}</p>
                            </div>
                            <div className="px-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">UDISE Code</p>
                                <p className="text-2xl font-sans font-extrabold text-white tracking-wide">{school?.udise || 'N/A'}</p>
                            </div>
                            <div className="px-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Affiliation</p>
                                <p className="text-lg font-sans font-extrabold text-white leading-tight break-words">{school?.affiliationCode || school?.affiliation || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT COLUMNS (Remaining Height) --- */}
                    <div className="p-10 grid grid-cols-12 gap-10 items-start relative z-10">

                        {/* LEFT COLUMN (4 Cols) - Contact & Operations */}
                        <div className="col-span-4 space-y-8 border-r border-slate-200 pr-10 min-h-[140mm]">

                            <section className="space-y-4">
                                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-800 border-b border-indigo-200 pb-2">
                                    Contact Details
                                </h2>
                                <div className="space-y-3">
                                    <DetailBlock label="Primary Email" value={school?.email} />
                                    <DetailBlock label="Contact No." value={school?.contactNumber} />
                                    <DetailBlock label="Landline" value={school?.landline} />
                                    <DetailBlock label="WhatsApp" value={school?.whatsapp} />
                                    <DetailBlock label="Website" value={school?.website} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-800 border-b border-indigo-200 pb-2">
                                    Operational Specs
                                </h2>
                                <div className="space-y-3">
                                    <DetailBlock label="Academic Session" value={getAcademicSessionLabel()} />
                                    <DetailBlock label="Language" value={getLanguageLabel()} />
                                    <DetailBlock label="Weekly Off" value={school?.weekOff?.split(',').filter(Boolean).join(', ')} />
                                    <DetailBlock label="Currency" value={school?.currency?.toUpperCase()} />
                                </div>
                            </section>

                        </div>

                        {/* RIGHT COLUMN (8 Cols) - About & Profile */}
                        <div className="col-span-8 space-y-8 pl-2">

                            {school?.about && (
                                <section>
                                    <h2 className="text-xs font-black uppercase tracking-widest text-indigo-800 border-b border-indigo-200 pb-2 mb-4">
                                        About Institution
                                    </h2>
                                    <p className="text-sm font-serif text-slate-700 leading-relaxed text-justify">
                                        {school.about}
                                    </p>
                                </section>
                            )}

                            <section>
                                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-800 border-b border-indigo-200 pb-2 mb-4">
                                    Official Address
                                </h2>
                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-base font-serif font-medium text-slate-800 leading-relaxed w-3/4">
                                        {school?.address || 'No address provided.'}
                                        {school?.city && `, ${school.city}`}
                                        {school?.state && `, ${school.state}`}
                                        {school?.pincode && ` - ${school.pincode}`}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{school?.country}</p>
                                </div>
                            </section>

                            {/* Additional Metadata Grid */}
                            <section>
                                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-800 border-b border-indigo-200 pb-2 mb-4">
                                    Registration Metadata
                                </h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailBlock label="Short Name (SMS)" value={school?.shortName} />
                                    <DetailBlock label="GST Registration" value={school?.gstNo || 'Not Applicable'} />
                                </div>
                            </section>

                        </div>

                    </div>

                    {/* --- FOOTER SECTION (Bottom 30mm) --- */}
                    <div className="absolute bottom-0 left-0 w-full h-[30mm] px-10 py-6 border-t border-slate-200 flex items-end justify-between bg-white z-20">

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded">KuMMi</span>
                                <span className="text-[10px] tracking-widest uppercase text-slate-400">Official Digital Partner</span>
                            </div>
                            <p className="text-[9px] font-mono text-slate-400">
                                DOMAIN_ID: {school?.id?.split('-')[0].toUpperCase()} • GEN_DATE: {new Date().toLocaleDateString('en-GB').toUpperCase()}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {school?.signature ? (
                                <img src={school.signature} alt="Sig" className="h-10 object-contain" />
                            ) : (
                                <div className="h-8 w-32 border-b-2 border-slate-300 mb-1"></div>
                            )}
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.05em]">Principal / Secretary</p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </>
    );

    function DetailBlock({ label, value }: { label: string; value?: string }) {
        if (!value) return null;
        return (
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</span>
                <span className="font-sans font-semibold text-slate-800 text-sm leading-snug">{value}</span>
            </div>
        );
    }
}
