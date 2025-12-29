'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { SyncListener } from '@/components/layout/SyncListener';
import { useEffect, useState } from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [wallpaper, setWallpaper] = useState<string | null>(null);

    useEffect(() => {
        // Check for wallpaper preference
        const savedWallpaper = localStorage.getItem('velox_admin_bg');
        if (savedWallpaper === 'custom') {
            setWallpaper('/wallpaper.jpeg');
        } else {
            setWallpaper(null);
        }
    }, []);

    return (
        <div className="min-h-screen bg-pterodark pl-64 transition-all relative">
            {/* Wallpaper Background Overlay */}
            {wallpaper && (
                <div
                    className="fixed inset-0 z-0 opacity-25 pointer-events-none"
                    style={{
                        backgroundImage: `url(${wallpaper})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        filter: 'blur(0px) brightness(0.7)'
                    }}
                />
            )}

            <div className="relative z-10">
                <SyncListener />
                <Sidebar type="admin" />
                <main className="p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
