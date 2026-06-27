'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle2, Pencil, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import ImageCropper from '@/components/image-cropper';

export default function UserProfilePage() {
    const [loading, setLoading] = useState(true);
    const [userSaving, setUserSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [userForm, setUserForm] = useState<{ id?: string, name?: string, email?: string, password?: string, avatar?: string }>({});

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        const loadUser = () => {
            const storedUser = localStorage.getItem('kummi_user');
            if (storedUser) {
                setUserForm(JSON.parse(storedUser));
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const handleUserChange = (field: string, value: any) => {
        setUserForm(prev => ({ ...prev, [field]: value }));
    };

    const handleUserSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userForm.id) return;
        setUserSaving(true);

        try {
            const { updateUser } = await import('@/app/actions');
            const result = await updateUser(userForm.id, userForm);
            if (result.success) {
                toast.success('Your profile has been updated successfully!');
                localStorage.setItem('kummi_user', JSON.stringify(userForm));
                
                const origUser = localStorage.getItem('kummi_original_user');
                if (origUser) {
                    try {
                        const parsedOrig = JSON.parse(origUser);
                        if (parsedOrig.id === userForm.id) {
                            localStorage.setItem('kummi_original_user', JSON.stringify(userForm));
                        }
                    } catch (e) {
                        console.error(e);
                    }
                } else {
                    localStorage.setItem('kummi_original_user', JSON.stringify(userForm));
                }
                
                // Notify other components (header avatar)
                window.dispatchEvent(new Event('profile-updated'));
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred while saving profile');
        } finally {
            setUserSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">My Profile</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your personal information, photo, and security.</p>
                </div>
                <Button
                    onClick={handleUserSave}
                    disabled={userSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                >
                    {userSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600" />
                <CardContent className="relative pt-0">
                    <div className="flex flex-col md:flex-row gap-8 items-start -mt-16">
                        {/* Photo Column */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-white rounded-full scale-105 shadow-md" />
                                <img
                                    src={userForm.avatar || '/logo_placeholder.png'}
                                    alt="User Avatar"
                                    className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl relative z-10"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-2 p-3 bg-indigo-600 text-white rounded-full shadow-lg z-20 hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
                                >
                                    <Upload size={18} />
                                </button>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Photo</p>
                                <p className="text-[10px] text-slate-400 italic mt-1">JPG, PNG (Max 5MB)</p>
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 space-y-8 pt-20 md:pt-24 w-full">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="full-name" className="text-slate-600 font-semibold">Full Name</Label>
                                    <Input
                                        id="full-name"
                                        placeholder="Enter your name"
                                        value={userForm.name || ''}
                                        onChange={(e) => handleUserChange('name', e.target.value)}
                                        className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-600 font-semibold">Email Address</Label>
                                    <Input
                                        id="email"
                                        value={userForm.email || ''}
                                        readOnly
                                        className="h-11 bg-slate-50 border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Email cannot be changed by the user.</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <Label htmlFor="password-reset" className="text-slate-600 font-semibold flex items-center gap-2">
                                    Account Password
                                    <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 border-indigo-100 bg-indigo-50/50">Secure</Badge>
                                </Label>
                                <div className="relative group max-w-md">
                                    <Input
                                        id="password-reset"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="New Password"
                                        value={userForm.password || ''}
                                        onChange={(e) => handleUserChange('password', e.target.value)}
                                        className="h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl font-mono tracking-widest pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ImageCropper
                image={imageToCrop}
                open={isCropperOpen}
                onClose={() => setIsCropperOpen(false)}
                onCropComplete={(croppedImage) => {
                    handleUserChange('avatar', croppedImage);
                    toast.success('Image cropped successfully! Click "Save Changes" to apply.');
                }}
                aspect={1}
            />
        </div>
    );
}

// Simple Badge component since I might not have it in this workspace's specific shadcn installation exactly as expected
function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
            {children}
        </span>
    );
}
