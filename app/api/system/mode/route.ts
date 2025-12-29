import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig, saveSystemConfig } from '@/lib/system-config';

export async function GET() {
    return NextResponse.json(getSystemConfig());
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { server_mode } = body;

        if (!['local', 'ubuntu'].includes(server_mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        saveSystemConfig({ server_mode });
        return NextResponse.json({ success: true, server_mode });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
