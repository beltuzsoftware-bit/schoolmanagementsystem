'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Layout, Globe, School2, RotateCcw, Info, Settings2, Users, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Import Managers
import SimpleListManager from '@/components/school-admin/settings/simple-list-manager';
import ClassesManager from '@/components/school-admin/settings/classes-manager';
import IdGenerationManager from '@/components/school-admin/settings/id-generation-manager';
import AdmissionDesignManager from '@/components/school-admin/settings/admission-design-manager';
import FieldLabelManager from '@/components/school-admin/settings/field-label-manager';

import { getSchools, getSchool, updateStudentSettings, getGlobalStudentDefaults } from '@/app/actions';
import { School } from '@/types';

import {
    INITIAL_CLASS_SETUPS,
    INITIAL_SECTIONS,
    INITIAL_HOUSES,
    INITIAL_RELIGIONS,
    INITIAL_CATEGORIES,
    INITIAL_STREAMS,
    INITIAL_REG_SETTINGS,
    INITIAL_ENROLL_SETTINGS,
    INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS,
    INITIAL_SR_SETTINGS,
    INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS,
    INITIAL_DISABLE_REASONS
} from '@/lib/student-constants';
import { RegNoSettings, EnrollmentNoSettings, ClassSetup, AutoIdSettings } from '@/types/student-settings';

function ToggleBanner({
    title,
    isCustom,
    onToggle
}: {
    title: string;
    isCustom: boolean;
    onToggle: (custom: boolean) => void;
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-8 gap-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isCustom ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    {isCustom ? <School2 size={20} /> : <Globe size={20} />}
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">{title} Configuration Mode</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                        {isCustom
                            ? "Currently using your school's unique custom configuration."
                            : "Currently using the platform-wide global defaults (Read Only)."}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-xl self-start md:self-auto">
                <button
                    onClick={() => onToggle(false)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${!isCustom ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    Global Default
                </button>
                <button
                    onClick={() => onToggle(true)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isCustom ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    Custom Config
                </button>
            </div>
        </div>
    );
}

export default function StudentSettingsPage() {
    // Toggles
    const [useCustomClasses, setUseCustomClasses] = useState(false);
    const [useCustomSections, setUseCustomSections] = useState(false);
    const [useCustomHouses, setUseCustomHouses] = useState(false);
    const [useCustomIdSettings, setUseCustomIdSettings] = useState(false);
    const [useCustomDisableReasons, setUseCustomDisableReasons] = useState(false);
    const [useCustomReligions, setUseCustomReligions] = useState(false);
    const [useCustomCategories, setUseCustomCategories] = useState(false);
    const [useCustomStreams, setUseCustomStreams] = useState(false);
    const [useCustomLanguages, setUseCustomLanguages] = useState(false);
    const [admissionPaymentEnabled, setAdmissionPaymentEnabled] = useState(false);
    const [admissionFeeAmount, setAdmissionFeeAmount] = useState(0);
    const [requireAdmissionDocs, setRequireAdmissionDocs] = useState(false);

    // Dynamic State arrays
    const [classes, setClasses] = useState<ClassSetup[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [houses, setHouses] = useState<string[]>([]);
    const [disableReasons, setDisableReasons] = useState<string[]>([]);
    const [religions, setReligions] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [streams, setStreams] = useState<string[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
    const [firstLanguageFixed, setFirstLanguageFixed] = useState(false);
    const [firstLanguageDefault, setFirstLanguageDefault] = useState('English');
    const [secondLanguageFixed, setSecondLanguageFixed] = useState(false);
    const [secondLanguageDefault, setSecondLanguageDefault] = useState('');
    const [thirdLanguageFixed, setThirdLanguageFixed] = useState(false);
    const [thirdLanguageDefault, setThirdLanguageDefault] = useState('');

    const [regSettings, setRegSettings] = useState<RegNoSettings>(INITIAL_REG_SETTINGS);
    const [enrollSettings, setEnrollSettings] = useState<EnrollmentNoSettings>(INITIAL_ENROLL_SETTINGS);
    const [apaarSettings, setApaarSettings] = useState<AutoIdSettings>(INITIAL_APAAR_SETTINGS);
    const [penSettings, setPenSettings] = useState<AutoIdSettings>(INITIAL_PEN_SETTINGS);
    const [srSettings, setSrSettings] = useState<AutoIdSettings>(INITIAL_SR_SETTINGS);
    const [genRegSettings, setGenRegSettings] = useState<AutoIdSettings>(INITIAL_GEN_REG_SETTINGS);
    const [rollSettings, setRollSettings] = useState<AutoIdSettings>(INITIAL_ROLL_SETTINGS);

    // Global Defaults Cache
    const [globalDefaults, setGlobalDefaults] = useState({
        classes: INITIAL_CLASS_SETUPS,
        sections: INITIAL_SECTIONS,
        houses: INITIAL_HOUSES,
        religions: INITIAL_RELIGIONS,
        categories: INITIAL_CATEGORIES,
        streams: INITIAL_STREAMS,
        disableReasons: INITIAL_DISABLE_REASONS,
        regNoSettings: INITIAL_REG_SETTINGS,
        enrollNoSettings: INITIAL_ENROLL_SETTINGS,
        apaarIdSettings: INITIAL_APAAR_SETTINGS,
        penNoSettings: INITIAL_PEN_SETTINGS,
        srNoSettings: INITIAL_SR_SETTINGS,
        genRegNoSettings: INITIAL_GEN_REG_SETTINGS,
        rollNoSettings: INITIAL_ROLL_SETTINGS,
        languages: ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German']
    });

    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        fetchSchool();
    }, []);

    const fetchSchool = async () => {
        const storedUser = localStorage.getItem('kummi_user');
        if (!storedUser) {
            console.warn('[SETTINGS] No user found in localStorage');
            return;
        }
        const user = JSON.parse(storedUser);
        const schoolId = user.schoolId;
        if (!schoolId) {
            console.warn('[SETTINGS] No schoolId found in user object');
            return;
        }

        console.log('[SETTINGS] Fetching configuration for school:', schoolId);
        setLoading(true);
        try {
            const [mySchool, globals] = await Promise.all([
                getSchool(schoolId),
                getGlobalStudentDefaults()
            ]);

            console.log('[SETTINGS] Fetch complete. School found:', !!mySchool);

            if (globals) {
                setGlobalDefaults(globals as any);
            }

            if (mySchool) {
                setSchool(mySchool as any);
                const ms = mySchool as any;

                // Load Toggles
                setUseCustomClasses(!!ms.useCustomClasses);
                setUseCustomSections(!!ms.useCustomSections);
                setUseCustomHouses(!!ms.useCustomHouses);
                setUseCustomIdSettings(!!ms.useCustomIdSettings);
                setUseCustomDisableReasons(!!ms.useCustomDisableReasons);
                setUseCustomReligions(!!ms.useCustomReligions);
                setUseCustomCategories(!!ms.useCustomCategories);
                setUseCustomStreams(!!ms.useCustomStreams);

                // Load Custom Data
                setClasses(ms.classes || globals?.classes || INITIAL_CLASS_SETUPS);
                setSections(ms.sections || globals?.sections || INITIAL_SECTIONS);
                setHouses(ms.houses || globals?.houses || INITIAL_HOUSES);
                setDisableReasons(ms.disableReasons || globals?.disableReasons || INITIAL_DISABLE_REASONS);
                setReligions(ms.religions || globals?.religions || INITIAL_RELIGIONS);
                setCategories(ms.categories || globals?.categories || INITIAL_CATEGORIES);
                setStreams(ms.streams || globals?.streams || INITIAL_STREAMS);

                if (ms.languages) {
                    const langObj = ms.languages as any;
                    setAvailableLanguages(langObj.available || ['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German']);
                    setFirstLanguageFixed(!!langObj.firstLanguageFixed);
                    setFirstLanguageDefault(langObj.firstLanguageDefault || 'English');
                    setSecondLanguageFixed(!!langObj.secondLanguageFixed);
                    setSecondLanguageDefault(langObj.secondLanguageDefault || '');
                    setThirdLanguageFixed(!!langObj.thirdLanguageFixed);
                    setThirdLanguageDefault(langObj.thirdLanguageDefault || '');
                    setUseCustomLanguages(true);
                } else {
                    setAvailableLanguages(['English', 'Hindi', 'Bengali', 'Sanskrit', 'French', 'German']);
                    setFirstLanguageFixed(false);
                    setFirstLanguageDefault('English');
                    setSecondLanguageFixed(false);
                    setSecondLanguageDefault('');
                    setThirdLanguageFixed(false);
                    setThirdLanguageDefault('');
                    setUseCustomLanguages(false);
                }

                if (ms.regNoSettings) setRegSettings(ms.regNoSettings);
                if (ms.enrollNoSettings) setEnrollSettings(ms.enrollNoSettings);
                if (ms.apaarIdSettings) setApaarSettings(ms.apaarIdSettings);
                if (ms.penNoSettings) setPenSettings(ms.penNoSettings);
                if (ms.srNoSettings) setSrSettings(ms.srNoSettings);
                if (ms.genRegNoSettings) setGenRegSettings(ms.genRegNoSettings);
                if (ms.rollNoSettings) setRollSettings(ms.rollNoSettings);

                setAdmissionPaymentEnabled(!!ms.admissionPaymentEnabled);
                setAdmissionFeeAmount(ms.admissionFeeAmount || 0);
                setRequireAdmissionDocs(!!ms.requireAdmissionDocs);
            } else {
                toast.error("School configuration not found. Please contact support.");
            }
        } catch (error) {
            console.error('[SETTINGS] Fetch failed:', error);
            toast.error("Failed to load settings. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async () => {
        if (!school) return;
        setLoading(true);
        try {
            const settings = {
                useCustomClasses,
                useCustomSections,
                useCustomHouses,
                useCustomIdSettings,
                useCustomDisableReasons,
                useCustomReligions,
                useCustomCategories,
                useCustomStreams,
                useCustomLanguages,
                languages: useCustomLanguages ? {
                    available: availableLanguages,
                    firstLanguageFixed,
                    firstLanguageDefault,
                    secondLanguageFixed,
                    secondLanguageDefault,
                    thirdLanguageFixed,
                    thirdLanguageDefault
                } : null,
                
                // Only save the lists if custom is active. If not active, we still save them but they won"t be used by the app logic as the priority.
                classes,
                sections,
                houses,
                disableReasons,
                religions,
                categories,
                streams,
                regNoSettings: regSettings,
                enrollNoSettings: enrollSettings,
                apaarIdSettings: apaarSettings,
                penNoSettings: penSettings,
                srNoSettings: srSettings,
                genRegNoSettings: genRegSettings,
                rollNoSettings: rollSettings,
                admissionPaymentEnabled,
                admissionFeeAmount,
                requireAdmissionDocs,
            };
            const res = await updateStudentSettings(school.id, settings);
            if (res.success) {
                toast.success("All student settings saved successfully!");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("An error occurred while saving settings");
        } finally {
            setLoading(false);
        }
    };

    // When switching to Custom Config for any list, seed with globals if empty
    const handleToggleHouses = (custom: boolean) => {
        setUseCustomHouses(custom);
        if (custom && houses.length === 0) {
            setHouses(globalDefaults.houses);
        }
    };
    const handleToggleSections = (custom: boolean) => {
        setUseCustomSections(custom);
        if (custom && sections.length === 0) {
            setSections(globalDefaults.sections);
        }
    };
    const handleToggleReligions = (custom: boolean) => {
        setUseCustomReligions(custom);
        if (custom && religions.length === 0) {
            setReligions(globalDefaults.religions);
        }
    };
    const handleToggleCategories = (custom: boolean) => {
        setUseCustomCategories(custom);
        if (custom && categories.length === 0) {
            setCategories(globalDefaults.categories);
        }
    };
    const handleToggleStreams = (custom: boolean) => {
        setUseCustomStreams(custom);
        if (custom && streams.length === 0) {
            setStreams(globalDefaults.streams);
        }
    };
    const handleToggleDisableReasons = (custom: boolean) => {
        setUseCustomDisableReasons(custom);
        if (custom && disableReasons.length === 0) {
            setDisableReasons(globalDefaults.disableReasons);
        }
    };

    const handleToggleLanguages = (custom: boolean) => {
        setUseCustomLanguages(custom);
        if (custom && availableLanguages.length === 0) {
            setAvailableLanguages(globalDefaults.languages);
        }
    };

    const handleIdUpdate = (field: string, newSettings: any) => {
        switch (field) {
            case 'registrationNo': setRegSettings(newSettings); break;
            case 'enrollmentNo': setEnrollSettings(newSettings); break;
            case 'apaarId': setApaarSettings(newSettings); break;
            case 'penNo': setPenSettings(newSettings); break;
            case 'srNo': setSrSettings(newSettings); break;
            case 'generalRegistrationNo': setGenRegSettings(newSettings); break;
            case 'rollNumber': setRollSettings(newSettings); break;
        }
    };

    if (!isMounted) return null;

    // Show smooth loading state while fetching from database
    if (!school) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400/80 animate-in fade-in duration-1000">
                <Settings2 className="w-12 h-12 mb-6 animate-[spin_3s_linear_infinite]" />
                <h3 className="text-xl font-bold text-slate-600">Loading Configuration</h3>
                <p className="text-sm mt-2">Fetching school parameters from the database...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Student Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure classes, IDs, and other parameters for your school.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button onClick={handleSaveAll} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold shadow-md">
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="classes" className="space-y-4">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1.5 h-auto flex flex-wrap gap-1.5 w-full justify-start rounded-xl">
                    <TabsTrigger value="classes" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Classes</TabsTrigger>
                    <TabsTrigger value="sections" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Sections</TabsTrigger>
                    <TabsTrigger value="houses" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Houses</TabsTrigger>
                    <TabsTrigger value="religions" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Religions</TabsTrigger>
                    <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Categories</TabsTrigger>
                    <TabsTrigger value="streams" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Streams</TabsTrigger>
                    <TabsTrigger value="languages" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Languages</TabsTrigger>
                    <TabsTrigger value="auto-gen" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">ID Auto-Gen</TabsTrigger>
                    <TabsTrigger value="disable-reason" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Disable Reason</TabsTrigger>
                    <TabsTrigger value="admission-form" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Admission Form</TabsTrigger>
                    <TabsTrigger value="field-labels" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Form Field Labels</TabsTrigger>
                    <TabsTrigger value="admission-behavior" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Online Admission</TabsTrigger>
                    <TabsTrigger value="batch-edit" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all px-4 py-2 rounded-lg font-bold text-slate-600">Batch Update Info</TabsTrigger>
                </TabsList>

                {/* --- CLASSES --- */}
                <TabsContent value="classes">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Classes</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Classes" isCustom={useCustomClasses} onToggle={setUseCustomClasses} />
                            
                            {useCustomClasses && (
                                <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start animate-in slide-in-from-top-2 duration-500">
                                    <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                    <div className="text-sm text-blue-800 leading-relaxed">
                                        <p className="font-bold mb-1">How Class & Section Setup Works:</p>
                                        <p>Your school has a <strong>pool of sections</strong> (defined in the next tab). When creating a class, you simply "pick" which sections from that pool belong to it. We've added a quick-add feature below so you can add new sections while setting up a class.</p>
                                    </div>
                                </div>
                            )}

                            <div className={!useCustomClasses ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <ClassesManager 
                                    classes={useCustomClasses ? classes : globalDefaults.classes} 
                                    sections={useCustomSections ? sections : globalDefaults.sections} 
                                    onUpdate={setClasses} 
                                    onAddSection={(newSec) => {
                                        if (useCustomSections) {
                                            setSections(prev => [...prev, newSec]);
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SECTIONS --- */}
                <TabsContent value="sections">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Sections</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Sections" isCustom={useCustomSections} onToggle={handleToggleSections} />
                            <div className={!useCustomSections ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Sections" description="Manage sections available to assign to classes." items={useCustomSections ? sections : globalDefaults.sections} onUpdate={setSections} placeholder="Enter section name" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- HOUSES --- */}
                <TabsContent value="houses">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Houses / Blocks</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Houses" isCustom={useCustomHouses} onToggle={handleToggleHouses} />
                            <div className={!useCustomHouses ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Houses" description="Student house structures." items={useCustomHouses ? houses : globalDefaults.houses} onUpdate={setHouses} placeholder="Enter house name" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- RELIGIONS --- */}
                <TabsContent value="religions">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Religions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Religions" isCustom={useCustomReligions} onToggle={handleToggleReligions} />
                            <div className={!useCustomReligions ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Religions" description="Religions available." items={useCustomReligions ? religions : globalDefaults.religions} onUpdate={setReligions} placeholder="Enter religion" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- CATEGORIES --- */}
                <TabsContent value="categories">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Categories</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Categories" isCustom={useCustomCategories} onToggle={handleToggleCategories} />
                            <div className={!useCustomCategories ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Categories" description="Social categories available." items={useCustomCategories ? categories : globalDefaults.categories} onUpdate={setCategories} placeholder="Enter category" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- STREAMS --- */}
                <TabsContent value="streams">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Streams</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Streams" isCustom={useCustomStreams} onToggle={handleToggleStreams} />
                            <div className={!useCustomStreams ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Streams" description="Academic streams available." items={useCustomStreams ? streams : globalDefaults.streams} onUpdate={setStreams} placeholder="Enter stream" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- LANGUAGES --- */}
                <TabsContent value="languages">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Languages Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Languages" isCustom={useCustomLanguages} onToggle={handleToggleLanguages} />
                            
                            <div className={!useCustomLanguages ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all space-y-6" : "transition-all space-y-6"}>
                                <SimpleListManager 
                                    title="Available Languages" 
                                    description="Languages available for selection in student profile (1st, 2nd, and 3rd Language)." 
                                    items={useCustomLanguages ? availableLanguages : globalDefaults.languages} 
                                    onUpdate={setAvailableLanguages} 
                                    placeholder="Enter language name (e.g. Sanskrit, French)" 
                                />

                                <div className="border-t pt-6 space-y-4">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Language Specific Rules</h4>
                                    
                                    {/* Fix 1st Language */}
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 border rounded-2xl">
                                        <input 
                                            type="checkbox" 
                                            id="firstLanguageFixed"
                                            checked={firstLanguageFixed} 
                                            onChange={(e) => setFirstLanguageFixed(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0" 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700">Fix 1st Language for Entire School</p>
                                            <p className="text-xs text-slate-500 mt-0.5">All students get the same 1st Language.</p>
                                        </div>
                                        {firstLanguageFixed && (
                                            <select
                                                value={firstLanguageDefault}
                                                onChange={(e) => setFirstLanguageDefault(e.target.value)}
                                                className="h-9 px-3 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none shrink-0"
                                            >
                                                {(useCustomLanguages ? availableLanguages : globalDefaults.languages).map((lang) => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Fix 2nd Language */}
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 border rounded-2xl">
                                        <input 
                                            type="checkbox" 
                                            id="secondLanguageFixed"
                                            checked={secondLanguageFixed} 
                                            onChange={(e) => setSecondLanguageFixed(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0" 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700">Fix 2nd Language for Entire School</p>
                                            <p className="text-xs text-slate-500 mt-0.5">All students get the same 2nd Language.</p>
                                        </div>
                                        {secondLanguageFixed && (
                                            <select
                                                value={secondLanguageDefault}
                                                onChange={(e) => setSecondLanguageDefault(e.target.value)}
                                                className="h-9 px-3 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none shrink-0"
                                            >
                                                <option value="">-- Select --</option>
                                                {(useCustomLanguages ? availableLanguages : globalDefaults.languages)
                                                    .filter(lang => !(firstLanguageFixed && lang === firstLanguageDefault))
                                                    .map((lang) => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Fix 3rd Language */}
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 border rounded-2xl">
                                        <input 
                                            type="checkbox" 
                                            id="thirdLanguageFixed"
                                            checked={thirdLanguageFixed} 
                                            onChange={(e) => setThirdLanguageFixed(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0" 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700">Fix 3rd Language for Entire School</p>
                                            <p className="text-xs text-slate-500 mt-0.5">All students get the same 3rd Language.</p>
                                        </div>
                                        {thirdLanguageFixed && (
                                            <select
                                                value={thirdLanguageDefault}
                                                onChange={(e) => setThirdLanguageDefault(e.target.value)}
                                                className="h-9 px-3 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none shrink-0"
                                            >
                                                <option value="">-- Select --</option>
                                                {(useCustomLanguages ? availableLanguages : globalDefaults.languages)
                                                    .filter(lang => {
                                                        if (firstLanguageFixed && lang === firstLanguageDefault) return false;
                                                        if (secondLanguageFixed && lang === secondLanguageDefault) return false;
                                                        return true;
                                                    })
                                                    .map((lang) => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ID AUTO-GEN --- */}
                <TabsContent value="auto-gen">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">ID Auto-Generation</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="ID Formats" isCustom={useCustomIdSettings} onToggle={setUseCustomIdSettings} />
                            <div className={!useCustomIdSettings ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <IdGenerationManager
                                    settings={useCustomIdSettings ? { 
                                        registrationNo: regSettings, enrollmentNo: enrollSettings, apaarId: apaarSettings, penNo: penSettings, srNo: srSettings, generalRegistrationNo: genRegSettings, rollNumber: rollSettings 
                                    } : {
                                        registrationNo: globalDefaults.regNoSettings, enrollmentNo: globalDefaults.enrollNoSettings, apaarId: globalDefaults.apaarIdSettings, penNo: globalDefaults.penNoSettings, srNo: globalDefaults.srNoSettings, generalRegistrationNo: globalDefaults.genRegNoSettings, rollNumber: globalDefaults.rollNoSettings 
                                    }}
                                    onUpdate={handleIdUpdate}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- DISABLE REASON --- */}
                <TabsContent value="disable-reason">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Disable / Remove Reasons</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ToggleBanner title="Disable Reasons" isCustom={useCustomDisableReasons} onToggle={handleToggleDisableReasons} />
                            <div className={!useCustomDisableReasons ? "opacity-60 pointer-events-none grayscale-[0.3] transition-all" : "transition-all"}>
                                <SimpleListManager title="Disable Reasons" description="Reasons shown when disabling a student." items={useCustomDisableReasons ? disableReasons : globalDefaults.disableReasons} onUpdate={setDisableReasons} placeholder="Enter reason" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ADMISSION FORM --- */}
                <TabsContent value="admission-form">
                    <Card className="border-t-4 border-t-indigo-500 overflow-hidden shadow-sm">
                        <CardHeader className="p-10 pb-0">
                            <CardTitle className="text-3xl font-black flex items-center gap-4">
                                <Layout className="h-10 w-10 text-indigo-600" />
                                Admission Form Design
                            </CardTitle>
                            <CardDescription className="text-lg font-medium text-slate-500 mt-2">
                                Choose a pre-designed admission form template for your school.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-10">
                            {school ? (
                                <AdmissionDesignManager schoolId={school.id} currentTemplateId={school.admissionFormTemplateId} />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-400 font-bold italic animate-pulse">
                                    Loading configuration...
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- FIELD LABELS --- */}
                <TabsContent value="field-labels">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Form Field Labels</CardTitle>
                            <CardDescription>Customize the visible names of fields in your student admission forms.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {school && <FieldLabelManager schoolId={school.id} />}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- BATCH EDIT --- */}
                <TabsContent value="batch-edit">
                    <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Batch Student Information Update</CardTitle>
                            <CardDescription>Perform bulk updates for student types and other attributes.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] flex flex-col items-center text-center gap-6">
                                <div className="h-20 w-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center">
                                    <Users size={40} />
                                </div>
                                <div className="space-y-2 max-w-md">
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Batch Student Type Editor</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Quickly update students as 'New' or 'Old' for a specific class and section. This ensures accurate fee generation for your school.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => window.location.href = '/school-admin/students/batch-edit-type'}
                                    className="bg-indigo-600 hover:bg-slate-900 text-white h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center gap-3"
                                >
                                    Open Batch Editor
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
