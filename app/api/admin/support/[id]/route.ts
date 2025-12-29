import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, getTicketMessages, addMessage, updateTicketStatus } from '@/lib/support-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);

        const ticket = await getTicketById(ticketId);
        if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Augment with email if missing? The service handles getAllTicketsWithUsers but not single getTicketByIdWithUser
        // However, the admin details page probably needs the email.
        // Let's add email fetching to getTicketById if needed, or just let it be.
        // Actually, the frontend might rely on user email being present on the list, but not necessarily on the detail view if it's already known.
        // But let's check the frontend code later if needed. For now, basic retrieval.
        // Wait, generic getTicketById in service doesn't return email mock joined.

        // Quick fix: fetch user mock for email if local.
        if (!ticket.email) {
            const { getAllUsers } = await import('@/lib/auth');
            const users = await getAllUsers();
            const user = users.find(u => u.id === ticket.user_id);
            if (user) ticket.email = user.email;
        }

        const messages = await getTicketMessages(ticketId);

        return NextResponse.json({ ticket, messages });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);
        const { status, priority } = await req.json();

        await updateTicketStatus(ticketId, status, priority);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ticketId = parseInt(id);
        const { message, adminId } = await req.json();

        await updateTicketStatus(ticketId, 'answered');
        await addMessage(ticketId, 'admin', adminId || 0, message);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
