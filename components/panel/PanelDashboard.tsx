'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Console } from '@/components/ui/console';
import { ReservationTable } from '@/components/panel/ReservationTable';
import { Card, Button, Badge, cn } from '@/components/ui/core';
import {
    Power, RotateCcw, MonitorStop, Activity, RefreshCcw, Shield, ShieldOff, Key,
    MessageSquare, LayoutDashboard, Calendar, MessageCircle, Clock, Download,
    Upload, FileJson, Store, ChevronRight, Eye, EyeOff, Save, LogOut, Settings, Users, Database
} from 'lucide-react';
import { getAllServers, getServersByUserId, updateServer, type Server } from '@/lib/servers';
import { triggerSync } from '@/lib/sync';
import { validateGeminiKey, validateWhatsAppKey, validateWhatsAppCredentials } from '@/lib/ai';
import { getUserById, type User } from '@/lib/auth';
import { getReservationsByServerId } from '@/lib/reservations';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/components/LanguageContext';

const SubUserManagement = dynamic(
    () => import('@/components/panel/SubUserManagement').then(m => m.SubUserManagement),
    { ssr: false }
);

interface PanelDashboardProps {
    defaultUserId?: number;
    showReturnToAdmin?: boolean;
}

function DashboardContent({ defaultUserId = 2, showReturnToAdmin = false }: PanelDashboardProps) {
    const { t } = useTranslation();
    // State for multiple servers logic
    const [userServers, setUserServers] = useState<Server[]>([]);
    const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

    const searchParams = useSearchParams();
    const router = useRouter();

    // Initialize tab from URL or default to 'system'
    // Initialize tab from URL, LocalStorage, or default to 'system'
    const tabParam = searchParams.get('tab');

    // We use a lazy initializer for state to access localStorage only on mount
    const [activeTab, setActiveTab] = useState<'system' | 'reservations' | 'backups' | 'sub-users'>(() => {
        if (typeof window === 'undefined') return 'system';
        return (localStorage.getItem('velox_active_tab') as any) || 'system';
    });

    // Persist active tab changes
    useEffect(() => {
        if (activeTab) {
            localStorage.setItem('velox_active_tab', activeTab);
        }
    }, [activeTab]);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [server, setServer] = useState<Server | null>(null);
    const [logs, setLogs] = useState<string[]>([
        "[System]: Initializing VeloxAI Neural Engine v2.1...",
        "[System]: Connected to WhatsApp Gateway (PID: 8821)",
        "[Worker]: Listening for incoming reservation requests...",
    ]);
    const [loading, setLoading] = useState(true);

    // URL Params for Deep Linking

    const userIdParam = searchParams.get('userId');
    const activeUserId = userIdParam ? Number(userIdParam) : defaultUserId;
    const fromAdmin = searchParams.get('fromAdmin') === 'true' || showReturnToAdmin;

    // Configuration States
    const [openaiKey, setOpenaiKey] = useState('');
    const [whatsappToken, setWhatsappToken] = useState('');
    const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
    const [whatsappClientId, setWhatsappClientId] = useState('');
    const [whatsappClientSecret, setWhatsappClientSecret] = useState('');

    const [showKeys, setShowKeys] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({
        pendingReplies: 0,
        successfulReservations: 0,
        aiConfidence: 0
    });


    // Helper for centralized permission logic
    const hasPermission = (perm: string) => {
        if (!server || !currentUser) return false;

        // Admins and Owners have full access to all tabs
        if (currentUser.role === 'admin' || server.userId === currentUser.id) {
            return true;
        }

        // Check sub-user permissions
        const subUser = server.subUsers?.find(su => su.userId === currentUser.id);
        return subUser?.permissions?.includes(perm) ?? false;
    };

    // ... addLog ...
    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}]: ${msg}`]);
        if (msg.includes("RESERVATION_QUERY")) {
            setStats(prev => ({ ...prev, pendingReplies: prev.pendingReplies + 1, aiConfidence: 98.5 }));
        }
        if (msg.includes("Reply sent")) {
            setStats(prev => ({
                ...prev,
                pendingReplies: Math.max(0, prev.pendingReplies - 1),
                successfulReservations: prev.successfulReservations + 1
            }));
        }
    };

    const loadServerData = async (targetServer: Server) => {
        setServer(targetServer);
        setOpenaiKey(targetServer.aiApiKey || '');
        setWhatsappToken(targetServer.whatsappApiToken || '');
        setWhatsappBusinessId(targetServer.whatsappBusinessId || '');
        setWhatsappClientId(targetServer.whatsappClientId || '');
        setWhatsappClientSecret(targetServer.whatsappClientSecret || '');

        // Check power status logic
        if (targetServer.status === 'suspended' && targetServer.powerStatus !== 'offline') {
            await updateServer(targetServer.id, { powerStatus: 'offline' });
            addLog("CRITICAL: Service has been suspended by administrator.");
            addLog("Forcing all AI processes to halt...");
        }
    };

    const fetchServers = async () => {
        // Load current user data
        const user = await getUserById(activeUserId);
        setCurrentUser(user);

        let myServers: Server[] = [];
        if (user?.role === 'admin') {
            myServers = await getAllServers();
        } else {
            myServers = await getServersByUserId(activeUserId);
        }
        setUserServers(myServers);

        if (myServers.length > 0) {
            // Check URL param first
            const paramId = searchParams.get('serverId');
            const target = paramId ? myServers.find(s => s.id === Number(paramId)) : null;

            if (target) {
                // If we found a target from URL, use it
                if (server?.id !== target.id) loadServerData(target);
            } else if (!server || !myServers.find(s => s.id === server.id)) {
                // Default to first if none selected
                loadServerData(myServers[0]);
            } else {
                // Refresh current server data (e.g. status updates)
                const fresh = myServers.find(s => s.id === server.id);
                if (fresh) loadServerData(fresh);
            }
        } else {
            console.warn("[Panel Debug] fetchServers returned 0 servers. Keeping existing state if present.");
            if (!server) setServer(null);
        }

        // Update real stats
        if (server) {
            // ... (keep existing stats logic)
            const reservations = await getReservationsByServerId(server.id, activeUserId);
            setStats({
                pendingReplies: reservations.filter(r => r.status === 'pending').length,
                successfulReservations: reservations.filter(r => r.status === 'confirmed').length,
                aiConfidence: 98.5
            });
        }
    };





    useEffect(() => {
        fetchServers();

        const interval = setInterval(() => {
            fetchServers();
        }, 15000);

        return () => clearInterval(interval);
    }, [activeUserId, searchParams, server?.id]);



    const handleSwitchServer = (s: Server) => {
        loadServerData(s);
        setViewMode('dashboard');
        addLog(`Switched control context to: ${s.name}`);
        // Update URL to reflect the new server context while preserving userId
        router.push(`/panel?serverId=${s.id}&userId=${activeUserId}${fromAdmin ? '&fromAdmin=true' : ''}`);
    };

    const handleResetStats = () => {
        setStats({ pendingReplies: 0, successfulReservations: 0, aiConfidence: 0 });
        addLog("Statistics have been reset.");
    };

    const handlePowerAction = async (action: 'running' | 'offline' | 'restarting') => {
        if (!server) return;
        await updateServer(server.id, { powerStatus: action });
        await triggerSync();
        fetchServers();

        if (action === 'running') {
            addLog("System starting up...");
            addLog("AI Reservation Agent is now ONLINE.");
        } else if (action === 'offline') {
            addLog("Shutting down AI processes...");
            addLog("System is now OFFLINE.");
        } else if (action === 'restarting') {
            addLog("Initiating system restart...");
            setTimeout(() => {
                updateServer(server.id, { powerStatus: 'running' });
                fetchServers();
                addLog("System reboot successful. AI Agent is back ONLINE.");
            }, 2000);
        }
    };

    const handleSaveConfig = async () => {
        if (!server) return;
        setIsSaving(true);
        addLog("Starting Configuration Validation...");

        let currentOpenaiKey = openaiKey;
        let currentWhatsappToken = whatsappToken;
        let currentClientId = whatsappClientId;
        let currentClientSecret = whatsappClientSecret;
        let warnings: string[] = [];

        // 1. Validate Gemini
        if (currentOpenaiKey && currentOpenaiKey !== 'mock_ai_key_123') {
            addLog("Validating Gemini API Key...");
            const isGeminiValid = await validateGeminiKey(currentOpenaiKey);
            if (!isGeminiValid) {
                addLog("ERROR: Gemini API Key is invalid.");
                currentOpenaiKey = '';
                setOpenaiKey('');
                warnings.push("Gemini API Key");
            } else {
                addLog("Gemini API Key: Valid");
            }
        }

        // 2. Validate WhatsApp Token
        if (currentWhatsappToken) {
            addLog("Validating WhatsApp Token...");
            const isWhatsappValid = await validateWhatsAppKey(currentWhatsappToken);
            if (!isWhatsappValid) {
                addLog("ERROR: WhatsApp Token is invalid.");
                currentWhatsappToken = '';
                setWhatsappToken('');
                warnings.push("WhatsApp Access Token");
            } else {
                addLog("WhatsApp Token: Valid");
            }
        }

        // 3. Validate WhatsApp Client Credentials
        if (currentClientId && currentClientSecret) {
            addLog("Validating WhatsApp App Credentials...");
            const areCredsValid = await validateWhatsAppCredentials(currentClientId, currentClientSecret);
            if (!areCredsValid) {
                addLog("ERROR: WhatsApp Client Credentials are invalid.");
                currentClientId = '';
                currentClientSecret = '';
                setWhatsappClientId('');
                setWhatsappClientSecret('');
                warnings.push("WhatsApp App Credentials (ID/Secret)");
            } else {
                addLog("WhatsApp App Credentials: Valid");
            }
        }

        // 4. Save whatever is valid (or cleared)
        await updateServer(server.id, {
            aiApiKey: currentOpenaiKey,
            whatsappApiToken: currentWhatsappToken,
            whatsappBusinessId: whatsappBusinessId,
            whatsappClientId: currentClientId,
            whatsappClientSecret: currentClientSecret
        });
        await triggerSync();

        // 5. Feedback to User
        if (warnings.length > 0) {
            const warningMsg = `Validation Alert:\nThe following connections were invalid and have been removed:\n\n• ${warnings.join('\n• ')}\n\nValid configurations have been saved.`;
            alert(warningMsg);
            addLog(`Partial Save: Configurations for [${warnings.join(', ')}] were removed.`);
        } else {
            addLog("All configurations validated and saved successfully.");
        }

        setTimeout(() => setIsSaving(false), 800);
    };

    useEffect(() => {
        if (!server || server.powerStatus !== 'running') return;
        const messages = [
            "[Incoming]: New message from customer...",
            "[AI]: Analyzing intent: 'Tengo una reserva para mañana'",
            "[Intent]: RESERVATION_QUERY (Confidence: 0.99)",
            "[Action]: Fetching database records...",
            "[AI]: Replying: 'Sí, tienes mesa para 4 a las 20:30. ¿Necesitas cambiar algo?'",
            "[Outgoing]: Reply sent.",
        ];
        let i = 0;
        const interval = setInterval(() => {
            if (i < messages.length && server.powerStatus === 'running') {
                setLogs(prev => [...prev, messages[i]]);
                i++;
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [server?.powerStatus, server?.id]);

    // Backup Logic
    const handleCreateBackup = () => {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            servers: localStorage.getItem('veloxai_servers'),
            reservations: localStorage.getItem('veloxai_reservations')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `velox_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog("Backup created and downloaded successfully.");
    };

    const processRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!json.servers || !json.reservations) {
                    alert('Invalid backup file. Missing critical data.');
                    return;
                }

                if (confirm('WARNING: Restoring a backup will OVERWRITE all current data. This cannot be undone. Are you sure?')) {
                    localStorage.setItem('veloxai_servers', json.servers);
                    localStorage.setItem('veloxai_reservations', json.reservations);
                    alert('Restore successful! The page will now reload.');
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse backup file.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="overflow-hidden">
            {fromAdmin && (
                <div className="mb-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <Link href="/admin">
                        <Button variant="secondary" className="text-xs h-8 px-3 border-pteroborder/50 hover:bg-pteroborder">
                            🔧 Return to Admin
                        </Button>
                    </Link>
                    <Badge variant="blue" className="text-[10px] uppercase font-bold px-2 py-0.5 opacity-50">
                        Monitoring Session: User {activeUserId}
                    </Badge>
                </div>
            )}

            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-pterotext">{server?.name || 'AI Reservation System'}</h1>
                        {userServers.length > 1 && (
                            <button
                                onClick={() => setViewMode(viewMode === 'list' ? 'dashboard' : 'list')}
                                className="p-1 text-pterosub hover:text-pterotext hover:bg-pteroborder rounded transition-colors"
                            >
                                <ChevronRight size={20} className={cn("transition-transform", viewMode === 'list' ? "rotate-90" : "rotate-0")} />
                            </button>
                        )}
                    </div>
                    <p className="text-pterosub text-sm mt-1 flex items-center gap-2">
                        <span className={cn(
                            "text-xs font-bold uppercase",
                            server?.status === 'suspended' ? "text-red-600" :
                                server?.powerStatus === 'running' ? "text-green-500" :
                                    server?.powerStatus === 'restarting' ? "text-yellow-500" : "text-red-500"
                        )}>
                            {server?.status === 'suspended' ? "SUSPENDED" : (server?.powerStatus || 'offline')}
                        </span>
                        {server?.status === 'suspended' && (
                            <Badge variant="red" className="ml-2 py-0 h-5">Action Required</Badge>
                        )}
                    </p>
                </div>

                {/* Submodule Tabs */}
                {viewMode === 'dashboard' && currentUser && server && (
                    <div className="flex bg-pterodark border border-pteroborder p-1 rounded-lg">
                        {hasPermission('system') && (
                            <button
                                onClick={() => {
                                    setActiveTab('system');
                                    router.push(`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: 'system' }).toString()}`);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    activeTab === 'system'
                                        ? "bg-pteroblue text-white shadow-lg shadow-pteroblue/20"
                                        : "text-pterosub hover:text-pterotext"
                                )}
                            >
                                <LayoutDashboard size={14} /> {t('system')}
                            </button>
                        )}
                        {hasPermission('reservations') && (
                            <button
                                onClick={() => {
                                    setActiveTab('reservations');
                                    router.push(`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: 'reservations' }).toString()}`);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    activeTab === 'reservations'
                                        ? "bg-pteroblue text-white shadow-lg shadow-pteroblue/20"
                                        : "text-pterosub hover:text-pterotext"
                                )}
                            >
                                <Calendar size={14} /> {t('reservations')}
                            </button>
                        )}
                        {hasPermission('sub-users') && (
                            <button
                                onClick={() => {
                                    setActiveTab('sub-users');
                                    router.push(`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: 'sub-users' }).toString()}`);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    activeTab === 'sub-users'
                                        ? "bg-pteroblue text-white shadow-lg shadow-pteroblue/20"
                                        : "text-pterosub hover:text-pterotext"
                                )}
                            >
                                <Users size={14} /> {t('subUsers')}
                            </button>
                        )}
                        {hasPermission('backups') && (
                            <button
                                onClick={() => {
                                    setActiveTab('backups');
                                    router.push(`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: 'backups' }).toString()}`);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    activeTab === 'backups'
                                        ? "bg-pteroblue text-white shadow-lg shadow-pteroblue/20"
                                        : "text-pterosub hover:text-pterotext"
                                )}
                            >
                                <Database size={14} /> {t('backups')}
                            </button>
                        )}
                    </div>
                )}
            </header>

            {server && currentUser?.id !== server.userId && (
                <div className="mb-6 p-3 rounded-lg bg-pteroblue/10 border border-pteroblue/20 flex items-center gap-3 text-pteroblue animate-in fade-in slide-in-from-top-4 duration-500">
                    <Shield size={18} className="shrink-0" />
                    <p className="text-sm font-medium">Logged in with Sub-User access — Permissions managed by the Restaurant Owner.</p>
                </div>
            )}

            <div className="space-y-6">
                {/* List Mode View */}
                {viewMode === 'list' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-lg font-semibold text-pterotext mb-4">My Restaurants</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userServers.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSwitchServer(s)}
                                    className={cn(
                                        "p-6 rounded-lg bg-pterodark border border-pteroborder hover:border-pteroblue/50 cursor-pointer transition-all flex items-start gap-4 group",
                                        server?.id === s.id ? "border-pteroblue bg-pteroblue/5 ring-1 ring-pteroblue/20" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-lg",
                                        s.powerStatus === 'running' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                        <Store size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-pterotext group-hover:text-pteroblue transition-colors">{s.name}</h4>
                                            {s.userId !== currentUser?.id && (
                                                <Badge variant="blue" className="text-[8px] py-0 px-1">SUB-USER</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", s.powerStatus === 'running' ? "bg-green-500" : "bg-red-500")} />
                                            <span className="text-xs text-pterosub uppercase font-bold">{s.powerStatus}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-pterosub group-hover:text-pteroblue opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dashboard Mode (Existing Modules) */}
                {viewMode === 'dashboard' && (
                    <>
                        {/* System Module */}
                        {activeTab === 'system' && (
                            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                                {server?.status === 'suspended' && (
                                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-4">
                                        <div className="bg-red-500 p-2 rounded-full text-white">
                                            <ShieldOff size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-pterotext font-bold">Service Temporarily Suspended</h4>
                                            <p className="text-pterosub text-sm">Your AI Agent has been disabled by the system administrator.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mb-4">
                                    <Button
                                        variant="primary"
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-30"
                                        onClick={() => handlePowerAction('running')}
                                        disabled={server?.powerStatus === 'running' || server?.powerStatus === 'restarting' || server?.status === 'suspended' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                    >
                                        <Power size={16} className="mr-2 inline" /> Start
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handlePowerAction('restarting')}
                                        disabled={server?.powerStatus === 'offline' || server?.powerStatus === 'restarting' || server?.status === 'suspended' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                    >
                                        <RotateCcw size={16} className="mr-2 inline" /> Restart
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handlePowerAction('offline')}
                                        disabled={server?.powerStatus === 'offline' || server?.powerStatus === 'restarting' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                    >
                                        <MonitorStop size={16} className="mr-2 inline" /> Stop
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-6">
                                        <Console logs={logs} />
                                        <Card className="border-pteroblue/20 bg-pteroblue/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-pterotext font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                                                    <Key size={16} className="text-pteroblue" /> Gemini & WhatsApp Configuration
                                                </h3>
                                                <Button variant="ghost" className="h-8 px-2" onClick={() => setShowKeys(!showKeys)}>
                                                    {showKeys ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                                                    {showKeys ? 'Hide' : 'Show'}
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-pterosub uppercase flex items-center gap-1">
                                                        <Activity size={10} /> Gemini API Key
                                                    </label>
                                                    <input
                                                        type={showKeys ? "text" : "password"}
                                                        value={openaiKey}
                                                        onChange={e => setOpenaiKey(e.target.value)}
                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                                        placeholder="..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-pterosub uppercase flex items-center gap-1">
                                                        <MessageSquare size={10} /> Access Token (Permanent)
                                                    </label>
                                                    <input
                                                        type={showKeys ? "text" : "password"}
                                                        value={whatsappToken}
                                                        onChange={e => setWhatsappToken(e.target.value)}
                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                                        placeholder="EAAV..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-pterosub uppercase flex items-center gap-1">
                                                        <Activity size={10} /> Business Account ID
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={whatsappBusinessId}
                                                        onChange={e => setWhatsappBusinessId(e.target.value)}
                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                                        placeholder="ID from Meta Dashboard..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-pteroborder/50">
                                                <h4 className="text-[10px] font-bold text-pterosub uppercase mb-4 flex items-center gap-1">
                                                    <Shield size={10} /> WhatsApp Developer Credentials
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-pterosub uppercase">Client ID</label>
                                                        <input
                                                            type={showKeys ? "text" : "password"}
                                                            value={whatsappClientId}
                                                            onChange={e => setWhatsappClientId(e.target.value)}
                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                                            placeholder="Enter Client ID..."
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-pterosub uppercase">Client Secret</label>
                                                        <input
                                                            type={showKeys ? "text" : "password"}
                                                            value={whatsappClientSecret}
                                                            onChange={e => setWhatsappClientSecret(e.target.value)}
                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                                            placeholder="Enter Client Secret..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-pteroborder/50 flex justify-end">
                                                <Button
                                                    onClick={handleSaveConfig}
                                                    disabled={isSaving || !server || (server.subUsers?.find(su => su.userId === currentUser?.id) && !server.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                                >
                                                    <Save size={14} className="mr-2" /> {isSaving ? 'Validating...' : 'Save Configuration'}
                                                </Button>
                                            </div>
                                        </Card>

                                        <Card className="border-pteroborder bg-pterodark/50">
                                            <h3 className="text-sm font-semibold text-pterotext uppercase tracking-wide mb-4 flex items-center gap-2">
                                                <Clock size={16} className="text-pteroblue" /> Restaurant Operation Settings
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Max Seats Per Day</label>
                                                    <input
                                                        type="number"
                                                        value={server?.config?.maxSeats || 50}
                                                        onChange={e => {
                                                            if (!server) return;
                                                            const newConfig = {
                                                                ...(server.config || { openTime: '10:00', closeTime: '22:00', openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }),
                                                                maxSeats: parseInt(e.target.value)
                                                            };
                                                            updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                            setServer({ ...server, config: newConfig });
                                                        }}
                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Open Time</label>
                                                        <input
                                                            type="time"
                                                            value={server?.config?.openTime || '10:00'}
                                                            onChange={e => {
                                                                if (!server) return;
                                                                const newConfig = {
                                                                    ...(server.config || { maxSeats: 50, closeTime: '22:00', openDays: [] }),
                                                                    openTime: e.target.value
                                                                };
                                                                updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                setServer({ ...server, config: newConfig });
                                                            }}
                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={server?.config?.closeTime || '22:00'}
                                                            onChange={e => {
                                                                if (!server) return;
                                                                const newConfig = {
                                                                    ...(server.config || { maxSeats: 50, openTime: '10:00', openDays: [] }),
                                                                    closeTime: e.target.value
                                                                };
                                                                updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                setServer({ ...server, config: newConfig });
                                                            }}
                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Open Days</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                                            <button
                                                                key={day}
                                                                onClick={() => {
                                                                    if (!server) return;
                                                                    const currentDays = server.config?.openDays || [];
                                                                    const newDays = currentDays.includes(day)
                                                                        ? currentDays.filter(d => d !== day)
                                                                        : [...currentDays, day];

                                                                    const newConfig = {
                                                                        ...(server.config || { maxSeats: 50, openTime: '10:00', closeTime: '22:00' }),
                                                                        openDays: newDays
                                                                    };
                                                                    updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                    setServer({ ...server, config: newConfig });
                                                                }}
                                                                className={cn(
                                                                    "px-2 py-1 text-xs rounded border transition-all",
                                                                    server?.config?.openDays?.includes(day)
                                                                        ? "bg-pteroblue text-white border-pteroblue"
                                                                        : "bg-pterodark text-pterosub border-pteroborder hover:border-pteroblue/50"
                                                                )}
                                                            >
                                                                {day.slice(0, 3)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="space-y-6">
                                        <Card>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-pterotext font-semibold text-sm uppercase tracking-wide">Stats</h3>
                                                <Button variant="ghost" className="h-7 w-7 p-0 text-pterosub hover:text-red-400" onClick={handleResetStats}>
                                                    <RefreshCcw size={14} />
                                                </Button>
                                            </div>
                                            <ul className="space-y-3">
                                                <li className="flex justify-between text-sm">
                                                    <span className="text-pterosub">Replies</span>
                                                    <span className="text-pterotext font-medium">{stats.pendingReplies}</span>
                                                </li>
                                                <li className="flex justify-between text-sm">
                                                    <span className="text-pterosub">Success</span>
                                                    <span className="text-green-400 font-medium">{stats.successfulReservations}</span>
                                                </li>
                                            </ul>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reservations Module */}
                        {activeTab === 'reservations' && server && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <ReservationTable userId={activeUserId} serverId={server.id} />
                            </div>
                        )}

                        {/* Sub-Users Module */}
                        {activeTab === 'sub-users' && server && hasPermission('sub-users') && (
                            <SubUserManagement
                                server={server}
                                onUpdateServer={setServer}
                                onLogAction={addLog}
                            />
                        )}

                        {/* Backup Module */}
                        {activeTab === 'backups' && (
                            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                                <Card className="border-pteroblue/20 bg-pterodark/40">
                                    <h3 className="text-lg font-semibold text-pterotext mb-2 flex items-center gap-2">
                                        <FileJson className="text-pteroblue" /> System Backups
                                    </h3>
                                    <p className="text-pterosub text-sm mb-6">
                                        Manage your system data. Creating a backup exports your Servers, Configurations, and Reservations database to a secure JSON file.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Export Section */}
                                        <div className="p-6 rounded-lg bg-pterodark border border-pteroborder hover:border-pteroblue/30 transition-all flex flex-col items-center text-center space-y-4">
                                            <div className="bg-pteroblue/10 p-4 rounded-full text-pteroblue">
                                                <Download size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-pterotext">Export Data</h4>
                                                <p className="text-xs text-pterosub mt-1">Download a full snapshot of your current system state.</p>
                                            </div>
                                            <Button onClick={handleCreateBackup} className="w-full bg-pteroblue hover:bg-pteroblue/80 text-white">
                                                Create Backup
                                            </Button>
                                        </div>

                                        {/* Import Section */}
                                        <div className="p-6 rounded-lg bg-pterodark border border-pteroborder hover:border-red-400/30 transition-all flex flex-col items-center text-center space-y-4">
                                            <div className="bg-red-500/10 p-4 rounded-full text-red-500">
                                                <Upload size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-pterotext">Restore Data</h4>
                                                <p className="text-xs text-pterosub mt-1">Overwrite current system with a previous backup file.</p>
                                            </div>
                                            <div className="relative w-full">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={processRestore}
                                                    className="hidden"
                                                    id="backup-upload"
                                                />
                                                <label htmlFor="backup-upload">
                                                    <div className="w-full h-9 px-4 py-2 bg-pterocard border border-pteroborder hover:bg-pteroborder rounded-md text-sm font-medium text-pterotext cursor-pointer flex items-center justify-center transition-colors">
                                                        Select Backup File
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3">
                                    <Shield className="text-yellow-500 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-yellow-500 font-bold text-sm uppercase">Security Note</h4>
                                        <p className="text-pterosub text-xs mt-1">
                                            Backups contain sensitive API keys and customer data. Store them securely.
                                            Restoring a backup will <strong>permanently replace</strong> all current data.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function PanelDashboard(props: PanelDashboardProps) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-pterosub">Loading dashboard context...</div>}>
            <DashboardContent {...props} />
        </Suspense>
    );
}
