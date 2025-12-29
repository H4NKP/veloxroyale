'use client';

import { useState, useEffect } from 'react';
import { Card, cn } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { Image, Layout, CheckCircle2 } from 'lucide-react';

export default function AdminAppearancePage() {
    const { t } = useTranslation();
    const [wallpaper, setWallpaper] = useState<'default' | 'custom_1' | 'custom_2'>('default');

    useEffect(() => {
        const saved = localStorage.getItem('velox_admin_bg');
        if (saved === 'custom') {
            setWallpaper('custom_1'); // Migrate old pref
        } else if (saved === 'custom_2') {
            setWallpaper('custom_2');
        } else {
            setWallpaper('default');
        }
    }, []);

    const setWallpaperPref = (type: 'default' | 'custom_1' | 'custom_2') => {
        setWallpaper(type);
        if (type === 'default') {
            localStorage.setItem('velox_admin_bg', 'default');
        } else if (type === 'custom_1') {
            localStorage.setItem('velox_admin_bg', 'custom');
        } else {
            localStorage.setItem('velox_admin_bg', 'custom_2');
        }
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-pink-500/10">
                        <Image className="text-pink-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-pterotext">{t('appearance')}</h1>
                        <p className="text-pterosub">{t('appearanceDesc')}</p>
                    </div>
                </div>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Default Theme Option */}
                        <div
                            onClick={() => setWallpaperPref('default')}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all h-full flex flex-col gap-4",
                                wallpaper === 'default'
                                    ? "bg-pteroblue/5 border-pteroblue ring-1 ring-pteroblue/50"
                                    : "bg-pterocard border-pteroborder hover:border-pteroblue/50"
                            )}
                        >
                            <div className="aspect-video rounded-lg bg-pterodark border border-pteroborder flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-pterodark to-pterocard" />
                                <Layout size={32} className={wallpaper === 'default' ? "text-pteroblue relative z-10" : "text-pterosub relative z-10"} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn("font-bold text-lg", wallpaper === 'default' ? "text-pteroblue" : "text-pterotext")}>
                                        Default Theme
                                    </h4>
                                    {wallpaper === 'default' && <CheckCircle2 size={20} className="text-pteroblue" />}
                                </div>
                                <p className="text-sm text-pterosub">Standard professional dark interface optimized for clarity.</p>
                            </div>
                        </div>

                        {/* Custom Wallpaper 1 Option */}
                        <div
                            onClick={() => setWallpaperPref('custom_1')}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all h-full flex flex-col gap-4 group",
                                wallpaper === 'custom_1'
                                    ? "bg-pink-500/5 border-pink-500 ring-1 ring-pink-500/50"
                                    : "bg-pterocard border-pteroborder hover:border-pink-500/50"
                            )}
                        >
                            <div className="aspect-video rounded-lg bg-pterodark border border-pteroborder overflow-hidden relative">
                                <img src="/wallpaper.jpeg" alt="Northern Lights" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/20" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn("font-bold text-lg", wallpaper === 'custom_1' ? "text-pink-500" : "text-pterotext")}>
                                        Northern Lights
                                    </h4>
                                    {wallpaper === 'custom_1' && <CheckCircle2 size={20} className="text-pink-500" />}
                                </div>
                                <p className="text-sm text-pterosub">Immersive background with blur effect for a premium feel.</p>
                            </div>
                        </div>

                        {/* Custom Wallpaper 2 Option */}
                        <div
                            onClick={() => setWallpaperPref('custom_2')}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all h-full flex flex-col gap-4 group",
                                wallpaper === 'custom_2'
                                    ? "bg-purple-500/5 border-purple-500 ring-1 ring-purple-500/50"
                                    : "bg-pterocard border-pteroborder hover:border-purple-500/50"
                            )}
                        >
                            <div className="aspect-video rounded-lg bg-pterodark border border-pteroborder overflow-hidden relative">
                                <img src="/wallpaper2.jpg" alt="Abstract Galaxy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/20" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn("font-bold text-lg", wallpaper === 'custom_2' ? "text-purple-500" : "text-pterotext")}>
                                        Abstract Galaxy
                                    </h4>
                                    {wallpaper === 'custom_2' && <CheckCircle2 size={20} className="text-purple-500" />}
                                </div>
                                <p className="text-sm text-pterosub">Deep abstract tones for a modern, high-tech look.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
