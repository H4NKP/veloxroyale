// Mock authentication store with localStorage persistence
// This simulates a shared user database that persists across refreshes

import bcrypt from 'bcryptjs';

export interface User {
    id: number;
    email: string;
    password: string; // In real app, this would be hashed
    role: 'admin' | 'customer';
    status: 'active' | 'suspended';
    plan?: 'Basic Plan' | 'Growth Plan' | 'Premium Plan' | 'Custom Plan';
    support_priority?: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6' | 'tier_7' | 'tier_8';
    support_suspended?: boolean;
    suspension_message?: string;
    reset_token?: string;
    reset_token_expiry?: string;
    created_at: string;
}

// Initial users database
const initialUsers: User[] = [
    {
        id: 1,
        email: 'admin',
        password: 'admin',
        role: 'admin',
        status: 'active',
        plan: 'Custom Plan',
        support_priority: 'tier_8',
        support_suspended: false,
        created_at: '2024-01-15'
    },
    {
        id: 2,
        email: 'client@latraviata.com',
        password: 'password123',
        role: 'customer',
        status: 'active',
        plan: 'Premium Plan',
        support_priority: 'tier_4',
        support_suspended: false,
        created_at: '2024-02-10'
    },
    {
        id: 3,
        email: 'manager@bistro.com',
        password: 'password123',
        role: 'customer',
        status: 'suspended',
        plan: 'Growth Plan',
        created_at: '2024-03-05'
    },
    {
        id: 5,
        email: 'subuser@test.com',
        password: 'password123',
        role: 'customer',
        status: 'active',
        plan: 'Basic Plan',
        created_at: '2024-04-01'
    }
];

// Load from localStorage or use initial data
function loadUsers(): User[] {
    if (typeof window === 'undefined') return initialUsers;

    const stored = localStorage.getItem('veloxai_users');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return initialUsers;
        }
    }
    return initialUsers;
}

// Save to localStorage
function saveUsers(users: User[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('veloxai_users', JSON.stringify(users));
    }
}

let usersDB: User[] = loadUsers();

// Helper to check if remote DB is enabled
async function isRemoteDb(): Promise<boolean> {
    try {
        const res = await fetch('/api/db/config');
        const data = await res.json();
        return data.enabled;
    } catch {
        return false;
    }
}

export async function authenticateUser(identifier: string, password: string): Promise<User | null> {
    const remote = await isRemoteDb();
    let user: User | null = null;

    if (remote) {
        const res = await fetch(`/api/users?email=${identifier}`);
        const data = await res.json();
        user = Array.isArray(data) ? data[0] : null;
    } else {
        usersDB = loadUsers();
        user = usersDB.find(
            u => (u.email === identifier || u.email.split('@')[0] === identifier)
        ) || null;
    }

    if (!user) return null;

    // Check password
    let isMatch = false;
    try {
        isMatch = await bcrypt.compare(password, user.password);
    } catch {
        // Fallback for plain text (migration)
        isMatch = user.password === password;

        if (isMatch) {
            // Transparent migration: Update to hash
            const hashedPassword = await bcrypt.hash(password, 10);
            await updateUser(user.id, { password: hashedPassword });
        }
    }

    return isMatch ? user : null;
}

export async function getAllUsers(): Promise<User[]> {
    // if (typeof window === 'undefined') return []; // Removed to allow server-side mock lookup

    if (await isRemoteDb()) {
        const res = await fetch('/api/users?adminAccess=true');
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    usersDB = loadUsers();
    return usersDB.map(u => ({ ...u, password: '***' })) as User[];
}

export async function getUserById(id: number): Promise<User | null> {
    // if (typeof window === 'undefined') return null; // Removed to allow server-side mock lookup

    if (await isRemoteDb()) {
        const res = await fetch(`/api/users?id=${id}`);
        const data = await res.json();
        return Array.isArray(data) ? data[0] : null;
    }

    usersDB = loadUsers();
    return usersDB.find(u => u.id === id) || null;
}

export async function getUserByEmailOrUsername(identifier: string): Promise<User | null> {
    if (await isRemoteDb()) {
        const res = await fetch(`/api/users?email=${identifier}`);
        const data = await res.json();
        return Array.isArray(data) ? data[0] : null;
    }

    usersDB = loadUsers();
    return usersDB.find(u => u.email === identifier || u.email.split('@')[0] === identifier) || null;
}

export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const remote = await isRemoteDb();
    let newUser: User;

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const dataToSave = { ...userData, password: hashedPassword };

    if (remote) {
        // ... existing remote logic ...
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
        newUser = await res.json();
    } else {
        if (typeof window === 'undefined') {
            const { isServerMode } = await import('@/lib/system-config');
            if (isServerMode()) {
                throw new Error("System is in Ubuntu Server Mode. Local storage is disabled. Please enable MySQL Database.");
            }
        }

        newUser = {
            ...userData,
            password: hashedPassword,
            id: usersDB.length > 0 ? Math.max(...usersDB.map(u => u.id)) + 1 : 1,
            created_at: new Date().toISOString().split('T')[0]
        } as User;
    }

    usersDB = loadUsers();
    usersDB.push(newUser);
    saveUsers(usersDB);
    return { ...newUser, password: '***' } as User;
}

export async function updateUser(id: number, updates: Partial<User>, resetToken?: string): Promise<User | null> {
    const remote = await isRemoteDb();

    // Hash password if it's being updated
    if (updates.password) {
        const { oldPassword } = updates as any;
        const currentUserId = id;

        if (remote) {
            await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, resetToken, ...updates })
            });

            // Re-fetch usersDB to stay in sync for local fallback
            const res = await fetch('/api/users?adminAccess=true');
            const data = await res.json();
            if (Array.isArray(data)) saveUsers(data);
            return getUserById(id);
        }

        // Local Mode Check
        if (typeof window === 'undefined') {
            const { isServerMode } = await import('@/lib/system-config');
            if (isServerMode()) throw new Error("Ubuntu Server Mode enabled. Local updates disabled.");
        }

        usersDB = loadUsers();
        const user = usersDB.find(u => u.id === id);
        if (!user) return null;

        // If not a reset token flow, require and check old password
        if (!resetToken) {
            if (!oldPassword) {
                throw new Error('Current password is required to set a new password.');
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                throw new Error('Incorrect current password.');
            }
        }

        if (!updates.password.startsWith('$2a$')) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
    } else if (remote) {
        await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, resetToken, ...updates })
        });
    } else {
        if (typeof window === 'undefined') {
            const { isServerMode } = await import('@/lib/system-config');
            if (isServerMode()) throw new Error("Ubuntu Server Mode enabled. Local updates disabled.");
        }
    }

    usersDB = loadUsers();
    const index = usersDB.findIndex(u => u.id === id);
    if (index === -1) return null;

    usersDB[index] = { ...usersDB[index], ...updates };

    // Auto-clear reset token if password was updated (security best practice)
    if (updates.password) {
        usersDB[index].reset_token = undefined;
        usersDB[index].reset_token_expiry = undefined;
    }

    saveUsers(usersDB);
    return { ...usersDB[index], password: '***' } as User;
}

export async function deleteUser(id: number): Promise<boolean> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    } else {
        if (typeof window === 'undefined') {
            const { isServerMode } = await import('@/lib/system-config');
            if (isServerMode()) throw new Error("Ubuntu Server Mode enabled. Local delete disabled.");
        }
    }

    usersDB = loadUsers();
    const index = usersDB.findIndex(u => u.id === id);
    if (index === -1) return false;

    usersDB.splice(index, 1);
    saveUsers(usersDB);
    return true;
}

