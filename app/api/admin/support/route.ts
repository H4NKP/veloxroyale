import { NextRequest, NextResponse } from 'next/server';
import { getAllTicketsWithUsers, getMaxTicketsSetting, setMaxTicketsSetting } from '@/lib/support-service';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type === 'settings') {
            const maxTickets = await getMaxTicketsSetting();
            return NextResponse.json({ maxTickets });
        }

        // List all tickets
        const tickets = await getAllTicketsWithUsers();
        return NextResponse.json(tickets);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type } = body;

        if (type === 'settings') {
            const { maxTickets } = body;
            await setMaxTicketsSetting(maxTickets);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
