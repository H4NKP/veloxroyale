import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { host, port, user, password, database } = body;

        const connection = await mysql.createConnection({
            host,
            port: Number(port),
            user,
            password,
            database
        });

        await connection.ping();
        await connection.end();

        return NextResponse.json({ success: true, message: "Connection successful" });
    } catch (error: any) {
        console.error("DB Test Failed:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to connect to database"
        }, { status: 500 });
    }
}
