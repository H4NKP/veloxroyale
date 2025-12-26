'use client';

import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui/core';
import { ShieldAlert, Mail } from 'lucide-react';
import { getSuspendedPageSettings, type SuspendedPageSettings } from '@/lib/suspended-settings';
import { getAllUsers, type User } from '@/lib/auth';

export default function SuspendedPage() {
    const [settings, setSettings] = useState<SuspendedPageSettings>({
        supportEmail: 'support@example.com',
        customMessage: 'Your access to the VeloxAI system has been temporarily suspended.',
        reasons: []
    });
    const [userSpecificMessage, setUserSpecificMessage] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setSettings(getSuspendedPageSettings());

            // Check for user-specific message
            const email = sessionStorage.getItem('suspended_user_email');
            if (email) {
                const users = await getAllUsers();
                // Need to use find because getAllUsers hides passwords but should keep suspension_message
                const user = users.find(u => u.email === email);
                if (user && user.suspension_message) {
                    setUserSpecificMessage(user.suspension_message);
                }
            }
        };
        load();
    }, []);

    const handleContactSupport = () => {
        window.location.href = `mailto:${settings.supportEmail}?subject=Account Suspension Appeal&body=Hello, I would like to request information about my suspended account.`;
    };

    return (
        <div className="min-h-screen bg-pterodark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/20 mb-4">
                        <ShieldAlert className="text-red-400" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-pterotext tracking-tight mb-2">Account Suspended</h1>
                    <p className="text-pterosub text-sm">Your account has been temporarily suspended</p>
                </div>

                <Card className="border-t-4 border-t-red-500 bg-[#1a202c]/50 backdrop-blur-sm shadow-xl">
                    <div className="space-y-4 text-center">
                        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 text-left">
                            <p className="text-pterotext text-sm font-semibold mb-2">
                                User Specific Reason:
                            </p>
                            <p className="text-pterosub text-sm leading-relaxed whitespace-pre-wrap">
                                {userSpecificMessage || settings.customMessage}
                            </p>

                            {!userSpecificMessage && settings.reasons.length > 0 && (
                                <>
                                    <p className="text-pterosub text-sm mt-2">This may be due to:</p>
                                    <ul className="mt-2 space-y-1 text-xs text-pterosub/80">
                                        {settings.reasons.map((reason, index) => (
                                            <li key={index}>• {reason}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>

                        <div className="pt-2">
                            <p className="text-sm text-pterotext mb-4">
                                If you believe this is an error or would like to appeal, please contact our support team.
                            </p>

                            <Button
                                onClick={handleContactSupport}
                                className="w-full bg-red-600 hover:bg-red-700"
                            >
                                <Mail size={18} className="mr-2" />
                                Contact Support
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-pteroborder">
                            <a
                                href="/"
                                className="text-xs text-pterosub hover:text-pterotext transition-colors"
                            >
                                ← Back to Login
                            </a>
                        </div>
                    </div>
                </Card>

                <p className="text-center mt-6 text-xs text-pterosub/50">
                    &copy; 2025 VeloxAI System. All rights reserved.
                </p>
            </div>
        </div>
    );
}
