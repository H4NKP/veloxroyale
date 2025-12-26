'use client';

import { useTranslation } from '@/components/LanguageContext';
import { useState, useEffect } from 'react';
import { Server, updateServer, getServersByUserId } from '@/lib/servers';
import { Settings, MessageSquare, Check, Globe } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsPage() {
    const { t, language, setLanguage } = useTranslation();
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // AI Language state (stored per server, simplistic implementation taking the first server for now as panel is usually 1 user = 1 restaurant context)
    const [aiLanguage, setAiLanguage] = useState<'es' | 'en' | 'both'>('es');
    const [activeServerId, setActiveServerId] = useState<number | null>(null);

    useEffect(() => {
        // Mock fetching user servers - in real app would get from auth context
        // Ensuring we grab servers for a specific user to edit their config
        // Hardcoded userId 2 based on previous context or TODO: get real user
        const fetchSettings = async () => {
            try {
                // We use a mock ID or fetch logic. For now, let's try to get servers logic.
                // Since this is a client component, we might rely on an API or the lib if compatible.
                // The lib functions are async but use localStorage on client side which is fine.
                // Ideally this should be an API call, but we'll stick to the existing pattern found in codebase.
                const userServers = await getServersByUserId(2); // Mock User ID from previous files
                if (userServers.length > 0) {
                    setServers(userServers);
                    const s = userServers[0];
                    setActiveServerId(s.id);
                    // Default to ES if not set
                    setAiLanguage(s.config?.aiLanguage || 'es');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!activeServerId) return;
        setSaving(true);
        try {
            // Update local server config
            // We need to preserve other config options
            const server = servers.find(s => s.id === activeServerId);
            if (server) {
                const updatedConfig = {
                    ...server.config,
                    aiLanguage: aiLanguage
                    // We need to allow other properties like openTime etc to exist if they are there,
                    // but typescript might complain if they are optional. 
                    // The spread handles 'undefined' gracefully essentially.
                };

                // Type assertion or update logic
                // We will update the server config
                await updateServer(activeServerId, {
                    config: updatedConfig as any // Using any to bypass stricter type checks for now until we update the interface
                });
            }

            // Emulate network delay for better UX
            await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            console.error("Failed to save settings", e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-white/50">{t('loading')}</div>;
    }

    return (
        <div className="animate-fade-in space-y-8">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    {t('settings')}
                </h1>
                <p className="text-zinc-400 mt-2">{t('panelSettings')}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Panel Visual Language */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('panelLanguage')}</h2>
                    </div>
                    <p className="text-zinc-400 text-sm mb-6">
                        {t('panelLanguageDesc')}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setLanguage('en')}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                language === 'en'
                                    ? "bg-blue-500/10 border-blue-500/50 text-white"
                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            )}
                        >
                            <span>English</span>
                            {language === 'en' && <Check className="w-4 h-4 text-blue-400" />}
                        </button>

                        <button
                            onClick={() => setLanguage('es')}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                language === 'es'
                                    ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            )}
                        >
                            <span>Español</span>
                            {language === 'es' && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                    </div>
                </div>

                {/* AI Agent Language */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('aiSettings')}</h2>
                    </div>

                    <p className="text-zinc-400 text-sm mb-6">
                        {t('aiLanguageDesc')}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setAiLanguage('es')}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                aiLanguage === 'es'
                                    ? "bg-purple-500/10 border-purple-500/50 text-white"
                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            )}
                        >
                            <span>{t('aiLangOption_es')}</span>
                            {aiLanguage === 'es' && <Check className="w-4 h-4 text-purple-400" />}
                        </button>

                        <button
                            onClick={() => setAiLanguage('en')}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                aiLanguage === 'en'
                                    ? "bg-purple-500/10 border-purple-500/50 text-white"
                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            )}
                        >
                            <span>{t('aiLangOption_en')}</span>
                            {aiLanguage === 'en' && <Check className="w-4 h-4 text-purple-400" />}
                        </button>

                        <button
                            onClick={() => setAiLanguage('both')}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                aiLanguage === 'both'
                                    ? "bg-purple-500/10 border-purple-500/50 text-white"
                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            )}
                        >
                            <span>{t('aiLangOption_both')}</span>
                            {aiLanguage === 'both' && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-800">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                t('saveChanges')
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
