'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, User, Briefcase, Wallet, MapPin } from 'lucide-react';
import { addStaff } from '@/app/actions';
import { toast } from 'sonner';
import { StaffRole } from '@/types/staff';
import { UserRole } from '@/types';



interface AddStaffModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    schoolId: string;
}

export function AddStaffModal({ open, onOpenChange, onSuccess, schoolId }: AddStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        designation: '',
        department: '',
        salary: '0',
        joiningDate: new Date().toISOString().split('T')[0],
        role: StaffRole.TEACHER,
        password: '',
        address: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const userData = {
            name: formData.name,
            email: formData.email,
            role: 'STAFF' as UserRole, // All staff are mapped to STAFF role in the main system
            schoolId: schoolId,
            password: formData.password || 'password123'
        };

        const profileData = {
            designation: formData.designation,
            department: formData.department,
            salary: parseFloat(formData.salary),
            joiningDate: formData.joiningDate,
            role: formData.role, // This is the specialized StaffRole
            personalDetails: {
                phone: formData.phone,
                address: formData.address,
                bloodGroup: '',
                qualification: ''
            }
        };

        const res = await addStaff(userData as any, profileData as any);

        if (res.success) {
            toast.success('Staff member added successfully');
            onSuccess();
            onOpenChange(false);
            setFormData({
                name: '',
                email: '',
                phone: '',
                designation: '',
                department: '',
                salary: '0',
                joiningDate: new Date().toISOString().split('T')[0],
                role: StaffRole.TEACHER,
                password: '',
                address: ''
            });
        } else {
            toast.error((res as any).error || 'Failed to add staff');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                        Create a new staff profile and system login credentials.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="salary">Salary & Login</TabsTrigger>
                        </TabsList>

                        <TabsContent value="personal" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="employment" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role *</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={v => setFormData({ ...formData, role: v as StaffRole })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={StaffRole.TEACHER}>Teacher</SelectItem>
                                            <SelectItem value={StaffRole.ACCOUNTANT}>Accountant</SelectItem>
                                            <SelectItem value={StaffRole.LIBRARIAN}>Librarian</SelectItem>
                                            <SelectItem value={StaffRole.RECEPTIONIST}>Receptionist</SelectItem>
                                            <SelectItem value={StaffRole.ADMIN}>Admin Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="designation">Designation</Label>
                                    <Input
                                        id="designation"
                                        placeholder="e.g. Senior Math Teacher"
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select
                                        value={formData.department}
                                        onValueChange={v => setFormData({ ...formData, department: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Academic">Academic</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="Library">Library</SelectItem>
                                            <SelectItem value="Support">Support</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="joiningDate">Joining Date</Label>
                                    <Input
                                        id="joiningDate"
                                        type="date"
                                        value={formData.joiningDate}
                                        onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="salary" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="salary">Monthly Basic Salary</Label>
                                    <Input
                                        id="salary"
                                        type="number"
                                        value={formData.salary}
                                        onChange={e => setFormData({ ...formData, salary: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Login Password</Label>
                                    <Input
                                        id="password"
                                        type="text"
                                        placeholder="Leave empty for 'password123'"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Staff Member'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
