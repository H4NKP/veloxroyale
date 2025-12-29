'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { Loader2 } from 'lucide-react';

interface SessionGuardProps {
    children: React.ReactNode;
    allowedRoles?: ('admin' | 'customer')[];
}

export function SessionGuard({ children, allowedRoles }: SessionGuardProps) {
    const { user, loading } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // No session found, redirect to login
                // Encode current path to redirect back after login if needed (optional)
                router.push('/');
            } else {
                // Check role
                if (allowedRoles && !allowedRoles.includes(user.role)) {
                    // Wrong role, redirect to appropriate home
                    if (user.role === 'admin') router.push('/admin');
                    else router.push('/panel');
                } else {
                    setAuthorized(true);
                }
            }
        }
    }, [user, loading, router, allowedRoles, pathname]);

    if (loading || !authorized) {
        return (
            <div className="min-h-screen bg-pterodark flex items-center justify-center">
                <Loader2 className="animate-spin text-pteroblue" size={32} />
                <span className="ml-3 text-pterosub">Verifying Session...</span>
            </div>
        );
    }

    return <>{children}</>;
}
