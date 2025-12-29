import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

        let sql = 'SELECT id, email, role, status, reset_token, reset_token_expiry, created_at FROM users';
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (username, email, password, role, joined_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            username,
            email,
            hashedPassword,
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
        const { id, oldPassword, ...updates } = body;

        // Security: If updating password, require oldPassword check UNLESS a valid resetToken is provided
        if (updates.password) {
            const { resetToken: providedToken } = body;

            if (providedToken) {
                // Verify reset token
                const verifySql = 'SELECT reset_token, reset_token_expiry FROM users WHERE id = ?';
                const [user]: any = await query(verifySql, [id]);

                if (!user || user.reset_token !== providedToken || new Date(user.reset_token_expiry) < new Date()) {
                    return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 403 });
                }

                // If valid, clear token fields after update
                updates.reset_token = null;
                updates.reset_token_expiry = null;
            } else if (!oldPassword) {
                return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
            } else {
                // Verify old password using bcrypt
                const verifySql = 'SELECT password FROM users WHERE id = ?';
                const [user]: any = await query(verifySql, [id]);

                if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
                    return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
                }
            }

            // Hash the new password before saving (if not already hashed)
            if (!updates.password.startsWith('$2a$')) {
                updates.password = await bcrypt.hash(updates.password, 10);
            }
        }

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        const sql = `UPDATE users SET ${fields} WHERE id = ?`;
        await query(sql, [...values, id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
