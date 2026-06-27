export interface NavItemType {
    title: string;
    href: string;
    icon: string;
    children?: { title: string; href: string; icon?: string }[];
}

export const MODULE_NAV_MAP: Record<string, NavItemType> = {
    m1: {
        title: 'Student Management',
        href: '/school-admin/students',
        icon: 'UserPlus',
        children: [
            { title: 'Student Details', href: '/school-admin/students' },
            { title: 'New Admission', href: '/school-admin/admissions/new' },
            { title: 'Online Admission', href: '/school-admin/admissions' },
            { title: 'Disabled Students', href: '/school-admin/students/disabled' },
            { title: 'Batch Edit Type', href: '/school-admin/students/batch-edit-type' },
            { title: 'Student Settings', href: '/school-admin/students/settings' },
        ]
    },

    m3: {
        title: 'Fees Collection',
        href: '/school-admin/fees',
        icon: 'Banknote',
        children: [
            { title: 'Collect Fees', href: '/school-admin/fees/collect' },
            { title: 'Search Due Fees', href: '/school-admin/fees/due' },
            { title: 'Fees Setting', href: '/school-admin/fees/settings' },
        ]
    },
    m4: { title: 'Attendance', href: '/school-admin/attendance', icon: 'CalendarCheck' },
    m5: {
        title: 'Academics',
        href: '/school-admin/academics',
        icon: 'BookOpen',
        children: [
            { title: 'Subjects', href: '/school-admin/academics/subjects' },
        ]
    },
    m6: { title: 'Staff Management', href: '/school-admin/staff', icon: 'Briefcase' },
    m7: { title: 'Payroll', href: '/school-admin/payroll', icon: 'Wallet' },
    m8: { title: 'ID Cards', href: '/school-admin/id-cards', icon: 'IdCard' },
    m9: { title: 'QR Fee Collection', href: '/school-admin/qr-fees', icon: 'QrCode' },
    m10: { 
        title: 'Inventory', 
        href: '/school-admin/fees/accessories', 
        icon: 'ShoppingBag',
        children: [
            { title: 'Inventory', href: '/school-admin/fees/accessories' },
            { title: 'Student Purchase', href: '/school-admin/fees/accessories/sales' }
        ]
    },
    m12: {
        title: 'Transport',
        href: '/school-admin/transport',
        icon: 'Bus'
    },
};

