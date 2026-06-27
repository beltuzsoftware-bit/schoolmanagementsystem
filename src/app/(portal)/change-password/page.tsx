'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePortalPassword } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('kummi_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await updatePortalPassword(user.role, user.email, password);
            if (res.success) {
                // Update local session
                const updatedUser = { ...user, passwordChanged: true };
                localStorage.setItem('kummi_user', JSON.stringify(updatedUser));
                
                toast.success('Password updated successfully!');
                
                // Redirect based on role
                if (user.role === 'STUDENT') router.push('/student');
                else router.push('/parent');
            } else {
                toast.error(res.error || 'Failed to update password');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-md mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
                <div className="h-2 bg-indigo-600 w-full" />
                <CardHeader className="space-y-4 pt-10 px-8">
                    <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                        <ShieldCheck size={32} />
                    </div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Security Requirement</CardTitle>
                        <CardDescription className="text-sm font-medium mt-2">
                            For your protection, you must change your initial password before accessing the {user.role.toLowerCase()} portal.
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5 px-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                    placeholder="Enter secure password"
                                    required
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                    placeholder="Repeat new password"
                                    required
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-8 pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-100 disabled:opacity-60"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Secure Hash…</>
                            ) : (
                                'Set New Password & Continue'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
