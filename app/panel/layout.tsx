import { Sidebar } from '@/components/layout/sidebar';
import { SyncListener } from '@/components/layout/SyncListener';
import { LanguageProvider } from '@/components/LanguageContext';

export default function UserPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LanguageProvider>
            <div className="min-h-screen bg-pterodark pl-64 transition-all">
                <SyncListener />
                <Sidebar type="user" />
                <main className="p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </LanguageProvider>
    );
}
