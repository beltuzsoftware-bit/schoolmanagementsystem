'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import DynamicFavicon from '@/components/dynamic-favicon';
import { getSchools, getPackages } from '@/app/actions';
import { getSchoolSubscription } from '@/app/actions/subscriptions';
import { School, User, SaasPackage } from '@/types';
import { MODULE_NAV_MAP } from '@/lib/module-nav';

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [schoolData, setSchoolData] = useState<School | null>(null);
    const [userData, setUserData] = useState<User | null>(null);
    const [subExpiryDays, setSubExpiryDays] = useState<number | null>(null);
    const [subStatus, setSubStatus] = useState<string | null>(null);

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
                        // Priority: SchoolSubscription modules > Package modules
                        const pkg = packages.find((p: SaasPackage) => p.id === school.packageId);
                        const subscription = await getSchoolSubscription(school.id);
                        
                        if (subscription) {
                            setSubStatus(subscription.status);
                            const end = new Date(subscription.endDate).getTime();
                            const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
                            setSubExpiryDays(days);
                        } else {
                            setSubStatus(null);
                            setSubExpiryDays(null);
                        }

                        const activeModules = subscription?.modules ?? pkg?.modules ?? [];

                        const modularItems = activeModules
                            .map((modId: string) => MODULE_NAV_MAP[modId])
                            .filter(Boolean);

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
                {/* Subscription Warning / Expiry Banner */}
                {((subExpiryDays !== null && subExpiryDays <= 30) || subStatus === 'Expired' || subStatus === 'Suspended') && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                        subStatus === 'Expired' || subStatus === 'Suspended' || (subExpiryDays !== null && subExpiryDays <= 0)
                            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-200 font-bold'
                            : subExpiryDays !== null && subExpiryDays <= 7
                                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-200 animate-pulse'
                                : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200'
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="font-bold text-sm">
                                    {subStatus === 'Suspended'
                                        ? 'Your school subscription has been suspended!'
                                        : subStatus === 'Expired' || (subExpiryDays !== null && subExpiryDays <= 0)
                                            ? 'Your school subscription has expired!'
                                            : `Your school subscription will expire in ${subExpiryDays ?? 0} day${(subExpiryDays ?? 0) > 1 ? 's' : ''}!`}
                                </p>
                                <p className="text-xs opacity-90 mt-0.5">
                                    {subStatus === 'Suspended'
                                        ? 'Please contact the Super Admin to reinstate your services.'
                                        : 'Please contact the Super Admin to renew your subscription and avoid service interruptions.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </DashboardLayout>
        </>
    );
}
