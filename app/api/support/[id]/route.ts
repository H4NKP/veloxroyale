import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, getTicketMessages, addMessage, updateTicketStatus } from '@/lib/support-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId'); // Security check

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch ticket metadata
        const ticket = await getTicketById(ticketId);
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Security: Ensure user owns ticket
        if (ticket.user_id != userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch messages
        const messages = await getTicketMessages(ticketId);

        return NextResponse.json({ ticket, messages });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);
        const body = await req.json();
        const { userId, message } = body;

        if (!userId || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Update ticket status to 'customer_reply'
        await updateTicketStatus(ticketId, 'customer_reply');

        // Insert message
        await addMessage(ticketId, 'user', userId, message);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
