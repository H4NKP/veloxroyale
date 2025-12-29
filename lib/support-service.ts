import { query, getDbConfig } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const LOCAL_DATA_PATH = path.join(process.cwd(), 'support_data.json');

export interface SupportTicket {
    id: number;
    user_id: number;
    subject: string;
    priority: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6' | 'tier_7' | 'tier_8' | 'urgent';
    status: 'open' | 'answered' | 'customer_reply' | 'closed' | 'solved';
    created_at: string;
    updated_at: string;
    email?: string; // For joined queries
}

export interface SupportMessage {
    id: number;
    ticket_id: number;
    sender_type: 'user' | 'admin';
    sender_id: number;
    message: string;
    created_at: string;
}

interface LocalData {
    tickets: SupportTicket[];
    messages: SupportMessage[];
    settings: {
        max_open_tickets: number;
    };
}

// Initialize local data file if not exists
function ensureLocalData() {
    if (!fs.existsSync(LOCAL_DATA_PATH)) {
        const initialData: LocalData = {
            tickets: [],
            messages: [],
            settings: { max_open_tickets: 3 }
        };
        fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(initialData, null, 2));
    }
}

function getLocalData(): LocalData {
    ensureLocalData();
    try {
        return JSON.parse(fs.readFileSync(LOCAL_DATA_PATH, 'utf-8'));
    } catch {
        return { tickets: [], messages: [], settings: { max_open_tickets: 3 } };
    }
}

function saveLocalData(data: LocalData) {
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(data, null, 2));
}

async function isDbEnabled() {
    const config = getDbConfig();
    return config && config.enabled;
}

async function checkServerMode() {
    const { isServerMode } = await import('@/lib/system-config');
    if (isServerMode()) {
        throw new Error("Ubuntu Server Mode enabled. Local support data disabled.");
    }
}

// --- Service Methods ---

export async function checkOpenTicketsLimit(userId: number, maxTickets: number): Promise<boolean> {
    if (await isDbEnabled()) {
        const res: any = await query(
            'SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ? AND status != "closed" AND status != "solved"',
            [userId]
        );
        return res[0].count < maxTickets;
    } else {
        const data = getLocalData();
        const count = data.tickets.filter(t => t.user_id === userId && t.status !== 'closed' && t.status !== 'solved').length;
        return count < maxTickets;
    }
}

export async function getMaxTicketsSetting(): Promise<number> {
    if (await isDbEnabled()) {
        const res: any = await query('SELECT setting_value FROM system_settings WHERE setting_key = "max_open_tickets"');
        return res.length ? parseInt(res[0].setting_value) : 3;
    } else {
        const data = getLocalData();
        return data.settings.max_open_tickets;
    }
}

export async function setMaxTicketsSetting(value: number) {
    if (await isDbEnabled()) {
        await query(`
            INSERT INTO system_settings (setting_key, setting_value) 
            VALUES ('max_open_tickets', ?) 
            ON DUPLICATE KEY UPDATE setting_value = ?
        `, [value, value]);
    } else {
        const data = getLocalData();
        data.settings.max_open_tickets = value;
        saveLocalData(data);
    }
}

// Helper to get user details for priority/suspension
async function getUserDetails(userId: number) {
    if (await isDbEnabled()) {
        const res: any = await query('SELECT support_priority, support_suspended FROM users WHERE id = ?', [userId]);
        return res[0];
    } else {
        const { getUserById } = await import('./auth');
        return await getUserById(userId);
    }
}

export async function createTicket(userId: number, subject: string, priority: string, message: string) {
    // Check suspension and get default priority
    const user = await getUserDetails(userId);
    if (!user) throw new Error("User not found");

    if (user.support_suspended) {
        throw new Error("You are suspended from creating support tickets.");
    }

    // Determine final priority
    // If user explicitly asks for 'urgent', allow it (admin requested "urgent option which admin will atend you no matter what priority")
    // Otherwise use their assigned priority (low/medium/high)
    let finalPriority = priority;

    if (priority !== 'urgent') {
        // Enforce user's assigned priority if they didn't select urgent
        // actually the prompt says "priority isnt something that the user can choose if not the admin adds it default in the user"
        // BUT "I do need to add a urgent option"
        // So if user passes 'urgent', it is urgent. Else, it is their default.
        finalPriority = user.support_priority || 'tier_1';
    }

    if (await isDbEnabled()) {
        const ticketRes: any = await query(
            'INSERT INTO support_tickets (user_id, subject, priority, status) VALUES (?, ?, ?, "open")',
            [userId, subject, finalPriority]
        );
        const ticketId = ticketRes.insertId;
        await query(
            'INSERT INTO support_messages (ticket_id, sender_type, sender_id, message) VALUES (?, "user", ?, ?)',
            [ticketId, userId, message]
        );
        return ticketId;
    } else {
        await checkServerMode();
        const data = getLocalData();
        const ticketId = data.tickets.length > 0 ? Math.max(...data.tickets.map(t => t.id)) + 1 : 1;
        const now = new Date().toISOString();

        const newTicket: SupportTicket = {
            id: ticketId,
            user_id: userId,
            subject,
            priority: finalPriority as any,
            status: 'open',
            created_at: now,
            updated_at: now
        };

        const newMessage: SupportMessage = {
            id: data.messages.length > 0 ? Math.max(...data.messages.map(m => m.id)) + 1 : 1,
            ticket_id: ticketId,
            sender_type: 'user',
            sender_id: userId,
            message,
            created_at: now
        };

        data.tickets.push(newTicket);
        data.messages.push(newMessage);
        saveLocalData(data);
        return ticketId;
    }
}

export async function getTicketsByUser(userId: number) {
    if (await isDbEnabled()) {
        return await query(
            'SELECT * FROM support_tickets WHERE user_id = ? AND status != "solved" ORDER BY updated_at DESC',
            [userId]
        );
    } else {
        const data = getLocalData();
        return data.tickets
            .filter(t => t.user_id === userId && t.status !== 'solved')
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
}

export async function getAllTicketsWithUsers() {
    if (await isDbEnabled()) {
        return await query(`
            SELECT t.*, u.email 
            FROM support_tickets t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY 
                CASE WHEN t.status IN ('open', 'customer_reply') THEN 0 ELSE 1 END,
                t.updated_at DESC
        `);
    } else {
        const data = getLocalData();
        // Mock join with auth.ts users? 
        // We can't easily access auth.ts users in the same way without duplication or import.
        // For local mode, we'll try to just return userId as email fallback or fetch from auth logic if possible.
        // Let's import getAllUsers from auth to map?
        // Note: auth.ts is purely Client-side or Read-Only server side mock.
        // We will just return the tickets. Admin UI should handle missing email gracefully or we mock it.
        const { getAllUsers } = await import('./auth');
        const users = await getAllUsers(); // This works if server-side auth.ts returns defaults.

        return data.tickets.map(t => {
            const user = users.find(u => u.id === t.user_id);
            return {
                ...t,
                email: user ? user.email : `User ${t.user_id}`
            };
        }).sort((a, b) => {
            const priorityA = (a.status === 'open' || a.status === 'customer_reply') ? 0 : 1;
            const priorityB = (b.status === 'open' || b.status === 'customer_reply') ? 0 : 1;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }
}

export async function getTicketById(ticketId: number) {
    if (await isDbEnabled()) {
        const tickets: any = await query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
        return tickets[0];
    } else {
        const data = getLocalData();
        return data.tickets.find(t => t.id === ticketId);
    }
}

export async function getTicketMessages(ticketId: number) {
    if (await isDbEnabled()) {
        return await query(
            'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
            [ticketId]
        );
    } else {
        const data = getLocalData();
        return data.messages
            .filter(m => m.ticket_id === ticketId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
}

export async function addMessage(ticketId: number, senderType: 'user' | 'admin', senderId: number, message: string) {
    if (await isDbEnabled()) {
        await query(
            'INSERT INTO support_messages (ticket_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)',
            [ticketId, senderType, senderId, message]
        );
    } else {
        await checkServerMode();
        const data = getLocalData();
        const newMessage: SupportMessage = {
            id: data.messages.length > 0 ? Math.max(...data.messages.map(m => m.id)) + 1 : 1,
            ticket_id: ticketId,
            sender_type: senderType,
            sender_id: senderId,
            message,
            created_at: new Date().toISOString()
        };
        data.messages.push(newMessage);
        saveLocalData(data);
    }
}

export async function updateTicketStatus(ticketId: number, status?: string, priority?: string) {
    if (await isDbEnabled()) {
        if (status) query('UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?', [status, ticketId]);
        if (priority) query('UPDATE support_tickets SET priority = ? WHERE id = ?', [priority, ticketId]);
    } else {
        await checkServerMode();
        const data = getLocalData();
        const ticket = data.tickets.find(t => t.id === ticketId);
        if (ticket) {
            if (status) {
                ticket.status = status as any;
                ticket.updated_at = new Date().toISOString();
            }
            if (priority) ticket.priority = priority as any;
            saveLocalData(data);
        }
    }
}
