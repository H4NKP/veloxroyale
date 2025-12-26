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
    try {
        const res = await fetch('/api/db/config');
        const data = await res.json();
        return data.enabled;
    } catch {
        return false;
    }
}

export async function getReservationsByUserId(userId: number): Promise<Reservation[]> {
    if (typeof window === 'undefined') return [];

    if (await isRemoteDb()) {
        const res = await fetch(`/api/reservations?userId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) return data;
    }

    reservationsDB = loadReservations();
    return reservationsDB.filter(r => r.userId === userId);
}

export async function getReservationsByServerId(serverId: number, userId?: number): Promise<Reservation[]> {
    if (typeof window === 'undefined') return [];

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
    const remote = await isRemoteDb();
    if (remote) {
        await fetch('/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
    }

    reservationsDB = loadReservations();
    const index = reservationsDB.findIndex(r => r.id === id);
    if (index === -1) return null;

    reservationsDB[index] = { ...reservationsDB[index], status };
    saveReservations(reservationsDB);
    return reservationsDB[index];
}

export async function deleteReservation(id: number): Promise<boolean> {
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
