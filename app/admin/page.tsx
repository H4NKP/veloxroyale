'use client';

import { useState, useEffect } from 'react';
import { Card, cn } from '@/components/ui/core';
import Link from 'next/link';
import { Server, Users, Activity, ExternalLink } from 'lucide-react';
import { getAllServers, type Server as ServerType } from '@/lib/servers';
import { getAllUsers, type User } from '@/lib/auth';
import { getReservationsByServerId } from '@/lib/reservations';
import { useTranslation } from '@/components/LanguageContext';

export default function AdminDashboard() {
    const [servers, setServers] = useState<ServerType[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [totalReservations, setTotalReservations] = useState(0);
    const [dbStatus, setDbStatus] = useState<{ enabled: boolean }>({ enabled: false });
    const [isLoading, setIsLoading] = useState(true);

    const { t } = useTranslation();

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const s = await getAllServers();
            setServers(s);
            const u = await getAllUsers();
            setAllUsers(u);

            // Compute reservations
            let total = 0;
            for (const server of s) {
                const res = await getReservationsByServerId(server.id);
                total += res.filter(r => r.status === 'confirmed').length;
            }
            setTotalReservations(total);
            setTotalReservations(total);

            // Check DB Status
            try {
                const dbRes = await fetch('/api/db/config');
                const dbConfig = await dbRes.json();
                setDbStatus(dbConfig);
            } catch (error) {
                console.error("Failed to check DB status:", error);
                setDbStatus({ enabled: false });
            }

            setIsLoading(false);
        };
        load();
    }, []);

    const customers = allUsers.filter(u => u.role === 'customer');

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-pterotext">{t('adminOverview')}</h1>
                <p className="text-pterosub mt-2">{t('adminOverviewDesc')}</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title={t('totalAiAgents')}
                    value={servers.length.toString()}
                    icon={Server}
                    trend={t('realTime')}
                    color="blue"
                />
                <StatsCard
                    title={t('activeReservations')}
                    value={totalReservations.toLocaleString()}
                    icon={Activity}
                    trend={t('confirmed')}
                    color="green"
                />
                <StatsCard
                    title={t('totalCustomers')}
                    value={customers.length.toString()}
                    icon={Users}
                    trend={t('realTime')}
                    color="purple"
                />
                <StatsCard
                    title={t('systemStatus')}
                    value={dbStatus.enabled ? t('online') : "Offline / Local"}
                    icon={Activity}
                    trend={dbStatus.enabled ? "Database Connected" : "Using LocalStorage"}
                    color={dbStatus.enabled ? "green" : "orange"}
                />
            </div>

            {/* Recent Activity / Restaurants List */}
            <h2 className="text-xl font-semibold text-pterotext mb-4">{t('activeDeployments')}</h2>
            <Card className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-pterocard border-b border-pteroborder text-pterosub text-sm uppercase tracking-wider">
                            <th className="p-4 font-medium">{t('status')}</th>
                            <th className="p-4 font-medium">{t('clientAiAgent')}</th>
                            <th className="p-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pteroborder">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-pterosub italic">
                                    {t('loadingSystemData')}
                                </td>
                            </tr>
                        ) : servers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-pterosub italic">
                                    {t('noRestaurants')}
                                </td>
                            </tr>
                        ) : (
                            servers.map((server) => (
                                <tr key={server.id} className="hover:bg-pteroborder/30 transition-colors">
                                    <td className="p-4">
                                        <span className={cn(
                                            "inline-flex h-3 w-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]",
                                            server.status === 'active' ? "bg-green-500" : "bg-red-500"
                                        )}></span>
                                    </td>
                                    <td className="p-4 text-pterotext font-medium">{server.name}</td>
                                    <td className="p-4 text-right">
                                        <Link href={`/admin/monitor?userId=${server.userId}&fromAdmin=true&serverId=${server.id}`}>
                                            <button className="p-2 hover:bg-pteroborder rounded-md text-pterosub hover:text-white transition-colors">
                                                <ExternalLink size={16} />
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </>
    );
}

function StatsCard({ title, value, icon: Icon, trend, color }: any) {
    const colors: any = {
        blue: "text-blue-400 bg-blue-400/10",
        green: "text-green-400 bg-green-400/10",
        purple: "text-purple-400 bg-purple-400/10",
        orange: "text-orange-400 bg-orange-400/10",
    };

    return (
        <Card className="flex items-start justify-between">
            <div>
                <p className="text-pterosub text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-pterotext">{value}</h3>
                <p className="text-xs text-pterosub/70 mt-2">{trend}</p>
            </div>
            <div className={`p-3 rounded-md ${colors[color]}`}>
                <Icon size={20} />
            </div>
        </Card>
    );
}

