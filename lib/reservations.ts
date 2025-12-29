// Multi-tenant reservation library with localStorage persistence

export interface Reservation {
    id: number;
    userId: number;
    serverId: number; // Linked to specific restaurant
    customerName: string;
    customerPhone: string;
    date: string;
    time: string;
    partySize: number;
    status: 'confirmed' | 'pending' | 'cancelled';
    source: 'WhatsApp' | 'Web' | 'Phone';
    createdAt: string;
    notes?: string;
    allergies?: string;
    raw_commentary?: string;
    structured_commentary?: any;
    staff_notes?: string;
}

const initialReservations: Reservation[] = [
    // Reservations for User 2 (Bistro Central AI - Server 1)
    {
        id: 1,
        userId: 2,
        serverId: 1,
        customerName: 'Juan Perez',
        customerPhone: '+1 234 567 8901',
        date: '2025-12-26',
        time: '19:30',
        partySize: 4,
        status: 'confirmed',
        source: 'WhatsApp',
        createdAt: '2025-12-25T08:30:00Z'
    },
    {
        id: 2,
        userId: 2,
        serverId: 1,
        customerName: 'Maria Garcia',
        customerPhone: '+1 234 567 8902',
        date: '2025-12-26',
        time: '20:15',
        partySize: 2,
        status: 'confirmed',
        source: 'WhatsApp',
        createdAt: '2025-12-25T09:15:00Z'
    },
    {
        id: 3,
        userId: 2,
        serverId: 1,
        customerName: 'Carlos Ruiz',
        customerPhone: '+1 234 567 8903',
        date: '2025-12-27',
        time: '13:00',
        partySize: 6,
        status: 'pending',
        source: 'WhatsApp',
        createdAt: '2025-12-25T10:00:00Z'
    },
    // Reservations for User 2 (Second Restaurant - Server 2 [Hypothetical])
    {
        id: 5,
        userId: 2,
        serverId: 2,
        customerName: 'Luigi Mario',
        customerPhone: '+1 234 567 8904',
        date: '2025-12-28',
        time: '19:00',
        partySize: 2,
        status: 'confirmed',
        source: 'Web',
        createdAt: '2025-12-25T11:00:00Z'
    },
    // Reservations for User 1 (Admin/Demo)
    {
        id: 4,
        userId: 1,
        serverId: 999,
        customerName: 'Demo Client',
        customerPhone: '+0 000 000 0000',
        date: '2024-01-01',
        time: '12:00',
        partySize: 2,
        status: 'confirmed',
        source: 'Web',
        createdAt: '2024-01-01T00:00:00Z'
    }
];

function loadReservations(): Reservation[] {
    if (typeof window === 'undefined') return initialReservations;
    const stored = localStorage.getItem('veloxai_reservations');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return initialReservations;
        }
    }
    return initialReservations;
}

function saveReservations(res: Reservation[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('veloxai_reservations', JSON.stringify(res));
    }
}

let reservationsDB = loadReservations();

// Helper to check if remote DB is enabled
async function isRemoteDb(): Promise<boolean> {
    if (typeof window === 'undefined') {
        try {
            const { getDbConfig } = await import('./db');
            const config = getDbConfig();
            return config?.enabled === true;
        } catch {
            return false;
        }
    }
    try {
        const res = await fetch('/api/db/config');
        const data = await res.json();
        return data.enabled;
    } catch {
        return false;
    }
}

export async function getReservationsByUserId(userId: number): Promise<Reservation[]> {
    if (typeof window === 'undefined') {
        if (await isRemoteDb()) {
            try {
                const { query } = await import('./db');
                const results: any = await query('SELECT * FROM reservations WHERE userId = ?', [userId]);
                return results.map((r: any) => ({
                    ...r,
                    structured_commentary: typeof r.structured_commentary === 'string' ? JSON.parse(r.structured_commentary) : r.structured_commentary
                }));
            } catch (e) {
                console.error("[getReservationsByUserId] Server SQL Error:", e);
                return [];
            }
        }
        return initialReservations.filter(r => r.userId === userId);
    }

    if (await isRemoteDb()) {
        const res = await fetch(`/api/reservations?userId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    reservationsDB = loadReservations();
    return reservationsDB.filter(r => r.userId === userId);
}


export async function getReservationsByServerId(serverId: number, userId?: number): Promise<Reservation[]> {
    if (typeof window === 'undefined') {
        if (await isRemoteDb()) {
            try {
                const { query } = await import('./db');
                let sql = 'SELECT * FROM reservations WHERE serverId = ?';
                let params = [serverId];
                if (userId) {
                    sql += ' AND userId = ?';
                    params.push(userId);
                }
                const results: any = await query(sql, params);
                return results.map((r: any) => ({
                    ...r,
                    structured_commentary: typeof r.structured_commentary === 'string' ? JSON.parse(r.structured_commentary) : r.structured_commentary
                }));
            } catch (e) {
                console.error("[getReservationsByServerId] Server SQL Error:", e);
                return [];
            }
        }
        return initialReservations.filter(r => r.serverId === serverId);
    }

    if (await isRemoteDb()) {
        const url = userId
            ? `/api/reservations?serverId=${serverId}&userId=${userId}`
            : `/api/reservations?serverId=${serverId}&adminAccess=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    reservationsDB = loadReservations();
    return reservationsDB.filter(r => r.serverId === serverId);
}


export async function updateReservationStatus(id: number, status: Reservation['status']): Promise<Reservation | null> {
    return updateReservation(id, { status });
}

export async function updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | null> {
    if (typeof window === 'undefined') {
        const remote = await isRemoteDb();
        if (remote) {
            try {
                const { query } = await import('./db');
                const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                const values = Object.values(updates).map(v =>
                    typeof v === 'object' ? JSON.stringify(v) : v
                );
                await query(`UPDATE reservations SET ${fields} WHERE id = ?`, [...values, id]);
                // Simplified: We don't return the full object here to save complexity, 
                // but in a real app we'd fetch it again if needed.
                return { id, ...updates } as any;
            } catch (e) {
                console.error("[updateReservation] Server SQL Error:", e);
            }
        }
    }

    const remote = await isRemoteDb();
    if (remote) {
        await fetch('/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, adminAccess: true, ...updates })
        });
    }

    reservationsDB = loadReservations();
    const index = reservationsDB.findIndex(r => r.id === id);
    if (index === -1) return null;

    reservationsDB[index] = { ...reservationsDB[index], ...updates };
    saveReservations(reservationsDB);
    return reservationsDB[index];
}

export async function deleteReservation(id: number): Promise<boolean> {
    if (typeof window === 'undefined') {
        const remote = await isRemoteDb();
        if (remote) {
            try {
                const { query } = await import('./db');
                await query('DELETE FROM reservations WHERE id = ?', [id]);
                return true;
            } catch (e) {
                console.error("[deleteReservation] Server SQL Error:", e);
                return false;
            }
        }
    }

    const remote = await isRemoteDb();
    if (remote) {
        await fetch(`/api/reservations?id=${id}`, { method: 'DELETE' });
    }

    reservationsDB = loadReservations();
    const index = reservationsDB.findIndex(r => r.id === id);
    if (index === -1) return false;

    reservationsDB.splice(index, 1);
    saveReservations(reservationsDB);
    return true;
}

export async function addReservation(res: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    if (typeof window === 'undefined') {
        const remote = await isRemoteDb();
        if (remote) {
            try {
                const { query } = await import('./db');
                const keys = Object.keys(res);
                const placeholders = keys.map(() => '?').join(', ');
                const values = Object.values(res).map(v =>
                    typeof v === 'object' ? JSON.stringify(v) : v
                );
                const sql = `INSERT INTO reservations (${keys.join(', ')}, created_at) VALUES (${placeholders}, ?)`;
                const result: any = await query(sql, [...values, new Date().toISOString()]);
                return { id: result.insertId, createdAt: new Date().toISOString(), ...res } as Reservation;
            } catch (e) {
                console.error("[addReservation] Server SQL Error:", e);
            }
        }
    }

    const remote = await isRemoteDb();
    let newRes: Reservation;

    if (remote) {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(res)
        });
        newRes = await response.json();
    } else {
        newRes = {
            ...res,
            id: reservationsDB.length > 0 ? Math.max(...reservationsDB.map(r => r.id)) + 1 : 1,
            createdAt: new Date().toISOString()
        };
    }

    reservationsDB = loadReservations();
    reservationsDB.push(newRes);
    saveReservations(reservationsDB);
    return newRes;
}


export async function findPendingReservationByPhone(serverId: number, phone: string): Promise<Reservation | null> {
    const reservations = await getReservationsByServerId(serverId);
    // Find latest pending reservation for this phone in the last 24 hours (to avoid matching very old ones)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return reservations
        .filter(r => r.customerPhone === phone && r.status === 'pending' && r.createdAt >= oneDayAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
}

/**
 * Checks if a requested reservation can be accepted based on server config.
 */
export async function checkAvailability(
    serverId: number,
    dateStr: string, // YYYY-MM-DD
    timeStr: string, // HH:MM
    partySize: number,
    config?: { maxSeats: number; openTime: string; closeTime: string; openDays: string[] }
): Promise<{ available: boolean; reason?: string }> {
    if (!config) return { available: true }; // No limits set

    // 1. Check Open Days
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];

    if (config.openDays && config.openDays.length > 0 && !config.openDays.includes(dayName)) {
        return { available: false, reason: `Closed on ${dayName}s` };
    }

    // 2. Check Time
    if (config.openTime && config.closeTime) {
        if (timeStr < config.openTime || timeStr > config.closeTime) {
            return { available: false, reason: `Closed at ${timeStr} (Open ${config.openTime} - ${config.closeTime})` };
        }
    }

    // 3. Check Capacity (Max Seats Per Day)
    if (config.maxSeats > 0) {
        const reservations = await getReservationsByServerId(serverId);
        const existing = reservations.filter(r =>
            r.date === dateStr && r.status !== 'cancelled'
        );
        const currentSeats = existing.reduce((sum, r) => sum + r.partySize, 0);

        if (currentSeats + partySize > config.maxSeats) {
            return { available: false, reason: 'Restaurant is full for this date' };
        }
    }

    return { available: true };
}
