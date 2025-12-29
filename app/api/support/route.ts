import { NextRequest, NextResponse } from 'next/server';
import { getTicketsByUser, createTicket, checkOpenTicketsLimit, getMaxTicketsSetting } from '@/lib/support-service';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId'); // In real app, get from session

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tickets = await getTicketsByUser(parseInt(userId));
        return NextResponse.json(tickets);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, subject, priority, message } = body;

        if (!userId || !subject || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const maxTickets = await getMaxTicketsSetting();
        const canCreate = await checkOpenTicketsLimit(userId, maxTickets);

        if (!canCreate) {
            return NextResponse.json({ error: `You have reached the limit of ${maxTickets} open tickets.` }, { status: 403 });
        }

        // Create Ticket
        const ticketId = await createTicket(parseInt(userId), subject, priority || 'medium', message);

        return NextResponse.json({ success: true, ticketId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
