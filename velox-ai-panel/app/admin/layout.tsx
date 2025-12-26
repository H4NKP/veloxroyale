import { Sidebar } from '@/components/layout/sidebar';
import { SyncListener } from '@/components/layout/SyncListener';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-pterodark pl-64 transition-all">
            <SyncListener />
            <Sidebar type="admin" />
            <main className="p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
