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
            date, time, partySize, status, source, notes, allergies,
            raw_commentary, structured_commentary, staff_notes
        } = body;

        const sql = `
            INSERT INTO reservations (
                userId, serverId, customerName, customerPhone, 
                date, time, partySize, status, source, created_at, notes, allergies,
                raw_commentary, structured_commentary, staff_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            userId, serverId, customerName, customerPhone,
            date, time, partySize, status || 'pending', source,
            new Date().toISOString(), notes || '', allergies || '',
            raw_commentary || '',
            typeof structured_commentary === 'object' ? JSON.stringify(structured_commentary) : (structured_commentary || '{}'),
            staff_notes || ''
        ];

        const result: any = await query(sql, params);
        return NextResponse.json({ id: result.insertId, ...body });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, userId, adminAccess, ...updates } = body;

        if (!userId && !adminAccess) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch current reservation data to check for core changes and get server info
        const [currentRes]: any = await query('SELECT * FROM reservations WHERE id = ?', [id]);
        if (!currentRes) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        let sql = '';
        let params: any[] = [];

        if (adminAccess) {
            sql = `UPDATE reservations SET ${fields} WHERE id = ?`;
            params = [...values, id];
        } else {
            sql = `UPDATE reservations SET ${fields} WHERE id = ? AND userId = ?`;
            params = [...values, id, userId];
        }

        const result: any = await query(sql, params);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Reservation not found or access denied' }, { status: 403 });
        }

        // Check if core fields were modified
        const coreFields = ['customerName', 'partySize', 'date', 'time'];
        const isCoreChanged = coreFields.some(field =>
            updates[field] !== undefined && String(updates[field]) !== String(currentRes[field])
        );

        if (isCoreChanged && currentRes.customerPhone && currentRes.source === 'WhatsApp') {
            try {
                // Fetch server details for WhatsApp API
                const [server]: any = await query('SELECT * FROM servers WHERE id = ?', [currentRes.serverId]);
                if (server && server.whatsappApiToken && server.whatsappPhoneNumberId) {
                    const lang = server.config?.aiLanguage || 'es';
                    const name = updates.customerName || currentRes.customerName;
                    const pax = updates.partySize || currentRes.partySize;
                    const date = updates.date || currentRes.date;
                    const time = updates.time || currentRes.time;

                    const msgEn = `Hello ${name}! Your reservation has been updated:\n- Guests: ${pax}\n- Date: ${date}\n- Time: ${time}\nSee you soon!`;
                    const msgEs = `¡Hola ${name}! Tu reserva ha sido actualizada:\n- Personas: ${pax}\n- Fecha: ${date}\n- Hora: ${time}\n¡Te esperamos!`;

                    const finalMsg = lang === 'en' ? msgEn : msgEs;
                    await sendWhatsAppMessage(server.whatsappApiToken, server.whatsappPhoneNumberId, currentRes.customerPhone, finalMsg);
                }
            } catch (err) {
                console.error("[Notification Error]", err);
            }
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
