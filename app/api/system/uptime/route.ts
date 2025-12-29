import { NextResponse } from 'next/server';

export async function GET() {
    // process.uptime() returns seconds
    const uptimeSeconds = process.uptime();

    // Format to Human Readable
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    const bootTime = Date.now() - (uptimeSeconds * 1000);

    return NextResponse.json({
        uptimeSeconds,
        uptimeFormatted: `${hours}h ${minutes}m ${seconds}s`,
        bootTime
    });
}
