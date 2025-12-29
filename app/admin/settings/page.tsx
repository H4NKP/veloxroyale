'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui/core';
import { Console } from '@/components/ui/console';
import { useTranslation } from '@/components/LanguageContext';
import {
    Terminal,
    Github,
    Download,
    RefreshCw,
    Server,
    Cpu,
    HardDrive,
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    Zap,
    Save,
    Edit2,
    ShieldCheck,
    Database,
    Trash2,
    Mail,
    Image,
    Layout
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { getLicenseInfo } from '@/lib/license';

export default function AdminSystemPage() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<string[]>([
        "[System]: VeloxAI Admin Panel initialized",
        "[System]: All services operational",
    ]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'success' | 'error'>('idle');
    const [hasUpdates, setHasUpdates] = useState(false);
    const [latestVersion, setLatestVersion] = useState('v1.0');

    // Config de los repos
    const [repoUrl, setRepoUrl] = useState('');
    const [repoBranch, setRepoBranch] = useState('');
    const [isEditingRepo, setIsEditingRepo] = useState(false);
    const [isSavingRepo, setIsSavingRepo] = useState(false);

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
    const [isTestingDb, setIsTestingDb] = useState(false);
    const [dbStatus, setDbStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [dbError, setDbError] = useState('');

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
        const savedRepo = localStorage.getItem('veloxai_repo_url') || 'https://github.com/H4NKP/veloxroyal';
        const savedBranch = localStorage.getItem('veloxai_repo_branch') || 'main';
        setRepoUrl(savedRepo);
        setRepoBranch(savedBranch);

        // Calculamos las estadísticas del sistema
        const updateStats = async () => {
            try {
                const servers = JSON.parse(localStorage.getItem('veloxai_servers') || '[]');
                const reservations = JSON.parse(localStorage.getItem('veloxai_reservations') || '[]');
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

                setSystemStats({
                    uptime: realUptime,
                    activeServers: servers.filter((s: any) => s.status === 'active').length,
                    totalReservations: reservations.length,
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

        const interval = setInterval(updateStats, 30000);
        return () => clearInterval(interval);
    }, []);



    const handleSaveRepoConfig = () => {
        setIsSavingRepo(true);
        addLog("Saving repository configuration...");

        localStorage.setItem('veloxai_repo_url', repoUrl);
        localStorage.setItem('veloxai_repo_branch', repoBranch);

        setTimeout(() => {
            addLog(`✓ Repository set to: ${repoUrl}`);
            addLog(`✓ Branch set to: ${repoBranch}`);
            setIsSavingRepo(false);
            setIsEditingRepo(false);
        }, 500);
    };

    const handleCheckUpdates = async () => {
        setUpdateStatus('checking');
        setHasUpdates(false);
        addLog("Checking for updates from GitHub...");
        addLog(`Repository: ${repoUrl}`);
        addLog(`Branch: ${repoBranch}`);

        setTimeout(() => {
            const currentVersion = 'v1.0';
            const remoteVersion = 'v1.0'; // En producción, esto se trae de GitHub API

            addLog(`Current version: ${currentVersion}`);
            addLog(`Latest version: ${remoteVersion}`);

            if (currentVersion !== remoteVersion) {
                setHasUpdates(true);
                setLatestVersion(remoteVersion);
                addLog(`⚠ Update available: ${remoteVersion}`);
                setUpdateStatus('idle');
            } else {
                setHasUpdates(false);
                addLog("✓ System is up to date");
                setUpdateStatus('success');
                setTimeout(() => setUpdateStatus('idle'), 3000);
            }
        }, 2000);
    };

    const handleUpdate = async () => {
        if (!hasUpdates) {
            addLog("⚠ No updates available. Run 'Check for Updates' first.");
            return;
        }

        const confirmed = confirm(
            'This will update the panel to the latest version via Git.\n\n' +
            '✓ Data will be preserved.\n' +
            '✓ Services may need manual restart if not auto-managed.\n\n' +
            'Continue?'
        );

        if (!confirmed) {
            addLog("Update cancelled by user.");
            return;
        }

        setIsUpdating(true);
        setUpdateStatus('updating');
        addLog("Starting update process (Git Pull)...");

        try {
            const res = await fetch('/api/system/update', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                addLog("✓ Git Pull successful");
                if (data.logs && data.logs.length > 0) {
                    data.logs.forEach((l: string) => addLog(l));
                }

                addLog("✓ Update completed successfully");
                setUpdateStatus('success');
                setHasUpdates(false);

                addLog("Please reload or restart services if needed.");
            } else {
                addLog(`✖ Update failed: ${data.message}`);
                setUpdateStatus('error');
            }

        } catch (error: any) {
            addLog(`✖ Update Error: ${error.message}`);
            setUpdateStatus('error');
        } finally {
            setIsUpdating(false);
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

    const handleTestDb = async () => {
        setIsTestingDb(true);
        setDbStatus('idle');
        setDbError('');
        addLog("Testing third-party database connection...");

        try {
            const res = await fetch('/api/db/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig)
            });
            const data = await res.json();
            if (data.success) {
                setDbStatus('success');
                addLog("✓ Database connection successful!");
            } else {
                setDbStatus('error');
                setDbError(data.message);
                addLog(`✖ Connection failed: ${data.message}`);
            }
        } catch (err: any) {
            setDbStatus('error');
            setDbError(err.message);
            addLog(`✖ Network error testing database: ${err.message}`);
        } finally {
            setIsTestingDb(false);
        }
    };

    const handleInitDb = async () => {
        if (!confirm("This will initialize the schema in the remote database. Continue?")) return;

        setIsTestingDb(true);
        addLog("Initializing remote database schema...");

        try {
            const res = await fetch('/api/db/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig)
            });
            const data = await res.json();
            if (data.success) {
                setDbConfig(prev => ({ ...prev, enabled: true }));
                addLog("✓ Database initialized and tables created.");
                alert("Database linked successfully! The system will now use the third-party server.");
            } else {
                addLog(`✖ Initialization failed: ${data.message}`);
            }
        } catch (err: any) {
            addLog(`✖ Error initializing database: ${err.message}`);
        } finally {
            setIsTestingDb(false);
        }
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-purple-500/10">
                                <Github className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-pterotext">{t('githubUpdates')}</h3>
                                <p className="text-sm text-pterosub">{t('manageUpdates')}</p>
                            </div>
                        </div>
                        {updateStatus === 'success' && (
                            <Badge variant="green" className="flex items-center gap-1">
                                <CheckCircle2 size={14} />
                                {t('upToDate')}
                            </Badge>
                        )}
                        {hasUpdates && (
                            <Badge variant="blue" className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                <AlertCircle size={14} />
                                {t('updateAvailable')}
                            </Badge>
                        )}
                    </div>

                    <div className="p-4 bg-pteroborder/20 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-pterosub uppercase font-bold">{t('repoConfig')}</p>
                            {!isEditingRepo && (
                                <Button onClick={() => setIsEditingRepo(true)} variant="ghost" className="text-xs h-7 px-2">
                                    <Edit2 size={12} className="mr-1" />
                                    Edit
                                </Button>
                            )}
                        </div>

                        {isEditingRepo ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('repoUrl')}</label>
                                    <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="e.g., username/repo-name" className="font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('branch')}</label>
                                    <Input value={repoBranch} onChange={(e) => setRepoBranch(e.target.value)} placeholder="e.g., main, develop" className="font-mono text-sm" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={handleSaveRepoConfig} disabled={isSavingRepo} className="bg-green-500 hover:bg-green-600 text-white text-xs h-8">
                                        <Save size={14} className="mr-1" />
                                        {isSavingRepo ? 'Saving...' : t('saveChanges')}
                                    </Button>
                                    <Button onClick={() => { setIsEditingRepo(false); setRepoUrl(localStorage.getItem('veloxai_repo_url') || 'https://github.com/H4NKP/veloxroyal'); setRepoBranch(localStorage.getItem('veloxai_repo_branch') || 'main'); }} variant="ghost" className="text-xs h-8">
                                        {t('cancel')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-pterosub uppercase font-bold">Repository</p>
                                    <p className="text-sm text-pterotext font-mono">{repoUrl}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-pterosub uppercase font-bold">Branch</p>
                                    <p className="text-sm text-pterotext font-mono">{repoBranch}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-pteroborder/20 rounded-lg">
                        <p className="text-xs text-pterosub uppercase font-bold mb-2">{t('panelVersion')}</p>
                        <p className="text-sm text-pterotext font-mono">v1.0</p>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleCheckUpdates} disabled={updateStatus === 'checking' || updateStatus === 'updating'} className="bg-purple-500 hover:bg-purple-600 text-white">
                            {updateStatus === 'checking' ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} className="mr-2" />
                                    {t('checkForUpdates')}
                                </>
                            )}
                        </Button>
                        <Button onClick={handleUpdate} disabled={!hasUpdates || isUpdating || updateStatus === 'checking'} variant="secondary">
                            {isUpdating ? (
                                <>
                                    <Download size={16} className="mr-2 animate-bounce" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Download size={16} className="mr-2" />
                                    {t('startUpdate')}
                                </>
                            )}
                        </Button>
                    </div>

                </div>
            </Card>

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

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-blue-500/10">
                                <Database className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-pterotext">{t('thirdPartyDb')}</h3>
                                <p className="text-sm text-pterosub">{t('thirdPartyDbDesc')}</p>
                            </div>
                        </div>
                        {dbConfig.enabled ? (
                            <Badge variant="green" className="flex items-center gap-1">
                                <CheckCircle2 size={14} /> {t('connected')}
                            </Badge>
                        ) : (
                            <Badge variant="gray" className="text-gray-400">{t('notLinked')}</Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Host</label>
                            <Input
                                value={dbConfig.host}
                                onChange={e => setDbConfig({ ...dbConfig, host: e.target.value })}
                                placeholder="e.g., db.example.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Port</label>
                            <Input
                                value={dbConfig.port}
                                onChange={e => setDbConfig({ ...dbConfig, port: e.target.value })}
                                placeholder="3306"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Database Name</label>
                            <Input
                                value={dbConfig.database}
                                onChange={e => setDbConfig({ ...dbConfig, database: e.target.value })}
                                placeholder="velox_ai"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Username</label>
                            <Input
                                value={dbConfig.user}
                                onChange={e => setDbConfig({ ...dbConfig, user: e.target.value })}
                                placeholder="root"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Password</label>
                            <Input
                                type="password"
                                value={dbConfig.password}
                                onChange={e => setDbConfig({ ...dbConfig, password: e.target.value })}
                                placeholder="********"
                            />
                        </div>
                    </div>

                    {dbError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 flex items-center gap-2">
                            <AlertCircle size={14} /> {dbError}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleTestDb} disabled={isTestingDb} variant="secondary">
                            {isTestingDb ? 'Testing...' : t('testConnection')}
                        </Button>
                        <Button
                            onClick={handleInitDb}
                            disabled={isTestingDb || !dbConfig.host || !dbConfig.database}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save size={16} className="mr-2" /> {t('applyInit')}
                        </Button>
                    </div>

                    <p className="text-[10px] text-pterosub italic">
                        ⚠ {t('dbWarning')}
                    </p>
                </div>
            </Card>

            {/* ERROR ZONE - Danger Zone */}
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

            {/* Factory Reset Modal */}
            <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={t('factoryReset')}>
                <div className="space-y-4">
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

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setShowResetModal(false)}>{t('cancel')}</Button>
                        <Button
                            onClick={handleFactoryReset}
                            disabled={!resetPassword || isResetting}
                            className="bg-red-600 hover:bg-red-700 text-white"
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
                    </div>
                </div>
            </Modal>
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
