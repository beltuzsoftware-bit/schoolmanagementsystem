'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Call server action — it sets the HTTP-only session cookie
            const result = await authenticateUser(identifier, password);

            if (result.success && result.user) {
                const user = result.user;

                // Also store minimal user info in localStorage for client-side UI rendering
                // (nav menus, user avatar, etc.) — NOT for auth, that's the cookie's job
                localStorage.setItem('kummi_user', JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId,
                    avatar: user.avatar,
                    designation: user.designation,
                    passwordChanged: user.passwordChanged,
                }));
                localStorage.setItem('kummi_original_user', JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId,
                    avatar: user.avatar,
                    designation: user.designation,
                }));

                switch (user.role) {
                    case 'SUPER_ADMIN':
                        router.push('/super-admin');
                        break;
                    case 'ROOT':
                        router.push('/root');
                        break;
                    case 'SCHOOL_ADMIN':
                        router.push('/school-admin');
                        break;
                    case 'STUDENT':
                        router.push(user.passwordChanged ? '/student' : '/change-password');
                        break;
                    case 'PARENT':
                        router.push(user.passwordChanged ? '/parent' : '/change-password');
                        break;
                    default:
                        router.push('/');
                }
            } else {
                setError(result.error || 'Invalid credentials');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred during login');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
            <div className="hidden lg:flex flex-col justify-center items-center bg-indigo-600 text-white p-12">
                <div className="max-w-md space-y-6">
                    <div className="flex items-center gap-2 text-4xl font-bold tracking-tight">
                        <span className="bg-white text-indigo-600 p-2 rounded-lg">K</span>
                        <h1>KuMMi</h1>
                    </div>
                    <p className="text-xl text-indigo-100">
                        Next Generation School Management System. Empowering education with advanced SaaS solutions.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm opacity-80 mt-8">
                        <div className="bg-indigo-700/50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-1">For Schools</h3>
                            <p>One-stop solution for administration and management.</p>
                        </div>
                        <div className="bg-indigo-700/50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-1">For Staff</h3>
                            <p>Efficient tools for teaching and operations.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8">
                <Card className="w-full max-w-md border-0 shadow-2xl bg-white dark:bg-slate-900">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the account
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="identifier">Username or Email</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="identifier"
                                        placeholder="admin"
                                        className="pl-9"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••"
                                        className="pl-9 pr-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sign In
                            </Button>
                        </CardFooter>
                    </form>
                    <div className="px-8 pb-8 text-center text-xs text-muted-foreground">
                        By clicking continue, you agree to our Terms of Service and Privacy Policy.
                    </div>
                </Card>
            </div>
        </div>
    );
}
