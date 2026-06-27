'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import DynamicFavicon from '@/components/dynamic-favicon';
import { getSchools, getPackages } from '@/app/actions';
import { School, User, SaasPackage } from '@/types';
import { MODULE_NAV_MAP } from '@/lib/module-nav';

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [schoolData, setSchoolData] = useState<School | null>(null);
    const [userData, setUserData] = useState<User | null>(null);

    // Filtered Navigation Items
    const [navItems, setNavItems] = useState([
        { title: 'Dashboard', href: '/school-admin', icon: 'LayoutDashboard' },
        { title: 'School Profile', href: '/school-admin/profile', icon: 'School' },
    ]);



    useEffect(() => {
        const fetchUserData = async () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setUserData(user);

                if (user.role === 'SUPER_ADMIN') {
                    router.push('/super-admin');
                    return;
                }
                if (user.role === 'ROOT') {
                    router.push('/root');
                    return;
                }

                if (user.schoolId) {
                    const schools = await getSchools();
                    const packages = await getPackages();
                    const school = schools.find((s: School) => s.id === user.schoolId);

                    if (school) {
                        setSchoolData(school);
                        document.title = `${school.name} | KuMMi`;

                        // DYNAMIC NAVIGATION LOGIC
                        const pkg = packages.find((p: SaasPackage) => p.id === school.packageId);
                        const modularItems = pkg?.modules
                            .map((modId: string) => {
                                return MODULE_NAV_MAP[modId];
                            })
                            .filter(Boolean) || [];

                        const coreItems = [
                            { title: 'Dashboard', href: '/school-admin', icon: 'LayoutDashboard' },
                        ];

                        const postModularItems = [
                            ...(pkg?.modules.includes('m6') ? [{ title: 'Staff & Roles', href: '/school-admin/roles', icon: 'UserCog' }] : []),
                            ...(pkg?.modules.includes('m11') ? [{ title: 'Reports', href: '/school-admin/reports', icon: 'FileText' }] : []),
                            {
                                title: 'Settings',
                                href: '#',
                                icon: 'Settings',
                                children: [
                                    { title: 'School Profile', href: '/school-admin/profile' },
                                ]
                            },
                        ];

                        setNavItems([...coreItems, ...modularItems, ...postModularItems]);
                    }
                }
            }
        };

        const handleProfileUpdate = () => {
            fetchUserData();
        };

        window.addEventListener('profile-updated', handleProfileUpdate);
        fetchUserData();

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, []);

    return (
        <>
            {/* Dynamic Favicon Component */}
            <DynamicFavicon schoolLogo={schoolData?.logo} />

            <DashboardLayout
                navItems={navItems}
                userRole="School Admin"
                schoolName={schoolData?.name}
                schoolLogo={schoolData?.logo}
                schoolLocation={schoolData?.address}
                schoolTagline={schoolData?.tagline}
                academicYear={schoolData?.currentSession}
                sessions={schoolData?.sessions}
                sessionStartMonth={String(schoolData?.sessionStartMonth || '')}
                userName={userData?.name}
                userAvatar={userData?.avatar}
            >
                {children}
            </DashboardLayout>
        </>
    );
}
