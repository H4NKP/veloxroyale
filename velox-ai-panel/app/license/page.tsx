'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui/core';
import { ShieldAlert, Fingerprint, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { validateLicenseKey, setActivated, isActivated } from '@/lib/license';

export default function LicensePage() {
    const router = useRouter();
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // If already activated, send to login
        if (isActivated()) {
            router.push('/');
        }
    }, [router]);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate activation verification delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (validateLicenseKey(licenseKey)) {
            setSuccess(true);
            setActivated(true);

            setTimeout(() => {
                router.push('/');
            }, 2000);
        } else {
            setError('Invalid License Key. Please contact support to obtain a valid license.');
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

            <div className="w-full max-w-lg z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-pterotext tracking-tighter mb-2 flex items-center justify-center gap-3">
                        VELOX<span className="text-pteroblue">AI</span>
                    </h1>
                    <div className="bg-pteroblue/10 text-pteroblue border border-pteroblue/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block">
                        Software Protection System
                    </div>
                </div>

                <Card className="border-t-4 border-t-pteroblue bg-[#1a202c]/50 backdrop-blur-sm shadow-2xl p-8">
                    {success ? (
                        <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Activation Successful</h2>
                            <p className="text-pterosub">License verified. Redirecting to management console...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleActivate} className="space-y-6">
                            <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                                <div className="p-2 bg-red-500/20 rounded-md text-red-400">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-red-400">System Locked</h4>
                                    <p className="text-xs text-pterosub">This software requires a valid license key to operate.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-pterosub uppercase tracking-widest ml-1">License Key Token</label>
                                <div className="relative">
                                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={18} />
                                    <Input
                                        type="text"
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        className="pl-10 h-14 bg-pterodark/50 border-pteroborder text-pterotext placeholder:opacity-30 font-mono tracking-widest text-lg"
                                        value={licenseKey}
                                        onChange={(e) => setLicenseKey(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-in slide-in-from-top-1 duration-200">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4 pt-2">
                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-pteroblue hover:bg-pteroblue/80 text-white font-bold text-base shadow-lg shadow-pteroblue/20 group"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Activate Permanent License <Lock size={16} className="group-hover:translate-y-[-1px] transition-transform" />
                                        </span>
                                    )}
                                </Button>

                                <p className="text-center text-[10px] text-pterosub leading-relaxed">
                                    By activating this product, you agree to the Terms of Service and Privacy Policy. <br />
                                    &copy; 2025 VeloxAI System. All rights reserved.
                                </p>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
}
