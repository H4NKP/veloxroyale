'use client';

import { useState, useEffect } from 'react';
import { Card, cn } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { Image, Layout, CheckCircle2 } from 'lucide-react';

export default function AdminAppearancePage() {
    const { t } = useTranslation();
    const [wallpaperEnabled, setWallpaperEnabled] = useState(false);

    useEffect(() => {
        const savedWallpaper = localStorage.getItem('velox_admin_bg');
        setWallpaperEnabled(savedWallpaper === 'custom');
    }, []);

    const toggleWallpaper = () => {
        const newState = !wallpaperEnabled;
        setWallpaperEnabled(newState);
        localStorage.setItem('velox_admin_bg', newState ? 'custom' : 'default');
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
                            onClick={() => wallpaperEnabled && toggleWallpaper()}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all h-full flex flex-col gap-4",
                                !wallpaperEnabled
                                    ? "bg-pteroblue/5 border-pteroblue ring-1 ring-pteroblue/50"
                                    : "bg-pterocard border-pteroborder hover:border-pteroblue/50"
                            )}
                        >
                            <div className="aspect-video rounded-lg bg-pterodark border border-pteroborder flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-pterodark to-pterocard" />
                                <Layout size={32} className={!wallpaperEnabled ? "text-pteroblue relative z-10" : "text-pterosub relative z-10"} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn("font-bold text-lg", !wallpaperEnabled ? "text-pteroblue" : "text-pterotext")}>
                                        Default Theme
                                    </h4>
                                    {!wallpaperEnabled && <CheckCircle2 size={20} className="text-pteroblue" />}
                                </div>
                                <p className="text-sm text-pterosub">Standard professional dark interface optimized for clarity.</p>
                            </div>
                        </div>

                        {/* Custom Wallpaper Option */}
                        <div
                            onClick={() => !wallpaperEnabled && toggleWallpaper()}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all h-full flex flex-col gap-4 group",
                                wallpaperEnabled
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
                                    <h4 className={cn("font-bold text-lg", wallpaperEnabled ? "text-pink-500" : "text-pterotext")}>
                                        Northern Lights
                                    </h4>
                                    {wallpaperEnabled && <CheckCircle2 size={20} className="text-pink-500" />}
                                </div>
                                <p className="text-sm text-pterosub">Immersive background with blur effect for a premium feel.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
