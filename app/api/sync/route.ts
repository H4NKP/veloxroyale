import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const results: any = await query('SELECT version FROM sync_state WHERE id = 1');
        const version = results[0]?.version || 1;
        return NextResponse.json({ version });
    } catch (e) {
        return NextResponse.json({ version: 1 });
    }
}

export async function POST() {
    try {
        await query('UPDATE sync_state SET version = version + 1 WHERE id = 1');
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
