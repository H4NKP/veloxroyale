'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Console } from '@/components/ui/console';
import { ReservationTable } from '@/components/panel/ReservationTable';
import { Card, Button, Badge, cn } from '@/components/ui/core';
import {
    Power, PowerOff, RotateCcw, MonitorStop, Activity, RefreshCcw, Shield, ShieldOff, Key,
    MessageSquare, LayoutDashboard, Calendar, MessageCircle, Clock, Download,
    Upload, FileJson, Store, ChevronRight, Eye, EyeOff, Save, LogOut, Settings, Users, Database,
    CheckCircle2, AlertCircle, AlertTriangle
} from 'lucide-react';
import { getAllServers, getServersByUserId, updateServer, type Server } from '@/lib/servers';
import { triggerSync } from '@/lib/sync';
import { validateGeminiKey, validateWhatsAppKey, validateWhatsAppCredentials } from '@/lib/ai';
import { getUserById, type User } from '@/lib/auth';
import { getReservationsByServerId } from '@/lib/reservations';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/components/LanguageContext';
import { useSession } from '@/hooks/useSession';
import { isExpired, getDaysRemaining } from '@/lib/timezone';

const SubUserManagement = dynamic(
    () => import('@/components/panel/SubUserManagement').then(m => m.SubUserManagement),
    { ssr: false }
);

import { ArchivedReservations } from '@/components/panel/ArchivedReservations';

interface PanelDashboardProps {
    defaultUserId?: number;
    showReturnToAdmin?: boolean;
}

function DashboardContent({ defaultUserId = 2, showReturnToAdmin = false }: PanelDashboardProps) {
    const { t } = useTranslation();
    const { user: sessionUser } = useSession();
    // State for multiple servers logic
    const [userServers, setUserServers] = useState<Server[]>([]);
    const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

    const searchParams = useSearchParams();
    const router = useRouter();

    // Initialize tab from URL or default to 'system'
    // Initialize tab from URL, LocalStorage, or default to 'system'
    // Initialize tab from URL, LocalStorage, or default to 'system'
    // Initialize tab from URL, LocalStorage, or default to 'system'
    const tabParam = searchParams.get('tab') as any;
    const [activeTab, setActiveTabInternal] = useState<'system' | 'reservations' | 'backups' | 'sub-users' | 'archive'>('system');

    // Sync activeTab with URL param if it changes

    // Sync activeTab with URL param if it changes
    useEffect(() => {
        if (tabParam) {
            setActiveTabInternal(tabParam);
        } else if (searchParams.get('serverId')) {
            // If no tab in URL, check localStorage or default to system
            const stored = typeof window !== 'undefined' ? localStorage.getItem('velox_active_tab') : null;
            if (stored && ['system', 'reservations', 'backups', 'sub-users'].includes(stored)) {
                setActiveTabInternal(stored as any);
            } else {
                setActiveTabInternal('system');
            }
        }
    }, [tabParam, searchParams]);

    const setActiveTab = (tab: typeof activeTab) => {
        setActiveTabInternal(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('velox_active_tab', tab);
        }
        // Update URL to persist tab state
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/panel?${params.toString()}`);
    };


    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [server, setServer] = useState<Server | null>(null);
    const [logs, setLogs] = useState<string[]>([
        // Initial simulated logs for the console
        "[System]: Initializing VeloxAI Neural Engine v2.1...",
        "[System]: Connected to WhatsApp Gateway (PID: 8821)",
        "[Worker]: Listening for incoming reservation requests...",
    ]);
    const [loading, setLoading] = useState(true);

    // URL Params for Deep Linking

    // URL Params for Deep Linking
    const userIdParam = searchParams.get('userId');

    // Determine secure active user ID
    let activeUserId = defaultUserId;
    if (sessionUser) {
        if (sessionUser.role === 'admin') {
            // Admin can impersonate via param, otherwise defaults to themselves (or 2 if fallback needed)
            activeUserId = userIdParam ? Number(userIdParam) : sessionUser.id;
        } else {
            // Customers MUST use their own ID
            activeUserId = sessionUser.id;
        }
    }

    const fromAdmin = searchParams.get('fromAdmin') === 'true' || showReturnToAdmin;

    // Configuration States
    const [openaiKey, setOpenaiKey] = useState('');
    const [whatsappToken, setWhatsappToken] = useState('');
    const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
    const [whatsappClientId, setWhatsappClientId] = useState('');
    const [whatsappClientSecret, setWhatsappClientSecret] = useState('');
    const [aiLanguage, setAiLanguage] = useState<'es' | 'en' | 'both'>('es');

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

    // Centralized Status Logic
    const isSuspendedStatus = server?.status === 'suspended';
    const isExpiredStatus = !!(server?.validUntil && isExpired(server.validUntil));
    const isLocked = isSuspendedStatus || isExpiredStatus;

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
        setAiLanguage(targetServer.config?.aiLanguage || 'es');

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
                // Specific server requested in URL
                // Only load if different to avoid overwriting state during polling
                if (server?.id !== target.id) {
                    loadServerData(target);
                }
            } else {
                // No server ID in URL -> ALWAYS show selection grid
                // This satisfies the request to "show all servers" when navigating to dashboard
                if (server) setServer(null);
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
        if (!sessionUser) return;
        fetchServers();

        // Listen for global sync events (e.g., from Reservations table)
        const handleSync = () => {
            console.log("[Panel Sync] Sync event received, refreshing data...");
            fetchServers();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('veloxai_sync', handleSync);
        }

        const interval = setInterval(() => {
            fetchServers();
        }, 15000);

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('veloxai_sync', handleSync);
            }
        };
    }, [activeUserId, searchParams, server?.id, sessionUser]);



    const handleSwitchServer = (s: Server) => {
        loadServerData(s);
        setViewMode('dashboard');
        addLog(`Switched control context to: ${s.name}`);
        // Update URL to include serverId and default tab, preserving other params
        const params = new URLSearchParams(searchParams.toString());
        params.set('serverId', String(s.id));
        params.set('tab', 'system');
        router.push(`/panel?${params.toString()}`);
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

            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                {/* Header logic */}
                {server ? (
                    <header className="relative overflow-hidden mb-8 rounded-2xl bg-pteroblue/5 border border-pteroblue/10 p-8">
                        {/* Background Mesh */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pteroblue/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 rounded-xl bg-pteroblue/10 text-pteroblue">
                                        <Store size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                            {server.name}
                                        </h2>
                                        <p className="text-sm font-medium text-pteroblue flex items-center gap-2 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pteroblue"></span>
                                            ID: {server.id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {(() => {
                                    if (isExpiredStatus) {
                                        return (
                                            <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                                    <AlertTriangle size={20} className="relative z-10 text-red-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-red-500">Service Expired</span>
                                                    <span className="text-[10px] text-red-400 font-medium">Action Required</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (server.status === 'suspended') {
                                        return (
                                            <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <ShieldOff size={20} className="text-red-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-red-500">Suspended</span>
                                                    <span className="text-[10px] text-red-400 font-medium">Contact Support</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-pterodark/50 border border-white/5 rounded-xl backdrop-blur-sm">
                                            <div className="relative flex items-center justify-center w-4 h-4">
                                                <span className={cn(
                                                    "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                                                    server.powerStatus === 'running' ? "bg-green-500" : "bg-transparent"
                                                )}></span>
                                                <span className={cn(
                                                    "relative inline-flex rounded-full h-3 w-3 shadow-lg",
                                                    server.powerStatus === 'running' ? "bg-green-500 shadow-green-500/50" :
                                                        server.powerStatus === 'restarting' ? "bg-yellow-500 shadow-yellow-500/50" : "bg-red-500 shadow-red-500/50"
                                                )}></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-xs font-bold uppercase tracking-widest",
                                                    server.powerStatus === 'running' ? "text-green-500" :
                                                        server.powerStatus === 'restarting' ? "text-yellow-500" : "text-red-500"
                                                )}>
                                                    {server.powerStatus === 'running' ? 'Operational' : server.powerStatus}
                                                </span>
                                                {server.powerStatus === 'running' && (
                                                    <span className="text-[10px] text-pterosub font-medium">AI Agent Active</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </header>
                ) : (
                    <header className="mb-8 relative z-10">
                        <h2 className="text-4xl font-black text-white tracking-tight mb-2">
                            VeloxAI <span className="text-transparent bg-clip-text bg-gradient-to-r from-pteroblue to-purple-500">Command Control</span>
                        </h2>
                        <p className="text-pterosub max-w-xl text-lg">Select a restaurant to manage its AI operations and reservations.</p>
                    </header>
                )}

                {server && currentUser?.id !== server.userId && (
                    <div className="mb-2 p-3 rounded-lg bg-pteroblue/10 border border-pteroblue/20 flex items-center gap-3 text-pteroblue animate-in fade-in slide-in-from-top-4 duration-500">
                        <Shield size={18} className="shrink-0" />
                        <p className="text-sm font-medium">Logged in with Sub-User access — Permissions managed by the Restaurant Owner.</p>
                    </div>
                )}

                <div className="space-y-6">
                    {!server ? (
                        /* SELECTION MODE */
                        /* SELECTION MODE - PREMIUM REDESIGN */
                        <div className="animate-in fade-in zoom-in-95 duration-700">
                            <div className="text-center mb-12">
                                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Select a Restaurant</h3>
                                <p className="text-pterosub max-w-lg mx-auto">Manage your AI staff, reservations, and system configuration from a single command center.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-0">
                                {userServers.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleSwitchServer(s)}
                                        className="group relative cursor-pointer"
                                    >
                                        {/* Glow Effect */}
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-pteroblue to-purple-600 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition duration-500 will-change-transform group-hover:duration-200" />

                                        {/* Card Content */}
                                        <div className={cn(
                                            "relative h-full bg-pterodark/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 flex flex-col items-center gap-6 transition-all duration-300",
                                            "hover:border-white/10 hover:bg-pterodark/80 hover:-translate-y-1 hover:shadow-2xl"
                                        )}>
                                            {/* Status Indicator Dot */}
                                            <div className="absolute top-4 right-4">
                                                {(() => {
                                                    const expired = s.validUntil && isExpired(s.validUntil);
                                                    if (expired) return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
                                                    if (s.status === 'suspended') return <div className="w-2 h-2 rounded-full bg-red-400" />;
                                                    if (s.powerStatus === 'running') return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />;
                                                    return <div className="w-2 h-2 rounded-full bg-red-500/50" />;
                                                })()}
                                            </div>

                                            {/* Icon with Ring */}
                                            <div className="relative">
                                                <div className={cn(
                                                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    s.powerStatus === 'running'
                                                        ? "bg-gradient-to-br from-pteroblue/20 to-pteroblue/5 text-pteroblue shadow-lg shadow-pteroblue/20 ring-1 ring-pteroblue/30 group-hover:ring-pteroblue/50"
                                                        : "bg-white/5 text-pterosub grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                                                )}>
                                                    <Store size={40} className="transition-transform duration-500 group-hover:scale-110" />
                                                </div>
                                            </div>

                                            <div className="text-center space-y-1">
                                                <h4 className="text-xl font-bold text-white group-hover:text-pteroblue transition-colors duration-300">
                                                    {s.name}
                                                </h4>
                                                <p className="text-xs text-pterosub font-medium uppercase tracking-wider opacity-60 group-hover:opacity-90 transition-opacity">
                                                    #{s.id} • {s.status === 'active' ? 'Active Deployment' : 'Service Suspended'}
                                                </p>
                                            </div>

                                            {/* Status Chips */}
                                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                {(() => {
                                                    const expired = s.validUntil && isExpired(s.validUntil);
                                                    if (expired) {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-500 border border-red-500/20">
                                                                Expired
                                                            </span>
                                                        );
                                                    }
                                                    if (s.status === 'suspended') {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-400 border border-red-500/20">
                                                                Suspended
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                                                            s.powerStatus === 'running'
                                                                ? "bg-green-500/5 text-green-400 border-green-500/20"
                                                                : "bg-red-500/5 text-red-400 border-red-500/20"
                                                        )}>
                                                            {s.powerStatus || 'Offline'}
                                                        </span>
                                                    );
                                                })()}

                                                {s.userId !== currentUser?.id && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        Sub-User
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* MODULE MODE */
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both">
                            <div className="space-y-6">
                                {/* Legacy Tab Navigation (Upgraded to Pill/Dock Style) */}
                                <div className="flex items-center justify-center mb-10 overflow-x-auto py-2">
                                    <div className="flex bg-pterodark/60 backdrop-blur-md border border-white/5 rounded-2xl p-1.5 shadow-xl">
                                        {[
                                            { id: 'system', label: t('system'), icon: LayoutDashboard },
                                            { id: 'reservations', label: t('reservations'), icon: Calendar },
                                            { id: 'sub-users', label: t('subUsers'), icon: Users },
                                            { id: 'backups', label: t('backups'), icon: Database },
                                            { id: 'archive', label: 'Archive', icon: Store }
                                        ].map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = activeTab === tab.id;

                                            // Permission check logic
                                            const canAccess = currentUser?.role === 'admin' || server?.userId === currentUser?.id ||
                                                (server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes(tab.id === 'system' ? 'system' : tab.id));

                                            if (!canAccess && tab.id !== 'system') return null;

                                            const isDisabled = isLocked && tab.id !== 'system';

                                            return (
                                                <button
                                                    key={tab.id}
                                                    disabled={isDisabled}
                                                    onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                                                    className={cn(
                                                        "relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                                                        isActive
                                                            ? "text-white shadow-lg bg-pteroblue"
                                                            : "text-pterosub hover:text-white hover:bg-white/5",
                                                        isDisabled && "opacity-40 cursor-not-allowed grayscale"
                                                    )}
                                                    title={isDisabled ? "Service Suspended - Access Restricted" : ""}
                                                >
                                                    <Icon size={16} className={cn("relative z-10", isActive ? "animate-pulse" : "")} />
                                                    <span className="relative z-10">{tab.label}</span>

                                                    {/* Active Glow Background (Subtle) */}
                                                    {isActive && (
                                                        <div className="absolute inset-0 rounded-xl bg-pteroblue blur-[8px] opacity-40 z-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="relative">
                                    {/* Service Expiration Overlay & Blur Logic */}
                                    {isLocked && activeTab !== 'system' && (
                                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
                                            <div className="bg-pterodark border border-red-500/50 p-8 rounded-2xl shadow-2xl max-w-md text-center transform scale-110">
                                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                                    <ShieldOff className="text-red-500" size={40} />
                                                </div>
                                                <h2 className="text-2xl font-bold text-white mb-2">Service Suspended</h2>
                                                <p className="text-pterosub mb-6">
                                                    This restaurant service has been suspended or expired. Access to management modules is restricted.
                                                </p>
                                                <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/10 mb-4">
                                                    <p className="text-xs font-mono text-red-400">STATUS: {isSuspendedStatus ? "SUSPENDED" : "EXPIRED"}</p>
                                                    <p className="text-xs text-pterosub mt-1">Please contact your administrator to restore access.</p>
                                                </div>
                                                <Button
                                                    onClick={() => setActiveTab('system')}
                                                    className="w-full bg-pteroblue hover:bg-pteroblue/80 text-white"
                                                >
                                                    View Suspension Details
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Module Content (Blurred if expired and not system) */}
                                    <div className={cn(
                                        "transition-all duration-500",
                                        isLocked && activeTab !== 'system' ? "opacity-30 blur-md pointer-events-none select-none" : ""
                                    )}>
                                        {activeTab === 'system' && (
                                            <div className="space-y-6">
                                                {/* Unified Service Status Alert */}
                                                {(isLocked || server.validUntil) && (
                                                    <div className="grid grid-cols-1">
                                                        {(() => {
                                                            const daysLeft = server.validUntil ? getDaysRemaining(server.validUntil) : null;

                                                            let colorClass = "bg-green-500/10 text-green-500 border-green-500/20";
                                                            let icon = <CheckCircle2 size={24} />;
                                                            let title = "Service Operational";
                                                            let message = daysLeft !== null ? `Valid for ${daysLeft} days` : "Service is active";
                                                            let subtext = "Service is running optimally.";

                                                            // Override for Locked/Expired
                                                            if (isLocked) {
                                                                colorClass = "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]";
                                                                icon = <ShieldOff size={24} />;
                                                                title = "Service Restricted";

                                                                if (isSuspendedStatus) {
                                                                    message = "This service has been manually suspended by an administrator.";
                                                                } else if (isExpiredStatus) {
                                                                    message = "This service has automatically expired based on its validity date.";
                                                                } else {
                                                                    message = "Access to this service is restricted.";
                                                                }
                                                                subtext = "Contact support to restore full access.";
                                                            }
                                                            // Warning states for non-locked but expiring soon
                                                            else if (daysLeft !== null && daysLeft <= 3) {
                                                                colorClass = "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse";
                                                                icon = <AlertCircle size={24} />;
                                                                title = "Validity Warning";
                                                                message = `Expires in ${daysLeft} days!`;
                                                                subtext = "Please renew your subscription soon.";
                                                            } else if (daysLeft !== null && daysLeft <= 7) {
                                                                colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                                                                icon = <Clock size={24} />;
                                                                title = "Validity Notice";
                                                                message = `Expires in ${daysLeft} days`;
                                                                subtext = "Consider renewing your subscription.";
                                                            }

                                                            return (
                                                                <div className={cn("p-5 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 transition-all duration-300", colorClass)}>
                                                                    <div className="flex items-start sm:items-center gap-4">
                                                                        <div className="p-2 bg-current/10 rounded-lg shrink-0">
                                                                            {icon}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-bold uppercase tracking-widest text-xs opacity-90 mb-1 flex items-center gap-2">
                                                                                {title}
                                                                                {isLocked && <Badge className="bg-red-500/20 text-red-500 border-red-500/20 text-[10px] px-1.5 py-0">ACTION REQUIRED</Badge>}
                                                                            </h4>
                                                                            <p className="font-bold text-sm sm:text-base leading-snug">{message}</p>
                                                                            <p className="text-xs opacity-70 mt-1.5">{subtext}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Validity Date Badge */}
                                                                    {server.validUntil && (
                                                                        <div className="bg-black/20 rounded-lg p-3 text-right min-w-[140px] hidden sm:block">
                                                                            <p className="text-[10px] opacity-60 uppercase tracking-widest mb-0.5">
                                                                                {isLocked && isExpiredStatus ? "Expired On" : "Valid Until"}
                                                                            </p>
                                                                            <p className="font-mono text-sm font-bold flex items-center justify-end gap-2">
                                                                                <Calendar size={12} />
                                                                                {server.validUntil}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="flex flex-col-reverse md:flex-row gap-6">

                                                    {/* LEFT COLUMN: Controls & Console */}
                                                    <div className="flex-1 space-y-6">

                                                        {/* Floating Control Island */}
                                                        <div className="p-1.5 bg-pterodark/80 backdrop-blur border border-white/5 rounded-2xl inline-flex gap-1.5 shadow-xl">
                                                            <Button
                                                                className={cn(
                                                                    "rounded-xl h-11 px-6 font-bold uppercase tracking-wide transition-all duration-300",
                                                                    server.powerStatus === 'running'
                                                                        ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 cursor-not-allowed"
                                                                        : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20"
                                                                )}
                                                                onClick={() => handlePowerAction('running')}
                                                                disabled={isLocked || server.powerStatus === 'running' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                                            >
                                                                <Power size={18} className="mr-2" /> Start
                                                            </Button>
                                                            <Button
                                                                className={cn(
                                                                    "rounded-xl h-11 px-6 font-bold uppercase tracking-wide transition-all duration-300",
                                                                    "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20"
                                                                )}
                                                                onClick={() => handlePowerAction('restarting')}
                                                                disabled={isLocked || server.powerStatus === 'offline' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                                            >
                                                                <RotateCcw size={18} className="mr-2" /> Restart
                                                            </Button>
                                                            <Button
                                                                className={cn(
                                                                    "rounded-xl h-11 px-6 font-bold uppercase tracking-wide transition-all duration-300",
                                                                    server.powerStatus === 'offline'
                                                                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 cursor-not-allowed"
                                                                        : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                                                                )}
                                                                onClick={() => handlePowerAction('offline')}
                                                                disabled={isLocked || server.powerStatus === 'offline' || (server?.subUsers?.find(su => su.userId === currentUser?.id) && !server?.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
                                                            >
                                                                <MonitorStop size={18} className="mr-2" /> Stop
                                                            </Button>
                                                        </div>

                                                        {/* Terminal Console */}
                                                        <Console
                                                            logs={logs}
                                                            embedded
                                                            variant="tabs"
                                                            className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1117]"
                                                        />

                                                        <Card className="border-pteroblue/20 bg-gradient-to-br from-pteroblue/5 to-transparent backdrop-blur-sm">
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
                                                                        disabled={isLocked}
                                                                        onChange={e => setOpenaiKey(e.target.value)}
                                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                                        disabled={isLocked}
                                                                        onChange={e => setWhatsappToken(e.target.value)}
                                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                                        disabled={isLocked}
                                                                        onChange={e => setWhatsappBusinessId(e.target.value)}
                                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                                            disabled={isLocked}
                                                                            onChange={e => setWhatsappClientId(e.target.value)}
                                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            placeholder="Enter Client ID..."
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-pterosub uppercase">Client Secret</label>
                                                                        <input
                                                                            type={showKeys ? "text" : "password"}
                                                                            value={whatsappClientSecret}
                                                                            disabled={isLocked}
                                                                            onChange={e => setWhatsappClientSecret(e.target.value)}
                                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            placeholder="Enter Client Secret..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-pteroborder/50 flex justify-end">
                                                                <Button
                                                                    onClick={handleSaveConfig}
                                                                    disabled={isLocked || isSaving || !server || (server.subUsers?.find(su => su.userId === currentUser?.id) && !server.subUsers?.find(su => su.userId === currentUser?.id)?.permissions.includes('system'))}
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
                                                                        disabled={isLocked}
                                                                        onChange={e => {
                                                                            if (!server || isLocked) return;
                                                                            const newConfig = {
                                                                                ...(server.config || { openTime: '10:00', closeTime: '22:00', openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }),
                                                                                maxSeats: parseInt(e.target.value)
                                                                            };
                                                                            updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                            setServer({ ...server, config: newConfig });
                                                                        }}
                                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Open Time</label>
                                                                        <input
                                                                            type="time"
                                                                            value={server?.config?.openTime || '10:00'}
                                                                            disabled={isLocked}
                                                                            onChange={e => {
                                                                                if (!server || isLocked) return;
                                                                                const newConfig = {
                                                                                    ...(server.config || { maxSeats: 50, closeTime: '22:00', openDays: [] }),
                                                                                    openTime: e.target.value
                                                                                };
                                                                                updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                                setServer({ ...server, config: newConfig });
                                                                            }}
                                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Close Time</label>
                                                                        <input
                                                                            type="time"
                                                                            value={server?.config?.closeTime || '22:00'}
                                                                            disabled={isLocked}
                                                                            onChange={e => {
                                                                                if (!server || isLocked) return;
                                                                                const newConfig = {
                                                                                    ...(server.config || { maxSeats: 50, openTime: '10:00', openDays: [] }),
                                                                                    closeTime: e.target.value
                                                                                };
                                                                                updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                                setServer({ ...server, config: newConfig });
                                                                            }}
                                                                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">Open Days</label>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                                                            <button
                                                                                key={day}
                                                                                disabled={isLocked}
                                                                                onClick={() => {
                                                                                    if (!server || isLocked) return;
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
                                                                                    "px-2 py-1 text-xs rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed",
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
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-pterosub uppercase block mb-1">AI Response Language</label>
                                                                    <select
                                                                        value={aiLanguage}
                                                                        disabled={isLocked}
                                                                        onChange={e => {
                                                                            if (!server || isLocked) return;
                                                                            const newLang = e.target.value as 'es' | 'en' | 'both';
                                                                            setAiLanguage(newLang);
                                                                            const newConfig = {
                                                                                ...(server.config || { maxSeats: 50, openTime: '10:00', closeTime: '22:00', openDays: [] }),
                                                                                aiLanguage: newLang
                                                                            };
                                                                            updateServer(server.id, { config: newConfig }).then(() => triggerSync());
                                                                            setServer({ ...server, config: newConfig });
                                                                        }}
                                                                        className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        <option value="es">{t('aiLangOption_es')}</option>
                                                                        <option value="en">{t('aiLangOption_en')}</option>
                                                                        <option value="both">{t('aiLangOption_both')}</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="text-pterotext font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    <Activity size={14} className="text-pteroblue" /> System Analytics
                                                                </h3>
                                                                <Button variant="ghost" className="h-6 w-6 p-0 text-pterosub hover:text-white hover:bg-white/5 rounded-full" onClick={handleResetStats}>
                                                                    <RefreshCcw size={12} />
                                                                </Button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                {/* Metric Card 1: Interactions */}
                                                                <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-white/5 shadow-xl transition-all hover:shadow-2xl hover:border-pteroblue/20">
                                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                        <MessageSquare size={48} />
                                                                    </div>
                                                                    <div className="relative z-10">
                                                                        <p className="text-[10px] font-bold text-pterosub uppercase tracking-widest mb-1">Total Interactions</p>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className="text-3xl font-black text-white tracking-tight">{stats.pendingReplies}</span>
                                                                        </div>
                                                                        <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-pteroblue w-[60%] rounded-full animate-pulse" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Metric Card 2: Success Rate */}
                                                                <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-white/5 shadow-xl transition-all hover:shadow-2xl hover:border-green-500/20">
                                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-green-500">
                                                                        <CheckCircle2 size={48} />
                                                                    </div>
                                                                    <div className="relative z-10">
                                                                        <p className="text-[10px] font-bold text-pterosub uppercase tracking-widest mb-1">Success Rate</p>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className="text-3xl font-black text-white tracking-tight">{stats.successfulReservations}</span>
                                                                            <span className="text-[10px] font-bold text-pterosub">completed</span>
                                                                        </div>
                                                                        <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-green-500 w-[85%] rounded-full" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
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

                                        {/* Archive Module */}
                                        {activeTab === 'archive' && server && (
                                            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                                                <ArchivedReservations userId={activeUserId} serverId={server.id} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
