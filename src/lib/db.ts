import fs from 'fs';
import path from 'path';
import { School, SaasPackage, User, Module, IDCardTemplate, Student, StaffFormTemplate, AdmissionFormTemplate, StudentProfileTemplate, SubjectGroup, Subject, ClassSubjectAllocation, QRTransaction, AdmissionApplication, AccessoryTemplate, AccessorySale, SubjectGroupType, CurriculumTemplate } from '@/types';
import { StaffProfile, AttendanceMaster } from '@/types/staff';
import { FeeGroup, Transaction as FeeTransaction, DEMO_FEE_GROUP } from '@/types/fees';
import { MOCK_SCHOOLS, PACKAGES, MOCK_USERS, MODULES, DEFAULT_ID_CARD_TEMPLATES, DEFAULT_STAFF_FORM_TEMPLATES, DEFAULT_ADMISSION_FORM_TEMPLATES, DEFAULT_STUDENT_PROFILE_TEMPLATES, DEFAULT_SUBJECT_GROUPS, DEFAULT_SUBJECTS, DEFAULT_ACCESSORY_TEMPLATES } from '@/lib/mock-data';
import { 
    INITIAL_RELIGIONS, INITIAL_CATEGORIES, INITIAL_STREAMS,
    INITIAL_CLASS_SETUPS, INITIAL_SECTIONS, INITIAL_HOUSES,
    INITIAL_REG_SETTINGS, INITIAL_ENROLL_SETTINGS, INITIAL_APAAR_SETTINGS,
    INITIAL_PEN_SETTINGS, INITIAL_SR_SETTINGS, INITIAL_GEN_REG_SETTINGS,
    INITIAL_ROLL_SETTINGS, INITIAL_DISABLE_REASONS
} from '@/lib/student-constants';
import { ClassSetup, RegNoSettings, EnrollmentNoSettings, AutoIdSettings } from '@/types/student-settings';

// Triggering hot-reload to load updated INITIAL_CLASS_SETUPS
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data.json');

// Define the shape of our database
interface DatabaseSchema {
    users: User[];
    schools: School[];
    packages: SaasPackage[];
    modules: Module[];
    staffProfiles: StaffProfile[];
    attendance: AttendanceMaster;
    idCardTemplates: IDCardTemplate[];
    students: Student[];
    staffFormTemplates: StaffFormTemplate[];
    admissionFormTemplates: AdmissionFormTemplate[];
    studentProfileTemplates: StudentProfileTemplate[];
    curriculumTemplates: CurriculumTemplate[];
    subjectGroups: SubjectGroup[];
    subjectGroupTypes: SubjectGroupType[];
    subjects: Subject[];
    classAllocations: ClassSubjectAllocation[];
    qrTransactions: QRTransaction[];
    feeGroups: FeeGroup[];
    feeTransactions: FeeTransaction[];
    invoiceSettings: Record<string, any>; // schoolId -> settings
    admissionSettings: Record<string, any>;
    admissionApplications: AdmissionApplication[];
    accessoryTemplates: AccessoryTemplate[];
    accessorySales: AccessorySale[];
    revertedTransactions: any[];
    transportRoutes?: any[];
    transportVehicles?: any[];
    transportVehicleTypes?: any[];
    transportAllocations?: any[];
    transportDrivers?: any[];
    platformConfig: {
        defaultFeeTemplate: string;
        disabledFeeTemplates: string[];
    };
    globalStudentDefaults: {
        classes: ClassSetup[];
        sections: string[];
        houses: string[];
        religions: string[];
        categories: string[];
        streams: string[];
        disableReasons: string[];
        regNoSettings: RegNoSettings;
        enrollNoSettings: EnrollmentNoSettings;
        apaarIdSettings: AutoIdSettings;
        penNoSettings: AutoIdSettings;
        srNoSettings: AutoIdSettings;
        genRegNoSettings: AutoIdSettings;
        rollNoSettings: AutoIdSettings;
        sessions: string[];
    };
}

// Initial Data Seed
const INITIAL_DATA: DatabaseSchema = {
    users: MOCK_USERS,
    schools: MOCK_SCHOOLS,
    packages: PACKAGES,
    modules: MODULES,
    staffProfiles: [],
    attendance: {},
    idCardTemplates: DEFAULT_ID_CARD_TEMPLATES,
    students: [],
    staffFormTemplates: DEFAULT_STAFF_FORM_TEMPLATES,
    admissionFormTemplates: DEFAULT_ADMISSION_FORM_TEMPLATES,
    studentProfileTemplates: DEFAULT_STUDENT_PROFILE_TEMPLATES,
    curriculumTemplates: [],
    subjectGroups: DEFAULT_SUBJECT_GROUPS,
    subjectGroupTypes: [
        { id: 'cat_lang', name: 'Language', color: 'indigo' },
        { id: 'cat_core', name: 'Core Subject', color: 'emerald' },
        { id: 'cat_elective', name: 'Elective', color: 'amber' },
        { id: 'cat_optional', name: 'Optional', color: 'purple' }
    ],
    subjects: DEFAULT_SUBJECTS,
    classAllocations: [],
    qrTransactions: [],
    feeGroups: [],
    feeTransactions: [],
    invoiceSettings: {},
    admissionSettings: {},
    admissionApplications: [],
    accessoryTemplates: DEFAULT_ACCESSORY_TEMPLATES,
    accessorySales: [],
    revertedTransactions: [],
    platformConfig: {
        defaultFeeTemplate: 'template_1',
        disabledFeeTemplates: [],
    },
    globalStudentDefaults: {
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
        sessions: ["2024-2025", "2025-2026", "2026-2027"],
    },
};

// Helper: Ensure DB exists
function ensureDb() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
    }
}

// Helper: Read DB
export function readDb(): DatabaseSchema {
    try {
        ensureDb();
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        let parsed: Partial<DatabaseSchema>;
        
        try {
            parsed = JSON.parse(data);
        } catch (parseError) {
            console.error('CRITICAL: data.json is corrupted and could not be parsed.');
            // Create an emergency backup of the corrupted file
            const corruptedPath = `${DB_PATH}.corrupted.${Date.now()}.bak`;
            fs.copyFileSync(DB_PATH, corruptedPath);
            console.error(`Emergency backup of corrupted file created at: ${corruptedPath}`);
            
            // Instead of returning INITIAL_DATA, we should throw to prevent overwriting
            throw new Error(`Database corruption detected. Please restore from backup. Corrupted file saved to ${corruptedPath}`);
        }

        // Merge with initial data to ensure all keys exist
        // Restore any admission template with an empty config from the seed defaults
        const mergedAdmissionTemplates = (parsed.admissionFormTemplates && parsed.admissionFormTemplates.length > 0)
            ? parsed.admissionFormTemplates.map((t: any) => {
                if (!t.config || t.config.length === 0) {
                    const seed = INITIAL_DATA.admissionFormTemplates.find(s => s.id === t.id);
                    return seed ? { ...t, config: seed.config } : t;
                }
                return t;
            })
            : INITIAL_DATA.admissionFormTemplates;

        return {
            ...INITIAL_DATA,
            ...parsed,
            // Ensure core arrays are preserved as they were in the parsed data if they exist
            users: parsed.users ?? INITIAL_DATA.users,
            schools: (parsed.schools ?? INITIAL_DATA.schools).map(s => {
                const migrate = (arr: any[], type: 'discount' | 'reminder') => {
                    if (!arr) return [];
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
                                months: [0,1,2,3,4,5,6,7,8,9,10,11] // Default all months
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

                return {
                    ...s,
                    feeTypes: s.feeTypes || [],
                    feeDiscounts: migrate(s.feeDiscounts || [], 'discount'),
                    feeReminders: migrate(s.feeReminders || [], 'reminder')
                };
            }),
            packages: parsed.packages ?? INITIAL_DATA.packages,
            modules: parsed.modules ?? INITIAL_DATA.modules,
            staffProfiles: parsed.staffProfiles ?? INITIAL_DATA.staffProfiles,
            attendance: parsed.attendance ?? INITIAL_DATA.attendance,
            idCardTemplates: parsed.idCardTemplates ?? INITIAL_DATA.idCardTemplates,
            students: parsed.students ?? INITIAL_DATA.students,
            staffFormTemplates: parsed.staffFormTemplates ?? INITIAL_DATA.staffFormTemplates,
            admissionFormTemplates: mergedAdmissionTemplates,
            studentProfileTemplates: parsed.studentProfileTemplates ?? INITIAL_DATA.studentProfileTemplates,
            curriculumTemplates: parsed.curriculumTemplates ?? INITIAL_DATA.curriculumTemplates,
            subjectGroups: parsed.subjectGroups ?? INITIAL_DATA.subjectGroups,
            subjectGroupTypes: parsed.subjectGroupTypes ?? INITIAL_DATA.subjectGroupTypes,
            subjects: parsed.subjects ?? INITIAL_DATA.subjects,
            classAllocations: parsed.classAllocations ?? INITIAL_DATA.classAllocations,
            qrTransactions: parsed.qrTransactions ?? INITIAL_DATA.qrTransactions,
            feeGroups: parsed.feeGroups ?? INITIAL_DATA.feeGroups,
            feeTransactions: parsed.feeTransactions ?? INITIAL_DATA.feeTransactions,
            invoiceSettings: parsed.invoiceSettings ?? INITIAL_DATA.invoiceSettings,
            admissionApplications: parsed.admissionApplications ?? INITIAL_DATA.admissionApplications,
            accessoryTemplates: parsed.accessoryTemplates ?? INITIAL_DATA.accessoryTemplates,
            accessorySales: parsed.accessorySales ?? INITIAL_DATA.accessorySales,
            revertedTransactions: parsed.revertedTransactions ?? INITIAL_DATA.revertedTransactions,
            platformConfig: {
                ...INITIAL_DATA.platformConfig,
                ...((parsed as any).platformConfig || {}),
            },
            globalStudentDefaults: {
                ...INITIAL_DATA.globalStudentDefaults,
                ...(parsed.globalStudentDefaults || {})
            },
        };
    } catch (error) {
        console.error('Failed to read DB:', error);
        throw error; // Propagate the error to prevent silent data loss
    }
}

// Helper: Write DB
export function writeDb(data: DatabaseSchema) {
    try {
        // Create a backup of the current file before overwriting
        if (fs.existsSync(DB_PATH)) {
            const backupPath = `${DB_PATH}.bak`;
            fs.copyFileSync(DB_PATH, backupPath);
        }
        
        // Write to a temporary file first to ensure atomicity as much as possible
        const tempPath = `${DB_PATH}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, DB_PATH);
    } catch (error) {
        console.error('Failed to write DB:', error);
        throw error; // Re-throw to allow callers to handle failure
    }
}

// Helper: Resolve school by multiple possible identifiers
export function resolveSchool(schoolIdOrIdentifier: string): any {
    const db = readDb();
    const searchVal = decodeURIComponent(schoolIdOrIdentifier).toLowerCase().trim();
    // 1. Try to match school by id (UUID or s1)
    let school = db.schools.find((s: any) => s.id.toLowerCase() === searchVal);
    if (school) return school;

    // 2. Try to match by schoolId (e.g. MIS001)
    school = db.schools.find((s: any) => s.schoolId.toLowerCase() === searchVal);
    if (school) return school;

    // 3. Try to match by shortName (slug-like or custom fields)
    school = db.schools.find((s: any) => s.shortName && s.shortName.toLowerCase() === searchVal);
    if (school) return school;

    // 4. Try to match by official Code
    school = db.schools.find((s: any) => s.code && s.code.toLowerCase() === searchVal);
    if (school) return school;

    // 5. Try to match by name (e.g. "The Millennium International School")
    school = db.schools.find((s: any) => s.name.toLowerCase() === searchVal);
    if (school) return school;

    // 6. Try to match by slugified name (in case the URL is /apply/the-millennium-international-school)
    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    school = db.schools.find((s: any) => slugify(s.name) === searchVal);
    if (school) return school;

    return null;
}

