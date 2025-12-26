import { NextResponse } from 'next/server';
import { getDbConfig } from '@/lib/db';

export async function GET() {
    const config = getDbConfig();

    if (!config || !config.enabled) {
        return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
        enabled: true,
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database
    });
}
