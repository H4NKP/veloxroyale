'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import {
    Database,
    CheckCircle2,
    Save,
    Trash2
} from 'lucide-react';
import { Console } from '@/components/ui/console';

export default function AdminDatabasePage() {
    const { t } = useTranslation();
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
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}]: ${msg}`]);
    };

    useEffect(() => {
        // Fetch DB config
        fetch('/api/db/config')
            .then(res => res.json())
            .then(data => {
                if (data.host) {
                    setDbConfig(prev => ({ ...prev, ...data }));
                }
            })
            .catch(err => console.error("Failed to fetch DB config", err));
    }, []);

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

    const handleDisconnect = async () => {
        if (!confirm(t('dbWarning') || "Disconnecting will revert to local storage.")) return;
        // In a real app we'd call an API to clear config, here we just clear state/file likely via API if implemented, 
        // but based on previous implementation it seemed to just rely on the presence of config.
        // For now, let's assume we just clear the enabled flag locally or call config API with empty values if that endpoint supported it.
        // Replicating previous logic which didn't strictly have a "Disconnect" button in the view I saw, but good to have.
        // Actually, I'll stick to the exact previous implementation first.
        // Wait, previous implementation didn't have disconnect button in the viewed snippet, only check for enabled.
        // I will implement basic save logic via Test/Init.
    };

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                        <Database className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-pterotext">{t('thirdPartyDb') || "Database"}</h1>
                        <p className="text-pterosub">{t('thirdPartyDbDesc') || "Configure external database connection."}</p>
                    </div>
                </div>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-pterotext">Connection Details</h3>
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
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                            {dbError}
                        </div>
                    )}

                    <div className="pt-4 flex gap-3 border-t border-pteroborder/50">
                        <Button
                            onClick={handleTestDb}
                            disabled={isTestingDb}
                            variant="secondary"
                            className="w-full md:w-auto"
                        >
                            {isTestingDb ? 'Testing...' : t('testConnection')}
                        </Button>

                        {dbStatus === 'success' && !dbConfig.enabled && (
                            <Button
                                onClick={handleInitDb}
                                disabled={isTestingDb}
                                className="bg-green-500 hover:bg-green-600 text-white w-full md:w-auto"
                            >
                                {t('applyInit')}
                            </Button>
                        )}
                        {dbConfig.enabled && (
                            <Button
                                onClick={() => {
                                    // Placeholder for disconnect, for now just reload to clear state if manual config clear was done
                                    // But since we interpret "Disconnect" as user wanting to stop using it.
                                    // For now, let's keep it consistent with previous code which didn't strictly offer disconnect UI.
                                    // I won't add a disconnect button that does nothing.
                                }}
                                disabled={true}
                                variant="ghost"
                                className="ml-auto text-xs text-pterosub"
                            >
                                Configured
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-pterotext">Connection Logs</h3>
                    <Console logs={logs} className="h-48" />
                </div>
            </Card>
        </div>
    );
}
