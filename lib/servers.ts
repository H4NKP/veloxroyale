// Persistencia de los datos de los servers usando localStorage

export interface Server {
    id: number;
    name: string;
    userId: number; // Conectado al dueño
    status: 'active' | 'suspended';
    aiApiKey?: string;
    whatsappClientId?: string;
    whatsappClientSecret?: string;
    whatsappApiToken?: string;
    whatsappBusinessId?: string;
    whatsappPhoneNumberId?: string;
    powerStatus: 'running' | 'offline' | 'restarting';
    created_at: string;
    config?: {
        maxSeats: number;
        openTime: string;
        closeTime: string;
        openDays: string[]; // ["Monday", "Tuesday", ...]
        aiLanguage?: 'en' | 'es' | 'both';
    };
    subUsers?: {
        userId: number;
        permissions: string[];
    }[];
}

const initialServers: Server[] = [
    {
        id: 1,
        name: 'La Traviata AI Agent',
        userId: 2,
        status: 'active',
        aiApiKey: 'mock_ai_key_123',
        whatsappApiToken: 'mock_whatsapp_token_456',
        powerStatus: 'running',
        created_at: '2024-02-12',
        subUsers: [
            { userId: 5, permissions: ['sub-users', 'reservations', 'system'] }
        ]
    },
    {
        id: 2,
        name: 'Bistro Central AI',
        userId: 3,
        status: 'active',
        aiApiKey: '',
        whatsappApiToken: '',
        powerStatus: 'offline',
        created_at: '2024-03-01',
        subUsers: []
    }
];

function loadServers(): Server[] {
    if (typeof window === 'undefined') return initialServers;

    const stored = localStorage.getItem('veloxai_servers');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return initialServers;
        }
    }
    return initialServers;
}

function saveServers(servers: Server[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('veloxai_servers', JSON.stringify(servers));
    }
}

let serversDB: Server[] = loadServers();

// Helper para ver si la DB remota está activada
async function isRemoteDb(): Promise<boolean> {
    try {
        const res = await fetch('/api/db/config');
        const data = await res.json();
        return data.enabled;
    } catch {
        return false;
    }
}

export async function getAllServers(): Promise<Server[]> {
    if (typeof window === 'undefined') return initialServers;

    if (await isRemoteDb()) {
        const res = await fetch('/api/servers?adminAccess=true');
        const data = await res.json();
        if (Array.isArray(data)) {
            // Sincronizamos con local para que vaya más fluido
            saveServers(data);
            return data;
        }
    }

    serversDB = loadServers();
    return [...serversDB];
}

export async function getServersByUserId(userId: number): Promise<Server[]> {
    if (typeof window === 'undefined') return [];

    if (await isRemoteDb()) {
        const res = await fetch(`/api/servers?userId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    serversDB = loadServers();
    return serversDB.filter(s => s.userId === userId || s.subUsers?.some(su => su.userId === userId));
}

export async function createServer(serverData: Omit<Server, 'id' | 'created_at' | 'powerStatus'>): Promise<Server> {
    const remote = await isRemoteDb();
    let newServer: Server;

    if (remote) {
        const res = await fetch('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData)
        });
        newServer = await res.json();
    } else {
        newServer = {
            ...serverData,
            id: serversDB.length > 0 ? Math.max(...serversDB.map(s => s.id)) + 1 : 1,
            powerStatus: 'offline',
            created_at: new Date().toISOString().split('T')[0],
            subUsers: serverData.subUsers || []
        };
    }

    serversDB = loadServers();
    serversDB.push(newServer);
    saveServers(serversDB);
    return newServer;
}

export async function updateServer(id: number, updates: Partial<Server>): Promise<Server | null> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch('/api/servers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
        });
    }

    serversDB = loadServers();
    const index = serversDB.findIndex(s => s.id === id);
    if (index === -1) return null;

    serversDB[index] = { ...serversDB[index], ...updates };
    saveServers(serversDB);
    return serversDB[index];
}

export async function deleteServer(id: number): Promise<boolean> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch(`/api/servers?id=${id}`, { method: 'DELETE' });
    }

    serversDB = loadServers();
    const index = serversDB.findIndex(s => s.id === id);
    if (index === -1) return false;

    serversDB.splice(index, 1);
    saveServers(serversDB);
    return true;
}

