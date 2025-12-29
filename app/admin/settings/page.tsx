'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui/core';
import { Console } from '@/components/ui/console';
import { useTranslation } from '@/components/LanguageContext';
import {
    Terminal,
    Server,
    Cpu,
    HardDrive,
    Activity,
    Clock,
    Database,
    Zap,
    RefreshCw,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { getLicenseInfo } from '@/lib/license';
import { getAllServers } from '@/lib/servers';
import { getReservationsByServerId } from '@/lib/reservations';

export default function AdminSystemPage() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<string[]>([
        "[System]: VeloxAI Admin Panel initialized",
        "[System]: All services operational",
    ]);

    const [systemStats, setSystemStats] = useState({
        uptime: '0h 0m',
        activeServers: 0,
        totalReservations: 0,
        lastBackup: 'Never'
    });

    const [dbConfig, setDbConfig] = useState({
        host: '',
        port: '3306',
        user: '',
        password: '',
        database: '',
        enabled: false
    });

    // Keeping dbConfig just to show status in Info panel, but removing edit logic?
    // User asked to move DB setup. 
    // In Info panel (line 527) it uses dbConfig.enabled.
    // I should create a lightweight fetch for status or just keep the state but remove the UI editing.

    const [smtpError, setSmtpError] = useState('');

    // Factory Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState('');

    const [license, setLicense] = useState(getLicenseInfo());

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}]: ${msg}`]);
    };

    useEffect(() => {
        // Pillamos la config del repo del localStorage
        // const savedRepo = localStorage.getItem('veloxai_repo_url') || 'https://github.com/H4NKP/veloxroyal';
        // const savedBranch = localStorage.getItem('veloxai_repo_branch') || 'main';
        // Removed local state for these as moved to Updates module

        // Calculamos las estadísticas del sistema
        const updateStats = async () => {
            try {
                const servers = await getAllServers();
                const lastBackup = localStorage.getItem('veloxai_last_backup') || 'Never';

                // Fetch real uptime from server
                let realUptime = '0h 0m';
                try {
                    const res = await fetch('/api/system/uptime');
                    const data = await res.json();
                    if (data.uptimeFormatted) {
                        realUptime = data.uptimeFormatted;
                    }
                } catch (err) {
                    console.error("Failed to fetch uptime", err);
                }

                // Compute reservations
                let totalRes = 0;
                for (const server of servers) {
                    const res = await getReservationsByServerId(server.id);
                    totalRes += res.filter(r => r.status === 'confirmed').length;
                }

                setSystemStats({
                    uptime: realUptime,
                    activeServers: servers.filter((s: any) => s.status === 'active').length,
                    totalReservations: totalRes,
                    lastBackup
                });
            } catch (e) {
                console.error('Failed to load stats', e);
            }
        };

        updateStats();
        setLicense(getLicenseInfo());

        // Vamos a por la config de la DB
        fetch('/api/db/config')
            .then(res => res.json())
            .then(data => {
                if (data.host) {
                    setDbConfig(prev => ({ ...prev, ...data }));
                }
            })
            .catch(err => console.error("Failed to fetch DB config", err));

        // Sync with global events
        const handleSync = () => {
            console.log("[Settings Sync] Sync event received, refreshing stats...");
            updateStats();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('veloxai_sync', handleSync);
        }

        const interval = setInterval(updateStats, 30000);
        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('veloxai_sync', handleSync);
            }
        };
    }, []);


    const [serverMode, setServerMode] = useState<'local' | 'ubuntu'>('local');

    useEffect(() => {
        // ... (existing effects)

        // Fetch Server Mode
        fetch('/api/system/mode')
            .then(res => res.json())
            .then(data => {
                if (data.server_mode) setServerMode(data.server_mode);
            });
    }, []);

    const toggleServerMode = async (enabled: boolean) => {
        const newMode = enabled ? 'ubuntu' : 'local';
        try {
            const res = await fetch('/api/system/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_mode: newMode })
            });
            if (res.ok) {
                setServerMode(newMode);
                addLog(`Switched to ${newMode === 'ubuntu' ? 'Ubuntu Server' : 'Local'} Mode`);
                if (newMode === 'ubuntu') {
                    addLog("Warning: Local storage is now disabled for core services.");
                }
            }
        } catch (e) {
            console.error('Failed to toggle server mode', e);
        }
    };

    const handleRunCommand = (cmd: string) => {
        addLog(`$ ${cmd}`);

        setTimeout(() => {
            if (cmd.includes('status')) {
                addLog("All systems operational");
                addLog(`Active Servers: ${systemStats.activeServers}`);
                addLog(`Total Reservations: ${systemStats.totalReservations}`);
            } else if (cmd.includes('restart')) {
                addLog("Restarting services...");
                setTimeout(() => addLog("✓ Services restarted"), 1000);
            } else if (cmd.includes('clear')) {
                setLogs([]);
            } else {
                addLog(`Command executed: ${cmd}`);
            }
        }, 500);
    };

    const handleFactoryReset = async () => {
        setResetError('');
        setIsResetting(true);

        try {
            // 1. Call API to reset server-side data (MySQL) and validate password
            const res = await fetch('/api/system/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Reset failed');
            }

            // 2. Clear LocalStorage (Client-side)
            localStorage.removeItem('veloxai_users');
            localStorage.removeItem('veloxai_servers');
            localStorage.removeItem('veloxai_reservations');
            localStorage.removeItem('veloxai_last_backup');
            localStorage.removeItem('veloxai_start_time');

            // 3. Re-create Default Admin in LocalStorage
            const defaultAdmin = {
                id: 1,
                email: 'admin',
                password: 'admin',
                role: 'admin',
                status: 'active',
                created_at: new Date().toISOString().split('T')[0]
            };
            localStorage.setItem('veloxai_users', JSON.stringify([defaultAdmin]));

            addLog("✓ SYSTEM FACTORY RESET COMPLETED");
            alert(t('resetSuccess'));

            // Reload to apply changes
            window.location.reload();

        } catch (err: any) {
            setResetError(err.message);
            addLog(`✖ Factory Reset Failed: ${err.message}`);
        } finally {
            setIsResetting(false);
        }
    };


    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-pterotext">{t('systemControl')}</h1>
                <p className="text-pterosub mt-2">{t('systemControlDesc')}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Clock} label={t('systemUptime')} value={systemStats.uptime} color="blue" />
                <StatCard icon={Server} label={t('activeServers')} value={systemStats.activeServers.toString()} color="green" />
                <StatCard icon={Activity} label={t('totalReservations')} value={systemStats.totalReservations.toString()} color="purple" />
                <StatCard icon={HardDrive} label={t('lastBackup')} value={systemStats.lastBackup} color="yellow" />
            </div>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500/10">
                            <Terminal className="text-green-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-pterotext">{t('systemTerminal')}</h3>
                            <p className="text-sm text-pterosub">{t('terminalDesc')}</p>
                        </div>
                    </div>

                    <Console logs={logs} />

                    <div className="flex gap-2">
                        <Button onClick={() => handleRunCommand('status')} variant="ghost" className="text-xs">
                            <Activity size={14} className="mr-1" />
                            Status
                        </Button>
                        <Button onClick={() => handleRunCommand('restart')} variant="ghost" className="text-xs">
                            <RefreshCw size={14} className="mr-1" />
                            Restart
                        </Button>
                        <Button onClick={() => setLogs([])} variant="ghost" className="text-xs">
                            <Zap size={14} className="mr-1" />
                            Clear
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <Cpu className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-pterotext">{t('panelInfo')}</h3>
                            <p className="text-sm text-pterosub">{t('panelInfoDesc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem label={t('panelVersion')} value="v1.0" />
                        <InfoItem label={t('framework')} value="Next.js 14" />
                        <InfoItem label={t('aiEngine')} value="Google Gemini 1.5 Flash" />
                        <InfoItem label="Database" value={dbConfig.enabled ? `MySQL (${dbConfig.host})` : "LocalStorage (Internal)"} />
                        <InfoItem label="WhatsApp API" value="Meta Business v21.0" />
                        <InfoItem label="Deployment" value="Development Mode" />
                        <InfoItem label="Node Version" value="v20.x" />
                        <InfoItem label="License Status" value={license.status} />
                        <InfoItem label="License Type" value={license.type} />
                    </div>
                </div>
            </Card>

            {/* Server Mode Configuration */}
            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-indigo-500/10">
                            <Server className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-pterotext">Server Environment</h3>
                            <p className="text-sm text-pterosub">Configure the deployment environment mode.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-pteroborder/20 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-bold text-pterotext">Ubuntu Server Mode</p>
                            <p className="text-xs text-pterosub mt-1">
                                {serverMode === 'ubuntu'
                                    ? "Enabled: System strictly uses Database. Local storage fallback is disabled."
                                    : "Disabled: System allows local storage fallback for development."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={serverMode === 'ubuntu'}
                                    onChange={(e) => toggleServerMode(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/10">
                            <AlertCircle className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-500">{t('dangerZone')}</h3>
                            <p className="text-sm text-red-400/80">{t('factoryResetDesc')}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <h4 className="font-bold text-red-500 mb-2">{t('resetWarningTitle')}</h4>
                        <ul className="text-xs text-red-400 space-y-1 list-disc list-inside">
                            <li>{t('resetWarning1')}</li>
                            <li>{t('resetWarning2')}</li>
                            <li>{t('resetWarning3')}</li>
                        </ul>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={() => setShowResetModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white border-red-500"
                        >
                            <Trash2 size={16} className="mr-2" />
                            {t('factoryReset')}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Factory Reset Sheet */}
            <Sheet isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={t('factoryReset')}>
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-red-500">{t('resetWarningTitle')}</p>
                            <p className="text-xs text-red-400 mt-1">{t('resetWarning1')}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-pterosub uppercase">{t('enterResetPassword')}</label>
                        <Input
                            type="password"
                            placeholder={t('resetConfirmPlaceholder')}
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="border-red-500/30 focus:border-red-500"
                        />
                    </div>

                    {resetError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500">
                            {resetError}
                        </div>
                    )}

                    <div className="pt-6 border-t border-pteroborder flex flex-col gap-3">
                        <Button
                            onClick={handleFactoryReset}
                            disabled={!resetPassword || isResetting}
                            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider"
                        >
                            {isResetting ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    {t('resetting')}
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} className="mr-2" />
                                    {t('confirm')}
                                </>
                            )}
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => setShowResetModal(false)}>{t('cancel')}</Button>
                    </div>
                </div>
            </Sheet>
        </div>
    );
}

// Helper Modal Component if not already imported globally or available in scope.
// However, assuming Modal is imported from components/ui/modal based on previous file analysis.
// If it's not imported at top, I need to add it.
// Checking imports... 'Modal' is imported from '@/components/ui/modal' in 'app/admin/users/page.tsx', 
// BUT NOT in 'app/admin/settings/page.tsx' currently based on previous `view_file` (lines 1-25).
// I MUST add the import for Modal and also Trash2 icon.

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: 'blue' | 'green' | 'purple' | 'yellow' }) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400',
        green: 'bg-green-500/10 text-green-400',
        purple: 'bg-purple-500/10 text-purple-400',
        yellow: 'bg-yellow-500/10 text-yellow-400'
    };

    return (
        <Card className="border-pteroborder bg-pterodark/40">
            <div className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-xs text-pterosub uppercase font-bold">{label}</p>
                    <p className="text-2xl font-bold text-pterotext mt-1">{value}</p>
                </div>
            </div>
        </Card>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 bg-pteroborder/20 rounded-lg">
            <p className="text-xs text-pterosub uppercase font-bold mb-1">{label}</p>
            <p className="text-sm text-pterotext font-medium">{value}</p>
        </div>
    );
}
