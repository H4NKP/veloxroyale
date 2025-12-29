'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Modal } from '@/components/ui/modal';
import { Sheet } from '@/components/ui/sheet';
import { Server as ServerIcon, Shield, ShieldOff, Plus, ExternalLink, Settings2, Power, PowerOff, Activity, Globe, Calendar, Clock, PlusCircle, Database } from 'lucide-react';

import { getAllUsers, type User } from '@/lib/auth';
import { getAllServers, createServer, updateServer, deleteServer, type Server } from '@/lib/servers';
import { triggerSync } from '@/lib/sync';
import { validateGeminiKey } from '@/lib/ai';
import { useTranslation } from '@/components/LanguageContext';
import { isExpired } from '@/lib/timezone';

export default function RestaurantsAdminPage() {
    const { t } = useTranslation();
    const [clients, setClients] = useState<User[]>([]);
    const [servers, setServers] = useState<Server[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedServer, setSelectedServer] = useState<Server | null>(null);

    useEffect(() => {
        const load = async () => {
            const allUsers = await getAllUsers();
            setClients(allUsers.filter(u => u.role === 'customer'));

            const allServers = await getAllServers();
            setServers(allServers);
        };
        load();

        const handleSync = () => {
            console.log("[Restaurants Sync] Sync event received, refreshing...");
            load();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('veloxai_sync', handleSync);
        }

        const interval = setInterval(load, 30000);

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('veloxai_sync', handleSync);
            }
        };
    }, []);

    const refreshData = async () => {
        const allServers = await getAllServers();
        setServers(allServers);
    };

    const getClientEmail = (userId: number) => {
        return clients.find(c => c.id === userId)?.email || 'Unknown';
    };

    const filteredServers = servers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientEmail(s.userId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleStatus = async (server: Server) => {
        const isResuming = server.status === 'suspended';
        const expired = server.validUntil ? isExpired(server.validUntil) : false;

        if (isResuming && expired) {
            if (!confirm(t('resumeExpiredConfirm').replace('{name}', server.name))) {
                return;
            }
        }

        const newStatus = server.status === 'active' ? 'suspended' : 'active';
        await updateServer(server.id, { status: newStatus });
        await triggerSync();
        refreshData();
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const openDetailsModal = (server: Server) => {
        setSelectedServer(server);
        setIsDetailsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-pterotext">{t('restaurantManagement')}</h1>
                    <p className="text-pterosub mt-2">{t('restaurantManagementDesc')}</p>
                </div>
                <Button onClick={openCreateModal} className="bg-pteroblue hover:bg-pteroblue/80 text-white">
                    <Plus size={18} className="mr-2" /> {t('createRestaurant')}
                </Button>
            </header>

            <div className="flex items-center justify-between">
                <div className="relative max-w-md w-full">
                    <Input
                        placeholder={t('searchRestaurants')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-pterocard border-b border-pteroborder text-pterosub text-sm uppercase tracking-wider">
                            <th className="p-4 font-medium">{t('restaurants')}</th>
                            <th className="p-4 font-medium">{t('owner')}</th>
                            <th className="p-4 font-medium">{t('status')}</th>
                            <th className="p-4 font-medium">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pteroborder">
                        {filteredServers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-pterosub italic">
                                    {t('noRestaurantsFound')}
                                </td>
                            </tr>
                        ) : (
                            filteredServers.map((server) => (
                                <tr key={server.id} className="hover:bg-pteroborder/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${server.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <ServerIcon size={20} />
                                            </div>
                                            <div>
                                                <span className="text-pterotext font-bold block">{server.name}</span>
                                                <span className="text-xs text-pterosub">ID: #{server.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-pteroblue/20 flex items-center justify-center text-pteroblue text-xs font-bold">
                                                {getClientEmail(server.userId).charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-pterosub">{getClientEmail(server.userId)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {(() => {
                                            const expired = server.validUntil && isExpired(server.validUntil);
                                            if (expired) {
                                                return (
                                                    <Badge variant="red">
                                                        <Clock size={12} className="mr-1" />
                                                        {t('expired')}
                                                    </Badge>
                                                );
                                            }
                                            if (server.status === 'active') {
                                                return (
                                                    <Badge variant="green">
                                                        <Activity size={12} className="mr-1" />
                                                        {t('operational')}
                                                    </Badge>
                                                );
                                            }
                                            return (
                                                <Badge variant="red">
                                                    <ShieldOff size={12} className="mr-1" />
                                                    {t('suspended')}
                                                </Badge>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                className="p-2"
                                                onClick={() => openDetailsModal(server)}
                                                title={t('configuration')}
                                            >
                                                <Settings2 size={16} />
                                            </Button>
                                            <Button
                                                variant={server.status === 'active' ? 'danger' : 'primary'}
                                                className="p-2"
                                                onClick={() => handleToggleStatus(server)}
                                                title={server.status === 'active' ? t('suspend') : t('resume')}
                                            >
                                                {server.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                                            </Button>
                                            <Link href={`/admin/monitor?userId=${server.userId}&fromAdmin=true`}>
                                                <Button variant="ghost" className="p-2" title={t('connect')}>
                                                    <ExternalLink size={16} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Modals */}
            <CreateServerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                clients={clients}
                onCreated={refreshData}
            />

            {selectedServer && (
                <ServerDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    server={selectedServer}
                />
            )}
        </div>
    );
}

function CreateServerModal({ isOpen, onClose, clients, onCreated }: any) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [whatsappToken, setWhatsappToken] = useState('');
    const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
    const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
    const [whatsappClientId, setWhatsappClientId] = useState('');
    const [whatsappClientSecret, setWhatsappClientSecret] = useState('');
    const [aiLanguage, setAiLanguage] = useState<'es' | 'en' | 'both'>('es');
    const [validUntil, setValidUntil] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name || !selectedUserId) {
            alert(t('nameAndOwnerRequired'));
            return;
        }
        setIsCreating(true);

        if (openaiKey && openaiKey !== 'mock_ai_key_123') {
            const isValid = await validateGeminiKey(openaiKey);
            if (!isValid) {
                setOpenaiKey('');
                setIsCreating(false);
                alert(t('invalidGeminiKey'));
                return;
            }
        }

        const status = validUntil && isExpired(validUntil) ? 'suspended' : 'active';

        await createServer({
            name,
            userId: Number(selectedUserId),
            status,
            aiApiKey: openaiKey,
            whatsappApiToken: whatsappToken,
            whatsappBusinessId: whatsappBusinessId,
            whatsappPhoneNumberId: whatsappPhoneNumberId,
            whatsappClientId: whatsappClientId,
            whatsappClientSecret: whatsappClientSecret,
            validUntil: validUntil || undefined,
            config: {
                aiLanguage: aiLanguage,
                maxSeats: 50,
                openTime: '09:00',
                closeTime: '22:00',
                openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }
        });

        await triggerSync();
        setIsCreating(false);
        onCreated();
        onClose();
        setName('');
        setOpenaiKey('');
        setWhatsappToken('');
        setWhatsappBusinessId('');
        setWhatsappPhoneNumberId('');
        setSelectedUserId('');
        setValidUntil('');
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title={t('deployNewRestaurant')}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-pterosub uppercase">{t('restaurantName')}</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. La Dolce Vita"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-pterosub uppercase">{t('owner')}</label>
                        <select
                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all h-9"
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(Number(e.target.value))}
                        >
                            <option value="" disabled>{t('selectClient')}</option>
                            {clients.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.email}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('validityOptional')}</label>
                    <Input
                        type="date"
                        value={validUntil}
                        onChange={e => setValidUntil(e.target.value)}
                    />
                    <p className="text-[10px] text-pterosub">{t('validityDesc')}</p>
                </div>

                <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <h4 className="text-xs font-bold text-pteroblue uppercase flex items-center gap-2">
                        <Activity size={14} /> {t('aiApiConfig')}
                    </h4>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-pterosub uppercase">{t('geminiApiKey')}</label>
                            <Input
                                type="password"
                                placeholder={t('enterGeminiKey')}
                                value={openaiKey}
                                onChange={e => setOpenaiKey(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('accessToken')}</label>
                                <Input
                                    type="password"
                                    placeholder="EAAV..."
                                    value={whatsappToken}
                                    onChange={e => setWhatsappToken(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('businessAccountId')}</label>
                                <Input
                                    placeholder={t('enterId')}
                                    value={whatsappBusinessId}
                                    onChange={e => setWhatsappBusinessId(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1 mt-2">
                            <label className="text-[10px] font-bold text-pterosub uppercase">{t('phoneNumberId')}</label>
                            <Input
                                placeholder="e.g. 1928374656..."
                                value={whatsappPhoneNumberId}
                                onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                            />
                            <p className="text-[10px] text-pterosub italic font-normal">{t('foundInWhatsapp')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('clientId')}</label>
                                <Input
                                    placeholder={t('enterClientId')}
                                    value={whatsappClientId}
                                    onChange={e => setWhatsappClientId(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('clientSecret')}</label>
                                <Input
                                    type="password"
                                    placeholder={t('enterClientSecret')}
                                    value={whatsappClientSecret}
                                    onChange={e => setWhatsappClientSecret(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                    <h4 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                        <Globe size={14} /> {t('aiSettings')}
                    </h4>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-pterosub uppercase">{t('aiLanguage')}</label>
                        <select
                            className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                            value={aiLanguage}
                            onChange={(e) => setAiLanguage(e.target.value as any)}
                        >
                            <option value="es">{t('aiLangOption_es')}</option>
                            <option value="en">{t('aiLangOption_en')}</option>
                            <option value="both">{t('aiLangOption_both')}</option>
                        </select>
                    </div>
                </div>

                <div className="pt-6 border-t border-pteroborder flex flex-col gap-3">
                    <Button onClick={handleCreate} disabled={isCreating} className="w-full h-12 text-sm font-bold uppercase tracking-wider">
                        {isCreating ? t('validating') : t('createAndAssign')}
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={onClose} disabled={isCreating}>{t('cancel')}</Button>
                </div>
            </div>
        </Sheet>
    );
}

function ServerDetailsModal({ isOpen, onClose, server }: any) {
    const { t } = useTranslation();
    const [openaiKey, setOpenaiKey] = useState(server.aiApiKey || '');
    const [whatsappToken, setWhatsappToken] = useState(server.whatsappApiToken || '');
    const [whatsappBusinessId, setWhatsappBusinessId] = useState(server.whatsappBusinessId || '');
    const [whatsappClientId, setWhatsappClientId] = useState(server.whatsappClientId || '');
    const [whatsappClientSecret, setWhatsappClientSecret] = useState(server.whatsappClientSecret || '');
    const [aiLanguage, setAiLanguage] = useState<'es' | 'en' | 'both'>(server.config?.aiLanguage || 'es');
    const [validUntil, setValidUntil] = useState(server.validUntil || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        if (openaiKey && openaiKey !== 'mock_ai_key_123') {
            const isValid = await validateGeminiKey(openaiKey);
            if (!isValid) {
                setOpenaiKey('');
                setIsSaving(false);
                alert(t('invalidGeminiKey'));
                return;
            }
        }
        const status = validUntil && isExpired(validUntil) ? 'suspended' : server.status;

        await updateServer(server.id, {
            status,
            aiApiKey: openaiKey,
            whatsappApiToken: whatsappToken,
            whatsappBusinessId: whatsappBusinessId,
            whatsappClientId: whatsappClientId,
            whatsappClientSecret: whatsappClientSecret,
            validUntil: validUntil || undefined,
            config: {
                ...server.config,
                aiLanguage: aiLanguage
            }
        });
        await triggerSync();
        setTimeout(() => setIsSaving(false), 500);
    };

    const addDays = (days: number) => {
        const current = validUntil ? new Date(validUntil) : new Date();
        current.setDate(current.getDate() + days);
        setValidUntil(current.toISOString().split('T')[0]);
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title={t('aiSystemDeepDive')}>
            <div className="space-y-8">
                <div className="flex items-center justify-between p-5 bg-pteroborder/20 rounded-xl border border-pteroborder">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${server.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            <ServerIcon size={28} />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white leading-tight">{server.name}</h4>
                            <p className="text-[11px] text-pterosub uppercase tracking-[0.2em] font-medium mt-1">{t('localPanelDeployment')}</p>
                        </div>
                    </div>
                    <Badge variant={(server.status === 'active' && !(server.validUntil && isExpired(server.validUntil))) ? 'green' : 'red'} className="px-3 py-1 text-[10px] font-bold">
                        {(() => {
                            if (server.validUntil && isExpired(server.validUntil)) return t('expired');
                            return server.status.toUpperCase();
                        })()}
                    </Badge>
                </div>

                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-xs font-bold text-pterosub uppercase flex items-center gap-2">
                            <Activity size={14} className="text-pteroblue" /> {t('apiConfiguration')}
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('geminiApiKey')}</label>
                                <Input
                                    type="password"
                                    value={openaiKey}
                                    onChange={e => setOpenaiKey(e.target.value)}
                                    className="bg-pterodark border-pteroborder focus:border-pteroblue"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-pterosub uppercase">{t('accessToken')}</label>
                                    <Input
                                        type="password"
                                        value={whatsappToken}
                                        onChange={e => setWhatsappToken(e.target.value)}
                                        className="bg-pterodark"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-pterosub uppercase">{t('businessAccountId')}</label>
                                    <Input
                                        value={whatsappBusinessId}
                                        onChange={e => setWhatsappBusinessId(e.target.value)}
                                        className="bg-pterodark"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-pterosub uppercase">{t('clientId')}</label>
                                    <Input
                                        value={whatsappClientId}
                                        onChange={e => setWhatsappClientId(e.target.value)}
                                        className="bg-pterodark"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-pterosub uppercase">{t('clientSecret')}</label>
                                    <Input
                                        type="password"
                                        value={whatsappClientSecret}
                                        onChange={e => setWhatsappClientSecret(e.target.value)}
                                        className="bg-pterodark"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4 pt-4 border-t border-pteroborder">
                        <h4 className="text-xs font-bold text-pterosub uppercase flex items-center gap-2">
                            <Globe size={14} className="text-purple-400" /> {t('aiSettings')}
                        </h4>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-pterosub uppercase">{t('aiLanguage')}</label>
                            <select
                                className="w-full bg-pterodark border border-pteroborder text-sm text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue transition-all"
                                value={aiLanguage}
                                onChange={(e) => setAiLanguage(e.target.value as any)}
                            >
                                <option value="es">{t('aiLangOption_es')}</option>
                                <option value="en">{t('aiLangOption_en')}</option>
                                <option value="both">{t('aiLangOption_both')}</option>
                            </select>
                        </div>
                    </section>

                    <section className="space-y-4 pt-4 border-t border-pteroborder">
                        <h4 className="text-xs font-bold text-pterosub uppercase flex items-center gap-2">
                            <Calendar size={14} className="text-green-400" /> {t('serviceAvailability')}
                        </h4>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-pterosub uppercase">{t('expirationDate')}</label>
                                <Input
                                    type="date"
                                    value={validUntil}
                                    onChange={e => setValidUntil(e.target.value)}
                                    className="bg-pterodark"
                                />
                                <p className="text-[10px] text-pterosub italic">{t('validityDesc')}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant="secondary"
                                    className="text-[10px] h-8 font-bold uppercase tracking-wider"
                                    onClick={() => addDays(7)}
                                >
                                    <PlusCircle size={12} className="mr-1" /> {t('sevenDays')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="text-[10px] h-8 font-bold uppercase tracking-wider"
                                    onClick={() => addDays(14)}
                                >
                                    <PlusCircle size={12} className="mr-1" /> {t('fourteenDays')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="text-[10px] h-8 font-bold uppercase tracking-wider"
                                    onClick={() => addDays(30)}
                                >
                                    <PlusCircle size={12} className="mr-1" /> {t('thirtyDays')}
                                </Button>
                            </div>
                        </div>
                    </section>

                    <Button
                        className="w-full h-12 text-sm font-bold uppercase tracking-[0.1em] shadow-lg shadow-pteroblue/10 mt-6"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                                {t('validating')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Settings2 size={18} />
                                {t('updateCredentials')}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="p-5 bg-pterocard border border-pteroborder rounded-xl flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-pteroblue/10 rounded-lg">
                            <Database size={24} className="text-pteroblue" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('deploymentType')}</p>
                            <p className="text-white font-bold text-sm mt-0.5">{t('sharedInfrastructure')}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-[10px] text-pterosub font-medium">
                    <span className="flex items-center gap-1.5">
                        <Clock size={12} /> {t('createdOn')}: {server.created_at || t('unknown')}
                    </span>
                    <span>Server ID: #{server.id}</span>
                </div>
            </div>
        </Sheet>
    );
}




function DetailItem({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div className="p-3 bg-pterodark border border-pteroborder rounded-lg">
            <p className="text-[10px] font-bold text-pterosub uppercase tracking-widest">{label}</p>
            <p className="text-lg font-bold text-pterotext mt-1">{value}</p>
            <p className="text-[10px] text-pterosub mt-1">{sub}</p>
        </div>
    );
}
