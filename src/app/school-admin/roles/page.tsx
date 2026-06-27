'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserPlus, Shield, MoreHorizontal, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getUsers, addUser, updateUser, deleteUser } from '@/app/actions';
import { User } from '@/types';


const ROLES = ['Admin', 'Sub Admin', 'Principal', 'Teacher', 'Accountant', 'Receptionist', 'Librarian'];

export default function RolesPage() {
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', role: '' });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadStaff();
    }, []);

    async function loadStaff() {
        try {
            // Get current user context
            const currentUserData = localStorage.getItem('kummi_user');
            const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
            const schoolId = currentUser?.schoolId;

            // Fetch users excluding system-level roles
            const data = await getUsers({
                schoolId,
                excludeRoles: ['SUPER_ADMIN', 'ROOT']
            });
            setStaff(data);
        } catch (error) {
            console.error('Failed to load staff', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateUser() {
        if (!formData.name || !formData.email || !formData.role) return;

        setSubmitting(true);
        try {
            const result = await addUser({
                name: formData.name,
                email: formData.email,
                role: formData.role as any, // Cast to match UserRole type strictly if needed, or update types
                status: 'Active'
            } as any);

            if (result.success) {
                setStaff(prev => [...prev, result.user as User]);
                setIsDialogOpen(false);
                setFormData({ name: '', email: '', role: '' });
                // Assuming we might have a toast library, or just rely on UI update
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to create user');
        } finally {
            setSubmitting(false);
        }
    }

    function handleEditClick(user: User) {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, role: user.designation || user.role });
        setIsEditDialogOpen(true);
    }

    async function handleUpdateUser() {
        if (!editingUser || !formData.name || !formData.email || !formData.role) return;

        setSubmitting(true);
        try {
            const result = await updateUser(editingUser.id, {
                name: formData.name,
                email: formData.email,
                role: formData.role as any
            });

            if (result.success) {
                setStaff(prev => prev.map(s => s.id === editingUser.id ? result.user as User : s));
                setIsEditDialogOpen(false);
                setEditingUser(null);
                setFormData({ name: '', email: '', role: '' });
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update user');
        } finally {
            setSubmitting(false);
        }
    }

    function handleDeleteClick(user: User) {
        setDeletingUser(user);
        setIsDeleteDialogOpen(true);
    }

    async function handleDeleteUser() {
        if (!deletingUser) return;

        setSubmitting(true);
        try {
            const result = await deleteUser(deletingUser.id);

            if (result.success) {
                setStaff(prev => prev.filter(s => s.id !== deletingUser.id));
                setIsDeleteDialogOpen(false);
                setDeletingUser(null);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to delete user');
        } finally {
            setSubmitting(false);
        }
    }

    if (!mounted) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Staff & Roles</h1>
                    <p className="text-slate-500">Manage detailed permissions and staff accounts.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Shield className="mr-2 h-4 w-4" /> Permissions</Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700"><UserPlus className="mr-2 h-4 w-4" /> Add Staff</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Staff Member</DialogTitle>
                                <DialogDescription>Create a login for a new staff member.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Name</Label>
                                    <Input
                                        className="col-span-3"
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Email</Label>
                                    <Input
                                        className="col-span-3"
                                        type="email"
                                        placeholder="staff@school.edu"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={val => setFormData({ ...formData, role: val })}
                                    >
                                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(role => (
                                                <SelectItem key={role} value={role}>{role}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleCreateUser} disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        Loading staff...
                                    </TableCell>
                                </TableRow>
                            ) : staff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No staff members found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staff.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>{s.email}</TableCell>
                                        <TableCell><Badge variant="outline">{s.designation || s.role}</Badge></TableCell>
                                        <TableCell><Badge className="bg-green-500">{(s as any).status || 'Active'}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditClick(s)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(s)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                        <DialogDescription>Update staff member details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Name</Label>
                            <Input
                                className="col-span-3"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Email</Label>
                            <Input
                                className="col-span-3"
                                type="email"
                                placeholder="staff@school.edu"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={val => setFormData({ ...formData, role: val })}
                            >
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Role" /></SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateUser} disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{deletingUser?.name}</strong>'s account.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={submitting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
