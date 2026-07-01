// Student Settings Types
export interface ClassSetup {
    id: string;
    name: string;
    code?: string; // Optional: For ID generation (e.g. NUR, 10A)
    sections: string[];
    subjects?: string[];
    createStudentLoginDefault: boolean;
}

export interface SessionSetup {
    id: string;
    name: string;
    isActive: boolean;
}

export interface AutoIdSettings {
    enabled: boolean;
    isPerSection?: boolean;
    template: 'template1' | 'template2' | 'template3' | 'custom';
    prefix: string;
    separator1: string;
    padding: number;
    suffix: string;
    startFrom: number;
    currentSerial: number;
    customPattern?: string; // New: e.g. {SERIAL}-{CLASS}-{MONTH}-{YEAR}
}

export type RegNoSettings = AutoIdSettings;

export interface EnrollmentNoSettings extends AutoIdSettings {
    useSameAsRegNo: boolean;
}

export interface StudentSettings {
    // Toggle Config Flags (false = use Global Default, true = use strict Custom Config)
    useCustomClasses?: boolean;
    useCustomSections?: boolean;
    useCustomHouses?: boolean;
    useCustomReligions?: boolean;
    useCustomCategories?: boolean;
    useCustomStreams?: boolean;
    useCustomIdSettings?: boolean;
    useCustomDisableReasons?: boolean;

    // School-specific Data (used if above flag is true)
    classes: ClassSetup[];
    sections: string[];
    houses: string[];
    sessions: SessionSetup[];
    religions: string[];
    categories: string[];
    streams: string[];
    sessionStartMonth: number;
    admissionNoSettings: RegNoSettings;
    regNoSettings: RegNoSettings;
    enrollNoSettings: EnrollmentNoSettings;
    apaarIdSettings?: AutoIdSettings;
    penNoSettings?: AutoIdSettings;
    srNoSettings?: AutoIdSettings;
    genRegNoSettings?: AutoIdSettings;
    rollNoSettings?: AutoIdSettings;
    disableReasons: string[];
}
