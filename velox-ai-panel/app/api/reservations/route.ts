import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const serverId = searchParams.get('serverId');
        const isAdmin = searchParams.get('adminAccess') === 'true';

        // Ojo: Si no hay filtro, devolvemos lista vacía para que no se filtre info que no debe
        if (!userId && !serverId && !isAdmin) {
            return NextResponse.json([]);
        }

        let sql = 'SELECT * FROM reservations WHERE 1=1';
        let params: any[] = [];

        if (isAdmin) {
            if (serverId) {
                sql += ' AND serverId = ?';
                params.push(serverId);
            } else if (userId) {
                sql += ' AND userId = ?';
                params.push(userId);
            }
        } else {
            // Usuario normal: TIENE que poner su userId, aunque pase el serverId
            if (serverId && userId) {
                sql += ' AND serverId = ? AND userId = ?';
                params.push(serverId, userId);
            } else if (userId) {
                sql += ' AND userId = ?';
                params.push(userId);
            } else {
                // ¿Sin userId y no es admin? No le damos nada.
                return NextResponse.json([]);
            }
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
            userId, serverId, customerName, customerPhone,
            date, time, partySize, status, source, notes, allergies
        } = body;

        const sql = `
            INSERT INTO reservations (
                userId, serverId, customerName, customerPhone, 
                date, time, partySize, status, source, created_at, notes, allergies
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            userId, serverId, customerName, customerPhone,
            date, time, partySize, status || 'pending', source,
            new Date().toISOString(), notes || '', allergies || ''
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
        const { id, userId, adminAccess, ...updates } = body;

        if (!userId && !adminAccess) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        let sql = '';
        let params: any[] = [];

        if (adminAccess) {
            sql = `UPDATE reservations SET ${fields} WHERE id = ?`;
            params = [...values, id];
        } else {
            // Security: Normal users can only update their own reservations
            sql = `UPDATE reservations SET ${fields} WHERE id = ? AND userId = ?`;
            params = [...values, id, userId];
        }

        const result: any = await query(sql, params);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Reservation not found or access denied' }, { status: 403 });
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
        const isAdmin = searchParams.get('adminAccess') === 'true';

        if (!isAdmin && !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let sql = '';
        let params: any[] = [];

        if (isAdmin) {
            sql = 'DELETE FROM reservations WHERE id = ?';
            params = [id];
        } else {
            sql = 'DELETE FROM reservations WHERE id = ? AND userId = ?';
            params = [id, userId];
        }

        const result: any = await query(sql, params);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Reservation not found or access denied' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
