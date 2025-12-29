'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/components/ui/core';
import { getServersByUserId } from '@/lib/servers';
import { useTranslation } from '@/components/LanguageContext';
import {
    LayoutDashboard,
    Server,
    Settings,
    Users,
    Shield,
    LogOut,
    ChevronDown,
    UserCog,
    ShieldAlert,
    Database,
    Activity,
    Globe,
    Mail,
    Calendar,
    Image
} from 'lucide-react';

interface SidebarProps {
    type: 'admin' | 'user';
}

export function Sidebar({ type }: SidebarProps) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = Number(searchParams.get('userId')) || 2;
    const [isUsersExpanded, setIsUsersExpanded] = useState(true);
    const [isSystemExpanded, setIsSystemExpanded] = useState(true);
    const [myServers, setMyServers] = useState<any[]>([]);

    // Fetch user servers dynamically
    useEffect(() => {
        if (type === 'user') {
            const loadServers = async () => {
                const servers = await getServersByUserId(userId);
                setMyServers(servers);
            };
            loadServers();
            // Listen for updates (optional optimization)
            window.addEventListener('storage', loadServers);
            return () => window.removeEventListener('storage', loadServers);
        }
    }, [type, userId]);

    const adminLinks = [
        { name: t('overview'), href: '/admin', icon: LayoutDashboard },
        { name: t('restaurants'), href: '/admin/restaurants', icon: Server },
        { name: t('panelLife'), href: '/admin/settings', icon: Shield },
        { name: t('backups'), href: '/admin/backups', icon: Database },
        { name: t('statusConfig'), href: '/admin/status', icon: Activity },
    ];

    const userLinks = [
        { name: t('dashboard'), href: '/panel', icon: LayoutDashboard },
        { name: t('statusLink'), href: '/panel/status', icon: Activity },
        { name: t('settings'), href: '/panel/settings', icon: Settings },
    ];

    const usersSubmenu = [
        { name: t('userManagement'), href: '/admin/users', icon: UserCog },
        { name: t('suspendedPage'), href: '/admin/users/suspended-settings', icon: ShieldAlert },
    ];

    const systemSubmenu = [
        { name: t('language'), href: '/admin/system/language', icon: Globe },
        { name: t('appearance'), href: '/admin/system/appearance', icon: Image },
        { name: 'SMTP Server', href: '/admin/system/smtp', icon: Mail },
    ];

    const links = type === 'admin' ? adminLinks : userLinks;
    const activeServerId = searchParams.get('serverId');

    const handleDashboardClick = () => {
        // Explicitly nav to panel base to show server selection
        router.push(`/panel?userId=${userId}`);
    };

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
            window.location.replace('/');
        }
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-pterodark/80 backdrop-blur-sm border-r border-pteroborder flex flex-col z-50">
            <div className="h-16 flex items-center justify-center border-b border-pteroborder">
                <Link href={`${type === 'admin' ? '/admin' : '/panel'}?userId=${userId}`}>
                    <h1 className="text-xl font-bold tracking-tight text-pterotext hover:opacity-80 transition-opacity cursor-pointer">
                        VELOX<span className="text-pteroblue">AI</span>
                    </h1>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isDashboard = link.name === t('dashboard');
                    const isActive = isDashboard
                        ? (pathname === link.href && !activeServerId)
                        : (pathname === link.href && !window.location.search);

                    return (
                        <button
                            key={link.href}
                            onClick={isDashboard ? handleDashboardClick : () => router.push(`${link.href}?userId=${userId}`)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-pteroblue/10 text-pteroblue border border-pteroblue/20"
                                    : "text-pterosub hover:text-pterotext hover:bg-pterocard"
                            )}
                        >
                            <Icon size={18} />
                            {link.name}
                        </button>
                    );
                })}

                {/* User Restaurants List */}
                {type === 'user' && myServers.length > 0 && (
                    <div className="space-y-1 mt-4">
                        <p className="px-4 text-[10px] font-bold text-pterosub uppercase tracking-widest mb-2">My Restaurants</p>
                        {myServers.map(server => {
                            const isSelected = activeServerId === String(server.id);
                            return (
                                <div key={server.id} className="space-y-1">
                                    <Link
                                        href={`/panel?serverId=${server.id}&userId=${userId}&tab=system`}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                            isSelected
                                                ? "bg-pteroblue/10 text-pteroblue border border-pteroblue/20"
                                                : "text-pterosub hover:text-pterotext hover:bg-pterocard"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", server.powerStatus === 'running' ? "bg-green-500" : "bg-red-500")} />
                                        {server.name}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Users Section with Submenu (Admin Only) */}
                {type === 'admin' && (
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-pterosub hover:text-pterotext hover:bg-pterocard transition-all duration-200"
                        >
                            <Users size={18} />
                            <span className="flex-1 text-left">{t('users')}</span>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200",
                                    isUsersExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isUsersExpanded && (
                            <div className="ml-4 space-y-1 border-l-2 border-pteroborder pl-2">
                                {usersSubmenu.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-pteroblue/10 text-pteroblue border border-pteroblue/20"
                                                    : "text-pterosub hover:text-pterotext hover:bg-pterocard"
                                            )}
                                        >
                                            <Icon size={16} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* System Section with Submenu (Admin Only) */}
                {type === 'admin' && (
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsSystemExpanded(!isSystemExpanded)}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-pterosub hover:text-pterotext hover:bg-pterocard transition-all duration-200"
                        >
                            <Shield size={18} />
                            <span className="flex-1 text-left">{t('system')}</span>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200",
                                    isSystemExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isSystemExpanded && (
                            <div className="ml-4 space-y-1 border-l-2 border-pteroborder pl-2">
                                {systemSubmenu.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-pteroblue/10 text-pteroblue border border-pteroblue/20"
                                                    : "text-pterosub hover:text-pterotext hover:bg-pterocard"
                                            )}
                                        >
                                            <Icon size={16} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}


            </nav>

            <div className="p-4 border-t border-pteroborder flex gap-2">
                <Link
                    href={`${type === 'admin' ? '/admin/profile' : '/panel/profile'}?userId=${userId}`}
                    className="flex items-center justify-center w-12 h-12 rounded-lg text-pterosub hover:text-pterotext hover:bg-pterocard transition-all duration-200 border border-transparent hover:border-pteroborder"
                >
                    <UserCog size={20} />
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-200 font-medium"
                >
                    <LogOut size={16} />
                    {t('logout')}
                </button>
            </div>
        </aside>
    );
}
