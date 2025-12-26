import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const email = searchParams.get('email');
        const isAdmin = searchParams.get('adminAccess') === 'true';

        // Enforcement: Block global user list unless admin
        if (!id && !email && !isAdmin) {
            return NextResponse.json([]);
        }

        let sql = 'SELECT id, username, email, role, joined_at FROM users';
        let params: any[] = [];

        if (id) {
            sql += ' WHERE id = ?';
            params = [id];
        } else if (email) {
            sql += ' WHERE email = ?';
            params = [email];
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
        const { username, email, password, role } = body;

        const sql = `
            INSERT INTO users (username, email, password, role, joined_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            username,
            email,
            password,
            role || 'customer',
            new Date().toISOString().split('T')[0]
        ];

        const result: any = await query(sql, params);
        return NextResponse.json({ id: result.insertId, username, email, role });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        const sql = `UPDATE users SET ${fields} WHERE id = ?`;
        await query(sql, [...values, id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
