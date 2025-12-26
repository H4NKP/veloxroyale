'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Modal } from '@/components/ui/modal';
import { Plus, Search, Pencil, Trash2, Shield, User, KeyRound } from 'lucide-react';
import { useTranslation } from '@/components/LanguageContext';
import { getAllUsers, createUser, updateUser, deleteUser, type User as UserData } from '@/lib/auth';
import { triggerSync } from '@/lib/sync';

export default function UsersPage() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Load users on mount
    useEffect(() => {
        const load = async () => {
            const data = await getAllUsers();
            setUsers(data);
        };
        load();
    }, []);

    const handleDelete = async (id: number) => {
        if (confirm(t('deleteUserConfirm'))) {
            await deleteUser(id);
            await triggerSync();
            const data = await getAllUsers();
            setUsers(data);
        }
    };

    const openEdit = (user: UserData) => {
        setCurrentUser(user);
        setIsEditModalOpen(true);
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-pterotext">{t('userManagement')}</h1>
                    <p className="text-pterosub mt-1">{t('userManagementDesc')}</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} className="mr-2" /> {t('newUser')}
                </Button>
            </div>

            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                    <Input
                        placeholder={t('searchUsersByEmail')}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-pterocard border-b border-pteroborder text-sm uppercase text-pterosub">
                            <th className="p-4 font-semibold">{t('id')}</th>
                            <th className="p-4 font-semibold">{t('emailUser')}</th>
                            <th className="p-4 font-semibold">{t('role')}</th>
                            <th className="p-4 font-semibold">{t('status')}</th>
                            <th className="p-4 font-semibold">{t('created')}</th>
                            <th className="p-4 font-semibold text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pteroborder">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-pteroborder/30 transition-colors group">
                                <td className="p-4 font-mono text-sm text-pterosub">#{user.id}</td>
                                <td className="p-4 font-medium text-pterotext">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-pteroborder flex items-center justify-center text-xs">
                                            {user.email.substring(0, 2).toUpperCase()}
                                        </div>
                                        {user.email}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge variant={user.role === 'admin' ? 'red' : 'blue'}>
                                        {user.role === 'admin' ? <Shield size={10} className="mr-1" /> : <User size={10} className="mr-1" />}
                                        {user.role === 'admin' ? t('adminRole') : t('customerRole')}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-sm text-pterosub capitalize">{user.status === 'active' ? t('activeStatus') : t('suspendedStatus')}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-pterosub">{user.created_at}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="secondary" className="h-8 w-8 p-0" onClick={() => openEdit(user)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="danger" className="h-8 w-8 p-0" onClick={() => handleDelete(user.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-pterosub">
                                    {t('noUsersFoundMatching').replace('${searchTerm}', searchTerm)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* CREATE USER MODAL */}
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={async (newUserData: any) => {
                    await createUser(newUserData);
                    await triggerSync();
                    const data = await getAllUsers();
                    setUsers(data);
                    setIsCreateModalOpen(false);
                }}
            />

            {/* EDIT USER MODAL */}
            {currentUser && (
                <EditUserModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setCurrentUser(null); }}
                    user={currentUser}
                    onUpdate={async (id: number, updates: any) => {
                        await updateUser(id, updates);
                        await triggerSync();
                        const data = await getAllUsers();
                        setUsers(data);
                        setIsEditModalOpen(false);
                        setCurrentUser(null);
                    }}
                />
            )}
        </>
    );
}

// --- Subcomponents for Modals ---


function CreateUserModal({ isOpen, onClose, onCreate }: any) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'customer'>('customer');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({ email, password, role, status: 'active' });
        setEmail('');
        setPassword('');
        setRole('customer');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('createNewUser')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('emailUsername')}</label>
                    <Input
                        type="text"
                        autoFocus
                        required
                        placeholder="user@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('password')}</label>
                    <Input
                        type="password"
                        required
                        placeholder={t('setInitialPassword')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('role')}</label>
                    <select
                        className="w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue"
                        value={role}
                        onChange={e => setRole(e.target.value as 'admin' | 'customer')}
                    >
                        <option value="customer">{t('customerRole')}</option>
                        <option value="admin">{t('adminRole')}</option>
                    </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit">{t('createUser')}</Button>
                </div>
            </form>
        </Modal>
    );
}

function EditUserModal({ isOpen, onClose, user, onUpdate }: any) {
    const { t } = useTranslation();
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [status, setStatus] = useState(user.status);
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updates: any = { email, role, status };
        if (password) {
            updates.password = password;
        }
        onUpdate(user.id, updates);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editUser').replace('${email}', user.email)}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('emailUsername')}</label>
                    <Input
                        type="text"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('role')}</label>
                    <select
                        className="w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                    >
                        <option value="customer">{t('customerRole')}</option>
                        <option value="admin">{t('adminRole')}</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-pterosub uppercase">{t('status')}</label>
                    <select
                        className="w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="active">{t('activeStatus')}</option>
                        <option value="suspended">{t('suspendedStatus')}</option>
                    </select>
                </div>

                <div className="border-t border-pteroborder my-4 pt-4">
                    <h4 className="text-sm font-semibold text-pterotext mb-3 flex items-center gap-2">
                        <KeyRound size={16} /> {t('passwordManagement')}
                    </h4>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-pterosub uppercase">{t('newPassword')}</label>
                        <Input
                            type="password"
                            placeholder={t('passwordHint')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <p className="text-xs text-pterosub mt-1">{t('passwordChangeNote')}</p>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit">{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
}
