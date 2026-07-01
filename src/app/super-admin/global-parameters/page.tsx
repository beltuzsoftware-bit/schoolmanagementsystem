"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Save, RefreshCw } from "lucide-react";
import { 
    getGlobalStudentDefaults, 
    updateGlobalStudentDefaults 
} from "@/app/actions";
import SimpleListManager from '@/components/school-admin/settings/simple-list-manager';
import ClassesManager from '@/components/school-admin/settings/classes-manager';
import IdGenerationManager from '@/components/school-admin/settings/id-generation-manager';
import { ClassSetup, RegNoSettings, EnrollmentNoSettings, AutoIdSettings } from '@/types/student-settings';
import { 
    INITIAL_ADMISSION_SETTINGS,
    INITIAL_REG_SETTINGS, INITIAL_ENROLL_SETTINGS, INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS, INITIAL_SR_SETTINGS, INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS 
} from '@/lib/student-constants';
import { toast } from "sonner";

export default function GlobalParametersPage() {
    const [mounted, setMounted] = useState(false);
    
    // Global Defaults State
    const [globalReligions, setGlobalReligions] = useState<string[]>([]);
    const [globalCategories, setGlobalCategories] = useState<string[]>([]);
    const [globalStreams, setGlobalStreams] = useState<string[]>([]);
    const [globalClasses, setGlobalClasses] = useState<ClassSetup[]>([]);
    const [globalSections, setGlobalSections] = useState<string[]>([]);
    const [globalHouses, setGlobalHouses] = useState<string[]>([]);
    const [globalSessions, setGlobalSessions] = useState<string[]>([]);
    const [globalDisableReasons, setGlobalDisableReasons] = useState<string[]>([]);
    
    const [globalAdmissionSettings, setGlobalAdmissionSettings] = useState<RegNoSettings>(INITIAL_ADMISSION_SETTINGS);
    const [globalRegSettings, setGlobalRegSettings] = useState<RegNoSettings>(INITIAL_REG_SETTINGS);
    const [globalEnrollSettings, setGlobalEnrollSettings] = useState<EnrollmentNoSettings>(INITIAL_ENROLL_SETTINGS);
    const [globalApaarSettings, setGlobalApaarSettings] = useState<AutoIdSettings>(INITIAL_APAAR_SETTINGS);
    const [globalPenSettings, setGlobalPenSettings] = useState<AutoIdSettings>(INITIAL_PEN_SETTINGS);
    const [globalSrSettings, setGlobalSrSettings] = useState<AutoIdSettings>(INITIAL_SR_SETTINGS);
    const [globalGenRegSettings, setGlobalGenRegSettings] = useState<AutoIdSettings>(INITIAL_GEN_REG_SETTINGS);
    const [globalRollSettings, setGlobalRollSettings] = useState<AutoIdSettings>(INITIAL_ROLL_SETTINGS);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const globals = await getGlobalStudentDefaults();
            if (globals) {
                setGlobalReligions(globals.religions || []);
                setGlobalCategories(globals.categories || []);
                setGlobalStreams(globals.streams || []);
                setGlobalClasses(globals.classes || []);
                setGlobalSections(globals.sections || []);
                setGlobalHouses(globals.houses || []);
                setGlobalSessions(globals.sessions || []);
                setGlobalDisableReasons(globals.disableReasons || []);
                
                if (globals.admissionNoSettings) setGlobalAdmissionSettings(globals.admissionNoSettings);
                if (globals.regNoSettings) setGlobalRegSettings(globals.regNoSettings);
                if (globals.enrollNoSettings) setGlobalEnrollSettings(globals.enrollNoSettings);
                if (globals.apaarIdSettings) setGlobalApaarSettings(globals.apaarIdSettings);
                if (globals.penNoSettings) setGlobalPenSettings(globals.penNoSettings);
                if (globals.srNoSettings) setGlobalSrSettings(globals.srNoSettings);
                if (globals.genRegNoSettings) setGlobalGenRegSettings(globals.genRegNoSettings);
                if (globals.rollNoSettings) setGlobalRollSettings(globals.rollNoSettings);
            }
        } catch (error) {
            toast.error("Failed to load global parameters");
        } finally {
            setLoading(false);
        }
    };

    const handleIdUpdate = (field: string, newSettings: any) => {
        switch (field) {
            case 'admissionNumber': setGlobalAdmissionSettings(newSettings); break;
            case 'registrationNo': setGlobalRegSettings(newSettings); break;
            case 'enrollmentNo': setGlobalEnrollSettings(newSettings); break;
            case 'apaarId': setGlobalApaarSettings(newSettings); break;
            case 'penNo': setGlobalPenSettings(newSettings); break;
            case 'srNo': setGlobalSrSettings(newSettings); break;
            case 'generalRegistrationNo': setGlobalGenRegSettings(newSettings); break;
            case 'rollNumber': setGlobalRollSettings(newSettings); break;
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await updateGlobalStudentDefaults({
                religions: globalReligions,
                categories: globalCategories,
                streams: globalStreams,
                classes: globalClasses,
                sections: globalSections,
                houses: globalHouses,
                sessions: globalSessions,
                disableReasons: globalDisableReasons,
                admissionNoSettings: globalAdmissionSettings,
                regNoSettings: globalRegSettings,
                enrollNoSettings: globalEnrollSettings,
                apaarIdSettings: globalApaarSettings,
                penNoSettings: globalPenSettings,
                srNoSettings: globalSrSettings,
                genRegNoSettings: globalGenRegSettings,
                rollNoSettings: globalRollSettings
            });
            if (res.success) {
                toast.success('Global parameters updated successfully across the system.');
            } else {
                toast.error('Failed to update global parameters');
            }
        } catch (error) {
            toast.error('Failed to update global parameters');
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading global parameters...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Globe className="h-10 w-10 text-indigo-600" />
                        Global System Parameters
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium max-w-3xl">
                        Define global fallback options for all schools. These parameters are inherited by any school that hasn't defined their own custom overrides.
                    </p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-8 shadow-xl shadow-indigo-100 font-bold transition-all hover:scale-105 active:scale-95"
                >
                    <Save className="mr-2 h-5 w-5" />
                    {isSaving ? 'Saving Changes...' : 'Save All Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden border-2 h-full">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                            <CardTitle className="text-xl font-bold text-slate-800">Master Lists</CardTitle>
                            <CardDescription>Manage global lists for student categorization and school structure.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <SimpleListManager
                                    title="Religions"
                                    description="Base religions list inherited by default."
                                    items={globalReligions}
                                    onUpdate={setGlobalReligions}
                                    placeholder="E.g., Hinduism, Islam..."
                                />
                                <SimpleListManager
                                    title="Categories"
                                    description="Social categories like General, OBC, SC."
                                    items={globalCategories}
                                    onUpdate={setGlobalCategories}
                                    placeholder="E.g., General, OBC..."
                                />
                                <SimpleListManager
                                    title="Streams"
                                    description="Academic streams for higher classes."
                                    items={globalStreams}
                                    onUpdate={setGlobalStreams}
                                    placeholder="E.g., Science, Commerce..."
                                />
                                <SimpleListManager
                                    title="Houses / Blocks"
                                    description="Default student house structures."
                                    items={globalHouses}
                                    onUpdate={setGlobalHouses}
                                    placeholder="E.g., Red House..."
                                />
                                <SimpleListManager
                                    title="Sections"
                                    description="Default sections available to classes."
                                    items={globalSections}
                                    onUpdate={setGlobalSections}
                                    placeholder="E.g., A, B, C..."
                                />
                                <SimpleListManager
                                    title="Disable Reasons"
                                    description="Default reasons for student removal."
                                    items={globalDisableReasons}
                                    onUpdate={setGlobalDisableReasons}
                                    placeholder="Enter reason..."
                                />
                                <SimpleListManager
                                    title="Academic Sessions"
                                    description="Default sessions available for selection."
                                    items={globalSessions}
                                    onUpdate={setGlobalSessions}
                                    placeholder="E.g., 2026-2027..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 shadow-sm h-full flex flex-col justify-center">
                        <h3 className="text-amber-800 font-bold text-lg flex items-center gap-2 mb-4">
                            <RefreshCw className="h-5 w-5" />
                            Important Note
                        </h3>
                        <p className="text-amber-700 text-sm leading-relaxed">
                            Updating these parameters will immediately affect all schools that are using the "Global Default" settings. 
                            Schools with custom overrides will maintain their own unique configurations.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden border-2">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <CardTitle className="text-xl font-bold text-slate-800">Academic Structure</CardTitle>
                    <CardDescription>Define the default classes and their assigned sections.</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <ClassesManager 
                        classes={globalClasses} 
                        sections={globalSections} 
                        onUpdate={setGlobalClasses} 
                    />
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden border-2">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <CardTitle className="text-xl font-bold text-slate-800">ID Generation Rules</CardTitle>
                    <CardDescription>Set global formatting for registration and roll numbers.</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <IdGenerationManager 
                        settings={{ 
                            admissionNumber: globalAdmissionSettings,
                            registrationNo: globalRegSettings, 
                            enrollmentNo: globalEnrollSettings, 
                            apaarId: globalApaarSettings, 
                            penNo: globalPenSettings, 
                            srNo: globalSrSettings, 
                            generalRegistrationNo: globalGenRegSettings, 
                            rollNumber: globalRollSettings 
                        }} 
                        onUpdate={handleIdUpdate} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
