import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { getUserByEmailOrUsername, updateUser, getAllUsers } from '@/lib/auth';

// This would typically store tokens in a DB. For local mode, we might need a file or in-memory cache (which resets on restart).
// Since we have `usersDB` in `lib/auth` which uses localStorage on client but memory on server...
// Actually `lib/auth` on server side (API route) uses file system or DB if configured.
// `lib/auth.ts` uses `localStorage` which is client-only.
// We need a server-side persistence for tokens if `lib/auth` is client-side.
// But `app/api/users` reads from DB/File.
// Let's assume we can update the user with a `resetToken` field.

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        const user = await getUserByEmailOrUsername(email);

        if (!user) {
            // Explicitly notify user that email doesn't exist
            return NextResponse.json({
                success: false,
                message: 'No account found with this email address.'
            }, { status: 404 });
        }

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

        await updateUser(user.id, {
            reset_token: token,
            reset_token_expiry: expiry
        });

        const resetLink = `http://${req.headers.get('host')}/auth/reset-password?token=${token}&email=${user.email}`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
                <h1 style="color: #1a202c; text-align: center;">Password Recovery</h1>
                <p style="color: #4a5568; line-height: 1.6;">You've requested to reset your password for your VeloxAI account.</p>
                <p style="color: #4a5568; line-height: 1.6;">Click the button below to set a new password. <strong>This link will expire in 10 minutes.</strong></p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #a0aec0; font-size: 0.875rem; text-align: center; margin-top: 40px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        await sendEmail(user.email, 'Password Recovery - VeloxAI', html);

        return NextResponse.json({ success: true, message: 'Recovery email sent' });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
