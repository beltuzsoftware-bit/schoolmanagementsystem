'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import {
    Bus, Route, MapPin, Plus, Save, Trash2, Edit2, Search,
    ArrowUpDown, Users, ChevronRight, X, AlertCircle,
    Clock, Navigation, CheckCircle2, MoreHorizontal, LayoutGrid, List, Tag, UserPlus, Send,
    Loader2, Upload, IndianRupee, FileText, User, ChevronDown, UploadCloud, Eye, Droplet, Calendar, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
    getTransportRoutes, saveTransportRoute, deleteTransportRoute,
    getTransportVehicles, saveTransportVehicle, deleteTransportVehicle,
    getTransportAllocations, assignTransportToStudents, removeTransportAllocation, updateTransportAllocationMonths, updateTransportAllocation,
    getTransportVehicleTypes, saveTransportVehicleType, deleteTransportVehicleType,
    getTransportDrivers, saveTransportDriver, deleteTransportDriver
} from '@/app/actions/transport';
import { getStudents, getSchool, updateSchool } from '@/app/actions';
import { INITIAL_CLASS_SETUPS, INITIAL_SECTIONS, INITIAL_CATEGORIES } from '@/lib/student-constants';
import ConfirmationModal from '@/components/school-admin/confirmation-modal';
import FormSection from '@/components/school-admin/form-section';
import {
    TransportRoute, TransportVehicle, StudentTransportAllocation,
    Student, TransportStop, TransportVehicleType, TransportDriver, School
} from '@/types';

const COLOR_MAP = {
    indigo: '#4F39F6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    blue: '#3b82f6',
    orange: '#f97316',
    purple: '#a855f7',
    slate: '#64748b',
    pink: '#ec4899',
    cyan: '#06b6d4',
};

const BG_COLORS: Record<string, string> = {
    indigo: 'bg-indigo-100 border-indigo-200/60 shadow-indigo-100/20',
    emerald: 'bg-emerald-100 border-emerald-200/60 shadow-emerald-100/20',
    amber: 'bg-amber-100 border-amber-200/60 shadow-amber-100/20',
    rose: 'bg-rose-100 border-rose-200/60 shadow-rose-100/20',
    blue: 'bg-blue-100 border-blue-200/60 shadow-blue-100/20',
    orange: 'bg-orange-100 border-orange-200/60 shadow-orange-100/20',
    purple: 'bg-purple-100 border-purple-200/60 shadow-purple-100/20',
    slate: 'bg-slate-100 border-slate-200/60 shadow-slate-100/20',
    pink: 'bg-pink-100 border-pink-200/60 shadow-pink-100/20',
    cyan: 'bg-cyan-100 border-cyan-200/60 shadow-cyan-100/20',
};

const LABEL_COLORS: Record<string, string> = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    slate: 'text-slate-600',
    pink: 'text-pink-600',
    cyan: 'text-cyan-600',
};

export default function TransportPage() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('routes');

    // Data State
    const [routes, setRoutes] = useState<TransportRoute[]>([]);
    const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<TransportVehicleType[]>([]);
    const [allocations, setAllocations] = useState<StudentTransportAllocation[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [drivers, setDrivers] = useState<TransportDriver[]>([]);

    // Route Management State
    const [isAddingRoute, setIsAddingRoute] = useState(false);
    const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
    const [routeName, setRouteName] = useState('');
    const [routeColor, setRouteColor] = useState('indigo');
    const [routeStops, setRouteStops] = useState<TransportStop[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [routeSearchQuery, setRouteSearchQuery] = useState('');
    const [routeViewMode, setRouteViewMode] = useState<'grid' | 'list'>('grid');
    const [routeAmount, setRouteAmount] = useState<number>(0);
    const [routeAmountType, setRouteAmountType] = useState<string>('Fixed (₹)');
    const [routeStartDate, setRouteStartDate] = useState<string>('');
    const [routeGraceDays, setRouteGraceDays] = useState<number>(10);
    const [vehicleOn, setVehicleOn] = useState<boolean>(true);

    // Vehicle Management State
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
    const [vehicleViewMode, setVehicleViewMode] = useState<'grid' | 'list'>('grid');
    const [formDriverName, setFormDriverName] = useState('');
    const [formDriverPhone, setFormDriverPhone] = useState('');

    // Vehicle Type State
    const [isAddingType, setIsAddingType] = useState(false);
    const [editingType, setEditingType] = useState<TransportVehicleType | null>(null);
    const [typeName, setTypeName] = useState('');
    const [typeColor, setTypeColor] = useState('indigo');

    // Allocation State
    const [selectedRouteForAlloc, setSelectedRouteForAlloc] = useState<string>('');
    const [selectedStopForAlloc, setSelectedStopForAlloc] = useState<string>('');
    const [allocationStartDate, setAllocationStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [allocationEndDate, setAllocationEndDate] = useState<string>('');
    const [editingAllocation, setEditingAllocation] = useState<StudentTransportAllocation | null>(null);
    const [allocSearchQuery, setAllocSearchQuery] = useState('');
    const [allocClassFilter, setAllocClassFilter] = useState<string>('');
    const [allocSectionFilter, setAllocSectionFilter] = useState<string>('');
    const [allocGenderFilter, setAllocGenderFilter] = useState<string>('all');

    const [allocCategoryFilter, setAllocCategoryFilter] = useState<string>('all');
    const [allocSortField, setAllocSortField] = useState<'name' | 'rollNumber' | 'admissionNumber'>('name');
    const [allocSortOrder, setAllocSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [schoolConfig, setSchoolConfig] = useState<School | null>(null);
    const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

    // Driver Management State
    const [isAddingDriver, setIsAddingDriver] = useState(false);
    const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);
    const [driverSearchQuery, setDriverSearchQuery] = useState('');
    const [driverViewMode, setDriverViewMode] = useState<'grid' | 'list'>('grid');
    const [showExpiryHighlight, setShowExpiryHighlight] = useState(true);
    const [criticalExpiryDays, setCriticalExpiryDays] = useState<number>(30);
    const [warningExpiryDays, setWarningExpiryDays] = useState<number>(60);
    const [driverDocs, setDriverDocs] = useState<{ title: string; file: string; content: string }[]>([]);
    const [driverPhoto, setDriverPhoto] = useState<string>('');
    const [isReadingField, setIsReadingField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ title: string; content: string } | null>(null);
    const [croppingImg, setCroppingImg] = useState<{ src: string; aspect: number; onComplete: (croppedStr: string) => void } | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Calendar Modal State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedAllocationForCalendar, setSelectedAllocationForCalendar] = useState<StudentTransportAllocation | null>(null);
    const [tempSelectedMonths, setTempSelectedMonths] = useState<string[]>([]);

    const [isCopyRouteOpen, setIsCopyRouteOpen] = useState(false);
    const [routeToCopy, setRouteToCopy] = useState<TransportRoute | null>(null);
    const [copyRouteNewName, setCopyRouteNewName] = useState('');

    const MONTHS_LIST = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);

    const getSessionMonths = useCallback(() => {
        const startMonth = schoolConfig?.sessionStartMonth ?? 3; // Default to April
        const sessionMonths = [];
        for (let i = 0; i < 12; i++) {
            sessionMonths.push(MONTHS_LIST[(startMonth + i) % 12]);
        }
        return sessionMonths;
    }, [schoolConfig, MONTHS_LIST]);

    const handleUpdateExpiryThresholds = async (crit: number, warn: number) => {
        if (!schoolConfig) return;
        try {
            const updatedConfig = { criticalExpiryDays: crit, warningExpiryDays: warn };
            const result = await updateSchool(schoolConfig.id, { transportConfig: updatedConfig } as any);
            if (result.success) {
                toast.success('Expiry alert thresholds updated successfully');
                setSchoolConfig(prev => prev ? { ...prev, transportConfig: updatedConfig } as any : null);
            } else {
                toast.error('Failed to save alert thresholds');
            }
        } catch (error) {
            console.error('Error updating thresholds:', error);
            toast.error('An error occurred while saving thresholds');
        }
    };

    const handleThresholdBlur = (type: 'critical' | 'warning', value: string) => {
        const numVal = Math.max(1, parseInt(value) || 1);
        let nextCrit = criticalExpiryDays;
        let nextWarn = warningExpiryDays;
        if (type === 'critical') {
            nextCrit = numVal;
            setCriticalExpiryDays(numVal);
        } else {
            nextWarn = numVal;
            setWarningExpiryDays(numVal);
        }
        handleUpdateExpiryThresholds(nextCrit, nextWarn);
    };

    const handleThresholdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'critical' | 'warning') => {
        if (e.key === 'Enter') e.currentTarget.blur();
    };

    const getDaysRemaining = (expiryDateStr?: string): number | null => {
        if (!expiryDateStr) return null;
        try {
            const expiryDate = new Date(expiryDateStr);
            if (isNaN(expiryDate.getTime())) return null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expiryDate.setHours(0, 0, 0, 0);
            return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } catch (e) {
            return null;
        }
    };

    const getExpiryContainerClass = (expiryDateStr?: string) => {
        const days = getDaysRemaining(expiryDateStr);
        if (days === null) return '';
        if (days <= criticalExpiryDays) {
            return 'bg-rose-600 text-white animate-pulse p-2 rounded-xl shadow-md shadow-rose-200/30';
        } else if (days <= warningExpiryDays) {
            return 'bg-amber-500 text-white p-2 rounded-xl shadow-md shadow-amber-100/30';
        }
        return '';
    };

    const getExpiryLabelClass = (expiryDateStr?: string) => {
        const days = getDaysRemaining(expiryDateStr);
        return (days !== null && days <= warningExpiryDays) ? 'text-white/80' : 'text-slate-500';
    };

    const getExpiryValueClass = (expiryDateStr?: string) => {
        const days = getDaysRemaining(expiryDateStr);
        return (days !== null && days <= warningExpiryDays) ? 'text-white font-black' : 'text-slate-800';
    };

    const getExpiryBadgeClass = (expiryDateStr?: string) => {
        const days = getDaysRemaining(expiryDateStr);
        if (days === null) return '';
        if (days <= criticalExpiryDays) {
            return 'bg-rose-600 text-white px-2 py-0.5 rounded-lg font-black animate-pulse inline-block';
        } else if (days <= warningExpiryDays) {
            return 'bg-amber-500 text-white px-2 py-0.5 rounded-lg font-black inline-block';
        }
        return '';
    };

    useEffect(() => {
        if (editingVehicle) {
            setFormDriverName(editingVehicle.driverName || 'unassigned');
            setFormDriverPhone(editingVehicle.driverPhone || '');
        } else {
            setFormDriverName('unassigned');
            setFormDriverPhone('');
        }
    }, [editingVehicle]);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        setLoading(true);
        const storedUser = localStorage.getItem('kummi_user');
        const schoolId = storedUser ? JSON.parse(storedUser).schoolId : null;

        const [rts, vhs, vts, allocs, studs, drvs, sch] = await Promise.all([
            getTransportRoutes(),
            getTransportVehicles(),
            getTransportVehicleTypes(),
            getTransportAllocations(),
            schoolId ? getStudents(schoolId) : Promise.resolve([]),
            getTransportDrivers(),
            schoolId ? getSchool(schoolId) : Promise.resolve(null)
        ]);

        setRoutes(rts);
        setVehicles(vhs);
        setVehicleTypes(vts);
        setAllocations(allocs);
        setAllStudents(studs);
        setDrivers(drvs);
        setSchoolConfig(sch as any);
        if (sch && (sch as any).transportConfig) {
            setCriticalExpiryDays((sch as any).transportConfig.criticalExpiryDays ?? 30);
            setWarningExpiryDays((sch as any).transportConfig.warningExpiryDays ?? 60);
        } else {
            setCriticalExpiryDays(30);
            setWarningExpiryDays(60);
        }
        setLoading(false);

        // Set default end date to current session end date
        if (sch && sch.sessions && sch.currentSession) {
            const currentSession = sch.sessions.find((s: any) => s.id === sch.currentSession || s.name === sch.currentSession);
            if (currentSession?.endDate) {
                try {
                    const date = new Date(currentSession.endDate);
                    if (!isNaN(date.getTime())) {
                        setAllocationEndDate(date.toISOString().split('T')[0]);
                    }
                } catch (e) {
                    console.error("Failed to parse session end date", e);
                }
            }
        }
    };

    // --- ROUTE HANDLERS ---
    const handleAddStop = () => {
        const newStop: TransportStop = {
            id: `stop_${Date.now()}`,
            name: '',
            morningPickupTime: '',
            eveningDropTime: '',
            distanceKm: 0,
            monthlyFee: 0,
            order: routeStops.length + 1
        };
        setRouteStops([...routeStops, newStop]);
    };

    const handleUpdateStop = (id: string, field: keyof TransportStop, value: any) => {
        setRouteStops(routeStops.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveStop = (id: string) => {
        const stop = routeStops.find(s => s.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Remove Stop',
            message: `Are you sure you want to remove the stop "${stop?.name || 'this stop'}" from the route?`,
            onConfirm: () => {
                setRouteStops(routeStops.filter(s => s.id !== id));
            }
        });
    };

    const handleCopyStop = (id: string) => {
        const stop = routeStops.find(s => s.id === id);
        if (!stop) return;
        const stopIndex = routeStops.findIndex(s => s.id === id);
        const copiedStop: TransportStop = {
            ...stop,
            id: `stop_${Date.now()}`,
            name: stop.name ? `${stop.name} (Copy)` : '',
            order: stop.order + 1
        };
        // Insert the copy right after the original stop
        const updatedStops = [
            ...routeStops.slice(0, stopIndex + 1),
            copiedStop,
            ...routeStops.slice(stopIndex + 1)
        ].map((s, idx) => ({ ...s, order: idx + 1 }));
        setRouteStops(updatedStops);
        toast.success(`Stop copied — update the name and details`);
    };

    const handleSaveRoute = async () => {
        if (!routeName) {
            toast.error("Route name is required");
            return;
        }

        const routeData: TransportRoute = {
            id: editingRoute?.id || `route_${Date.now()}`,
            name: routeName,
            color: routeColor,
            vehicleId: selectedVehicleId,
            stops: routeStops,
            notes: editingRoute?.notes,
            amount: routeAmount,
            amountType: routeAmountType,
            startDate: routeStartDate,
            graceDays: routeGraceDays,
            vehicleOn: vehicleOn
        };

        const result = await saveTransportRoute(routeData);
        if (result.success) {
            toast.success(result.message);
            setIsAddingRoute(false);
            setEditingRoute(null);
            setRouteName('');
            setRouteStops([]);
            setSelectedVehicleId('');
            setRouteAmount(0);
            setRouteAmountType('Fixed (₹)');
            setRouteStartDate('');
            setRouteGraceDays(10);
            setVehicleOn(true);
            init();
        } else {
            toast.error(result.message);
        }
    };

    const handleEditRoute = (route: TransportRoute) => {
        setEditingRoute(route);
        setRouteName(route.name);
        setRouteColor(route.color || 'indigo');
        setRouteStops(route.stops);
        setSelectedVehicleId(route.vehicleId || '');
        setRouteAmount(route.amount ?? 0);
        setRouteAmountType(route.amountType ?? 'Fixed (₹)');
        setRouteStartDate(route.startDate ?? '');
        setRouteGraceDays(route.graceDays ?? 10);
        setVehicleOn(route.vehicleOn ?? true);
        setIsAddingRoute(true);
    };

    const handleDeleteRoute = async (id: string) => {
        const route = routes.find(r => r.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Route',
            message: `Are you sure you want to delete the route "${route?.name || 'this route'}"? This action cannot be undone.`,
            onConfirm: async () => {
                const result = await deleteTransportRoute(id);
                if (result.success) {
                    toast.success(result.message);
                    init();
                }
            }
        });
    };

    const handleCopyRoute = (route: TransportRoute) => {
        setRouteToCopy(route);
        setCopyRouteNewName(route.name ? `${route.name} Copy` : '');
        setIsCopyRouteOpen(true);
    };

    const handleSaveCopyRoute = async () => {
        if (!routeToCopy) return;
        const trimmedName = copyRouteNewName.trim();
        if (!trimmedName) {
            toast.error("Route name is required");
            return;
        }

        const copiedRoute: TransportRoute = {
            ...routeToCopy,
            id: `route_${Date.now()}`,
            name: trimmedName,
            stops: routeToCopy.stops.map((stop, idx) => ({
                ...stop,
                id: `stop_${Date.now()}_${idx}`
            }))
        };

        const result = await saveTransportRoute(copiedRoute);
        if (result.success) {
            toast.success(`Route duplicated as "${copiedRoute.name}"`);
            setIsCopyRouteOpen(false);
            setRouteToCopy(null);
            setCopyRouteNewName('');
            init();
        } else {
            toast.error(result.message || 'Failed to duplicate route');
        }
    };

    // --- VEHICLE HANDLERS ---
    const handleSaveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const vehicleData: TransportVehicle = {
            id: editingVehicle?.id || `vh_${Date.now()}`,
            vehicleNumber: (formData.get('vehicleNumber') as string || '').toUpperCase(),
            vehicleType: formData.get('vehicleType') as any,
            vehicleModel: formData.get('vehicleModel') as string,
            yearMade: formData.get('yearMade') as string,
            registrationNumber: formData.get('registrationNumber') as string,
            chasisNumber: formData.get('chasisNumber') as string,
            capacity: parseInt(formData.get('capacity') as string) || 0,
            driverName: formData.get('driverName') as string,
            driverPhone: formData.get('driverPhone') as string,
            insuranceExpiry: formData.get('insuranceExpiry') as string,
        };

        const result = await saveTransportVehicle(vehicleData);
        if (result.success) {
            toast.success(result.message);
            setIsAddingVehicle(false);
            setEditingVehicle(null);
            init();
        }
    };

    const handleSaveType = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!typeName.trim()) {
            toast.error("Type name is required");
            return;
        }

        const typeData: TransportVehicleType = {
            id: editingType?.id || `vt_${Date.now()}`,
            name: typeName,
            color: typeColor,
        };

        const result = await saveTransportVehicleType(typeData);
        if (result.success) {
            toast.success(result.message);
            setIsAddingType(false);
            setEditingType(null);
            setTypeName('');
            setTypeColor('indigo');
            init();
        } else {
            toast.error(result.message);
        }
    };

    const handleEditType = (type: TransportVehicleType) => {
        setEditingType(type);
        setTypeName(type.name);
        setTypeColor(type.color || 'indigo');
        setIsAddingType(true);
    };

    const handleDeleteType = async (id: string) => {
        const type = vehicleTypes.find(t => t.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Vehicle Type',
            message: `Are you sure you want to delete the classification "${type?.name || 'this type'}"?`,
            onConfirm: async () => {
                const promise = deleteTransportVehicleType(id);
                toast.promise(promise, {
                    loading: 'Deleting vehicle type...',
                    success: (data) => {
                        if (data.success) {
                            init();
                            return data.message;
                        }
                        throw new Error(data.message);
                    },
                    error: (err) => err.message || 'Failed to delete vehicle type',
                });
            }
        });
    };

    // --- DRIVER HANDLERS ---
    const onCropComplete = useCallback((_area: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleGenerateCroppedImage = async () => {
        if (!croppingImg || !croppedAreaPixels) return;
        try {
            const canvas = document.createElement('canvas');
            const img = new Image();
            img.src = croppingImg.src;
            await new Promise((resolve) => (img.onload = resolve));

            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(
                    img,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );
                const base64Image = canvas.toDataURL('image/jpeg');
                croppingImg.onComplete(base64Image);
                setCroppingImg(null);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveDriver = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const driverData: TransportDriver = {
            id: editingDriver?.id || `dr_${Date.now()}`,
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            emergencyContact: formData.get('emergencyContact') as string,
            aadharNumber: formData.get('aadharNumber') as string,
            panNumber: formData.get('panNumber') as string,
            licenseNumber: formData.get('licenseNumber') as string,
            licenseExpiry: formData.get('licenseExpiry') as string,
            licenseDocUrl: formData.get('licenseDocUrl') as string,
            address: formData.get('address') as string,
            experience: formData.get('experience') as string,
            salaryAmount: parseFloat(formData.get('salaryAmount') as string) || 0,
            bankAccountNo: formData.get('bankAccountNo') as string,
            bankIfsc: formData.get('bankIfsc') as string,
            bankName: formData.get('bankName') as string,
            otherDocsUrl: '', 
            documents: driverDocs,
            notes: formData.get('notes') as string,
            photo: driverPhoto,
            dob: formData.get('dob') as string,
            dateOfJoining: formData.get('dateOfJoining') as string,
            bloodGroup: formData.get('bloodGroup') as string,
        };

        const result = await saveTransportDriver(driverData);
        if (result.success) {
            toast.success(result.message);
            setIsAddingDriver(false);
            setEditingDriver(null);
            setDriverDocs([]);
            init();
        } else {
            toast.error(result.message);
        }
    };

    const handleEditDriver = (driver: TransportDriver) => {
        setEditingDriver(driver);
        // Ensure at least 4 slots for UI consistency, preserving existing documents
        const existingDocs = (driver.documents || []).map(d => ({
            title: d.title,
            file: d.file,
            content: d.content || ''
        }));
        const defaultTitles = ['Aadhar Card', 'PAN Card', 'Driving License', 'Bank Passbook'];
        const docs = [...existingDocs];
        
        while (docs.length < 4) {
            const nextIdx = docs.length;
            docs.push({ 
                title: defaultTitles[nextIdx] || `Document ${nextIdx + 1}`, 
                file: '', 
                content: '' 
            });
        }
        setDriverDocs(docs);
        setDriverPhoto(driver.photo || '');
        setIsAddingDriver(true);
    };

    const handleDeleteDriver = async (id: string) => {
        const driver = drivers.find(d => d.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Driver',
            message: `Are you sure you want to delete the record for "${driver?.name || 'this driver'}"?`,
            onConfirm: async () => {
                const result = await deleteTransportDriver(id);
                if (result.success) {
                    toast.success(result.message);
                    init();
                } else {
                    toast.error(result.message);
                }
            }
        });
    };

    // --- ALLOCATION HANDLERS ---
    const handleAssignTransport = async () => {
        if (!selectedRouteForAlloc || !selectedStopForAlloc || selectedStudentIds.length === 0) {
            toast.error("Please select route, stop, and at least one student");
            return;
        }

        setLoading(true);
        try {
            const res = await assignTransportToStudents(selectedStudentIds, selectedRouteForAlloc, selectedStopForAlloc, 'Both', schoolConfig?.id, allocationStartDate, allocationEndDate);
            setLoading(false);
            if (res.success) {
                toast.success(res.message);
                setSelectedStudentIds([]);
                setAllocSearchQuery('');
                setSelectedRouteForAlloc('');
                setSelectedStopForAlloc('');
                init();
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            setLoading(false);
            toast.error("Failed to assign transport");
        }
    };

    const handleEditAllocation = (alloc: StudentTransportAllocation) => {
        setEditingAllocation(alloc);
        setSelectedRouteForAlloc(alloc.routeId);
        setSelectedStopForAlloc(alloc.stopId);
        setAllocationStartDate(alloc.effectiveFrom ? new Date(alloc.effectiveFrom).toISOString().split('T')[0] : '');
        setAllocationEndDate(alloc.effectiveUntil ? new Date(alloc.effectiveUntil).toISOString().split('T')[0] : '');
    };

    const handleSaveEditAllocation = async () => {
        if (!editingAllocation || !selectedRouteForAlloc || !selectedStopForAlloc) {
            toast.error("Please select route and stop");
            return;
        }
        
        setLoading(true);
        try {
            const res = await updateTransportAllocation(
                editingAllocation.id,
                selectedRouteForAlloc,
                selectedStopForAlloc,
                allocationStartDate,
                allocationEndDate
            );
            setLoading(false);
            if (res.success) {
                toast.success(res.message);
                setEditingAllocation(null);
                setSelectedRouteForAlloc('');
                setSelectedStopForAlloc('');
                init();
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            setLoading(false);
            toast.error("Failed to update allocation");
        }
    };

    const openCalendar = (alloc: StudentTransportAllocation) => {
        setSelectedAllocationForCalendar(alloc);
        
        let initialMonths = alloc.activeMonths;
        if (!initialMonths || initialMonths.length === 0) {
            const allSessMonths = getSessionMonths();
            const currentMonthName = MONTHS_LIST[new Date().getMonth()];
            const currentIndex = allSessMonths.indexOf(currentMonthName);
            initialMonths = currentIndex !== -1 ? allSessMonths.slice(currentIndex) : allSessMonths;
        }
        
        setTempSelectedMonths(initialMonths);
        setIsCalendarOpen(true);
    };

    const handleSaveCalendar = async () => {
        if (!selectedAllocationForCalendar) return;

        setLoading(true);
        const res = await updateTransportAllocationMonths(selectedAllocationForCalendar.id, tempSelectedMonths);
        setLoading(false);

        if (res.success) {
            toast.success('Calendar updated successfully');
            setIsCalendarOpen(false);
            init();
        } else {
            toast.error(res.message);
        }
    };

    const availableClasses = useMemo(() => {
        if (schoolConfig?.useCustomClasses && schoolConfig.classes && schoolConfig.classes.length > 0) {
            return schoolConfig.classes.map((c: any) => c.name);
        }
        return INITIAL_CLASS_SETUPS.map((c: any) => c.name);
    }, [schoolConfig]);

    const availableSections = useMemo(() => {
        if (schoolConfig?.useCustomSections && schoolConfig.sections && schoolConfig.sections.length > 0) {
            return schoolConfig.sections;
        }
        return INITIAL_SECTIONS;
    }, [schoolConfig]);

    const availableCategories = useMemo(() => {
        if (schoolConfig?.useCustomCategories && schoolConfig.categories && schoolConfig.categories.length > 0) {
            return schoolConfig.categories;
        }
        return INITIAL_CATEGORIES;
    }, [schoolConfig]);

    const filteredStudentsForAlloc = useMemo(() => {
        // Return empty if no class or section selected AND no search query is active
        if ((!allocClassFilter || !allocSectionFilter) && !allocSearchQuery) return [];

        let result = allStudents.filter(s => {
            const searchMatch = !allocSearchQuery ||
                s.name.toLowerCase().includes(allocSearchQuery.toLowerCase()) ||
                s.admissionNumber.toLowerCase().includes(allocSearchQuery.toLowerCase());
            
            // If searching globally (no class filter), classMatch is true
            const classMatch = !allocClassFilter || allocClassFilter === 'all' || (() => {
                if (!s.className) return false;
                const sCls = s.className.toLowerCase().replace(/^class\s+/i, '').trim();
                const fCls = allocClassFilter.toLowerCase().replace(/^class\s+/i, '').trim();
                return sCls === fCls;
            })();

            const sectionMatch = !allocSectionFilter || allocSectionFilter === 'all' || s.section === allocSectionFilter;
            const genderMatch = allocGenderFilter === 'all' || s.gender === allocGenderFilter;
            const categoryMatch = allocCategoryFilter === 'all' || s.category === allocCategoryFilter;


            return searchMatch && classMatch && sectionMatch && genderMatch && categoryMatch;
        });

        // Apply Sorting
        return result.sort((a, b) => {
            const valA = a[allocSortField] || '';
            const valB = b[allocSortField] || '';
            const factor = allocSortOrder === 'asc' ? 1 : -1;
            return valA.toString().localeCompare(valB.toString()) * factor;
        });
    }, [allStudents, allocSearchQuery, allocClassFilter, allocSectionFilter, allocGenderFilter, allocCategoryFilter, allocSortField, allocSortOrder]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const unallocatedIds = filteredStudentsForAlloc
                .filter(s => !allocations.some(a => a.studentId === s.id))
                .map(s => s.id);
            setSelectedStudentIds(unallocatedIds);
        } else {
            setSelectedStudentIds([]);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            {/* Header Section */}
            <div className="flex items-center gap-6 mb-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 transition-all duration-500 hover:rotate-6 group">
                        <Bus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transport Management</h1>
                </div>
            </div>

            <Tabs 
                value={activeTab} 
                onValueChange={(val) => {
                    setActiveTab(val);
                    setIsAddingRoute(false);
                    setEditingRoute(null);
                    setIsAddingVehicle(false);
                    setEditingVehicle(null);
                    setIsAddingType(false);
                    setEditingType(null);
                    setIsAddingDriver(false);
                    setEditingDriver(null);
                    setAllocSearchQuery('');
                    setSelectedStudentIds([]);
                }} 
                className="w-full"
            >
                <div className="flex items-center justify-between mb-8 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50">
                    <TabsList className="bg-slate-200/20 p-1 rounded-xl h-11 w-fit flex border-none shadow-none">
                        <TabsTrigger 
                            value="routes" 
                            className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                        >
                            Route
                        </TabsTrigger>
                        <TabsTrigger 
                            value="allocation" 
                            className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                        >
                            Allocation
                        </TabsTrigger>
                        <TabsTrigger 
                            value="vehicles" 
                            className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                        >
                            Vehicles
                        </TabsTrigger>
                        <TabsTrigger 
                            value="vehicle_types" 
                            className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                        >
                            Vehicles Types
                        </TabsTrigger>
                        <TabsTrigger 
                            value="drivers" 
                            className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                        >
                            Driver
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-6 pr-4">
                        {activeTab === 'allocation' ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Allocated:</span>
                                    <span className="text-sm font-black text-indigo-600">{allocations.length}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Revenue:</span>
                                    <span className="text-sm font-black text-emerald-600">
                                        ₹{allocations.reduce((sum, a) => {
                                            const route = routes.find((r: TransportRoute) => r.id === a.routeId);
                                            const stop = route?.stops.find((s: TransportStop) => s.id === a.stopId);
                                            return sum + (stop?.monthlyFee || 0);
                                        }, 0).toLocaleString()}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Routes:</span>
                                    <span className="text-sm font-black text-indigo-600">{routes.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Vehicles:</span>
                                    <span className="text-sm font-black text-indigo-600">{vehicles.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Drivers:</span>
                                    <span className="text-sm font-black text-indigo-600">{drivers.length}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <TabsContent value="routes" className="mt-0 outline-none space-y-8">
                    {!isAddingRoute ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Master Route Repository</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search routes..." 
                                            value={routeSearchQuery}
                                            onChange={(e) => setRouteSearchQuery(e.target.value)}
                                            className="border-none shadow-none focus-visible:ring-0 h-7 text-xs min-w-[250px] font-bold"
                                        />
                                    </div>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <Button size="sm" variant="ghost" onClick={() => setRouteViewMode('grid')} className={`h-8 w-8 p-0 rounded-lg ${routeViewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setRouteViewMode('list')} className={`h-8 w-8 p-0 rounded-lg ${routeViewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List className="h-4 w-4" /></Button>
                                    </div>
                                    {!isAddingRoute && (
                                        <Button onClick={() => { setIsAddingRoute(true); setEditingRoute(null); setRouteStops([]); setRouteName(''); setSelectedVehicleId(''); setRouteAmount(0); setRouteAmountType('Fixed (₹)'); setRouteStartDate(''); setRouteGraceDays(10); setVehicleOn(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                                            <Plus className="h-4 w-4" /> ADD ROUTE
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {routeViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {routes
                                        .filter(r => r.name.toLowerCase().includes(routeSearchQuery.toLowerCase()))
                                        .map((route, idx) => {
                                            const vehicle = vehicles.find(v => v.id === route.vehicleId);
                                            const routeAllocs = allocations.filter(a => a.routeId === route.id);
                                            
                                            const palette = [
                                                { card: 'bg-emerald-100 border-emerald-200/60', header: 'bg-emerald-50', label: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
                                                { card: 'bg-indigo-100 border-indigo-200/60', header: 'bg-indigo-50', label: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
                                                { card: 'bg-amber-100 border-amber-200/60', header: 'bg-amber-50', label: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
                                                { card: 'bg-rose-100 border-rose-200/60', header: 'bg-rose-50', label: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
                                                { card: 'bg-blue-100 border-blue-200/60', header: 'bg-blue-50', label: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
                                                { card: 'bg-purple-100 border-purple-200/60', header: 'bg-purple-50', label: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
                                                { card: 'bg-cyan-100 border-cyan-200/60', header: 'bg-cyan-50', label: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-400' },
                                                { card: 'bg-orange-100 border-orange-200/60', header: 'bg-orange-50', label: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
                                            ];
                                            // Always rotate by index so every card gets a distinct color
                                            const p = palette[idx % palette.length];

                                            return (
                                                <div key={route.id} className={cn(
                                                    "border shadow-sm rounded-3xl overflow-hidden group transition-all duration-500 flex flex-col hover:shadow-lg hover:scale-[1.01]",
                                                    p.card
                                                )}>

                                                    {/* TOP CAP */}
                                                    <div className="h-4 w-full" />

                                                    {/* HEADER */}
                                                    <div className={cn("px-4 pb-2 pt-2 border-b border-white/60 flex flex-row items-center justify-between", p.header)}>
                                                        <div>
                                                            <span className="text-sm font-black text-slate-800">{route.name}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => { setActiveTab('allocation'); setSelectedRouteForAlloc(route.id); }} title="Assign Students" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-xl"><Tag className="h-3.5 w-3.5" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleCopyRoute(route)} title="Duplicate Route" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-xl"><Copy className="h-3.5 w-3.5" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)} className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-xl"><Edit2 className="h-3.5 w-3.5" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-white/50 rounded-xl"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                        </div>
                                                    </div>

                                                    {/* BODY */}
                                                    <div className="p-4 flex-1">
                                                        <div className="space-y-4">
                                                            {/* Fleet */}
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Fleet</span>
                                                                <div className="grid grid-cols-2 gap-x-4">
                                                                    <div className="space-y-1">
                                                                        <span className={cn("text-[9px] font-black uppercase whitespace-nowrap", p.label)}>Vehicle</span>
                                                                        <div className="text-[11px] font-bold text-slate-600 truncate uppercase">{vehicle?.vehicleNumber || '—'}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className={cn("text-[9px] font-black uppercase whitespace-nowrap", p.label)}>Driver</span>
                                                                        <div className="text-[11px] font-bold text-slate-600 truncate">{vehicle?.driverName || '—'}</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Stops */}
                                                            <div className="space-y-1 pt-2 border-t border-white/60">
                                                                <span className={cn("text-[10px] font-black uppercase tracking-widest block", p.label)}>Stops</span>
                                                                <div className="text-[11px] font-bold text-slate-700">
                                                                    {route.stops.length > 0 ? route.stops.map((s: TransportStop) => s.name).join(' | ') : '—'}
                                                                </div>
                                                            </div>

                                                            {/* Timings */}
                                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/60">
                                                                <div>
                                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Pickup</span>
                                                                    <div className="text-[10px] font-bold text-slate-600">{route.stops[0]?.morningPickupTime || '—'}</div>
                                                                </div>
                                                                <div className="border-l border-white/60 pl-4">
                                                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block mb-1">Drop</span>
                                                                    <div className="text-[10px] font-bold text-slate-600">{route.stops[route.stops.length - 1]?.eveningDropTime || '—'}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* FOOTER */}
                                                    <div 
                                                        className={cn(
                                                            "px-4 py-3 border-t border-white/60 cursor-pointer transition-all hover:bg-white/40",
                                                            expandedRouteId === route.id && "bg-white/60"
                                                        )}
                                                        onClick={() => setExpandedRouteId(expandedRouteId === route.id ? null : route.id)}
                                                    >
                                                        {routeAllocs.length > 0 ? (
                                                            <div className="flex items-center justify-between">
                                                                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5", p.label)}>
                                                                    <div className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                                                                    Linked Students
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", p.badge)}>
                                                                        {routeAllocs.length} Students
                                                                    </span>
                                                                    <ChevronDown className={cn("h-3 w-3 transition-transform text-slate-400", expandedRouteId === route.id && "rotate-180")} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                No students assigned yet
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* EXPANDED STUDENTS LIST */}
                                                    {expandedRouteId === route.id && routeAllocs.length > 0 && (
                                                        <div className="px-4 py-3 border-t border-white/40 bg-white/40 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                            {routeAllocs.map(alloc => {
                                                                const student = allStudents.find(s => s.id === alloc.studentId);
                                                                return (
                                                                    <div key={alloc.id} className="flex items-center justify-between text-[10px] bg-white/50 p-2 rounded-xl border border-white/60 group/std">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <span className="font-black text-slate-800 truncate">{student?.name || 'Unknown'}</span>
                                                                            <span className="text-[8px] font-bold text-slate-400">({alloc.activeMonths?.length || 0}M)</span>
                                                                        </div>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className={cn(
                                                                                "h-7 w-7 rounded-lg transition-all shadow-sm",
                                                                                alloc.activeMonths && alloc.activeMonths.length < 12
                                                                                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                                                                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openCalendar(alloc);
                                                                            }}
                                                                            title="Manage Months"
                                                                        >
                                                                            <Calendar className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                </div>
                                            );

                                        })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="py-6 pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Route Name</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Vehicle</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Students</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stops</TableHead>
                                                <TableHead className="text-right py-6 pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {routes
                                                .filter(r => r.name.toLowerCase().includes(routeSearchQuery.toLowerCase()))
                                                .map(route => {
                                                    const vehicle = vehicles.find(v => v.id === route.vehicleId);
                                                    const routeAllocs = allocations.filter(a => a.routeId === route.id);
                                                    return (
                                                        <TableRow key={route.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                            <TableCell className="pl-8 py-5 font-black text-slate-800 uppercase tracking-tight">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_MAP[route.color as keyof typeof COLOR_MAP] || '#4F39F6' }} />
                                                                    {route.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{vehicle?.vehicleNumber || 'Unassigned'}</TableCell>
                                                            <TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{routeAllocs.length} Assigned</TableCell>
                                                            <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{route.stops.length} Stops</TableCell>
                                                            <TableCell className="text-right pr-8">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" onClick={() => { setActiveTab('allocation'); setSelectedRouteForAlloc(route.id); }} title="Assign Students" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Tag className="h-4 w-4" /></Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleCopyRoute(route)} title="Duplicate Route" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Copy className="h-4 w-4" /></Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    ) : (() => {
                        const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
                        const formatExpiryDate = (dateStr?: string) => {
                            if (!dateStr) return 'N/A';
                            try {
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return dateStr.toUpperCase();
                                const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                const day = date.getDate();
                                const month = months[date.getMonth()];
                                const year = date.getFullYear().toString().slice(-2);
                                return `${day} ${month} ${year}`;
                            } catch (e) {
                                return dateStr.toUpperCase();
                            }
                        };

                        return (
                            <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                <Card className="border-none shadow-xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                                     <CardHeader className="bg-indigo-600 p-6 text-white">
                                         <div className="flex items-center justify-between w-full">
                                             <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                                 <Send className="h-5 w-5" />
                                                 {editingRoute ? 'EDIT ROUTE PATH' : 'DEFINE NEW ROUTE'}
                                             </CardTitle>
                                             <div className="flex items-center gap-2">
                                                 <Button 
                                                     variant="ghost" 
                                                     onClick={() => {
                                                         setIsAddingRoute(false);
                                                         setEditingRoute(null);
                                                         setRouteName('');
                                                         setRouteStops([]);
                                                         setSelectedVehicleId('');
                                                         setRouteAmount(0);
                                                         setRouteAmountType('Fixed (₹)');
                                                         setRouteStartDate('');
                                                         setRouteGraceDays(10);
                                                         setVehicleOn(true);
                                                     }} 
                                                     className="h-10 text-white hover:bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-[0.2em]"
                                                 >
                                                     CANCEL
                                                 </Button>
                                                 <Button onClick={handleSaveRoute} className="bg-white text-indigo-600 hover:bg-indigo-50 h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95">
                                                     <Save className="mr-2 h-4 w-4" /> SAVE ROUTE
                                                 </Button>
                                             </div>
                                         </div>
                                     </CardHeader>
                                     <CardContent className="p-10 space-y-10">
                                         {/* Metadata Row */}
                                         <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                             <div className="md:col-span-5 space-y-1.5">
                                                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Route Identity</Label>
                                                 <Input
                                                     value={routeName}
                                                     onChange={e => setRouteName(e.target.value)}
                                                     placeholder="e.g., North Sector Express"
                                                     className="h-14 rounded-2xl border-slate-100 bg-white text-base font-black focus-visible:ring-indigo-500"
                                                 />
                                             </div>
                                             
                                             <div className="md:col-span-4 space-y-1.5">
                                                 <div className="flex items-center justify-between px-1">
                                                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Assign Vehicle</Label>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400">{vehicleOn ? 'ON' : 'OFF'}</span>
                                                        <Switch checked={vehicleOn} onCheckedChange={setVehicleOn} size="sm" className="data-[state=checked]:bg-indigo-600" />
                                                    </div>
                                                 </div>
                                                 <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                                     <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-white font-black">
                                                         <SelectValue placeholder="Select Vehicle" />
                                                     </SelectTrigger>
                                                     <SelectContent className="rounded-2xl shadow-2xl">
                                                         {vehicles.map(vh => (
                                                             <SelectItem key={vh.id} value={vh.id} className="font-black py-3 uppercase">{vh.vehicleNumber} ({vh.driverName || 'No Driver'})</SelectItem>
                                                         ))}
                                                     </SelectContent>
                                                 </Select>
                                             </div>

                                             <div className="md:col-span-3 space-y-1.5">
                                                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Visual Marker</Label>
                                                 <div className="flex items-center gap-2 h-14 bg-slate-50/50 rounded-2xl px-4 border border-slate-100/50">
                                                     {Object.entries(COLOR_MAP).slice(0, 8).map(([name, hex]) => (
                                                         <button
                                                             key={name}
                                                             type="button"
                                                             onClick={() => setRouteColor(name)}
                                                             className={cn(
                                                                 "h-5 w-5 rounded-full transition-all border-2",
                                                                 routeColor === name ? "border-slate-900 scale-110" : "border-transparent"
                                                             )}
                                                             style={{ backgroundColor: hex }}
                                                         />
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Late Fine Policy Panel */}
                                         <div className="bg-rose-50/20 border border-rose-100/40 p-6 rounded-[2rem] space-y-6">
                                             <div className="flex items-center gap-3">
                                                 <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-lg shrink-0">
                                                     !
                                                 </div>
                                                 <div>
                                                     <h4 className="text-xs font-black uppercase text-slate-800 tracking-[0.2em]">Late Fine Policy</h4>
                                                     <p className="text-[9px] font-black text-rose-500 tracking-[0.15em] uppercase">Applies to all stops on this route</p>
                                                 </div>
                                             </div>
                                             
                                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                                                 <div className="space-y-1.5">
                                                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Effective Date</Label>
                                                     <Input
                                                         type="date"
                                                         value={routeStartDate}
                                                         onChange={e => setRouteStartDate(e.target.value)}
                                                         className="h-14 rounded-2xl border-rose-100/85 bg-white font-black focus-visible:ring-rose-500/20"
                                                     />
                                                 </div>
                                                 
                                                 <div className="space-y-1.5">
                                                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Fine Type</Label>
                                                     <div className="flex border border-slate-100 rounded-2xl p-1 h-14 bg-white">
                                                         <button
                                                             type="button"
                                                             onClick={() => setRouteAmountType('Fixed (₹)')}
                                                             className={cn(
                                                                 "flex-1 rounded-xl text-xs font-black transition-all",
                                                                 routeAmountType === 'Fixed (₹)' 
                                                                     ? "bg-rose-500 text-white shadow-md shadow-rose-100" 
                                                                     : "text-slate-400 hover:text-slate-600"
                                                             )}
                                                         >
                                                             ₹ Fixed
                                                         </button>
                                                         <button
                                                             type="button"
                                                             onClick={() => setRouteAmountType('Percentage')}
                                                             className={cn(
                                                                 "flex-1 rounded-xl text-xs font-black transition-all",
                                                                 routeAmountType === 'Percentage' 
                                                                     ? "bg-rose-500 text-white shadow-md shadow-rose-100" 
                                                                     : "text-slate-400 hover:text-slate-600"
                                                             )}
                                                         >
                                                             % Rate
                                                         </button>
                                                     </div>
                                                 </div>

                                                 <div className="space-y-1.5">
                                                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">
                                                         {routeAmountType === 'Percentage' ? 'Fine Rate (%)' : 'Fine Amount (₹)'}
                                                     </Label>
                                                     <div className="relative">
                                                         <Input
                                                             type="number"
                                                             value={routeAmount}
                                                             onChange={e => setRouteAmount(parseFloat(e.target.value) || 0)}
                                                             placeholder="0"
                                                             className="h-14 rounded-2xl border-rose-100/85 bg-white font-black focus-visible:ring-rose-500/20 pr-8"
                                                         />
                                                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                                                             {routeAmountType === 'Percentage' ? '%' : '₹'}
                                                         </span>
                                                     </div>
                                                 </div>

                                                 <div className="space-y-1.5">
                                                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Grace Days</Label>
                                                     <Input
                                                         type="number"
                                                         value={routeGraceDays}
                                                         onChange={e => setRouteGraceDays(parseInt(e.target.value) || 0)}
                                                         placeholder="10"
                                                         className="h-14 rounded-2xl border-rose-100/85 bg-white font-black focus-visible:ring-rose-500/20"
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Stops Configuration */}
                                         <div className="space-y-6">
                                             <div className="flex items-center justify-between px-2">
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                                         <MapPin className="h-5 w-5" />
                                                     </div>
                                                     <div className="flex items-center gap-3 flex-wrap">
                                                         <h3 className="text-sm font-black uppercase text-slate-800 tracking-[0.2em]">Stops & Scheduling</h3>
                                                     </div>
                                                 </div>
                                                 <Button onClick={handleAddStop} type="button" className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-100">
                                                     <Plus className="mr-2 h-4 w-4" /> ADD NEW STOP
                                                 </Button>
                                             </div>

                                            <div className="space-y-4">
                                                {routeStops.length > 0 ? (
                                                    routeStops.map((stop) => (
                                                        <div key={stop.id} className="bg-slate-50/30 border border-slate-100/60 p-6 rounded-[2rem] relative transition-all hover:bg-white hover:shadow-md hover:shadow-slate-100/50">
                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                                                <div className="md:col-span-4 space-y-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Stop Name</Label>
                                                                    <Input
                                                                        value={stop.name}
                                                                        onChange={e => handleUpdateStop(stop.id, 'name', e.target.value)}
                                                                        placeholder="e.g. city mall"
                                                                        className="h-14 rounded-2xl border-slate-100 bg-white font-black focus-visible:ring-indigo-500"
                                                                    />
                                                                </div>
                                                                
                                                                <div className="md:col-span-2 space-y-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Pickup (AM)</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            value={stop.morningPickupTime || ''}
                                                                            onChange={e => handleUpdateStop(stop.id, 'morningPickupTime', e.target.value)}
                                                                            type="time"
                                                                            className="h-14 rounded-2xl border-slate-100 bg-white font-black focus-visible:ring-indigo-500 pr-10 [color-scheme:light]"
                                                                        />
                                                                        <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                <div className="md:col-span-2 space-y-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Drop (PM)</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            value={stop.eveningDropTime || ''}
                                                                            onChange={e => handleUpdateStop(stop.id, 'eveningDropTime', e.target.value)}
                                                                            type="time"
                                                                            className="h-14 rounded-2xl border-slate-100 bg-white font-black focus-visible:ring-indigo-500 pr-10 [color-scheme:light]"
                                                                        />
                                                                        <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                <div className="md:col-span-1 space-y-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Distance (KM)</Label>
                                                                    <Input
                                                                        value={stop.distanceKm}
                                                                        onChange={e => handleUpdateStop(stop.id, 'distanceKm', parseFloat(e.target.value) || 0)}
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="h-14 rounded-2xl border-slate-100 bg-white font-black focus-visible:ring-indigo-500"
                                                                    />
                                                                </div>

                                                                <div className="md:col-span-2 space-y-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Monthly Fee</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            value={stop.monthlyFee}
                                                                            onChange={e => handleUpdateStop(stop.id, 'monthlyFee', parseFloat(e.target.value) || 0)}
                                                                            type="number"
                                                                            placeholder="0"
                                                                            className="h-14 rounded-2xl border-slate-100 bg-white font-black text-indigo-600 focus-visible:ring-indigo-500 pl-8 pr-4"
                                                                        />
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-600">₹</span>
                                                                    </div>
                                                                </div>

                                                                <div className="md:col-span-1 flex justify-end gap-1 pb-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        type="button"
                                                                        onClick={() => handleCopyStop(stop.id)}
                                                                        title="Copy this stop"
                                                                        className="h-10 w-10 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl"
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        type="button"
                                                                        onClick={() => handleRemoveStop(stop.id)}
                                                                        className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30 flex flex-col items-center gap-4 text-slate-300">
                                                        <Navigation className="h-12 w-12 opacity-20" />
                                                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">No stops defined for this route yet</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}
                </TabsContent>

                {/* --- ALLOCATION TAB --- */}
                <TabsContent value="allocation" className="mt-0 outline-none space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Assignment Control Panel */}
                        <div className="lg:col-span-12">
                            <div className="w-full bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl shadow-sm">
                                {/* Inputs Grid with items-end alignment */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                                    <div className="lg:col-span-3 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">Target Route</Label>
                                        <Select value={selectedRouteForAlloc} onValueChange={(val) => { setSelectedRouteForAlloc(val); setSelectedStopForAlloc(''); }}>
                                            <SelectTrigger className="!h-10 rounded-xl border-slate-200 bg-white font-black w-full hover:bg-slate-50 transition-all focus:ring-2 focus:ring-indigo-500">
                                                <SelectValue placeholder="Select Route" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {routes.map(r => (
                                                    <SelectItem key={r.id} value={r.id} className="font-black py-3 uppercase tracking-tight">{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="lg:col-span-3 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">Assign Stop</Label>
                                        <Select disabled={!selectedRouteForAlloc} value={selectedStopForAlloc} onValueChange={setSelectedStopForAlloc}>
                                            <SelectTrigger className="!h-10 rounded-xl border-slate-200 bg-white font-black w-full hover:bg-slate-50 transition-all focus:ring-2 focus:ring-indigo-500 [&_.hide-in-trigger]:hidden">
                                                <SelectValue placeholder={selectedRouteForAlloc ? "Choose Stop" : "First select a route"} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl shadow-2xl">
                                                {routes.find((r: TransportRoute) => r.id === selectedRouteForAlloc)?.stops.map((s: TransportStop) => (
                                                    <SelectItem key={s.id} value={s.id} className="font-black py-3 uppercase tracking-tight">
                                                        <div className="flex items-center justify-between w-full gap-4 flex-nowrap whitespace-nowrap overflow-hidden">
                                                            <span className="flex items-center gap-1.5 shrink-0">
                                                                <span>{s.name}</span>
                                                                {s.distanceKm > 0 && (
                                                                    <span className="text-[10px] font-bold text-slate-400">({s.distanceKm} KM)</span>
                                                                )}
                                                            </span>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[9px] text-slate-400 hide-in-trigger">AM: {s.morningPickupTime || '--:--'}</span>
                                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">₹{s.monthlyFee}</span>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="lg:col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">Start Date</Label>
                                        <Input 
                                            type="date" 
                                            value={allocationStartDate} 
                                            onChange={(e) => setAllocationStartDate(e.target.value)}
                                            className="!h-10 rounded-xl border-slate-200 bg-white font-black hover:bg-slate-50 transition-all focus-visible:ring-indigo-500 pr-3"
                                        />
                                    </div>

                                    <div className="lg:col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 block">End Date (Optional)</Label>
                                        <Input 
                                            type="date" 
                                            value={allocationEndDate} 
                                            onChange={(e) => setAllocationEndDate(e.target.value)}
                                            className="!h-10 rounded-xl border-slate-200 bg-white font-black hover:bg-slate-50 transition-all focus-visible:ring-indigo-500 pr-3"
                                        />
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Button 
                                            onClick={handleAssignTransport}
                                            disabled={selectedStudentIds.length === 0 || !selectedStopForAlloc}
                                            className="w-full !h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100/50 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                                        >
                                            {selectedStudentIds.length > 0 ? `Assign ${selectedStudentIds.length}` : 'Assign'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student Selection Table */}
                        <div className="lg:col-span-12 bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-100/50 overflow-hidden">
                            {/* Filter Bar (Academic Style) */}
                            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100/50">
                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select value={allocClassFilter} onValueChange={setAllocClassFilter}>
                                            <SelectTrigger className="w-[120px] h-9 rounded-xl border-white bg-white shadow-sm font-bold text-slate-600 text-[11px]">
                                                <SelectValue placeholder="Select Class" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {availableClasses.map((c: any) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                                <SelectItem value="all" className="mt-2 border-t pt-2 text-indigo-600">All Classes</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select value={allocSectionFilter} onValueChange={setAllocSectionFilter}>
                                            <SelectTrigger className="w-[110px] h-9 rounded-xl border-white bg-white shadow-sm font-bold text-slate-600 text-[11px]">
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {availableSections.map((s: any) => (
                                                    <SelectItem key={s} value={s}>Section {s}</SelectItem>
                                                ))}
                                                <SelectItem value="all" className="mt-2 border-t pt-2 text-indigo-600">All Sections</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select value={allocGenderFilter} onValueChange={setAllocGenderFilter}>
                                            <SelectTrigger className="w-[110px] h-9 rounded-xl border-white bg-white shadow-sm font-bold text-slate-600 text-[11px]">
                                                <SelectValue placeholder="Gender" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all">All Gender</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select value={allocCategoryFilter} onValueChange={setAllocCategoryFilter}>
                                            <SelectTrigger className="w-[130px] h-9 rounded-xl border-white bg-white shadow-sm font-bold text-slate-600 text-[11px]">
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {availableCategories.map((cat: any) => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full xl:w-64">
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                                            <input 
                                                className="flex-1 h-9 border-none focus:ring-0 text-[11px] font-bold placeholder:text-slate-300 px-3"
                                                placeholder="Search student..."
                                                value={allocSearchQuery}
                                                onChange={e => setAllocSearchQuery(e.target.value)}
                                            />
                                            <Button className="h-9 w-10 rounded-none bg-emerald-500 hover:bg-emerald-600 shadow-none border-none flex items-center justify-center p-0 transition-colors">
                                                <Search size={16} className="text-white" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-white border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Student Directory</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Found {filteredStudentsForAlloc.length} students matching criteria</p>
                                </div>
                            </div>

                            <div className="max-h-[800px] overflow-y-auto custom-scrollbar">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                                        <TableRow className="border-none">
                                            <TableHead className="w-12 py-6 pl-8">
                                                <Checkbox
                                                    checked={selectedStudentIds.length === filteredStudentsForAlloc.length && filteredStudentsForAlloc.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                    className="rounded-md"
                                                />
                                            </TableHead>
                                            <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                                <Button 
                                                    variant="ghost" 
                                                    className="p-0 hover:bg-transparent h-auto text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1"
                                                    onClick={() => {
                                                        if (allocSortField === 'name') setAllocSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                                        else { setAllocSortField('name'); setAllocSortOrder('asc'); }
                                                    }}
                                                >
                                                    Students <ArrowUpDown className="h-3 w-3" />
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                                <Button 
                                                    variant="ghost" 
                                                    className="p-0 hover:bg-transparent h-auto text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1"
                                                    onClick={() => {
                                                        if (allocSortField === 'rollNumber') setAllocSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                                        else { setAllocSortField('rollNumber'); setAllocSortOrder('asc'); }
                                                    }}
                                                >
                                                    Roll <ArrowUpDown className="h-3 w-3" />
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Class/Sec</TableHead>
                                            <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Route</TableHead>
                                            <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Duration</TableHead>
                                            <TableHead className="py-6 text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudentsForAlloc.map(student => {
                                            const allocation = allocations.find((a: StudentTransportAllocation) => a.studentId === student.id);
                                            const route = routes.find((r: TransportRoute) => r.id === allocation?.routeId);
                                            const stop = route?.stops.find((s: TransportStop) => s.id === allocation?.stopId);
                                            const isSelected = selectedStudentIds.includes(student.id);

                                            return (
                                                <TableRow key={student.id} className={cn(
                                                    "group transition-all",
                                                    isSelected ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
                                                )}>
                                                    <TableCell className="pl-8 py-5">
                                                        <Checkbox
                                                            checked={isSelected || !!allocation}
                                                            disabled={!!allocation}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                                else setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                            }}
                                                            className={cn(
                                                                "rounded-md transition-colors",
                                                                !!allocation && "border-rose-200 bg-rose-50 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 disabled:opacity-100 cursor-not-allowed"
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-800 text-sm uppercase tracking-tight leading-tight truncate max-w-[100px]" title={student.name}>
                                                                    {student.name.length > 11 ? `${student.name.substring(0, 11)}...` : student.name}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-indigo-500 font-bold">{student.admissionNumber}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-black text-slate-600">
                                                            {student.rollNumber || 'N/A'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-tight border border-slate-200/50">
                                                            {student.className} - {student.section}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit uppercase tracking-tighter border border-emerald-100">
                                                                        {route?.name}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-blue-600 px-1">
                                                                        At: {stop?.name} {stop?.distanceKm ? `(${stop.distanceKm} KM)` : ''}
                                                                    </span>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => openCalendar(allocation)} 
                                                                    className={cn(
                                                                        "h-8 w-8 rounded-xl transition-all",
                                                                        allocation.activeMonths && allocation.activeMonths.length < 12 
                                                                            ? "bg-amber-100 text-amber-600 hover:bg-amber-200 shadow-sm shadow-amber-100" 
                                                                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm shadow-indigo-50"
                                                                    )}
                                                                    title="Manage Session Months"
                                                                >
                                                                    <Calendar className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Not Assigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation && (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                                                    S: {allocation.effectiveFrom ? new Date(allocation.effectiveFrom).toLocaleDateString('en-GB', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    }) : '—'}
                                                                </span>
                                                                {allocation.effectiveUntil && (
                                                                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tight">
                                                                        E: {new Date(allocation.effectiveUntil).toLocaleDateString('en-GB', {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        {allocation && (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditAllocation(allocation)}
                                                                    className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Remove Allocation',
                                                                            message: `Are you sure you want to remove transport allocation for ${student.name}?`,
                                                                            onConfirm: async () => {
                                                                                await removeTransportAllocation(allocation.id);
                                                                                init();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="h-9 w-9 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {filteredStudentsForAlloc.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-24 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic text-[10px]">
                                                    No students found in the selected directory
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* --- VEHICLES TAB --- */}
                <TabsContent value="vehicles" className="mt-0 outline-none space-y-8">
                    {!isAddingVehicle ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Master Vehicle Repository</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search vehicles..." 
                                            value={vehicleSearchQuery}
                                            onChange={(e) => setVehicleSearchQuery(e.target.value)}
                                            className="border-none shadow-none focus-visible:ring-0 h-7 text-xs min-w-[250px] font-bold"
                                        />
                                    </div>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <Button size="sm" variant="ghost" onClick={() => setVehicleViewMode('grid')} className={`h-8 w-8 p-0 rounded-lg ${vehicleViewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setVehicleViewMode('list')} className={`h-8 w-8 p-0 rounded-lg ${vehicleViewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List className="h-4 w-4" /></Button>
                                    </div>
                                    {!isAddingVehicle && (
                                        <Button onClick={() => { setIsAddingVehicle(true); setEditingVehicle(null); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                                            <Plus className="h-4 w-4" /> ADD VEHICLE
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {vehicleViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {vehicles
                                        .filter(vh => vh.vehicleNumber.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) || (vh.driverName || '').toLowerCase().includes(vehicleSearchQuery.toLowerCase()))
                                        .map((vh, idx) => {
                                    const palette = [
                                        { card: 'bg-indigo-100 border-indigo-200/60', header: 'bg-indigo-50', label: 'text-indigo-500', bar: 'bg-indigo-500', barText: 'text-indigo-600' },
                                        { card: 'bg-emerald-100 border-emerald-200/60', header: 'bg-emerald-50', label: 'text-emerald-500', bar: 'bg-emerald-500', barText: 'text-emerald-600' },
                                        { card: 'bg-amber-100 border-amber-200/60', header: 'bg-amber-50', label: 'text-amber-500', bar: 'bg-amber-500', barText: 'text-amber-600' },
                                        { card: 'bg-rose-100 border-rose-200/60', header: 'bg-rose-50', label: 'text-rose-500', bar: 'bg-rose-500', barText: 'text-rose-600' },
                                        { card: 'bg-purple-100 border-purple-200/60', header: 'bg-purple-50', label: 'text-purple-500', bar: 'bg-purple-500', barText: 'text-purple-600' },
                                        { card: 'bg-cyan-100 border-cyan-200/60', header: 'bg-cyan-50', label: 'text-cyan-500', bar: 'bg-cyan-500', barText: 'text-cyan-600' },
                                    ];
                                    const p = palette[idx % palette.length];
                                    
                                    return (
                                        <div key={vh.id} className={cn(
                                            "border shadow-sm rounded-3xl overflow-hidden group transition-all duration-500 flex flex-col hover:shadow-lg hover:scale-[1.01]",
                                            p.card
                                        )}>
                                            
                                            {/* TOP CAP */}
                                            <div className="h-4 w-full" />
                                            
                                            {/* HEADER */}
                                            <div className={cn("px-4 pb-2 pt-2 border-b border-white/60 flex flex-row items-center justify-between", p.header)}>
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 uppercase">{vh.vehicleNumber.toUpperCase()}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle(vh); setIsAddingVehicle(true); }} className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-xl"><Edit2 className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Delete Vehicle',
                                                            message: `Are you sure you want to remove vehicle ${vh.vehicleNumber.toUpperCase()} from the registry?`,
                                                            onConfirm: async () => {
                                                                await deleteTransportVehicle(vh.id);
                                                                init();
                                                            }
                                                        });
                                                    }} className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-white/50 rounded-xl"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                </div>
                                            </div>

                                            {/* BODY */}
                                            <div className="p-4 flex-1">
                                                <div className="space-y-3">
                                                    {/* Main Specifications */}
                                                    <div className="space-y-2 text-[11px] font-bold text-slate-600">
                                                        {/* Row 1: Type & Capacity */}
                                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                            <div className="bg-white/40 p-2 rounded-xl border border-white/60">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Type</span>
                                                                <span className="font-black text-slate-800 uppercase truncate block">{vehicleTypes.find(t => t.id === vh.vehicleType)?.name || vh.vehicleType}</span>
                                                            </div>
                                                            <div className="bg-white/40 p-2 rounded-xl border border-white/60">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Capacity</span>
                                                                <span className="font-black text-slate-700 truncate block">{vh.capacity} Seats</span>
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Reg & Insurance */}
                                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                            <div className="bg-white/40 p-2 rounded-xl border border-white/60">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Reg No.</span>
                                                                <span className="font-black text-slate-700 uppercase truncate block">{vh.registrationNumber || '—'}</span>
                                                            </div>
                                                            <div className={cn(
                                                                "p-2 rounded-xl border transition-all duration-300",
                                                                showExpiryHighlight && getExpiryContainerClass(vh.insuranceExpiry) ? getExpiryContainerClass(vh.insuranceExpiry) : "bg-white/40 border-white/60"
                                                            )}>
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase block mb-0.5",
                                                                    showExpiryHighlight && getDaysRemaining(vh.insuranceExpiry) !== null && getDaysRemaining(vh.insuranceExpiry)! <= warningExpiryDays ? "text-white/80" : "text-slate-400"
                                                                )}>Insurance Expiry</span>
                                                                <span className={cn(
                                                                    "font-black truncate block",
                                                                    showExpiryHighlight && getDaysRemaining(vh.insuranceExpiry) !== null && getDaysRemaining(vh.insuranceExpiry)! <= warningExpiryDays ? "text-white" : "text-slate-700"
                                                                )}>{vh.insuranceExpiry || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Driver Details */}
                                                    <div className="pt-2 border-t border-white/60 space-y-2">
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Primary Driver</span>
                                                        {!vh.driverName || vh.driverName === 'unassigned' ? (
                                                            <div className="text-[10px] font-bold text-slate-400 italic bg-white/20 p-2 rounded-xl border border-dashed border-slate-200 text-center">No driver assigned</div>
                                                        ) : (() => {
                                                            const driver = drivers.find(d => d.name === vh.driverName);
                                                            return (
                                                                <div className="space-y-2 text-[10px]">
                                                                    {/* Row 1: Name & Blood Group */}
                                                                    <div className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-white/60">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase">Driver Name</span>
                                                                            <span className="font-black text-slate-800 uppercase">{vh.driverName}</span>
                                                                        </div>
                                                                        {driver?.bloodGroup && (
                                                                            <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-100 uppercase">{driver.bloodGroup}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Row 2: Phone */}
                                                                    {vh.driverPhone && (
                                                                        <div className="bg-white/40 p-2 rounded-xl border border-white/60 flex items-center justify-between">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase">Phone</span>
                                                                            <span className="font-black text-slate-700">{vh.driverPhone}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Row 3: DL Info & Licence Expiry */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="bg-white/40 p-2 rounded-xl border border-white/60">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Licence No.</span>
                                                                            <span className="font-black text-slate-700 truncate block">{driver?.licenseNumber || '—'}</span>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "p-2 rounded-xl border transition-all duration-300",
                                                                            driver?.licenseExpiry && showExpiryHighlight && getExpiryContainerClass(driver.licenseExpiry) ? getExpiryContainerClass(driver.licenseExpiry) : "bg-white/40 border-white/60"
                                                                        )}>
                                                                            <span className={cn(
                                                                                "text-[8px] font-black uppercase block mb-0.5",
                                                                                driver?.licenseExpiry && showExpiryHighlight && getDaysRemaining(driver.licenseExpiry) !== null && getDaysRemaining(driver.licenseExpiry)! <= warningExpiryDays ? "text-white/80" : "text-slate-400"
                                                                            )}>Licence Expiry</span>
                                                                            <span className={cn(
                                                                                "font-black truncate block",
                                                                                driver?.licenseExpiry && showExpiryHighlight && getDaysRemaining(driver.licenseExpiry) !== null && getDaysRemaining(driver.licenseExpiry)! <= warningExpiryDays ? "text-white font-black" : "text-slate-700"
                                                                            )}>{driver?.licenseExpiry || '—'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FOOTER */}
                                            <div className="px-4 py-3 border-t border-white/60">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden">
                                                        <div className={cn("h-full w-[85%]", p.bar)} />
                                                    </div>
                                                    <span className={cn("text-[9px] font-black", p.barText)}>85% Health</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="py-6 pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Vehicle Number</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacity</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Driver</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Insurance Expiry</TableHead>
                                                <TableHead className="text-right py-6 pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {vehicles
                                                .filter(vh => vh.vehicleNumber.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) || (vh.driverName || '').toLowerCase().includes(vehicleSearchQuery.toLowerCase()))
                                                .map(vh => (
                                                    <TableRow key={vh.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                        <TableCell className="pl-8 py-5 font-black text-slate-800 uppercase tracking-tight">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
                                                                    <Bus className="h-4 w-4" />
                                                                </div>
                                                                {vh.vehicleNumber.toUpperCase()}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{vehicleTypes.find(t => t.id === vh.vehicleType)?.name || vh.vehicleType}</TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{vh.capacity} Seats</TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                                            <div className="flex items-center gap-2">
                                                                <span>{!vh.driverName || vh.driverName === 'unassigned' ? 'Unassigned' : vh.driverName}</span>
                                                                {drivers.find(d => d.name === vh.driverName)?.bloodGroup && (
                                                                    <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1 rounded border border-rose-100 uppercase">{drivers.find(d => d.name === vh.driverName)?.bloodGroup}</span>
                                                                )}
                                                            </div>
                                                            {vh.driverPhone && vh.driverName !== 'unassigned' && (
                                                                <div className="text-[9px] text-slate-400 font-medium tracking-normal mt-0.5">{vh.driverPhone}</div>
                                                            )}
                                                            {vh.driverName && vh.driverName !== 'unassigned' && (() => {
                                                                const driver = drivers.find(d => d.name === vh.driverName);
                                                                if (!driver) return null;
                                                                return (
                                                                    <div className="text-[9px] text-slate-500 tracking-normal mt-1 border-t border-slate-100 pt-1 space-y-0.5 normal-case font-medium">
                                                                        <div>Licence: <span className="font-bold text-slate-700">{driver.licenseNumber || '—'}</span></div>
                                                                        <div className="flex items-center gap-1">
                                                                            <span>Expiry:</span> 
                                                                            <span className={cn(
                                                                                "font-bold text-slate-700 rounded px-1",
                                                                                showExpiryHighlight && getExpiryBadgeClass(driver.licenseExpiry)
                                                                            )}>
                                                                                {driver.licenseExpiry || '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-black tracking-tight">
                                                            {vh.insuranceExpiry ? (
                                                                <span className={getExpiryBadgeClass(vh.insuranceExpiry) || "text-slate-700 font-bold"}>
                                                                    {vh.insuranceExpiry}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle(vh); setIsAddingVehicle(true); }} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" onClick={() => {
                                                                    setConfirmModal({
                                                                        isOpen: true,
                                                                        title: 'Delete Vehicle',
                                                                        message: `Are you sure you want to remove vehicle ${vh.vehicleNumber.toUpperCase()} from the registry?`,
                                                                        onConfirm: async () => {
                                                                            await deleteTransportVehicle(vh.id);
                                                                            init();
                                                                        }
                                                                    });
                                                                }} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                            <Card className="border-none shadow-xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-indigo-600 p-6 text-white">
                                    <div className="flex items-center justify-between w-full">
                                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                            <Bus className="h-5 w-5" />
                                            {editingVehicle ? 'Update Vehicle Registry' : 'Register New Vehicle'}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                onClick={() => { 
                                                    setIsAddingVehicle(false); 
                                                    setEditingVehicle(null); 
                                                }} 
                                                className="h-10 text-white hover:bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-[0.2em]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                form="vehicleForm"
                                                className="bg-white text-indigo-600 hover:bg-indigo-50 h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95"
                                            >
                                                <Save className="mr-2 h-4 w-4" /> Save Vehicle
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-10">
                                    <form onSubmit={handleSaveVehicle} id="vehicleForm" className="space-y-10">
                                        {/* SECTION 1: VEHICLE SPECIFICATIONS */}
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Vehicle Specifications</h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Vehicle Number *</Label>
                                                    <Input name="vehicleNumber" defaultValue={editingVehicle?.vehicleNumber} required placeholder="e.g. DL-01-AB-1234" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Vehicle Model</Label>
                                                    <Input name="vehicleModel" defaultValue={editingVehicle?.vehicleModel} placeholder="e.g. Tata Marcopolo" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Year Made</Label>
                                                    <Input name="yearMade" defaultValue={editingVehicle?.yearMade} placeholder="e.g. 2022" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Vehicle Class</Label>
                                                    <Select name="vehicleType" defaultValue={editingVehicle?.vehicleType || 'Bus'}>
                                                        <SelectTrigger className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl shadow-2xl">
                                                            {vehicleTypes.map(type => (
                                                                <SelectItem key={type.id} value={type.id} className="font-black py-3 uppercase tracking-tight">{type.name}</SelectItem>
                                                            ))}
                                                            <SelectItem value="Other" className="font-black py-3 uppercase">Other Type</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Max Seating Capacity</Label>
                                                    <Input name="capacity" type="number" defaultValue={editingVehicle?.capacity} required placeholder="40" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 2: REGISTRATION & INSURANCE */}
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Registration & Insurance</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Registration Number</Label>
                                                    <Input name="registrationNumber" defaultValue={editingVehicle?.registrationNumber} placeholder="Reg No." className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Chasis Number</Label>
                                                    <Input name="chasisNumber" defaultValue={editingVehicle?.chasisNumber} placeholder="Chasis No." className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Insurance Expiry</Label>
                                                    <Input name="insuranceExpiry" type="date" defaultValue={editingVehicle?.insuranceExpiry} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 3: PERSONNEL ASSIGNMENT */}
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Personnel Assignment</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Lead Driver Name</Label>
                                                    <input type="hidden" name="driverName" value={formDriverName} />
                                                    <Select 
                                                        key={formDriverName}
                                                        value={formDriverName} 
                                                        onValueChange={(val) => {
                                                            setFormDriverName(val);
                                                            if (val === 'unassigned') {
                                                                setFormDriverPhone('');
                                                            } else {
                                                                const driver = drivers.find(d => d.name === val);
                                                                if (driver) setFormDriverPhone(driver.phone || '');
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase">
                                                            <SelectValue placeholder="Select Driver" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl shadow-2xl">
                                                            <SelectItem value="unassigned" className="font-black py-3 uppercase tracking-tight text-slate-400">Unassigned</SelectItem>
                                                            {drivers.map(d => (
                                                                <SelectItem key={d.id} value={d.name} className="font-black py-3 uppercase tracking-tight">{d.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Driver Contact</Label>
                                                    <Input 
                                                        name="driverPhone" 
                                                        value={formDriverPhone} 
                                                        onChange={(e) => setFormDriverPhone(e.target.value)}
                                                        placeholder="+1 234 567 890" 
                                                        className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* --- VEHICLE TYPES TAB --- */}
                <TabsContent value="vehicle_types" className="mt-0 outline-none space-y-8">
                    {!isAddingType ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Vehicle Classifications</h3>
                                <Button onClick={() => { setIsAddingType(true); setEditingType(null); setTypeName(''); setTypeColor('indigo'); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                                    <Plus className="h-4 w-4" /> ADD TYPE
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {vehicleTypes.map(type => {
                                    const cardStyle = BG_COLORS[type.color as keyof typeof BG_COLORS] || BG_COLORS.indigo;
                                    const labelStyle = LABEL_COLORS[type.color as keyof typeof LABEL_COLORS] || LABEL_COLORS.indigo;
                                    
                                    return (
                                        <div key={type.id} className={cn(
                                            "group border p-6 rounded-[2rem] hover:shadow-2xl transition-all duration-500",
                                            cardStyle
                                        )}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: COLOR_MAP[type.color as keyof typeof COLOR_MAP] || '#4F39F6' }}>
                                                    <Bus className="h-5 w-5" />
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditType(type)} className="h-8 w-8 text-slate-600 hover:bg-white/50 rounded-xl transition-colors"><Edit2 className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)} className="h-8 w-8 text-rose-600 hover:bg-white/50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{type.name}</h4>
                                            <p className={cn("text-[9px] font-black uppercase tracking-widest italic opacity-70", labelStyle)}>
                                                {vehicles.filter(v => v.vehicleType === type.id).length} Active Vehicles
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <Card className="max-w-md mx-auto border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                            <CardHeader className="bg-indigo-600 p-8 text-white">
                                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Tag className="h-6 w-6" /> {editingType ? 'Edit Classification' : 'New Classification'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handleSaveType} className="space-y-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Type Name</Label>
                                        <Input 
                                            value={typeName} 
                                            onChange={e => setTypeName(e.target.value)} 
                                            required 
                                            placeholder="e.g. Luxury Coach" 
                                            className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase focus-visible:ring-indigo-500" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Color Theme</Label>
                                        <Select value={typeColor} onValueChange={setTypeColor}>
                                            <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {Object.keys(COLOR_MAP).map(color => (
                                                    <SelectItem key={color} value={color} className="font-black py-2 uppercase">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_MAP[color as keyof typeof COLOR_MAP] }} />
                                                            {color}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button type="button" variant="ghost" onClick={() => { setIsAddingType(false); setEditingType(null); }} className="flex-1 h-12 rounded-2xl font-black text-slate-400">Cancel</Button>
                                        <Button type="submit" className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-100 transition-all active:scale-95">Save Changes</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                {/* --- DRIVERS TAB --- */}
                <TabsContent value="drivers" className="mt-0 outline-none space-y-8">
                    {!isAddingDriver ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Personnel Registry: Drivers</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search drivers..." 
                                            value={driverSearchQuery}
                                            onChange={(e) => setDriverSearchQuery(e.target.value)}
                                            className="border-none shadow-none focus-visible:ring-0 h-7 text-xs min-w-[250px] font-bold"
                                        />
                                    </div>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('grid')} className={`h-8 w-8 p-0 rounded-lg ${driverViewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('list')} className={`h-8 w-8 p-0 rounded-lg ${driverViewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List className="h-4 w-4" /></Button>
                                    </div>
                                    {!isAddingDriver && (
                                        <Button onClick={() => { 
                                            setIsAddingDriver(true); 
                                            setEditingDriver(null); 
                                            setDriverDocs([
                                                { title: 'Aadhar Card', file: '', content: '' },
                                                { title: 'PAN Card', file: '', content: '' },
                                                { title: 'Driving License', file: '', content: '' },
                                                { title: 'Bank Passbook', file: '', content: '' }
                                            ]);
                                        }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                                            <UserPlus className="h-4 w-4" /> ADD DRIVER
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {driverViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {drivers
                                        .filter(d => d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) || d.phone.includes(driverSearchQuery))
                                        .map((drv, idx) => {
                                            const palette = [
                                                { card: 'bg-blue-100 border-blue-200/60', icon: 'bg-blue-600', avatar: 'bg-blue-200 text-blue-700', label: 'text-blue-700', divider: 'border-blue-200/60' },
                                                { card: 'bg-emerald-100 border-emerald-200/60', icon: 'bg-emerald-600', avatar: 'bg-emerald-200 text-emerald-700', label: 'text-emerald-700', divider: 'border-emerald-200/60' },
                                                { card: 'bg-amber-100 border-amber-200/60', icon: 'bg-amber-600', avatar: 'bg-amber-200 text-amber-700', label: 'text-amber-700', divider: 'border-amber-200/60' },
                                                { card: 'bg-rose-100 border-rose-200/60', icon: 'bg-rose-600', avatar: 'bg-rose-200 text-rose-700', label: 'text-rose-700', divider: 'border-rose-200/60' },
                                                { card: 'bg-purple-100 border-purple-200/60', icon: 'bg-purple-600', avatar: 'bg-purple-200 text-purple-700', label: 'text-purple-700', divider: 'border-purple-200/60' },
                                                { card: 'bg-cyan-100 border-cyan-200/60', icon: 'bg-cyan-600', avatar: 'bg-cyan-200 text-cyan-700', label: 'text-cyan-700', divider: 'border-cyan-200/60' },
                                            ];
                                            const p = palette[idx % palette.length];
                                            return (
                                                <div key={drv.id} className={cn(
                                                    "group border p-6 rounded-[2rem] hover:shadow-2xl transition-all duration-500 flex flex-col",
                                                    p.card
                                                )}>
                                                    <div className="flex items-start justify-between mb-6">
                                                        {drv.photo ? (
                                                            <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-inner border border-white/60">
                                                                <img src={drv.photo} alt={drv.name} className="h-full w-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md", p.icon)}>
                                                                <Bus className="h-7 w-7" />
                                                            </div>
                                                        )}
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditDriver(drv)} className="h-9 w-9 text-slate-700 hover:bg-white/50 rounded-xl transition-colors"><Edit2 className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDriver(drv.id)} className="h-9 w-9 text-rose-600 hover:bg-white/50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 flex-1">
                                                        <div>
                                                            <h3 className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight">{drv.name}</h3>
                                                            <p className={cn("text-[10px] font-black mt-2 uppercase tracking-[0.2em]", p.label)}>{drv.phone}</p>
                                                        </div>

                                                        <div className={cn("grid grid-cols-2 gap-4 pt-4 border-t", p.divider)}>
                                                            <div className="col-span-2 flex items-center justify-between bg-white/40 p-2 rounded-xl mb-1">
                                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Blood Group</span>
                                                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">{drv.bloodGroup || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-1">License No.</span>
                                                                <span className="text-[11px] font-bold text-slate-800">{drv.licenseNumber || '—'}</span>
                                                            </div>
                                                             <div className={cn(
                                                                 "transition-all duration-300 rounded-xl px-2 py-0.5 -mx-2",
                                                                 showExpiryHighlight && getExpiryContainerClass(drv.licenseExpiry)
                                                             )}>
                                                                 <span className={cn(
                                                                     "text-[9px] font-black uppercase tracking-[0.2em] block mb-1",
                                                                     showExpiryHighlight ? getExpiryLabelClass(drv.licenseExpiry) : "text-slate-500"
                                                                 )}>Expiry</span>
                                                                 <span className={cn(
                                                                     "text-[11px] font-bold",
                                                                     showExpiryHighlight ? getExpiryValueClass(drv.licenseExpiry) : "text-slate-800"
                                                                 )}>
                                                                     {drv.licenseExpiry || '—'}
                                                                 </span>
                                                             </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="py-6 pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Driver Name</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone</TableHead>
                                                 <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Blood Group</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License No.</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License Expiry</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Experience</TableHead>
                                                <TableHead className="text-right py-6 pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drivers
                                                .filter(d => d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) || d.phone.includes(driverSearchQuery))
                                                .map(drv => (
                                                    <TableRow key={drv.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                        <TableCell className="pl-8 py-5 font-black text-slate-800 uppercase tracking-tight">{drv.name}</TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{drv.phone}</TableCell>
                                                         <TableCell className="text-[10px] font-black text-rose-600 uppercase tracking-tight">{drv.bloodGroup || '—'}</TableCell>
                                                        <TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{drv.licenseNumber || '—'}</TableCell>
                                                        <TableCell className="text-[10px] font-black uppercase tracking-tight">
                                                             {drv.licenseExpiry ? (
                                                                 <span className={cn(
                                                                     showExpiryHighlight ? getExpiryBadgeClass(drv.licenseExpiry) : "text-slate-700 font-bold"
                                                                 )}>
                                                                     {drv.licenseExpiry}
                                                                 </span>
                                                             ) : (
                                                                 <span className="text-slate-700 font-bold">—</span>
                                                             )}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{drv.experience || '—'}</TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="icon" onClick={() => handleEditDriver(drv)} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDriver(drv.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className="max-w-7xl mx-auto border border-slate-300 shadow-none rounded-none overflow-hidden bg-white">
                            <CardHeader className="p-4 border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-base font-bold text-slate-700">
                                    {editingDriver ? 'Edit Driver' : 'Driver Registration'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSaveDriver} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
                                        {/* Row 1 */}
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Full Name <span className="text-red-500">*</span></Label>
                                            <Input name="name" defaultValue={editingDriver?.name} required className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Phone <span className="text-red-500">*</span></Label>
                                            <Input name="phone" defaultValue={editingDriver?.phone} required className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Emergency No</Label>
                                            <Input name="emergencyContact" defaultValue={editingDriver?.emergencyContact} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Experience in years</Label>
                                            <Input name="experience" defaultValue={editingDriver?.experience} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>

                                        {/* Row 2 */}
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Date Of Birth</Label>
                                            <Input name="dob" type="date" defaultValue={editingDriver?.dob} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Date of Joining</Label>
                                            <Input name="dateOfJoining" type="date" defaultValue={editingDriver?.dateOfJoining} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">License Expiry</Label>
                                            <Input name="licenseExpiry" type="date" defaultValue={editingDriver?.licenseExpiry} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Blood Group</Label>
                                            <Select name="bloodGroup" defaultValue={editingDriver?.bloodGroup || ''}>
                                                <SelectTrigger className="w-full h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400 text-left px-3">
                                                    <SelectValue placeholder="Select Blood Group" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-none">
                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Row 3 */}
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Salary Amount</Label>
                                            <Input name="salaryAmount" type="number" defaultValue={editingDriver?.salaryAmount} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Bank Name</Label>
                                            <Input name="bankName" defaultValue={editingDriver?.bankName} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">IFSC Code</Label>
                                            <Input name="bankIfsc" defaultValue={editingDriver?.bankIfsc} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400 uppercase" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Account Number</Label>
                                            <Input name="bankAccountNo" defaultValue={editingDriver?.bankAccountNo} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>

                                        {/* Row 4 */}
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Driver Photo</Label>
                                            <div 
                                                className="h-10 border border-slate-300 flex items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all relative overflow-hidden group"
                                            >
                                                {driverPhoto ? (
                                                    <div className="w-full h-full flex items-center justify-between px-2 bg-white">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded border border-slate-200 overflow-hidden bg-white">
                                                                <img src={driverPhoto} className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600">Photo Attached</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => setPreviewDoc({ title: 'Driver Photo', content: driverPhoto })}
                                                                className="h-7 w-7 text-indigo-600 hover:bg-indigo-50"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Button>
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => setDriverPhoto('')}
                                                                className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-400" onClick={() => document.getElementById('driver-photo-upload')?.click()}>
                                                        <Upload size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Upload Photo</span>
                                                    </div>
                                                )}
                                                <input id="driver-photo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            setCroppingImg({
                                                                src: reader.result as string,
                                                                aspect: 1, // Square for profile
                                                                onComplete: (cropped) => setDriverPhoto(cropped)
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Residential Address</Label>
                                            <Input name="address" defaultValue={editingDriver?.address} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                        <div className="md:col-span-1 space-y-1">
                                            <Label className="text-sm font-medium text-slate-900">Additional Notes</Label>
                                            <Input name="notes" defaultValue={editingDriver?.notes} className="h-10 rounded-none border-slate-300 shadow-none focus:ring-0 focus:border-slate-400" />
                                        </div>
                                    </div>

                                    {/* 4 DRAG AND DROP FIELDS WITH INTEGRATED ID NUMBERS */}
                                    <div className="mt-8 border-t border-slate-200 pt-8">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            {/* Slot 1: Aadhar Card */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">Aadhar Card</Label>
                                                <Input
                                                    name="aadharNumber"
                                                    placeholder="abcd-abcd-abcd"
                                                    defaultValue={editingDriver?.aadharNumber}
                                                    className="h-10 rounded-none border-slate-300 text-xs shadow-none focus:ring-0 focus:border-slate-400"
                                                />
                                                <div
                                                    className={cn(
                                                        "h-24 border border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white hover:bg-slate-50 relative overflow-hidden group",
                                                        isDragging === "driver-0" && "bg-slate-100 border-slate-500"
                                                    )}
                                                >
                                                    {driverDocs[0]?.content ? (
                                                        <div className="w-full h-full">
                                                            {driverDocs[0].content.startsWith('data:application/pdf') ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                                                    <FileText size={24} className="text-rose-500" />
                                                                    <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-full px-2">{driverDocs[0].file}</span>
                                                                </div>
                                                            ) : (
                                                                <img src={driverDocs[0].content} className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button 
                                                                    type="button" 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => setPreviewDoc({ title: 'Aadhar Card', content: driverDocs[0].content })}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        const newDocs = [...driverDocs];
                                                                        newDocs[0] = { title: 'Aadhar Card', file: '', content: '' };
                                                                        setDriverDocs(newDocs);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2" onClick={() => document.getElementById("driver-doc-0")?.click()}>
                                                            {isReadingField === "driver-0" ? (
                                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={20} className="text-slate-400" />
                                                                    <span className="text-[10px] text-slate-500 text-center px-2">Upload Aadhar Scan</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input id="driver-doc-0" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.type === "application/pdf") {
                                                                setIsReadingField("driver-0");
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    const res = reader.result as string;
                                                                    const newDocs = [...driverDocs];
                                                                    newDocs[0] = { title: 'Aadhar Card', file: file.name, content: res };
                                                                    setDriverDocs(newDocs);
                                                                    setIsReadingField(null);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setCroppingImg({
                                                                        src: reader.result as string,
                                                                        aspect: 16 / 10, // Wider for documents
                                                                        onComplete: (cropped) => {
                                                                            const newDocs = [...driverDocs];
                                                                            newDocs[0] = { title: 'Aadhar Card', file: file.name, content: cropped };
                                                                            setDriverDocs(newDocs);
                                                                        }
                                                                    });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Slot 2: PAN Card */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">PAN Card</Label>
                                                <Input
                                                    name="panNumber"
                                                    placeholder="ABCDE1234F"
                                                    defaultValue={editingDriver?.panNumber}
                                                    className="h-10 rounded-none border-slate-300 text-xs shadow-none focus:ring-0 focus:border-slate-400 uppercase"
                                                />
                                                <div
                                                    className={cn(
                                                        "h-24 border border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white hover:bg-slate-50 relative overflow-hidden group",
                                                        isDragging === "driver-1" && "bg-slate-100 border-slate-500"
                                                    )}
                                                >
                                                    {driverDocs[1]?.content ? (
                                                        <div className="w-full h-full">
                                                            {driverDocs[1].content.startsWith('data:application/pdf') ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                                                    <FileText size={24} className="text-rose-500" />
                                                                    <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-full px-2">{driverDocs[1].file}</span>
                                                                </div>
                                                            ) : (
                                                                <img src={driverDocs[1].content} className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button 
                                                                    type="button" 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => setPreviewDoc({ title: 'PAN Card', content: driverDocs[1].content })}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        const newDocs = [...driverDocs];
                                                                        newDocs[1] = { title: 'PAN Card', file: '', content: '' };
                                                                        setDriverDocs(newDocs);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2" onClick={() => document.getElementById("driver-doc-1")?.click()}>
                                                            {isReadingField === "driver-1" ? (
                                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={20} className="text-slate-400" />
                                                                    <span className="text-[10px] text-slate-500 text-center px-2">Upload PAN Scan</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input id="driver-doc-1" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.type === "application/pdf") {
                                                                setIsReadingField("driver-1");
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    const res = reader.result as string;
                                                                    const newDocs = [...driverDocs];
                                                                    newDocs[1] = { title: 'PAN Card', file: file.name, content: res };
                                                                    setDriverDocs(newDocs);
                                                                    setIsReadingField(null);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setCroppingImg({
                                                                        src: reader.result as string,
                                                                        aspect: 16 / 10,
                                                                        onComplete: (cropped) => {
                                                                            const newDocs = [...driverDocs];
                                                                            newDocs[1] = { title: 'PAN Card', file: file.name, content: cropped };
                                                                            setDriverDocs(newDocs);
                                                                        }
                                                                    });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Slot 3: Driving License */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">Driving License</Label>
                                                <Input
                                                    name="licenseNumber"
                                                    placeholder="L-9988776655"
                                                    defaultValue={editingDriver?.licenseNumber}
                                                    className="h-10 rounded-none border-slate-300 text-xs shadow-none focus:ring-0 focus:border-slate-400"
                                                />
                                                <div
                                                    className={cn(
                                                        "h-24 border border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white hover:bg-slate-50 relative overflow-hidden group",
                                                        isDragging === "driver-2" && "bg-slate-100 border-slate-500"
                                                    )}
                                                >
                                                    {driverDocs[2]?.content ? (
                                                        <div className="w-full h-full">
                                                            {driverDocs[2].content.startsWith('data:application/pdf') ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                                                    <FileText size={24} className="text-rose-500" />
                                                                    <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-full px-2">{driverDocs[2].file}</span>
                                                                </div>
                                                            ) : (
                                                                <img src={driverDocs[2].content} className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button 
                                                                    type="button" 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => setPreviewDoc({ title: 'Driving License', content: driverDocs[2].content })}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        const newDocs = [...driverDocs];
                                                                        newDocs[2] = { title: 'Driving License', file: '', content: '' };
                                                                        setDriverDocs(newDocs);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2" onClick={() => document.getElementById("driver-doc-2")?.click()}>
                                                            {isReadingField === "driver-2" ? (
                                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={20} className="text-slate-400" />
                                                                    <span className="text-[10px] text-slate-500 text-center px-2">Upload License Scan</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input id="driver-doc-2" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.type === "application/pdf") {
                                                                setIsReadingField("driver-2");
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    const res = reader.result as string;
                                                                    const newDocs = [...driverDocs];
                                                                    newDocs[2] = { title: 'Driving License', file: file.name, content: res };
                                                                    setDriverDocs(newDocs);
                                                                    setIsReadingField(null);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setCroppingImg({
                                                                        src: reader.result as string,
                                                                        aspect: 16 / 10,
                                                                        onComplete: (cropped) => {
                                                                            const newDocs = [...driverDocs];
                                                                            newDocs[2] = { title: 'Driving License', file: file.name, content: cropped };
                                                                            setDriverDocs(newDocs);
                                                                        }
                                                                    });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Slot 4: Additional Document */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">Additional Document</Label>
                                                <Input
                                                    placeholder="Doc description"
                                                    className="h-10 rounded-none border-slate-300 text-xs shadow-none focus:ring-0 focus:border-slate-400"
                                                    value={driverDocs[3]?.title || ''}
                                                    onChange={(e) => {
                                                        const newDocs = [...driverDocs];
                                                        newDocs[3] = { ...newDocs[3], title: e.target.value };
                                                        setDriverDocs(newDocs);
                                                    }}
                                                />
                                                <div
                                                    className={cn(
                                                        "h-24 border border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white hover:bg-slate-50 relative overflow-hidden group",
                                                        isDragging === "driver-3" && "bg-slate-100 border-slate-500"
                                                    )}
                                                >
                                                    {driverDocs[3]?.content ? (
                                                        <div className="w-full h-full">
                                                            {driverDocs[3].content.startsWith('data:application/pdf') ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                                                    <FileText size={24} className="text-rose-500" />
                                                                    <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-full px-2">{driverDocs[3].file}</span>
                                                                </div>
                                                            ) : (
                                                                <img src={driverDocs[3].content} className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button 
                                                                    type="button" 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => setPreviewDoc({ title: driverDocs[3].title || 'Additional Document', content: driverDocs[3].content })}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="destructive" 
                                                                    size="sm" 
                                                                    className="h-7 rounded-none text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        const newDocs = [...driverDocs];
                                                                        newDocs[3] = { ...newDocs[3], file: '', content: '' };
                                                                        setDriverDocs(newDocs);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2" onClick={() => document.getElementById("driver-doc-3")?.click()}>
                                                            {isReadingField === "driver-3" ? (
                                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={20} className="text-slate-400" />
                                                                    <span className="text-[10px] text-slate-500 text-center px-2">Upload Additional Doc</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input id="driver-doc-3" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.type === "application/pdf") {
                                                                setIsReadingField("driver-3");
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    const res = reader.result as string;
                                                                    const newDocs = [...driverDocs];
                                                                    newDocs[3] = { ...newDocs[3], file: file.name, content: res };
                                                                    setDriverDocs(newDocs);
                                                                    setIsReadingField(null);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setCroppingImg({
                                                                        src: reader.result as string,
                                                                        aspect: 16 / 10,
                                                                        onComplete: (cropped) => {
                                                                            const newDocs = [...driverDocs];
                                                                            newDocs[3] = { ...newDocs[3], file: file.name, content: cropped };
                                                                            setDriverDocs(newDocs);
                                                                        }
                                                                    });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                                        <Button type="button" variant="outline" onClick={() => { setIsAddingDriver(false); setEditingDriver(null); setDriverDocs([]); }} className="h-10 px-8 rounded-none border-slate-300 font-medium text-slate-700">Cancel</Button>
                                        <Button type="submit" className="h-10 px-10 rounded-none bg-slate-700 hover:bg-slate-800 text-white font-medium">Save Driver</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* IMAGE CROP MODAL */}
                    {croppingImg && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="relative w-full max-w-2xl bg-white rounded-none shadow-2xl flex flex-col h-[70vh]">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Crop Image</h3>
                                    <Button variant="ghost" size="icon" onClick={() => setCroppingImg(null)} className="h-8 w-8">
                                        <X size={18} />
                                    </Button>
                                </div>
                                <div className="flex-1 relative bg-slate-200">
                                    <Cropper
                                        image={croppingImg.src}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={croppingImg.aspect}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                    />
                                </div>
                                <div className="p-6 space-y-4 border-t border-slate-200">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                            <span>Zoom</span>
                                            <span>{Math.round(zoom * 100)}%</span>
                                        </div>
                                        <Slider 
                                            value={[zoom]} 
                                            min={1} 
                                            max={3} 
                                            step={0.1} 
                                            onValueChange={([val]) => setZoom(val)} 
                                            className="py-4"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setCroppingImg(null)} className="rounded-none h-10 px-6 text-xs font-bold uppercase">Cancel</Button>
                                        <Button onClick={handleGenerateCroppedImage} className="rounded-none h-10 px-8 bg-slate-800 text-white text-xs font-bold uppercase hover:bg-black transition-colors">Apply Crop</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENT LIGHTBOX */}
                    {previewDoc && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-none flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700">{previewDoc.title}</h3>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setPreviewDoc(null)}
                                        className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                                    >
                                        <X size={18} />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-hidden p-2 bg-slate-100">
                                    {previewDoc.content.startsWith('data:application/pdf') ? (
                                        <iframe src={previewDoc.content} className="w-full h-full border-none" title={previewDoc.title} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <img src={previewDoc.content} alt={previewDoc.title} className="max-w-full max-h-full object-contain shadow-2xl" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>


            </Tabs>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                confirmButtonClasses="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            />

            {/* MONTH CALENDAR MODAL */}
            <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogContent className="max-w-md bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden outline-none">
                    <div className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Calendar className="h-6 w-6" />
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Session Calendar</DialogTitle>
                        <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                            For: {allStudents.find(s => s.id === selectedAllocationForCalendar?.studentId)?.name || 'Unknown Student'}
                        </DialogDescription>
                    </div>

                    <div className="p-8 pt-4 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {getSessionMonths().map(month => {
                                const isActive = tempSelectedMonths.includes(month);
                                return (
                                    <button
                                        key={month}
                                        type="button"
                                        onClick={() => {
                                            setTempSelectedMonths(prev => 
                                                prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
                                            );
                                        }}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1",
                                            isActive 
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]" 
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{month.substring(0, 3)}</span>
                                        {isActive && <CheckCircle2 className="h-3 w-3" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Months</span>
                            <span className="text-sm font-black text-indigo-600">{tempSelectedMonths.length} / 12</span>
                        </div>

                        <div className="flex gap-3 pb-4">
                            <Button 
                                type="button"
                                variant="outline" 
                                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all text-[10px]"
                                onClick={() => {
                                    if (tempSelectedMonths.length === 12) setTempSelectedMonths([]);
                                    else setTempSelectedMonths(getSessionMonths());
                                }}
                            >
                                {tempSelectedMonths.length === 12 ? 'Clear All' : 'Select All'}
                            </Button>
                            <Button 
                                type="button"
                                className="flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] text-[10px]"
                                onClick={handleSaveCalendar}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Apply Changes'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* EDIT ALLOCATION MODAL */}
            <Dialog open={!!editingAllocation} onOpenChange={(open) => !open && setEditingAllocation(null)}>
                <DialogContent className="max-w-md bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden outline-none">
                    <div className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Edit2 className="h-6 w-6" />
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Edit Allocation</DialogTitle>
                        <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                            For: {allStudents.find(s => s.id === editingAllocation?.studentId)?.name || 'Unknown Student'}
                        </DialogDescription>
                    </div>

                    <div className="p-8 pt-4 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Route</Label>
                                <Select value={selectedRouteForAlloc} onValueChange={(val) => { setSelectedRouteForAlloc(val); setSelectedStopForAlloc(''); }}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black">
                                        <SelectValue placeholder="Select Route" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {routes.map(r => (
                                            <SelectItem key={r.id} value={r.id} className="font-black py-2 uppercase tracking-tight">{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Assigned Stop</Label>
                                <Select disabled={!selectedRouteForAlloc} value={selectedStopForAlloc} onValueChange={setSelectedStopForAlloc}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black">
                                        <SelectValue placeholder={selectedRouteForAlloc ? "Choose Stop" : "First select a route"} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl shadow-2xl">
                                        {routes.find((r: TransportRoute) => r.id === selectedRouteForAlloc)?.stops.map((s: TransportStop) => (
                                            <SelectItem key={s.id} value={s.id} className="font-black py-2 uppercase tracking-tight">
                                                <div className="flex items-center justify-between w-full gap-8">
                                                    <span className="flex items-center gap-2">
                                                        <span>{s.name}</span>
                                                        {s.distanceKm > 0 && (
                                                            <span className="text-[10px] font-bold text-slate-400">({s.distanceKm} KM)</span>
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[9px] text-slate-400">AM: {s.morningPickupTime || '--:--'}</span>
                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">₹{s.monthlyFee}</span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Start Date</Label>
                                    <Input 
                                        type="date" 
                                        value={allocationStartDate} 
                                        onChange={(e) => setAllocationStartDate(e.target.value)}
                                        className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">End Date</Label>
                                    <Input 
                                        type="date" 
                                        value={allocationEndDate} 
                                        onChange={(e) => setAllocationEndDate(e.target.value)}
                                        className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-black"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pb-4">
                            <Button 
                                type="button"
                                variant="outline" 
                                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all text-[10px]"
                                onClick={() => setEditingAllocation(null)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="button"
                                className="flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] text-[10px]"
                                onClick={handleSaveEditAllocation}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Copy Route Dialog */}
            <Dialog open={isCopyRouteOpen} onOpenChange={(open) => { if (!open) { setIsCopyRouteOpen(false); setRouteToCopy(null); } }}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-indigo-600 p-8 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Copy className="h-6 w-6" />
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none">Duplicate Route</DialogTitle>
                        <DialogDescription className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mt-2">
                            Copying stops and details from: {routeToCopy?.name}
                        </DialogDescription>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">New Route Name</Label>
                            <Input
                                value={copyRouteNewName}
                                onChange={(e) => setCopyRouteNewName(e.target.value)}
                                placeholder="e.g. North Sector Copy"
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black focus-visible:ring-indigo-500"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button 
                                type="button"
                                variant="outline" 
                                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all text-[10px]"
                                onClick={() => { setIsCopyRouteOpen(false); setRouteToCopy(null); }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="button"
                                className="flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] text-[10px]"
                                onClick={handleSaveCopyRoute}
                            >
                                Duplicate
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
