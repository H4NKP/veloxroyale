import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const SMTP_CONFIG_PATH = path.join(process.cwd(), 'smtp_config.json');

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    from: string;
    enabled: boolean;
}

export function getSmtpConfig(): SmtpConfig | null {
    if (!fs.existsSync(SMTP_CONFIG_PATH)) return null;
    try {
        return JSON.parse(fs.readFileSync(SMTP_CONFIG_PATH, 'utf-8'));
    } catch {
        return null;
    }
}

export function saveSmtpConfig(config: SmtpConfig) {
    fs.writeFileSync(SMTP_CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function sendEmail(to: string, subject: string, html: string) {
    const config = getSmtpConfig();
    if (!config || !config.enabled) {
        console.log('[Email] SMTP disabled or not configured. Would send:', { to, subject });
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        await transporter.sendMail({
            from: config.from || config.user,
            to,
            subject,
            html,
        });
        return true;
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
        throw error;
    }
}
