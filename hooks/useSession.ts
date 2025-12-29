'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionUser {
    id: number;
    email: string;
    role: 'admin' | 'customer';
    status: string;
    support_priority?: string;
    support_suspended?: boolean;
}

export function useSession() {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // defined in client side purely
        if (typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem('velox_session');
                if (stored) {
                    setUser(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to parse session", e);
            } finally {
                setLoading(false);
            }
        }
    }, []);

    const login = (userData: SessionUser) => {
        sessionStorage.setItem('velox_session', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        sessionStorage.removeItem('velox_session');
        setUser(null);
        router.push('/');
    };

    return { user, loading, login, logout };
}
