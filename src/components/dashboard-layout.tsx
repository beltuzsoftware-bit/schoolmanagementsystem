'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Menu,
    LogOut,
    Settings,
    Bell,
    Search,
    Pin,
    ChevronRight,
    LayoutDashboard,
    Users,
    School,
    LineChart,
    Package,
    Blocks,
    Briefcase,
    Wallet,
    CalendarCheck,
    FileText,
    UserCog,
    UserPlus,
    Banknote,
    BookOpen,
    IdCard,
    ChevronDown,
    QrCode,
    Pencil,
    Database,
    Bus
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const ICON_MAP: Record<string, any> = {
    LayoutDashboard,
    Users,
    School,
    LineChart,
    Package,
    Blocks,
    Briefcase,
    Wallet,
    CalendarCheck,
    Settings,
    FileText,
    UserCog,
    UserPlus,
    Banknote,
    BookOpen,
    IdCard,
    QrCode,
    Database,
    Bus
};

interface NavItem {
    title: string;
    href: string;
    icon: string;
    children?: { title: string; href: string; icon?: string }[];
}


interface DashboardLayoutProps {
    children: React.ReactNode;
    navItems: NavItem[];
    userRole: string; // 'Super Admin' | 'School Admin' | 'Root'
    schoolName?: string;
    schoolLogo?: string;
    schoolLocation?: string;
    schoolTagline?: string;
    academicYear?: string;
    sessions?: { id: string; name: string }[];
    sessionStartMonth?: string;
    userName?: string;
    userAvatar?: string;
}

export default function DashboardLayout({
    children,
    navItems,
    userRole,
    schoolName = 'KuMMi',
    schoolLogo,
    schoolLocation,
    schoolTagline,
    academicYear,
    sessions = [],
    sessionStartMonth,
    userName = 'Current User',
    userAvatar
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [logoError, setLogoError] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ name?: string, role?: string, avatar?: string } | null>(null);
    const [originalUser, setOriginalUser] = useState<{ name?: string, role?: string, avatar?: string } | null>(null);
    const [activeSession, setActiveSession] = useState<string>(academicYear || '');
    const [isEditingSession, setIsEditingSession] = useState(false);

    const loadUser = () => {
        const stored = localStorage.getItem('kummi_user');
        if (stored) {
            try {
                setCurrentUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
        const storedOrig = localStorage.getItem('kummi_original_user');
        if (storedOrig) {
            try {
                setOriginalUser(JSON.parse(storedOrig));
            } catch (e) {
                console.error("Failed to parse original user data", e);
            }
        }
    };

    useEffect(() => {
        loadUser();

        const handleProfileUpdate = () => {
            loadUser();
        };

        window.addEventListener('profile-updated', handleProfileUpdate);
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, []);

    // Derive display name/role based on context:
    // On Super Admin pages, the localStorage may hold a school admin (from "Login as Admin").
    // In that case, show the original logged-in user (the impersonator) if one exists.
    const isSuperAdminPanel = userRole === 'Super Admin';
    const activeUser = isSuperAdminPanel ? (originalUser || currentUser) : currentUser;
    const displayName = activeUser?.name || userName || (isSuperAdminPanel ? 'Super Admin' : 'Current User');
    const displayRole = isSuperAdminPanel ? 'Super Admin' : (activeUser?.role || userRole).replace(/_/g, ' ');
    const displayAvatar = activeUser?.avatar || userAvatar;

    useEffect(() => {
        setLogoError(false);
    }, [schoolLogo]);

    useEffect(() => {
        // sessionStorage flag indicates the user manually switched sessions during this login session.
        // It survives page reloads but is cleared on logout (or closing the tab).
        const userSwitched = sessionStorage.getItem('kummi_session_overridden');
        if (userSwitched) {
            // User already manually picked a session — respect it across reloads
            const storedSession = localStorage.getItem('kummi_active_session');
            if (storedSession) {
                setActiveSession(storedSession);
                return;
            }
        }
        // No override — always default to the school's current active session from DB
        if (academicYear) {
            setActiveSession(academicYear);
            localStorage.setItem('kummi_active_session', academicYear);
        }
    }, [academicYear]);

    const handleSessionChange = (val: string) => {
        setActiveSession(val);
        localStorage.setItem('kummi_active_session', val);
        sessionStorage.setItem('kummi_session_overridden', 'true'); // Mark that user manually switched
        setIsEditingSession(false);
        window.dispatchEvent(new Event('session-changed'));
    };

    useEffect(() => {
        setMounted(true);
        // Auto-expand parents of active items
        const initialExpanded: Record<string, boolean> = {};
        navItems.forEach(item => {
            if (item.children?.some(child => pathname.startsWith(child.href))) {
                initialExpanded[item.title] = true;
            }
        });
        setExpandedItems(initialExpanded);
    }, [pathname, navItems]);

    const toggleExpand = (title: string) => {
        setExpandedItems(prev => ({ [title]: !prev[title] }));
    };

    const handleLogout = async () => {
        // Clear the HTTP-only session cookie on the server
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Failed to call logout API:', e);
        }
        // Clear client-side storage used for UI rendering
        localStorage.removeItem('kummi_user');
        localStorage.removeItem('kummi_original_user');
        localStorage.removeItem('kummi_active_session');   // Reset so next login uses active session
        sessionStorage.removeItem('kummi_session_overridden'); // Clear switch flag
        router.push('/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-slate-900 text-white">
            {/* School Branding Header */}
            <div className="p-8 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex flex-col items-center gap-4 text-center relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                        <img
                            src={(!logoError && schoolLogo) || '/kummi-icon.svg'}
                            alt="School Logo"
                            className="h-20 w-20 rounded-2xl object-cover shadow-2xl relative z-10 ring-2 ring-white/10 bg-white"
                            onError={() => setLogoError(true)}
                        />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                        <h2 className="text-sm font-black text-indigo-100 uppercase tracking-widest truncate max-w-[200px] leading-tight mb-1">
                            {schoolName}
                        </h2>
                        {schoolTagline && (
                            <p className="font-serif italic text-[11px] text-indigo-300/60 tracking-wide leading-tight italic">
                                {schoolTagline}
                            </p>
                        )}
                        <div className="mt-3 flex items-center justify-center gap-2">
                            {isEditingSession && sessions && sessions.length > 0 ? (
                                <Select value={activeSession} onValueChange={handleSessionChange}>
                                    <SelectTrigger className="h-7 text-xs bg-white/10 border-white/20 text-white rounded-full w-32 focus:ring-1 focus:ring-indigo-400">
                                        <SelectValue placeholder="Session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsEditingSession(true)}>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                        {activeSession || 'Session 2024-25'}
                                    </span>
                                    <Pencil size={12} className="text-indigo-400/70" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-3 py-2 flex-1 overflow-y-auto">
                <div className="h-4" /> {/* Spacer */}
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = ICON_MAP[item.icon] || Briefcase;
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedItems[item.title];

                        const isActive = item.href === '/school-admin' || item.href === '/super-admin'
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <div key={item.title} className="space-y-1">
                                {hasChildren ? (
                                    <button
                                        onClick={() => toggleExpand(item.title)}
                                        className={cn(
                                            "flex items-center justify-between w-full px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 group",
                                            isActive || isExpanded
                                                ? "bg-slate-800/50 text-white"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={cn(
                                                "h-5 w-5 transition-transform group-hover:scale-110",
                                                isActive || isExpanded ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
                                            )} />
                                            {item.title}
                                        </div>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 transition-transform duration-300",
                                            isExpanded ? "rotate-180 text-indigo-400" : "text-slate-600"
                                        )} />
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 group",
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-[1.02]"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "h-5 w-5 transition-transform group-hover:scale-110",
                                            isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-400"
                                        )} />
                                        {item.title}
                                    </Link>
                                )}

                                {hasChildren && isExpanded && (
                                    <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                                        {item.children?.map((child) => {
                                            const ChildIcon = child.icon ? (ICON_MAP[child.icon] || null) : null;
                                            const isChildActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setIsOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group/child",
                                                        isChildActive
                                                            ? "text-indigo-400 bg-indigo-500/5 font-bold"
                                                            : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                                                    )}
                                                >
                                                    {ChildIcon ? (
                                                        <ChildIcon className={cn("h-4 w-4", isChildActive ? "text-indigo-400" : "text-slate-600 group-hover/child:text-indigo-400")} />
                                                    ) : (
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", isChildActive ? "bg-indigo-400" : "bg-slate-700 group-hover/child:bg-indigo-400")} />
                                                    )}
                                                    {child.title}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

            </div>
            {/* KuMMi Platform Badge */}
            <div className="px-6 py-6 bg-slate-900 border-t border-slate-800/50">
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-6 h-6 rounded flex items-center justify-center text-[12px] shadow-lg shadow-indigo-900/20">K</div>
                    <span>System <span className="text-indigo-400">Architecture</span></span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Mobile Sidebar */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="left" className="p-0 w-72 border-r-0">
                    <SidebarContent />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col print:hidden z-40">
                <SidebarContent />
            </div>

            {/* Main Content */}
            <div className="md:pl-64 flex flex-col min-h-screen print:pl-0 print:bg-white">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white dark:bg-slate-900 px-6 shadow-sm print:hidden">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex-1 flex items-center gap-4">
                        {/* School Context Indicator */}
                        {schoolName !== 'KuMMi' && (
                            <h1 className={cn(
                                "hidden lg:block font-serif font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight",
                                schoolName && schoolName.length > 30 ? "text-xl" : "text-2xl"
                            )}>
                                {schoolName}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {mounted && (
                            <>
                                <Button variant="ghost" size="icon">
                                    <Bell className="h-5 w-5 text-slate-500" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-auto py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group">
                                            <div className="flex items-center gap-3">
                                                <div className="hidden sm:flex flex-col items-end">
                                                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                                        {displayName}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                                                        {displayRole}
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -inset-0.5 bg-indigo-500 rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity" />
                                                    <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm relative z-10">
                                                        <AvatarImage src={displayAvatar || "https://github.com/shadcn.png"} />
                                                        <AvatarFallback className="bg-indigo-50 text-indigo-600 font-black text-xs">{displayName?.charAt(0) || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500 transition-all duration-300 group-data-[state=open]:rotate-180" />
                                            </div>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-slate-100 p-2">
                                        <DropdownMenuLabel className="px-3 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Account</span>
                                                <span className="text-sm font-black text-slate-900 truncate">{displayName}</span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <Link href={userRole === 'Super Admin' ? "/super-admin/user-profile" : "/school-admin/user-profile"}>
                                            <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50">
                                                <UserCog className="mr-3 h-4 w-4" /> profile
                                            </DropdownMenuItem>
                                        </Link>
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-rose-600 hover:bg-rose-50/50">
                                            <LogOut className="mr-3 h-4 w-4" /> Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
