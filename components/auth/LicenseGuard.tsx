'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isActivated } from '@/lib/license';
import { Loader2 } from 'lucide-react';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkLicense = () => {
            const activated = isActivated();
            const isLicensePage = pathname === '/license';

            if (!activated && !isLicensePage) {
                router.replace('/license');
            } else if (activated && isLicensePage) {
                router.replace('/');
            } else {
                setIsChecking(false);
            }
        };

        checkLicense();
    }, [pathname, router]);

    if (isChecking) {
        return (
            <div className="min-h-screen bg-[#0b0f15] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-pteroblue animate-spin" />
                <p className="text-pterosub text-sm font-medium tracking-widest uppercase">Verifying System License...</p>
            </div>
        );
    }

    return <>{children}</>;
}
