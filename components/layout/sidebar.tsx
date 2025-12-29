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
    Image,
    RefreshCw,
    LifeBuoy,
    Store
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
    const [isSupportExpanded, setIsSupportExpanded] = useState(true);
    const [myServers, setMyServers] = useState<any[]>([]);
    const [isRestaurantsExpanded, setIsRestaurantsExpanded] = useState(true);

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
        { name: t('statusConfiguration'), href: '/admin/status', icon: Activity },
    ];

    const userLinks = [
        { name: t('dashboard'), href: '/panel', icon: LayoutDashboard },
        { name: t('statusLink'), href: '/panel/status', icon: Activity },
        { name: t('settings'), href: '/panel/settings', icon: Settings },
        { name: t('support'), href: '/panel/support', icon: LifeBuoy },
    ];

    const usersSubmenu = [
        { name: t('userManagement'), href: '/admin/users', icon: UserCog },
        { name: t('suspendedPage'), href: '/admin/users/suspended-settings', icon: ShieldAlert },
    ];

    const supportSubmenu = [
        { name: t('activeTickets') || 'Active Tickets', href: '/admin/support', icon: LifeBuoy },
        { name: t('archivedTickets') || 'Archived Tickets', href: '/admin/support?view=archived', icon: Database }, // Using Database icon as generic archive
    ];

    const systemSubmenu = [
        { name: t('language'), href: '/admin/system/language', icon: Globe },
        { name: t('appearance'), href: '/admin/system/appearance', icon: Image },
        { name: t('thirdPartyDb') || 'Database', href: '/admin/system/database', icon: Database },
        { name: t('githubUpdates') || 'Updates', href: '/admin/system/updates', icon: RefreshCw },
        { name: t('smtpConfiguration'), href: '/admin/system/smtp', icon: Mail },
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

    // Helper for "Chromed" Glow Styles (User Panel Only)
    const getItemStyle = (href: string) => {
        if (type === 'admin') {
            return "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:text-pterotext hover:bg-pterocard border border-transparent";
        }

        let colorClass = "";

        if (href.includes('restaurants') || href.includes('status') || href.includes('servers')) {
            colorClass = "hover:shadow-green-500/20 hover:border-green-500/50 hover:text-green-400";
        } else if (href.includes('support')) {
            colorClass = "hover:shadow-purple-500/20 hover:border-purple-500/50 hover:text-purple-400";
        } else if (href.includes('suspended')) {
            colorClass = "hover:shadow-red-500/20 hover:border-red-500/50 hover:text-red-400";
        } else if (href.includes('backups') || href.includes('database')) {
            colorClass = "hover:shadow-orange-500/20 hover:border-orange-500/50 hover:text-orange-400";
        } else if (href.includes('system') || href.includes('settings') || href.includes('language') || href.includes('appearance') || href.includes('smtp')) {
            colorClass = "hover:shadow-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-400";
        } else if (href.includes('users')) {
            colorClass = "hover:shadow-teal-500/20 hover:border-teal-500/50 hover:text-teal-400";
        } else {
            // Default Blue (Dashboard)
            colorClass = "hover:shadow-blue-500/20 hover:border-blue-500/50 hover:text-blue-400";
        }

        return cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 border border-transparent",
            "hover:bg-gradient-to-r hover:from-transparent hover:via-white/5 hover:to-transparent hover:shadow-lg",
            colorClass
        );
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 shadow-2xl">
            <div className="h-20 flex items-center justify-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <Link href={`${type === 'admin' ? '/admin' : '/panel'}?userId=${userId}`}>
                    <h1 className="text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1">
                        VELOX<span className="text-pteroblue drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">AI</span>
                    </h1>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
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
                                getItemStyle(link.href),
                                isActive
                                    ? "bg-pteroblue/10 text-pteroblue border-pteroblue/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
                                    : "text-pterosub"
                            )}
                        >
                            <Icon size={18} className={cn("transition-colors", isActive ? "text-pteroblue" : "group-hover:text-current")} />
                            {link.name}
                        </button>
                    );
                })}

                {/* User Restaurants List - Collapsible Module */}
                {type === 'user' && myServers.length > 0 && (
                    <div className="space-y-1 mt-2">
                        <button
                            onClick={() => setIsRestaurantsExpanded(!isRestaurantsExpanded)}
                            className={cn(
                                getItemStyle('restaurants'),
                                "justify-between group"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Store size={18} />
                                <span className="text-left">{t('myRestaurants')}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200 opacity-50 group-hover:opacity-100",
                                    isRestaurantsExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isRestaurantsExpanded && (
                            <div className="ml-4 space-y-1 border-l border-white/5 pl-2 my-1">
                                {myServers.map(server => {
                                    const isSelected = activeServerId === String(server.id);
                                    return (
                                        <Link
                                            key={server.id}
                                            href={`/panel?serverId=${server.id}&userId=${userId}&tab=system`}
                                            className={cn(
                                                getItemStyle('restaurants'),
                                                "py-2 text-xs",
                                                isSelected
                                                    ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]"
                                                    : "text-pterosub"
                                            )}
                                        >
                                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", server.powerStatus === 'running' ? "bg-green-500 text-green-500" : "bg-red-500 text-red-500")} />
                                            {server.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Support Section with Submenu (Admin Only) */}
                {type === 'admin' && (
                    <div className="space-y-1 mt-2">
                        <button
                            onClick={() => setIsSupportExpanded(!isSupportExpanded)}
                            className={cn(
                                getItemStyle('support'),
                                "justify-between group"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <LifeBuoy size={18} />
                                <span className="text-left">{t('support')}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200 opacity-50 group-hover:opacity-100",
                                    isSupportExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isSupportExpanded && (
                            <div className="ml-4 space-y-1 border-l border-white/5 pl-2 my-1">
                                {supportSubmenu.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href.split('?')[0] && (item.href.includes('view=archived') ? searchParams.get('view') === 'archived' : !searchParams.get('view'));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                getItemStyle(item.href),
                                                "py-2 text-xs",
                                                isActive
                                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)]"
                                                    : "text-pterosub"
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

                {/* Users Section with Submenu (Admin Only) */}
                {type === 'admin' && (
                    <div className="space-y-1 mt-2">
                        <button
                            onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                            className={cn(
                                getItemStyle('users'),
                                "justify-between group"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Users size={18} />
                                <span className="text-left">{t('users')}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200 opacity-50 group-hover:opacity-100",
                                    isUsersExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isUsersExpanded && (
                            <div className="ml-4 space-y-1 border-l border-white/5 pl-2 my-1">
                                {usersSubmenu.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                getItemStyle(item.href),
                                                "py-2 text-xs",
                                                isActive
                                                    ? "bg-teal-500/10 text-teal-400 border-teal-500/20 shadow-[0_0_15px_-5px_rgba(20,184,166,0.3)]"
                                                    : "text-pterosub"
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
                    <div className="space-y-1 mt-2">
                        <button
                            onClick={() => setIsSystemExpanded(!isSystemExpanded)}
                            className={cn(
                                getItemStyle('system'),
                                "justify-between group"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Shield size={18} />
                                <span className="text-left">{t('system')}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "transition-transform duration-200 opacity-50 group-hover:opacity-100",
                                    isSystemExpanded ? "rotate-180" : ""
                                )}
                            />
                        </button>

                        {isSystemExpanded && (
                            <div className="ml-4 space-y-1 border-l border-white/5 pl-2 my-1">
                                {systemSubmenu.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                getItemStyle(item.href),
                                                "py-2 text-xs",
                                                isActive
                                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]"
                                                    : "text-pterosub"
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

            <div className="p-4 border-t border-white/5 flex gap-2 bg-[#0b0e14]/50">
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
