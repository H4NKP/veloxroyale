import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername, updateUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, token, password } = await req.json();

        if (!email || !token || !password) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const user = await getUserByEmailOrUsername(email);

        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Verify token exists and matches
        if (!user.reset_token || user.reset_token !== token) {
            return NextResponse.json({ success: false, message: 'Invalid reset token' }, { status: 403 });
        }

        // Verify expiry
        if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) {
            return NextResponse.json({ success: false, message: 'Reset token has expired' }, { status: 403 });
        }

        // Update password and clear token
        // If remote DB is enabled, lib/auth.ts's updateUser will call PUT /api/users
        // Our modified PUT /api/users handles resetToken check.
        // For local mode, updateUser handles it directly.
        await updateUser(user.id, { password }, token);

        return NextResponse.json({ success: true, message: 'Password has been reset successfully' });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
