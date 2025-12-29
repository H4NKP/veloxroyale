import { Sidebar } from '@/components/layout/sidebar';
import { SyncListener } from '@/components/layout/SyncListener';
import { LanguageProvider } from '@/components/LanguageContext';
import { SessionGuard } from '@/components/auth/SessionGuard';

export default function UserPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LanguageProvider>
            <SessionGuard allowedRoles={['customer']}>
                <div className="min-h-screen bg-pterodark pl-64 transition-all">
                    <SyncListener />
                    <Sidebar type="user" />
                    <main className="p-8">
                        <div className="max-w-7xl mx-auto space-y-6">
                            {children}
                        </div>
                    </main>
                </div>
            </SessionGuard>
        </LanguageProvider>
    );
}
