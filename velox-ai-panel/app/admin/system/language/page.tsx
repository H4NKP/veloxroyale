'use client';

import { Card } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { Check, Globe } from 'lucide-react';

export default function LanguageSettingsPage() {
    const { language, setLanguage } = useTranslation();

    const languages = [
        { code: 'en', name: 'English (United States)', icon: '🇺🇸' },
        { code: 'es', name: 'Español (España)', icon: '🇪🇸' },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-pterotext">System Language</h1>
                <p className="text-pterosub mt-2">Manage the display language for the entire panel interface.</p>
            </header>

            <Card className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-pteroblue/10 text-pteroblue">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-pterotext">Panel Language</h2>
                        <p className="text-sm text-pterosub">Select your preferred language for the administrative dashboard.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code as 'en' | 'es')}
                            className={`
                                relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                                ${language === lang.code
                                    ? 'bg-pteroblue/10 border-pteroblue text-pterotext'
                                    : 'bg-pterocard border-pteroborder text-pterosub hover:border-pteroblue/50 hover:bg-pterocard/80'
                                }
                            `}
                        >
                            <span className="text-2xl">{lang.icon}</span>
                            <div className="text-left flex-1">
                                <p className={`font-medium ${language === lang.code ? 'text-pteroblue' : 'text-pterotext'}`}>
                                    {lang.name}
                                </p>
                                <p className="text-xs opacity-70">
                                    {lang.code === 'en' ? 'Default' : 'Translation'}
                                </p>
                            </div>
                            {language === lang.code && (
                                <div className="absolute top-4 right-4 text-pteroblue animate-in fade-in zoom-in">
                                    <Check size={18} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-pteroborder/20 rounded-lg border border-pteroborder/50">
                    <p className="text-xs text-pterosub text-center">
                        Note: Changing the system language will update the UI immediately for your session.
                    </p>
                </div>
            </Card>
        </div>
    );
}
