// Mock authentication store with localStorage persistence
// This simulates a shared user database that persists across refreshes

export interface User {
    id: number;
    email: string;
    password: string; // In real app, this would be hashed
    role: 'admin' | 'customer';
    status: 'active' | 'suspended';
    suspension_message?: string;
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
        created_at: '2024-01-15'
    },
    {
        id: 2,
        email: 'client@latraviata.com',
        password: 'password123',
        role: 'customer',
        status: 'active',
        created_at: '2024-02-10'
    },
    {
        id: 3,
        email: 'manager@bistro.com',
        password: 'password123',
        role: 'customer',
        status: 'suspended',
        created_at: '2024-03-05'
    },
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
    if (await isRemoteDb()) {
        const res = await fetch(`/api/users?email=${identifier}`);
        const data = await res.json();
        const user = Array.isArray(data) ? data[0] : null;
        // Password check usually server-side, but here we still have pseudo-auth
        if (user && user.password === password) return user;
    }

    usersDB = loadUsers();
    const user = usersDB.find(
        u => (u.email === identifier || u.email.split('@')[0] === identifier) && u.password === password
    );
    return user || null;
}

export async function getAllUsers(): Promise<User[]> {
    if (typeof window === 'undefined') return [];

    if (await isRemoteDb()) {
        const res = await fetch('/api/users?adminAccess=true');
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    usersDB = loadUsers();
    return usersDB.map(u => ({ ...u, password: '***' })) as User[];
}

export async function getUserById(id: number): Promise<User | null> {
    if (typeof window === 'undefined') return null;

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

    if (remote) {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        newUser = await res.json();
    } else {
        newUser = {
            ...userData,
            id: usersDB.length > 0 ? Math.max(...usersDB.map(u => u.id)) + 1 : 1,
            created_at: new Date().toISOString().split('T')[0]
        } as User;
    }

    usersDB = loadUsers();
    usersDB.push(newUser);
    saveUsers(usersDB);
    return { ...newUser, password: '***' } as User;
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
        });
    }

    usersDB = loadUsers();
    const index = usersDB.findIndex(u => u.id === id);
    if (index === -1) return null;

    usersDB[index] = { ...usersDB[index], ...updates };
    saveUsers(usersDB);
    return { ...usersDB[index], password: '***' } as User;
}

export async function deleteUser(id: number): Promise<boolean> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    }

    usersDB = loadUsers();
    const index = usersDB.findIndex(u => u.id === id);
    if (index === -1) return false;

    usersDB.splice(index, 1);
    saveUsers(usersDB);
    return true;
}

