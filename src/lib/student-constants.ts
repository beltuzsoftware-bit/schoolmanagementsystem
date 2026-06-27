import { ClassSetup, SessionSetup, RegNoSettings, EnrollmentNoSettings, AutoIdSettings } from '@/types/student-settings';

export const INITIAL_SESSIONS: SessionSetup[] = [
    { id: 'session-24-25', name: '2024-2025', isActive: true },
    { id: 'session-25-26', name: '2025-2026', isActive: false },
    { id: 'session-26-27', name: '2026-2027', isActive: false },
];

export const INITIAL_SECTIONS = ['A', 'B', 'C', 'D'];

export const INITIAL_CLASS_SETUPS: ClassSetup[] = [
    { id: 'class-nursery', name: 'Nursery', code: 'NUR', sections: [], subjects: ['English', 'Drawing', 'Activity'], createStudentLoginDefault: false },
    { id: 'class-lkg', name: 'LKG', code: 'LKG', sections: [], subjects: ['English', 'Hindi', 'Maths', 'Drawing'], createStudentLoginDefault: false },
    { id: 'class-ukg', name: 'UKG', code: 'UKG', sections: [], subjects: ['English', 'Hindi', 'Maths', 'EVS'], createStudentLoginDefault: false },
    ...Array.from({ length: 11 }, (_, i) => ({
        id: `class-${i + 1}`,
        name: `Class ${i + 1}`,
        code: `C${i + 1}`,
        sections: INITIAL_SECTIONS,
        subjects: ['English', 'Hindi', 'Sanskrit', 'Mathematics', 'Science', 'Social Science', 'Computer', 'French', 'German'],
        createStudentLoginDefault: i + 1 === 10, // Only Class 10 gets student login by default
    })),
    {
        id: 'class-12',
        name: 'Class 12',
        code: 'C12',
        sections: [],
        subjects: ['English', 'Hindi', 'Sanskrit', 'Mathematics', 'Science', 'Social Science', 'Computer', 'French', 'German'],
        createStudentLoginDefault: false,
    }
];

export const INITIAL_STREAMS = ['N/A', 'Science', 'Commerce', 'Arts'];
export const GENDERS = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const YES_NO_OPTIONS = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' }
];
export const INITIAL_RELIGIONS = ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism', 'Other'];
export const INITIAL_CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
export const INITIAL_HOUSES = ['Red', 'Blue', 'Green', 'Yellow'];
export const INITIAL_DISABLE_REASONS = ['Transfer', 'Health Issues', 'Financial Issues', 'Personal', 'Graduated', 'Expelled', 'Other'];

export const DEFAULT_COLORS = {
    primary: '#4f46e5',
    sidebarBg: '#1e293b',
    sidebarText: '#22d3ee',
};

export const INITIAL_REG_SETTINGS: RegNoSettings = {
    enabled: true,
    template: 'template1',
    prefix: 'REG',
    separator1: '-',
    padding: 3,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};

export const INITIAL_ENROLL_SETTINGS: EnrollmentNoSettings = {
    enabled: true,
    template: 'template2',
    prefix: '',
    separator1: '-',
    padding: 3,
    suffix: '',
    startFrom: 1,
    currentSerial: 0,
    useSameAsRegNo: false
};

export const INITIAL_APAAR_SETTINGS: AutoIdSettings = {
    enabled: true,
    template: 'template1',
    prefix: 'APAAR',
    separator1: '-',
    padding: 4,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};

export const INITIAL_PEN_SETTINGS: AutoIdSettings = {
    enabled: true,
    template: 'template1',
    prefix: 'PEN',
    separator1: '-',
    padding: 4,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};

export const INITIAL_SR_SETTINGS: AutoIdSettings = {
    enabled: true,
    template: 'template1',
    prefix: 'SR',
    separator1: '-',
    padding: 4,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};

export const INITIAL_GEN_REG_SETTINGS: AutoIdSettings = {
    enabled: true,
    template: 'template1',
    prefix: 'GR',
    separator1: '-',
    padding: 4,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};

export const INITIAL_ROLL_SETTINGS: AutoIdSettings = {
    enabled: true,
    isPerSection: true,
    template: 'custom',
    customPattern: '{SERIAL}',
    prefix: '',
    separator1: '',
    padding: 2,
    suffix: '',
    startFrom: 1,
    currentSerial: 0
};
