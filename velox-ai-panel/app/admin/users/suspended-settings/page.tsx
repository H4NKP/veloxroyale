'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Save, Plus, X, Mail, Search, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { getSuspendedPageSettings, updateSuspendedPageSettings } from '@/lib/suspended-settings';
import { getAllUsers, updateUser, type User } from '@/lib/auth';
import { triggerSync } from '@/lib/sync';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/components/LanguageContext';

export default function SuspendedSettingsPage() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState({
        supportEmail: '',
        customMessage: '',
        reasons: [] as string[]
    });
    const [newReason, setNewReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // User suspension management
    const [users, setUsers] = useState<User[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Confirmation Modal State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToUpdate, setUserToUpdate] = useState<User | null>(null);

    useEffect(() => {
        const currentSettings = getSuspendedPageSettings();
        setSettings(currentSettings);
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
    };

    const handleAddReason = () => {
        if (newReason.trim()) {
            setSettings({
                ...settings,
                reasons: [...settings.reasons, newReason.trim()]
            });
            setNewReason('');
        }
    };

    const handleRemoveReason = (index: number) => {
        setSettings({
            ...settings,
            reasons: settings.reasons.filter((_, i) => i !== index)
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 500));

        updateSuspendedPageSettings(settings);
        await triggerSync();
        setSaveMessage(t('saved'));
        setIsSaving(false);

        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleSearchUser = () => {
        const user = users.find(u => u.email.toLowerCase().includes(searchEmail.toLowerCase()));
        setSelectedUser(user || null);
    };

    const triggerConfirmSuspension = (user: User) => {
        setUserToUpdate(user);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSuspension = async () => {
        if (!userToUpdate) return;

        const newStatus = userToUpdate.status === 'suspended' ? 'active' : 'suspended';
        await updateUser(userToUpdate.id, { status: newStatus });
        await triggerSync();
        await loadUsers();

        // Update selected user
        if (selectedUser?.id === userToUpdate.id) {
            setSelectedUser({ ...userToUpdate, status: newStatus });
        }

        setIsConfirmModalOpen(false);
        setUserToUpdate(null);
    };

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-pterotext">{t('suspendedPageSettings')}</h1>
                    <p className="text-pterosub mt-1">{t('suspendedPageSettingsDesc')}</p>
                </div>
            </div>

            <div className="max-w-3xl space-y-6">
                {/* User Suspension Management */}
                <Card>
                    <h3 className="text-lg font-semibold text-pterotext mb-4">{t('manageUserSuspensions')}</h3>
                    <p className="text-sm text-pterosub mb-4">
                        {t('manageUserSuspensionsDesc')}
                    </p>

                    {/* Search */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                            <Input
                                type="email"
                                placeholder={t('enterUserEmail')}
                                className="pl-10"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                            />
                        </div>
                        <Button onClick={handleSearchUser} variant="secondary">
                            {t('search')}
                        </Button>
                    </div>

                    {/* Selected User */}
                    {selectedUser && (
                        <div className="p-4 rounded-lg bg-pteroinput border border-pteroborder">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm text-pterosub">{t('userEmail')}</p>
                                    <p className="text-pterotext font-medium">{selectedUser.email}</p>
                                </div>
                                <Badge variant={selectedUser.status === 'active' ? 'green' : 'red'}>
                                    {selectedUser.status === 'active' ? (
                                        <>
                                            <CheckCircle size={12} className="mr-1" />
                                            {t('activeStatus')}
                                        </>
                                    ) : (
                                        <>
                                            <Ban size={12} className="mr-1" />
                                            {t('suspendedStatus')}
                                        </>
                                    )}
                                </Badge>
                            </div>

                            <div className="space-y-3 mb-4">
                                <label className="text-xs font-bold text-pterosub uppercase">{t('personalizedSuspensionMessage')}</label>
                                <textarea
                                    className="w-full bg-pterodark border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue min-h-[80px] text-sm"
                                    placeholder={t('personalizedSuspensionMessagePlaceholder')}
                                    value={selectedUser.suspension_message || ''}
                                    onChange={async (e) => {
                                        const msg = e.target.value;
                                        setSelectedUser({ ...selectedUser, suspension_message: msg });
                                        // Update in the main list and storage
                                        await updateUser(selectedUser.id, { suspension_message: msg });
                                        await triggerSync();
                                        await loadUsers();
                                    }}
                                />
                                <p className="text-[10px] text-pterosub italic">{t('personalizedSuspensionMessageNote')}</p>
                            </div>

                            <div className="flex gap-2">
                                {selectedUser.status === 'active' ? (
                                    <Button
                                        variant="danger"
                                        onClick={() => triggerConfirmSuspension(selectedUser)}
                                        className="flex-1"
                                    >
                                        <Ban size={16} className="mr-2" />
                                        {t('suspendUser')}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => triggerConfirmSuspension(selectedUser)}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle size={16} className="mr-2" />
                                        {t('unsuspendUser')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {searchEmail && !selectedUser && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-sm text-red-400">{t('noUserFound').replace('${email}', searchEmail)}</p>
                        </div>
                    )}
                </Card>

                {/* Support Email */}
                <Card>
                    <h3 className="text-lg font-semibold text-pterotext mb-4 flex items-center gap-2">
                        <Mail size={20} className="text-pteroblue" />
                        {t('supportEmail')}
                    </h3>
                    <p className="text-sm text-pterosub mb-4">
                        {t('supportEmailDesc')}
                    </p>
                    <Input
                        type="email"
                        placeholder="support@example.com"
                        value={settings.supportEmail}
                        onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    />
                </Card>

                {/* Custom Message */}
                <Card>
                    <h3 className="text-lg font-semibold text-pterotext mb-4">{t('customMessage')}</h3>
                    <p className="text-sm text-pterosub mb-4">
                        {t('customMessageDesc')}
                    </p>
                    <textarea
                        className="w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue focus:ring-1 focus:ring-pteroblue transition-all placeholder:text-pterosub/50 min-h-[100px]"
                        placeholder={t('customMessagePlaceholder')}
                        value={settings.customMessage}
                        onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
                    />
                </Card>

                {/* Suspension Reasons */}
                <Card>
                    <h3 className="text-lg font-semibold text-pterotext mb-4">{t('suspensionReasons')}</h3>
                    <p className="text-sm text-pterosub mb-4">
                        {t('suspensionReasonsDesc')}
                    </p>

                    <div className="space-y-3 mb-4">
                        {settings.reasons.map((reason, index) => (
                            <div key={index} className="flex items-center gap-2 bg-pteroinput p-3 rounded-lg border border-pteroborder">
                                <span className="flex-1 text-sm text-pterotext">• {reason}</span>
                                <button
                                    onClick={() => handleRemoveReason(index)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder={t('addNewReason')}
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddReason()}
                        />
                        <Button onClick={handleAddReason} variant="secondary">
                            <Plus size={16} />
                        </Button>
                    </div>
                </Card>

                {/* Save Button */}
                <div className="flex items-center gap-4">
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                        <Save size={18} className="mr-2" />
                        {isSaving ? t('loading') : t('saveChanges')}
                    </Button>
                    {saveMessage && (
                        <span className="text-sm text-green-400">{saveMessage}</span>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title={userToUpdate?.status === 'active' ? t('confirmSuspension') : t('confirmActivation')}
            >
                <div className="space-y-4 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-pteroblue/10 flex items-center justify-center mb-2">
                        <AlertTriangle className="text-pteroblue" size={24} />
                    </div>

                    <div>
                        <p className="text-pterotext font-medium">
                            {userToUpdate?.status === 'active' ? t('confirmSuspensionMsg') : t('confirmActivationMsg')}
                        </p>
                        <p className="text-sm text-pterosub mt-1">
                            {userToUpdate?.email}
                        </p>
                    </div>

                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant={userToUpdate?.status === 'active' ? 'danger' : 'primary'}
                            onClick={handleConfirmSuspension}
                        >
                            {userToUpdate?.status === 'active' ? t('suspendUser') : t('activeStatus')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
