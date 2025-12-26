// lib/status.ts
// Persistence and logic for status monitoring

export interface StatusMonitor {
    id: number;
    name: string;
    target: string; // URL or IP
    status: 'active' | 'inactive' | 'maintenance';
    last_check?: string;
    total_checks: number;
    successful_checks: number;
    created_at: string;
}

const initialMonitors: StatusMonitor[] = [
    {
        id: 1,
        name: 'Google (Test)',
        target: 'https://www.google.com',
        status: 'active',
        total_checks: 100,
        successful_checks: 100,
        created_at: '2024-01-01'
    }
];

// Fallback persistence
function loadMonitors(): StatusMonitor[] {
    if (typeof window === 'undefined') return initialMonitors;
    const stored = localStorage.getItem('veloxai_monitors');
    if (stored) {
        try { return JSON.parse(stored); } catch { return initialMonitors; }
    }
    return initialMonitors;
}

function saveMonitors(monitors: StatusMonitor[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('veloxai_monitors', JSON.stringify(monitors));
    }
}

let monitorsDB = loadMonitors();

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

export async function getAllMonitors(): Promise<StatusMonitor[]> {
    if (typeof window === 'undefined') return initialMonitors;

    if (await isRemoteDb()) {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    monitorsDB = loadMonitors();
    return monitorsDB;
}

export async function addMonitor(name: string, target: string): Promise<StatusMonitor> {
    const remote = await isRemoteDb();
    const newMonitor: Omit<StatusMonitor, 'id'> = {
        name,
        target,
        status: 'active',
        total_checks: 0,
        successful_checks: 0,
        created_at: new Date().toISOString()
    };

    if (remote) {
        const res = await fetch('/api/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMonitor)
        });
        return await res.json();
    }

    const monitor = {
        ...newMonitor,
        id: monitorsDB.length > 0 ? Math.max(...monitorsDB.map(m => m.id)) + 1 : 1
    };
    monitorsDB.push(monitor);
    saveMonitors(monitorsDB);
    return monitor;
}

export async function updateMonitorStatus(id: number, status: StatusMonitor['status']): Promise<void> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch('/api/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
    }

    monitorsDB = loadMonitors();
    const index = monitorsDB.findIndex(m => m.id === id);
    if (index !== -1) {
        monitorsDB[index].status = status;
        saveMonitors(monitorsDB);
    }
}

export async function deleteMonitor(id: number): Promise<void> {
    const remote = await isRemoteDb();
    if (remote) {
        await fetch(`/api/status?id=${id}`, { method: 'DELETE' });
    }

    monitorsDB = loadMonitors().filter(m => m.id !== id);
    saveMonitors(monitorsDB);
}

// Uptime calculation
export function calculateUptime(monitor: StatusMonitor): string {
    if (monitor.total_checks === 0) return '100';
    const percentage = (monitor.successful_checks / monitor.total_checks) * 100;
    return percentage.toFixed(1);
}

// Ping Execution (For server-side or local simulation)
export async function performCheck(monitor: StatusMonitor): Promise<boolean> {
    try {
        // In browser (demo), we just fetch the target if it is a URL
        if (monitor.target.startsWith('http')) {
            const res = await fetch(monitor.target, { mode: 'no-cors' });
            return true; // if fetch doesn't throw, we assume it's "up" for basic demo
        }
        return true; // fallback
    } catch {
        return false;
    }
}
