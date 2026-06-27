'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Search, UserPlus, Phone, Mail, Briefcase, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getStaffProfiles, getUsers, deleteStaff, toggleStaffStatus } from '@/app/actions';
import { toast } from 'sonner';

interface StaffListProps {
    schoolId: string;
    refreshTrigger: number;
    onEdit?: (staff: any) => void;
}

export function StaffList({ schoolId, refreshTrigger, onEdit }: StaffListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStaff = async () => {
            setLoading(true);
            try {
                const [profiles, users] = await Promise.all([
                    getStaffProfiles(schoolId),
                    getUsers({ schoolId })
                ]);

                // Merge profile with user data
                const merged = profiles.map(p => {
                    const user = users.find((u: any) => u.id === p.userId);
                    return { ...p, user };
                });

                setStaff(merged);
            } catch (error) {
                toast.error('Failed to load staff list');
            }
            setLoading(false);
        };
        loadStaff();
    }, [schoolId, refreshTrigger]);

    const filteredStaff = staff.filter(s =>
        s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleStatus = async (staffId: string, userId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const actionWord = nextStatus === 'Inactive' ? 'deactivate' : 'activate';
        
        if (confirm(`Are you sure you want to ${actionWord} this staff member? Their login, details, and payroll logs will be fully preserved.`)) {
            const res = await toggleStaffStatus(staffId, userId, nextStatus);
            if (res.success) {
                toast.success(`Staff member marked as ${nextStatus}`);
                setStaff(staff.map(s => s.id === staffId ? { ...s, status: nextStatus } : s));
            } else {
                toast.error('Failed to update staff member status');
            }
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading staff database...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm">
                <Search className="h-4 w-4 text-slate-400 ml-2" />
                <Input
                    placeholder="Search by name, designation or department..."
                    className="border-none focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            toast.info(`Searching database for: ${searchTerm}`);
                        }
                    }}
                />
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow>
                            <TableHead className="w-[250px]">Staff Member</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStaff.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    No staff members found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStaff.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {item.photo ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-slate-200 bg-white">
                                                    <img src={item.photo} alt={item.user?.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                    <User size={18} />
                                                </div>
                                            )}

                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                                    {item.user?.name}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                                    ID: {item.staffId || item.id}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                                            {item.designation}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{item.department}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs gap-1">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Mail size={12} /> {item.user?.email}
                                            </div>
                                            {item.personalDetails?.phone && (
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Phone size={12} /> {item.personalDetails.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={item.status === 'Active' ? 'default' : 'secondary'}
                                            className={item.status === 'Active' ? 'bg-emerald-500' : ''}
                                        >
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onEdit?.(item)}>Edit Details</DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className={item.status === 'Active' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'} 
                                                    onClick={() => handleToggleStatus(item.id, item.userId, item.status || 'Active')}
                                                >
                                                    {item.status === 'Active' ? 'Deactivate Staff' : 'Activate Staff'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
