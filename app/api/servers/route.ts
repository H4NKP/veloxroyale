import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const isAdmin = searchParams.get('adminAccess') === 'true';

        // Enforcement: Prevent global server leaks
        if (!userId && !isAdmin) {
            return NextResponse.json([]);
        }

        let sql = 'SELECT * FROM servers';
        let params: any[] = [];

        if (userId) {
            sql += ' WHERE userId = ? OR JSON_CONTAINS(subUsers, ?)';
            params = [userId, JSON.stringify({ userId: Number(userId) })];
        }

        const results = await query(sql, params);
        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name, userId, aiApiKey, whatsappApiToken,
            whatsappBusinessId, whatsappPhoneNumberId,
            whatsappClientId, whatsappClientSecret,
            config, subUsers
        } = body;

        const sql = `
            INSERT INTO servers (
                name, userId, aiApiKey, whatsappApiToken, 
                whatsappBusinessId, whatsappPhoneNumberId, 
                whatsappClientId, whatsappClientSecret,
                created_at, config, subUsers
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            name,
            userId,
            aiApiKey || '',
            whatsappApiToken || '',
            whatsappBusinessId || '',
            whatsappPhoneNumberId || '',
            whatsappClientId || '',
            whatsappClientSecret || '',
            new Date().toISOString().split('T')[0],
            JSON.stringify(config || {}),
            JSON.stringify(subUsers || [])
        ];

        const result: any = await query(sql, params);
        return NextResponse.json({ id: result.insertId, ...body });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, userId, ...updates } = body;

        // Security: Must provide userId to prove ownership (or be admin)
        // In a real app, userId comes from session. Here we trust the client's context.
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Missing userId' }, { status: 401 });
        }

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates).map(val =>
            typeof val === 'object' ? JSON.stringify(val) : val
        );

        // Security: Only update if server belongs to userId (or subUser logic if needed, but simplified for ownership)
        const sql = `UPDATE servers SET ${fields} WHERE id = ? AND userId = ?`;
        const result: any = await query(sql, [...values, id, userId]);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Server not found or access denied (Ownership mismatch)' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
        }

        // Security: Only delete if belongs to userId
        const result: any = await query('DELETE FROM servers WHERE id = ? AND userId = ?', [id, userId]);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Server not found or access denied' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
