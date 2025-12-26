'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { User as UserIcon, Mail, Key, Shield, Calendar, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { getUserById, updateUser, type User } from '@/lib/auth';

export default function UserProfilePage() {
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Dynamic active user from URL
    const activeUserId = Number(searchParams.get('userId')) || 2;

    useEffect(() => {
        const load = async () => {
            const userData = await getUserById(activeUserId);
            if (userData) {
                setUser(userData);
                setEmail(userData.email);
            }
        };
        load();
    }, [activeUserId]);

    const handleSave = async () => {
        if (!user) return;

        if (newPassword && newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        const updates: Partial<User> = { email };
        if (newPassword) updates.password = newPassword;

        await updateUser(user.id, updates);

        // Re-fetch to confirm
        const updated = await getUserById(user.id);
        if (updated) setUser(updated);

        setIsSaving(false);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
    };

    if (!user) return <div className="p-8 text-center text-pterosub">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-pterotext">My Profile</h1>
                <p className="text-pterosub mt-2">Manage your account information and security settings.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Account Summary */}
                <Card className="md:col-span-1 space-y-6 flex flex-col items-center py-10">
                    <div className="w-24 h-24 bg-pteroblue/10 rounded-full flex items-center justify-center border-4 border-pteroborder">
                        <UserIcon size={48} className="text-pteroblue" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-pterotext">{user.email.split('@')[0]}</h2>
                        <Badge variant="blue" className="mt-2 text-[10px] uppercase font-bold tracking-widest">
                            {user.role}
                        </Badge>
                    </div>

                    <div className="w-full space-y-4 pt-6 border-t border-pteroborder">
                        <div className="flex items-center gap-3 text-sm">
                            <Shield size={16} className="text-pterosub" />
                            <span className="text-pterotext">Status:</span>
                            <span className="ml-auto text-green-400 font-medium">Active</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar size={16} className="text-pterosub" />
                            <span className="text-pterotext">Joined:</span>
                            <span className="ml-auto text-pterosub">{user.created_at}</span>
                        </div>
                    </div>
                </Card>

                {/* Edit Section */}
                <Card className="md:col-span-2 space-y-8">
                    {message && (
                        <div className={cn(
                            "p-4 rounded-lg flex items-center gap-3 border animate-in fade-in slide-in-from-top-2",
                            message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-pterosub uppercase tracking-widest flex items-center gap-2">
                            <Mail size={16} className="text-pteroblue" /> Account Information
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-pterosub">Email Address</label>
                            <Input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-pterosub uppercase tracking-widest flex items-center gap-2">
                            <Key size={16} className="text-pteroblue" /> Security & Password
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-pterosub">New Password</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        className="absolute right-3 top-2.5 text-pterosub hover:text-pterotext"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-pterosub">Confirm Password</label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-pterosub italic">Leave password fields blank if you do not want to change it.</p>
                    </section>

                    <div className="pt-6 border-t border-pteroborder flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="min-w-[120px]"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <Save size={16} className="mr-2" /> Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Helper function for class names
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
