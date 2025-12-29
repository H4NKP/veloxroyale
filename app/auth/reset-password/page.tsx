'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui/core';
import { Lock, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const email = searchParams.get('email');
    const token = searchParams.get('token');

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (!email || !token) {
            setStatus('error');
            setMessage('Invalid or missing recovery link.');
        }
    }, [email, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    token,
                    password: passwordData.newPassword
                })
            });

            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setMessage('Your password has been reset successfully. You can now log in with your new password.');
            } else {
                setStatus('error');
                setMessage(data.message || 'Failed to reset password.');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage('A network error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pterodark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pteroblue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-pterotext tracking-tight">VELOX<span className="text-pteroblue">AI</span></h1>
                    <p className="text-pterosub mt-2 text-sm">Secure Password Reset</p>
                </div>

                <Card className="border-t-4 border-t-pteroblue bg-[#1a202c]/50 backdrop-blur-sm shadow-xl p-6">
                    {status === 'success' ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-2">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-pterotext">Reset Successful</h2>
                            <p className="text-pterosub">{message}</p>
                            <Button
                                onClick={() => router.push('/')}
                                className="w-full h-11 bg-pteroblue hover:bg-pteroblue/90"
                            >
                                Go to Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {status === 'error' && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            {!email || !token ? (
                                <Button
                                    onClick={() => router.push('/')}
                                    className="w-full"
                                    variant="secondary"
                                >
                                    Back to Login
                                </Button>
                            ) : (
                                <>
                                    <div className="space-y-1.5 text-center mb-4">
                                        <p className="text-xs font-semibold text-pterosub uppercase tracking-wide">Account</p>
                                        <div className="flex items-center justify-center gap-2 text-pterotext font-medium bg-pterodark/30 py-2 rounded-lg border border-pteroborder">
                                            <Mail size={14} className="text-pteroblue" />
                                            {email}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-10"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-10"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-pteroblue hover:bg-pteroblue/90"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => router.push('/')}
                                        className="w-full text-xs text-pterosub hover:text-pterotext transition-colors"
                                    >
                                        Cancel and return to login
                                    </button>
                                </>
                            )}
                        </form>
                    )}
                </Card>

                <p className="text-center mt-6 text-xs text-pterosub/50">
                    &copy; 2025 VeloxAI System. All rights reserved.
                </p>
            </div>
        </div>
    );
}
