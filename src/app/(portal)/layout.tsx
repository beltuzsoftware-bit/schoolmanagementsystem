'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, ShieldAlert, LayoutDashboard, UserCircle, BookOpen, CreditCard, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'STUDENT' && parsedUser.role !== 'PARENT') {
            router.push('/login');
            return;
        }

        setUser(parsedUser);
        setLoading(false);

        // Force password change if not yet done
        if (parsedUser.passwordChanged === false && pathname !== '/change-password') {
            router.push('/change-password');
        }
    }, [router, pathname]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Failed to call logout API:', e);
        }
        localStorage.removeItem('kummi_user');
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const isStudent = user.role === 'STUDENT';

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            {/* --- TOP NAV --- */}
            <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
                        K
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                            {isStudent ? 'Student Portal' : 'Parent Portal'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest leading-none">
                            KuMMi Educational Ecosystem
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-xs font-black text-slate-900 leading-none">{user.name}</span>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{user.role} Access</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        onClick={handleLogout}
                    >
                        <LogOut size={20} />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* --- SIDEBAR --- */}
                <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col p-6 space-y-2">
                    <SidebarItem 
                        href={isStudent ? '/student' : '/parent'} 
                        icon={<LayoutDashboard size={18} />} 
                        label="Dashboard" 
                        active={pathname === (isStudent ? '/student' : '/parent')} 
                    />
                    {isStudent && (
                        <>
                            <SidebarItem href="/student/profile" icon={<UserCircle size={18} />} label="My Profile" active={pathname === '/student/profile'} />
                            <SidebarItem href="/student/academics" icon={<BookOpen size={18} />} label="Academics" active={pathname === '/student/academics'} />
                            <SidebarItem href="/student/fees" icon={<CreditCard size={18} />} label="Fees & Payments" active={pathname === '/student/fees'} />
                        </>
                    )}
                    {!isStudent && (
                        <>
                            <SidebarItem href="/parent/children" icon={<UserCircle size={18} />} label="My Children" active={pathname === '/parent/children'} />
                            <SidebarItem href="/parent/fees" icon={<CreditCard size={18} />} label="Pay Fees" active={pathname === '/parent/fees'} />
                            <SidebarItem href="/parent/notifications" icon={<Bell size={18} />} label="Notifications" active={pathname === '/parent/notifications'} />
                        </>
                    )}
                    
                    <div className="pt-8 mt-auto">
                        <div className="p-4 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert size={14} className="text-amber-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Note</span>
                            </div>
                            <p className="text-[10px] font-medium leading-relaxed text-slate-200">
                                Always logout after using the portal on a shared device.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <a 
            href={href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                active 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            <div className={cn("transition-transform duration-300 group-hover:scale-110", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
                {icon}
            </div>
            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        </a>
    );
}
