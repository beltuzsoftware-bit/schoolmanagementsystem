'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { LayoutDashboard, Users, School, Settings, LineChart, Package, Blocks, Briefcase, Wallet, CalendarCheck, UserPlus, IdCard, QrCode, ShoppingBag } from 'lucide-react';

const navItems = [
    { title: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
    {
        title: 'Modules',
        href: '/super-admin/modules',
        icon: 'Blocks',
        children: [
            { title: 'Global Parameters', href: '/super-admin/global-parameters', icon: 'Globe' },
            { title: 'Admission CRM', href: '/super-admin/modules/admissions', icon: 'UserPlus' },
            { title: 'Student Info', href: '/super-admin/modules/student-info', icon: 'Users' },
            { title: 'Staff Management', href: '/super-admin/modules/staff', icon: 'Briefcase' },
            { title: 'Payroll', href: '/super-admin/modules/payroll', icon: 'Wallet' },
            { title: 'Attendance', href: '/super-admin/modules/attendance', icon: 'CalendarCheck' },
            { title: 'ID Cards', href: '/super-admin/modules/id-cards', icon: 'IdCard' },
            { title: 'QR Fee Collection', href: '/super-admin/modules/qr-fees', icon: 'QrCode' },
            { title: 'Accessories', href: '/super-admin/modules/accessories', icon: 'ShoppingBag' },
        ]
    },
    { title: 'Packages', href: '/super-admin/packages', icon: 'Package' },
    { title: 'Schools', href: '/super-admin/schools', icon: 'School' },
    { title: 'Users', href: '/super-admin/users', icon: 'Users' },
    { title: 'Reports', href: '/super-admin/reports', icon: 'LineChart' },
    { title: 'Backup & Restore', href: '/super-admin/backup', icon: 'Database' },
    { title: 'Settings', href: '/super-admin/settings', icon: 'Settings' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.role === 'SUPER_ADMIN' || user.role === 'ROOT') {
                    setAuthorized(true);
                } else if (user.role === 'SCHOOL_ADMIN') {
                    router.push('/school-admin');
                } else {
                    router.push('/login');
                }
            } catch (e) {
                router.push('/login');
            }
        } else {
            router.push('/login');
        }
    }, [router]);

    if (!authorized) {
        return null;
    }

    return (
        <DashboardLayout navItems={navItems} userRole="Super Admin">
            {children}
        </DashboardLayout>
    );
}
