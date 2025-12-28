import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        uptime: process.uptime(),
        bootTime: Date.now() - (process.uptime() * 1000)
    });
}
