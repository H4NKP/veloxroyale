'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { User as UserIcon, Mail, Key, Shield, Calendar, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { getUserById, updateUser, type User } from '@/lib/auth';

export default function AdminProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Mock active user for admin (ID 1)
    const activeUserId = 1;

    useEffect(() => {
        const load = async () => {
            const userData = await getUserById(activeUserId);
            if (userData) {
                setUser(userData);
                setEmail(userData.email);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!user) return;

        if (newPassword && newPassword !== confirmPassword) {
            alert('the password doesnt match');
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        const updates: Partial<User> = { email };
        if (newPassword) {
            if (!currentPassword) {
                setMessage({ type: 'error', text: 'Current password is required to set a new password.' });
                setIsSaving(false);
                return;
            }
            (updates as any).oldPassword = currentPassword;
            updates.password = newPassword;
        }

        try {
            await updateUser(user.id, updates);

            // Re-fetch to confirm
            const updated = await getUserById(user.id);
            if (updated) setUser(updated);

            setIsSaving(false);
            setMessage({ type: 'success', text: 'Admin profile updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setIsSaving(false);
            setMessage({ type: 'error', text: error.message || 'Update failed' });
        }
    };

    if (!user) return <div className="p-8 text-center text-pterosub">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="blue" className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        System Admin
                    </Badge>
                </div>
                <h1 className="text-3xl font-bold text-pterotext">Administrator Account</h1>
                <p className="text-pterosub mt-2">Manage your administrative credentials and security preferences.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Account Summary */}
                <Card className="md:col-span-1 space-y-6 flex flex-col items-center py-10 border-pteroblue/30 bg-pteroblue/5">
                    <div className="w-24 h-24 bg-pteroblue/20 rounded-full flex items-center justify-center border-4 border-pteroborder shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Shield size={48} className="text-pteroblue" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-pterotext">{user.email}</h2>
                        <span className="text-xs text-pteroblue font-semibold uppercase tracking-widest">Full Access Control</span>
                    </div>

                    <div className="w-full space-y-4 pt-6 border-t border-pteroborder">
                        <div className="flex items-center gap-3 text-sm">
                            <UserIcon size={16} className="text-pterosub" />
                            <span className="text-pterotext">Account ID:</span>
                            <span className="ml-auto text-pterosub font-mono">#0{user.id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar size={16} className="text-pterosub" />
                            <span className="text-pterotext">System Role:</span>
                            <span className="ml-auto text-pterosub capitalize">{user.role}</span>
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
                            <Mail size={16} className="text-pteroblue" /> Administrative Email
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-pterosub">Email Address</label>
                            <Input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@veloxai.com"
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-pterosub uppercase tracking-widest flex items-center gap-2">
                            <Key size={16} className="text-pteroblue" /> Change Admin Password
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-medium text-pterosub">Current Password *</label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                                <p className="text-[10px] text-pterosub italic">Required when changing password for security.</p>
                            </div>
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
                                <label className="text-xs font-medium text-pterosub">Confirm New Password</label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
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
                                    <Save size={16} className="mr-2" /> Update Admin Profile
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
