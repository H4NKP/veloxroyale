'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Plus, Trash2, Activity, Globe, Wifi, Settings, AlertCircle, CheckCircle2, RotateCw, Hammer } from 'lucide-react';
import { useTranslation } from '@/components/LanguageContext';
import { getAllMonitors, addMonitor, deleteMonitor, calculateUptime, updateMonitorStatus, type StatusMonitor } from '@/lib/status';
import { triggerSync } from '@/lib/sync';

export default function AdminStatusPage() {
    const { t } = useTranslation();
    const [monitors, setMonitors] = useState<StatusMonitor[]>([]);
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchMonitors = async () => {
        setIsLoading(true);
        const data = await getAllMonitors();
        setMonitors(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMonitors();

        const handleSync = () => {
            console.log("[Status Sync] Sync event received, refreshing...");
            fetchMonitors();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('veloxai_sync', handleSync);
        }

        const interval = setInterval(fetchMonitors, 30000);

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('veloxai_sync', handleSync);
            }
        };
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !target) return;
        setIsSaving(true);
        await addMonitor(name, target);
        await triggerSync();
        setName('');
        setTarget('');
        await fetchMonitors();
        setIsSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('deleteMonitorConfirm'))) return;
        await deleteMonitor(id);
        await triggerSync();
        await fetchMonitors();
    };

    const toggleMaintenance = async (monitor: StatusMonitor) => {
        const newStatus = monitor.status === 'maintenance' ? 'active' : 'maintenance';
        await updateMonitorStatus(monitor.id, newStatus);
        await triggerSync();
        await fetchMonitors();
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-pterotext">{t('statusConfiguration')}</h1>
                    <p className="text-pterosub mt-1">{t('statusConfigDesc')}</p>
                </div>
                <Button onClick={fetchMonitors} variant="secondary" className="flex items-center gap-2">
                    <RotateCw className={isLoading ? "animate-spin" : ""} size={16} />
                    {t('refresh')}
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form */}
                <Card className="md:col-span-1 h-fit">
                    <h2 className="text-lg font-bold text-pterotext mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-pteroblue" />
                        {t('addMonitor')}
                    </h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-pterosub uppercase tracking-wide">{t('monitorName')}</label>
                            <Input
                                placeholder="Main Database Server"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-pterosub uppercase tracking-wide">{t('targetUrlIp')}</label>
                            <Input
                                placeholder="https://api.example.com"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={isSaving} className="w-full">
                            {isSaving ? t('creating') : t('createMonitor')}
                        </Button>
                    </form>
                </Card>

                {/* List */}
                <Card className="md:col-span-2">
                    <h2 className="text-lg font-bold text-pterotext mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-pteroblue" />
                        {t('activeMonitors')}
                    </h2>

                    {isLoading && monitors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-pterosub">
                            <RotateCw className="animate-spin mb-4" size={32} />
                            <p>{t('loadingMonitors')}</p>
                        </div>
                    ) : monitors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-pterosub border-2 border-dashed border-pteroborder rounded-lg">
                            <Globe size={48} className="mb-4 opacity-20" />
                            <p>{t('noMonitorsConfigured')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {monitors.map(monitor => (
                                <div key={monitor.id} className="group p-4 rounded-xl bg-pteroinput border border-pteroborder flex items-center justify-between hover:border-pteroblue/50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            monitor.status === 'active' ? "bg-green-500/10 text-green-500" :
                                                monitor.status === 'maintenance' ? "bg-yellow-500/10 text-yellow-500" :
                                                    "bg-red-500/10 text-red-500"
                                        )}>
                                            {monitor.status === 'active' ? <CheckCircle2 size={20} /> :
                                                monitor.status === 'maintenance' ? <Hammer size={20} /> :
                                                    <AlertCircle size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-pterotext flex items-center gap-2">
                                                {monitor.name}
                                                <Badge variant={
                                                    monitor.status === 'active' ? 'green' :
                                                        monitor.status === 'maintenance' ? 'yellow' : 'red'
                                                } className="text-[10px] py-0">
                                                    {monitor.status === 'maintenance' ? t('maintenanceStatus') : monitor.status.toUpperCase()}
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-pterosub font-mono">{monitor.target}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-pterosub font-bold uppercase tracking-widest">{t('uptime')}</p>
                                            <p className="text-lg font-bold text-pterotext">{calculateUptime(monitor)}%</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleMaintenance(monitor)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    monitor.status === 'maintenance' ? "text-yellow-500 bg-yellow-500/10" : "text-pterosub hover:text-yellow-500 hover:bg-yellow-500/10"
                                                )}
                                                title={monitor.status === 'maintenance' ? t('deactivateMaintenance') : t('activateMaintenance')}
                                            >
                                                <Hammer size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(monitor.id)}
                                                className="p-2 text-pterosub hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                title={t('deleteMonitor')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
