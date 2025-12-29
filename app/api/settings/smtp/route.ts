import { NextResponse } from 'next/server';
import { getSmtpConfig, saveSmtpConfig, sendEmail, SmtpConfig } from '@/lib/email';

export async function GET() {
    // In a real app, verify session here.
    const config = getSmtpConfig();
    return NextResponse.json(config || {
        host: '',
        port: 587,
        user: '',
        pass: '',
        secure: false,
        from: '',
        enabled: false
    });
}

export async function POST(req: Request) {
    // In a real app, verify session here.
    const body = await req.json();

    // Test Email Mode
    if (body.testEmail) {
        try {
            await sendEmail(body.testEmail, 'VeloxAI SMTP Test', '<h1>SMTP Verified!</h1><p>Your email system is working correctly.</p>');
            return NextResponse.json({ success: true, message: 'Test email sent successfully' });
        } catch (error: any) {
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
    }

    // Save Config Mode
    const newConfig: SmtpConfig = {
        host: body.host,
        port: Number(body.port),
        user: body.user,
        pass: body.pass,
        secure: body.secure,
        from: body.from,
        enabled: body.enabled
    };

    saveSmtpConfig(newConfig);
    return NextResponse.json({ success: true });
}
