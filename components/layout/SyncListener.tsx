'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSyncVersion } from '@/lib/sync';

export function SyncListener() {
    const router = useRouter();
    const lastVersion = useRef<number | null>(null);

    useEffect(() => {
        // Initial setup
        const init = async () => {
            const version = await getSyncVersion();
            lastVersion.current = version;
        };
        init();

        // 1. Remote Polling Sync (2 seconds)
        const interval = setInterval(async () => {
            const currentVersion = await getSyncVersion();

            if (lastVersion.current !== null && currentVersion > lastVersion.current) {
                // Version changed, refreshing
                lastVersion.current = currentVersion;
                router.refresh();
            } else if (lastVersion.current === null) {
                lastVersion.current = currentVersion;
            }
        }, 2000);

        // 2. Local Mode Sync (Custom Event)
        const handleLocalSync = () => {
            // Local event detected, refreshing
            router.refresh();
        };

        window.addEventListener('veloxai_sync', handleLocalSync);

        return () => {
            clearInterval(interval);
            window.removeEventListener('veloxai_sync', handleLocalSync);
        };
    }, [router]);

    return null; // Side-effect component
}
