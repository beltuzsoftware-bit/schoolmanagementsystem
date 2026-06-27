'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MODULES } from '@/lib/mock-data';
import {
    UserPlus,
    Users,
    Banknote,
    CalendarCheck,
    BookOpen,
    Briefcase,
    Wallet,
    CheckCircle,
    QrCode,
    IdCard,
    ShoppingBag,
    FileText,
    Bus
} from 'lucide-react';

const iconMap: Record<string, any> = {
    'UserPlus': UserPlus,
    'Users': Users,
    'Banknote': Banknote,
    'CalendarCheck': CalendarCheck,
    'BookOpen': BookOpen,
    'Briefcase': Briefcase,
    'Wallet': Wallet,
    'QrCode': QrCode,
    'IdCard': IdCard,
    'ShoppingBag': ShoppingBag,
    'FileText': FileText,
    'Bus': Bus
};

// Module features/descriptions
const moduleDetails: Record<string, { features: string[], color: string }> = {
    'm1': {
        color: 'bg-blue-500',
        features: [
            'Online admission forms',
            'Document verification',
            'Student enrollment tracking',
            'Admission reports'
        ]
    },
    'm2': {
        color: 'bg-indigo-500',
        features: [
            'Student profiles & records',
            'Academic performance tracking',
            'Parent information',
            'Student photo management'
        ]
    },
    'm3': {
        color: 'bg-green-500',
        features: [
            'Fee structure management',
            'Online fee collection',
            'Payment receipts & invoices',
            'Fee defaulter reports'
        ]
    },
    'm4': {
        color: 'bg-yellow-500',
        features: [
            'Daily attendance marking',
            'Staff & student attendance',
            'Attendance reports',
            'Leave management'
        ]
    },
    'm5': {
        color: 'bg-purple-500',
        features: [
            'Class & section management',
            'Subject allocation',
            'Timetable generation',
            'Exam management'
        ]
    },
    'm6': {
        color: 'bg-orange-500',
        features: [
            'Employee profiles & records',
            'Department management',
            'Qualification tracking',
            'Leave & attendance integration'
        ]
    },
    'm7': {
        color: 'bg-pink-500',
        features: [
            'Salary structure management',
            'Allowances & deductions',
            'Payslip generation',
            'Loan & reimbursement tracking'
        ]
    },
    'm8': {
        color: 'bg-teal-500',
        features: [
            'Template designer',
            'Bulk ID card generation',
            'Barcode & QR integration',
            'Printable ZIP exports'
        ]
    },
    'm9': {
        color: 'bg-indigo-600',
        features: [
            'Dynamic UPI QR generation',
            'Transaction limit enforcement',
            'Custom rate plan assignment',
            'Printable fee slips'
        ]
    },
    'm10': {
        color: 'bg-emerald-500',
        features: [
            'Item catalog management',
            'Category configuration',
            'Sales terminal & invoices',
            'Stock inward & tracking'
        ]
    },
    'm11': {
        color: 'bg-rose-500',
        features: [
            'Student & staff reports',
            'Defaulter & collection reports',
            'Attendance summaries',
            'Export to PDF & Excel'
        ]
    },
    'm12': {
        color: 'bg-indigo-600',
        features: [
            'Route & stop configuration',
            'Vehicle allocation',
            'Driver documentation',
            'Fee allocation calendar'
        ]
    },
};

export default function ModulesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        Available Modules
                    </h1>
                    <p className="text-slate-500">
                        Manage and view all SaaS modules available in the platform
                    </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                    {MODULES.length} Modules
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {MODULES.map((module) => {
                    const Icon = iconMap[module.icon] || Briefcase;
                    const details = moduleDetails[module.id] || { features: [], color: 'bg-slate-500' };

                    return (
                        <Card
                            key={module.id}
                            id={module.name.toLowerCase().includes('staff') || module.name.toLowerCase().includes('human') ? 'staff' : module.name.toLowerCase().includes('payroll') ? 'payroll' : module.name.toLowerCase().includes('attendance') ? 'attendance' : module.id}
                            className="shadow-md border-t-4 hover:shadow-xl transition-all hover:scale-[1.02] bg-white dark:bg-slate-900 cursor-pointer"
                            style={{ borderTopColor: details.color.replace('bg-', '#') }}
                            onClick={() => {
                                if (module.id === 'm1') window.location.href = '/super-admin/modules/admissions';
                                else if (module.id === 'm2') window.location.href = '/super-admin/modules/student-info';
                                else if (module.id === 'm8') window.location.href = '/super-admin/modules/id-cards';
                                else if (module.id === 'm6') window.location.href = '/super-admin/modules/staff';
                                else if (module.id === 'm9') window.location.href = '/super-admin/modules/qr-fees';
                                else if (module.id === 'm10') window.location.href = '/super-admin/modules/accessories';
                            }}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-3 rounded-lg ${details.color} bg-opacity-10`}>
                                        <Icon className={`h-6 w-6 ${details.color.replace('bg-', 'text-')}`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {module.id}
                                        </Badge>
                                        {(module.id === 'm1' || module.id === 'm2' || module.id === 'm6' || module.id === 'm8' || module.id === 'm9' || module.id === 'm10') && (
                                            <Badge className="bg-indigo-500 text-white border-none text-[10px] font-black uppercase tracking-tighter">
                                                config
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <CardTitle className="text-xl mt-4">{module.name}</CardTitle>
                                <CardDescription>{module.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                                        Key Features
                                    </div>
                                    <div className="space-y-2">
                                        {details.features.map((feature, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start text-sm text-slate-700 dark:text-slate-300"
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Summary Section */}
            <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                    <CardTitle className="text-indigo-900 dark:text-indigo-100">
                        Module Categories
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                                Student Management
                            </div>
                            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                <li>• Admission</li>
                                <li>• Student Information</li>
                                <li>• Academics</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                                Financial Management
                            </div>
                            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                <li>• Fees Collection</li>
                                <li>• Payroll</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                                HR & Operations
                            </div>
                            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                <li>• Human Resource</li>
                                <li>• Attendance</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
