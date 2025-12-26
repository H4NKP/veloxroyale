'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, cn, Input } from '@/components/ui/core';
import { Users, UserPlus, Shield, Trash2, Mail, User as UserIcon, Search, AlertCircle } from 'lucide-react';
import { getAllUsers, getUserByEmailOrUsername, type User } from '@/lib/auth';
import { updateServer, type Server } from '@/lib/servers';
import { triggerSync } from '@/lib/sync';

interface SubUserManagementProps {
    server: Server;
    onUpdateServer: (updated: Server) => void;
    onLogAction: (msg: string) => void;
}

const AVAILABLE_PERMISSIONS = [
    { id: 'system', label: 'System Settings', description: 'Access to API keys and restaurant configuration' },
    { id: 'reservations', label: 'Reservations', description: 'View and manage customer reservations' },
    { id: 'backups', label: 'Backups', description: 'Export and restore system data' },
    { id: 'sub-users', label: 'Sub-Users', description: 'Manage other sub-users' }
];

export function SubUserManagement({ server, onUpdateServer, onLogAction }: SubUserManagementProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [newPermissions, setNewPermissions] = useState<string[]>(['reservations']);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        const load = async () => {
            const users = await getAllUsers();
            setAllUsers(users);
        };
        load();
    }, []);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsSearching(true);
        const user = await getUserByEmailOrUsername(searchTerm);
        setFoundUser(user || null);
        if (!user) {
            onLogAction(`User search failed for: ${searchTerm}`);
        }
        setIsSearching(false);
    };

    const handleAddSubUser = async () => {
        if (!foundUser || !server) return;

        // Check if already a sub-user or owner
        if (server.userId === foundUser.id) {
            alert('This user is already the owner of this restaurant.');
            return;
        }

        const currentSubUsers = server.subUsers || [];
        if (currentSubUsers.find(su => su.userId === foundUser.id)) {
            alert('This user is already a sub-user of this restaurant.');
            return;
        }

        const updatedSubUsers = [
            ...currentSubUsers,
            { userId: foundUser.id, permissions: newPermissions }
        ];

        const updatedServer = { ...server, subUsers: updatedSubUsers };
        await updateServer(server.id, { subUsers: updatedSubUsers });
        await triggerSync();
        onUpdateServer(updatedServer);

        onLogAction(`Linked user ${foundUser.email} as sub-user with ${newPermissions.length} permissions`);
        setFoundUser(null);
        setSearchTerm('');
        setNewPermissions(['reservations']);
    };

    const handleDelete = async (userId: number) => {
        if (confirm('Are you sure you want to remove this sub-user access?')) {
            const updatedSubUsers = (server.subUsers || []).filter(su => su.userId !== userId);
            const updatedServer = { ...server, subUsers: updatedSubUsers };
            await updateServer(server.id, { subUsers: updatedSubUsers });
            await triggerSync();
            onUpdateServer(updatedServer);
            onLogAction(`Removed sub-user access for user ID: ${userId}`);
        }
    };

    const togglePermission = (permId: string) => {
        setNewPermissions(prev => prev.includes(permId)
            ? prev.filter(p => p !== permId)
            : [...prev, permId]
        );
    };

    const toggleExistingPermission = async (userId: number, permId: string) => {
        const currentSubUsers = [...(server.subUsers || [])];
        const index = currentSubUsers.findIndex(su => su.userId === userId);
        if (index === -1) return;

        const currentPerms = currentSubUsers[index].permissions;
        const newPerms = currentPerms.includes(permId)
            ? currentPerms.filter(p => p !== permId)
            : [...currentPerms, permId];

        currentSubUsers[index] = { ...currentSubUsers[index], permissions: newPerms };

        const updatedServer = { ...server, subUsers: currentSubUsers };
        await updateServer(server.id, { subUsers: currentSubUsers });
        await triggerSync();
        onUpdateServer(updatedServer);
        onLogAction(`Updated permissions for sub-user ID ${userId}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-pterotext flex items-center gap-2">
                    <Users className="text-pteroblue" size={24} /> Sub-User Management
                </h2>
                <Badge variant="blue" className="text-[10px] uppercase font-bold">Admin-Only Account Creation</Badge>
            </div>

            <Card className="border-pteroblue/20 bg-pterodark/40">
                <h3 className="text-sm font-bold text-pterotext uppercase mb-4 flex items-center gap-2">
                    <UserPlus size={16} className="text-pteroblue" /> Link Existing User Account
                </h3>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                            <Input
                                placeholder="Enter email or username of existing user..."
                                className="pl-10 h-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={isSearching} className="h-10">
                            Search
                        </Button>
                    </div>

                    {foundUser && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="p-4 rounded-lg bg-pteroblue/5 border border-pteroblue/20 mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-pteroblue text-white p-2 rounded-full">
                                            <UserIcon size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-pterotext">{foundUser.email}</p>
                                            <p className="text-[10px] text-pterosub uppercase font-bold">User Hash: #{foundUser.id}</p>
                                        </div>
                                    </div>
                                    <Badge variant="blue">{foundUser.role}</Badge>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-pterosub uppercase">Grant Permissions for {server.name}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <div
                                                key={perm.id}
                                                onClick={() => togglePermission(perm.id)}
                                                className={cn(
                                                    "p-2 rounded border cursor-pointer transition-all flex items-start gap-2",
                                                    newPermissions.includes(perm.id)
                                                        ? "border-pteroblue bg-pteroblue/10"
                                                        : "border-pteroborder bg-pterodark/50 hover:border-pterosub"
                                                )}
                                            >
                                                <div className={cn(
                                                    "mt-1 w-3 h-3 rounded border flex items-center justify-center",
                                                    newPermissions.includes(perm.id) ? "bg-pteroblue border-pteroblue" : "border-pterosub"
                                                )}>
                                                    {newPermissions.includes(perm.id) && <div className="w-1 h-1 bg-white rounded-full" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-pterotext">{perm.label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button onClick={handleAddSubUser}>
                                        Link User to Restaurant
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {searchTerm && !foundUser && !isSearching && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs">
                            <AlertCircle size={14} /> User not found. Accounts must be created by a System Administrator.
                        </div>
                    )}
                </div>
            </Card>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-pterotext uppercase flex items-center gap-2">
                    <Shield size={16} className="text-pteroblue" /> Current Sub-Users Access
                </h3>
                {(server.subUsers || []).length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-pteroborder rounded-lg">
                        <Users size={48} className="mx-auto text-pteroborder mb-4" />
                        <p className="text-pterosub">No sub-users have access to this restaurant yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {(server.subUsers || []).map(su => {
                            const user = allUsers.find(u => u.id === su.userId);
                            if (!user) return null;
                            return (
                                <Card key={su.userId} className="border-pteroborder hover:border-pterosub/30 transition-all p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-pteroborder p-2 rounded-full text-pterosub">
                                                <UserIcon size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-pterotext text-sm">{user.email}</h4>
                                                <p className="text-[10px] text-pterosub uppercase font-bold">Sub-User Access Level</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                                            {AVAILABLE_PERMISSIONS.map(perm => (
                                                <button
                                                    key={perm.id}
                                                    onClick={() => toggleExistingPermission(su.userId, perm.id)}
                                                    className="focus:outline-none"
                                                >
                                                    <Badge
                                                        variant={su.permissions.includes(perm.id) ? "blue" : "gray"}
                                                        className={cn(
                                                            "text-[8px] px-1.5 py-0.5 uppercase cursor-pointer transition-all",
                                                            !su.permissions.includes(perm.id) && "opacity-20 grayscale hover:opacity-100 hover:grayscale-0"
                                                        )}
                                                    >
                                                        {perm.label}
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex justify-end pt-3 md:pt-0 border-t md:border-t-0 border-pteroborder">
                                            <Button
                                                variant="danger"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleDelete(su.userId)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
