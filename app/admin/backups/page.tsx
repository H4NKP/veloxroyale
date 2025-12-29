'use client';

import { useState, useEffect } from 'react';
import { Card, Button, cn } from '@/components/ui/core';
import {
    Download,
    Trash2,
    Plus,
    Database,
    Clock,
    ShieldCheck,
    AlertCircle,
    Loader2,
    Calendar,
    HardDrive,
    RotateCcw,
    CheckCircle2,
    Upload
} from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { useTranslation } from '@/components/LanguageContext';

interface Backup {
    id: string;
    filename: string;
    size: number;
    createdAt: string;
}

export default function BackupsPage() {
    const { t } = useTranslation();
    const [backups, setBackups] = useState<Backup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [autoBackup, setAutoBackup] = useState(false);
    const [frequency, setFrequency] = useState('daily');
    const [error, setError] = useState<string | null>(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    // Progress States
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            const res = await fetch('/api/backups?adminAccess=true');
            const data = await res.json();
            if (res.ok) {
                setBackups(data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(t('failedToLoadBackups'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setIsCreating(true);
        setError(null);
        setProgress(0);
        setProgressStatus(t('preparingSystemSource'));

        try {
            // 1. Sync Phase
            setProgress(20);
            setProgressStatus(t('syncBrowserData'));
            const localData = {
                veloxai_users: localStorage.getItem('veloxai_users'),
                veloxai_suspended_settings: localStorage.getItem('veloxai_suspended_settings')
            };

            // 2. Transmit & Compress Phase
            setProgress(40);
            setProgressStatus(t('generatingArchive'));

            const res = await fetch('/api/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: localData, userId: 'admin' })
            });

            setProgress(70);
            setProgressStatus(t('finalizingCompression'));

            const data = await res.json();

            if (res.ok) {
                setProgress(100);
                setProgressStatus(t('backupComplete'));
                setBackups([data.backup, ...backups]);

                // Hide progress bar after success
                setTimeout(() => {
                    setIsCreating(false);
                    setProgress(0);
                }, 2000);
            } else {
                setError(data.error);
                setIsCreating(false);
            }
        } catch (err) {
            setError(t('failedToCreateBackup'));
            setIsCreating(false);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm(t('deleteBackupConfirm').replace('${filename}', filename))) return;

        try {
            const res = await fetch(`/api/backups?filename=${filename}&adminAccess=true`, { method: 'DELETE' });
            if (res.ok) {
                setBackups(backups.filter(b => b.filename !== filename));
            } else {
                const data = await res.json();
                setError(data.error);
            }
        } catch (err) {
            setError(t('failedToDeleteBackup'));
        }
    };

    const handleDownload = (filename: string) => {
        window.open(`/api/backups/download?filename=${filename}`, '_blank');
    };

    const handleRestore = async () => {
        if (!selectedBackup) return;
        setIsRestoring(true);
        setError(null);
        try {
            const res = await fetch('/api/backups/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: selectedBackup.filename })
            });
            const data = await res.json();
            if (res.ok) {
                // 1. Re-sync browser data from restored state
                if (data.state) {
                    if (data.state.veloxai_users) localStorage.setItem('veloxai_users', data.state.veloxai_users);
                    if (data.state.veloxai_suspended_settings) localStorage.setItem('veloxai_suspended_settings', data.state.veloxai_suspended_settings);
                }

                alert(t('restoreSuccess'));
                window.location.reload();
            } else {
                setError(data.error);
                setIsRestoreModalOpen(false);
            }
        } catch (err) {
            setError(t('failedToRestoreSystem'));
            setIsRestoreModalOpen(false);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow re-uploading same file if needed
        e.target.value = '';

        setIsCreating(true); // Re-use the loading state or create a separate one
        setError(null);
        setProgress(0);
        setProgressStatus("Uploading backup file...");

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulated upload progress (basic)
            setProgress(30);

            const res = await fetch('/api/backups/upload', {
                method: 'POST',
                body: formData,
            });

            setProgress(80);

            const data = await res.json();

            if (res.ok) {
                setProgress(100);
                setProgressStatus("Upload complete!");
                setBackups([data.backup, ...backups]);

                setTimeout(() => {
                    setIsCreating(false);
                    setProgress(0);
                }, 1500);
            } else {
                setError(data.error);
                setIsCreating(false);
            }

        } catch (err: any) {
            setError("Upload failed: " + err.message);
            setIsCreating(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-pterotext">{t('systemBackups')}</h1>
                    <p className="text-pterosub mt-1">{t('systemBackupsDesc')}</p>
                </div>
                <div className="flex gap-2">
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept=".tar.gz,.json"
                            onChange={handleUpload}
                            className="hidden"
                            disabled={isCreating}
                        />
                        <div className={cn(
                            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
                            "bg-pterocard hover:bg-pteroborder text-pterotext h-10 px-4 py-2 border border-pteroborder"
                        )}>
                            <Upload className="mr-2" size={18} />
                            {t('uploadBackup') || "Upload Backup"}
                        </div>
                    </label>

                    <Button
                        variant="primary"
                        onClick={handleCreateBackup}
                        disabled={isCreating}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="mr-2 animate-spin" size={18} />
                                {t('operationInProgress')}
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2" size={18} />
                                {t('createBackupNow')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Creation Progress Bar */}
            {isCreating && (
                <Card className="border-pteroblue/30 bg-pteroblue/5 animate-in fade-in duration-300">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-pterotext flex items-center gap-2">
                                <Plus size={16} className="text-pteroblue" />
                                {progressStatus}
                            </span>
                            <span className="text-xs font-mono text-pteroblue">{progress}%</span>
                        </div>
                        <div className="h-2 bg-pteroborder rounded-full overflow-hidden">
                            <div
                                className="h-full bg-pteroblue transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats & Automation */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold text-pterotext mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-pteroblue" />
                            {t('autoBackup')}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-pterosub">{t('backupSchedule')}</span>
                                <div
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${autoBackup ? 'bg-pteroblue' : 'bg-pteroborder'}`}
                                    onClick={() => setAutoBackup(!autoBackup)}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoBackup ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            {autoBackup && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-pterosub uppercase">{t('frequency')}</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        className="w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all text-sm"
                                    >
                                        <option value="hourly">{t('everyHour')}</option>
                                        <option value="daily">{t('daily3am')}</option>
                                        <option value="weekly">{t('weeklySun')}</option>
                                    </select>
                                </div>
                            )}

                            <div className="p-3 bg-pteroblue/5 border border-pteroblue/10 rounded-lg">
                                <p className="text-xs text-pterosub leading-relaxed">
                                    <ShieldCheck size={14} className="inline mr-1 text-pteroblue" />
                                    {t('autoBackupInfo')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold text-pterotext mb-4 flex items-center gap-2">
                            <HardDrive size={20} className="text-pteroblue" />
                            {t('storageUsage')}
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-pterosub">
                                    <span>{t('totalBackups')}</span>
                                    <span>{backups.length} {t('archives')}</span>
                                </div>
                                <div className="flex justify-between text-xs text-pterosub">
                                    <span>{t('usedSpace')}</span>
                                    <span>{formatSize(backups.reduce((acc, b) => acc + b.size, 0))}</span>
                                </div>
                            </div>
                            <div className="h-2 bg-pteroborder rounded-full overflow-hidden">
                                <div className="h-full bg-pteroblue" style={{ width: '15%' }} />
                            </div>
                            <p className="text-[10px] text-pterosub text-center italic">
                                {t('availableSpace')}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Backups List */}
                <div className="lg:col-span-2">
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-pteroborder flex items-center justify-between bg-pterocard">
                            <h3 className="text-lg font-semibold text-pterotext flex items-center gap-2">
                                <Database size={20} className="text-pteroblue" />
                                {t('availableBackups')}
                            </h3>
                        </div>

                        {isLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-pterosub gap-4">
                                <Loader2 size={32} className="animate-spin text-pteroblue" />
                                <p className="text-sm">{t('loadingBackupHistory')}</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-pterosub gap-4">
                                <div className="p-4 rounded-full bg-pteroborder/50">
                                    <Database size={48} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-pterotext font-semibold">{t('noBackupsFound')}</p>
                                    <p className="text-sm mt-1">{t('createFirstBackup')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-pterodark/50 text-pterosub text-[10px] uppercase font-bold tracking-wider">
                                            <th className="px-6 py-4">{t('filename')}</th>
                                            <th className="px-6 py-4">{t('creationDate')}</th>
                                            <th className="px-6 py-4">{t('size')}</th>
                                            <th className="px-6 py-4 text-right">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-pteroborder/50">
                                        {backups.map((backup) => (
                                            <tr key={backup.id} className="hover:bg-pterowhite/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-pterotext truncate max-w-[200px]" title={backup.filename}>
                                                            {backup.filename}
                                                        </span>
                                                        <span className="text-[10px] text-pterosub font-mono uppercase">{t('tarGzArchive')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-pterosub text-sm">
                                                        <Calendar size={14} />
                                                        {new Date(backup.createdAt).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-pterosub font-mono">
                                                        {formatSize(backup.size)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDownload(backup.filename)}
                                                            className="p-2 rounded-md hover:bg-pteroblue/10 text-pterosub hover:text-pteroblue transition-colors"
                                                            title={t('downloadToPc')}
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBackup(backup);
                                                                setIsRestoreModalOpen(true);
                                                            }}
                                                            className="p-2 rounded-md hover:bg-pteroblue/10 text-pterosub hover:text-pteroblue transition-colors"
                                                            title={t('restoreBackup')}
                                                        >
                                                            <RotateCcw size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBackup(backup.filename)}
                                                            className="p-2 rounded-md hover:bg-red-500/10 text-pterosub hover:text-red-400 transition-colors"
                                                            title={t('deletePermanently')}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Restore Confirmation Sheet */}
            <Sheet
                isOpen={isRestoreModalOpen}
                onClose={() => {
                    if (!isRestoring) {
                        setIsRestoreModalOpen(false);
                        setSelectedBackup(null);
                        setRestoreConfirmText('');
                    }
                }}
                title={t('rollbackSystem')}
            >
                <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-pteroblue/10 border border-pteroblue/20">
                        <p className="text-sm text-pteroblue font-semibold mb-2">
                            {t('criticalRestoreWarning')}
                        </p>
                        <ul className="text-xs text-pterosub space-y-1 ml-4 list-disc">
                            <li>{t('restoreWarning1')}</li>
                            <li>{t('restoreWarning2')}</li>
                            <li>{t('restoreWarning3')}</li>
                            <li>{t('restoreWarning4')}</li>
                        </ul>
                    </div>

                    <p className="text-sm text-pterotext">
                        {t('targetArchive')}: <span className="font-mono text-pteroblue">{selectedBackup?.filename}</span>
                    </p>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-pterosub uppercase">
                            {t('typeConfirmRestore')}
                        </label>
                        <input
                            type="text"
                            className="w-full bg-pterodark border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                            placeholder={t('confirmRestoreInput')}
                            value={restoreConfirmText}
                            onChange={(e) => setRestoreConfirmText(e.target.value)}
                            disabled={isRestoring}
                        />
                    </div>

                    <div className="pt-6 border-t border-pteroborder flex flex-col gap-3">
                        <Button
                            variant="primary"
                            onClick={handleRestore}
                            disabled={restoreConfirmText !== t('confirmRestoreInput') || isRestoring}
                            className="w-full h-12 text-sm font-bold uppercase tracking-wider"
                        >
                            {isRestoring ? (
                                <>
                                    <Loader2 className="mr-2 animate-spin" size={16} />
                                    {t('restoring')}
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={16} className="mr-2" />
                                    {t('startRestoration')}
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                setIsRestoreModalOpen(false);
                                setSelectedBackup(null);
                                setRestoreConfirmText('');
                            }}
                            disabled={isRestoring}
                        >
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
