'use client';

import { Suspense } from 'react';
import { PanelDashboard } from '@/components/panel/PanelDashboard';

function Loading() {
    return <div className="p-8 text-center text-pterosub">Loading Panel...</div>;
}

export default function UserPanelPage() {
    return (
        <Suspense fallback={<Loading />}>
            <PanelDashboard />
        </Suspense>
    );
}
