'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, cn } from '@/components/ui/core';
import { Activity, ShieldCheck, CheckCircle2, AlertCircle, Clock, Server, Globe, Hammer } from 'lucide-react';
import { getAllMonitors, calculateUptime, type StatusMonitor } from '@/lib/status';
import { useTranslation } from '@/components/LanguageContext';

export default function StatusWallPage() {
    const { t } = useTranslation();
    const [monitors, setMonitors] = useState<StatusMonitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const [countdown, setCountdown] = useState(10);

    const fetchMonitors = async () => {
        const data = await getAllMonitors();
        setMonitors(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMonitors();

        // Countdown timer implementation
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    fetchMonitors();
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const allSystemsOperational = monitors.length > 0 && monitors.every(m => m.status === 'active' || m.status === 'maintenance');
    const anyMaintenance = monitors.some(m => m.status === 'maintenance');

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="p-3 bg-pteroblue/10 rounded-2xl border border-pteroblue/20">
                        <Activity className="text-pteroblue animate-pulse" size={32} />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-pterotext tracking-tight">{t('systemStatus')}</h1>
                <p className="text-pterosub max-w-lg mx-auto">
                    {t('systemStatusDesc')}
                </p>

                <div className="flex items-center justify-center gap-2 text-[10px] text-pterosub font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {t('lastUpdated')}: {lastUpdated.toLocaleTimeString()} (Auto refresh in {countdown}s)
                </div>
            </header>

            {/* Overall Status Banner */}
            {!isLoading && (
                <div className={cn(
                    "p-6 rounded-2xl border flex items-center gap-4 transition-all duration-500",
                    allSystemsOperational
                        ? anyMaintenance ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                    {allSystemsOperational
                        ? anyMaintenance ? <Hammer size={32} /> : <ShieldCheck size={32} />
                        : <AlertCircle size={32} />}
                    <div>
                        <h2 className="text-xl font-bold">
                            {allSystemsOperational
                                ? anyMaintenance ? t('maintenanceSchedule') : t('allSystemsOp')
                                : t('partialOutage')}
                        </h2>
                        <p className="opacity-80 text-sm">
                            {allSystemsOperational
                                ? anyMaintenance ? t('maintenanceMsg') : t('operationalMsg')
                                : t('outageMsg')}
                        </p>
                    </div>
                </div>
            )}

            {/* Monitors Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-pterocard animate-pulse rounded-xl border border-pteroborder" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monitors.map(monitor => (
                        <Card key={monitor.id} className="group hover:border-pteroblue/30 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full animate-pulse",
                                        monitor.status === 'active' ? "bg-green-500 shadow-[0_0_8px_#22c55e]" :
                                            monitor.status === 'maintenance' ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" :
                                                "bg-red-500 shadow-[0_0_8px_#ef4444]"
                                    )} />
                                    <div>
                                        <h3 className="font-bold text-pterotext">{monitor.name}</h3>
                                        <div className="flex items-center gap-1.5 text-[10px] text-pterosub font-mono">
                                            {monitor.target.startsWith('http') ? <Globe size={10} /> : <Server size={10} />}
                                            {monitor.target}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-pterosub font-bold uppercase tracking-widest">{t('uptime')}</p>
                                    <p className="text-lg font-bold text-pterotext">{calculateUptime(monitor)}%</p>
                                </div>
                            </div>

                            {/* Uptime Mini Vis */}
                            <div className="mt-4 flex gap-0.5 h-6">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex-1 rounded-sm",
                                            monitor.status === 'active'
                                                ? "bg-green-500/20 group-hover:bg-green-500/40"
                                                : monitor.status === 'maintenance'
                                                    ? "bg-yellow-500/20 group-hover:bg-yellow-500/40"
                                                    : "bg-red-500/20 group-hover:bg-red-500/40",
                                            i === 19 && monitor.status === 'active' ? "bg-green-500" : "",
                                            i === 19 && monitor.status === 'maintenance' ? "bg-yellow-500" : "",
                                            i === 19 && monitor.status === 'inactive' ? "bg-red-500" : ""
                                        )}
                                    />
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}


