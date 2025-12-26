import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const STATE_FILE = path.join(process.cwd(), 'system_state.json');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const isAdmin = searchParams.get('adminAccess') === 'true';

        if (!userId && !isAdmin) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(file => file.endsWith('.tar.gz'))
            .filter(file => {
                // If admin, show all. If user, show only their user_{id} backups.
                if (isAdmin) return true;
                return file.includes(`user_${userId}_`);
            })
            .map(file => {
                const stats = fs.statSync(path.join(BACKUP_DIR, file));
                return {
                    id: file,
                    filename: file,
                    size: stats.size,
                    createdAt: stats.mtime.toISOString(),
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(backups);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const systemState = body.state || {};
        const userId = body.userId || 'admin';

        // 1. Write the browser state to a server file
        fs.writeFileSync(STATE_FILE, JSON.stringify(systemState, null, 2));

        // 2. Run the backup script (passing userId to specialize filename)
        const { stdout, stderr } = await execAsync(`bash scripts/backup.sh user_${userId}`);

        if (stderr && !stdout.includes('Backup successful')) {
            throw new Error(stderr);
        }

        // 3. Find the created file
        const files = fs.readdirSync(BACKUP_DIR);
        const latestFile = files
            .filter(file => file.endsWith('.tar.gz'))
            .map(file => ({
                file,
                mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime
            }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];

        const stats = fs.statSync(path.join(BACKUP_DIR, latestFile.file));

        return NextResponse.json({
            message: 'Backup created successfully',
            backup: {
                id: latestFile.file,
                filename: latestFile.file,
                size: stats.size,
                createdAt: stats.mtime.toISOString(),
            },
            log: stdout
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const userId = searchParams.get('userId');
        const isAdmin = searchParams.get('adminAccess') === 'true';

        if (!filename) {
            return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
        }

        // Security check: Only allow deleting own backups unless Admin
        if (!isAdmin && !filename.includes(`user_${userId}_`)) {
            return NextResponse.json({ error: 'Access denied: You can only delete your own backups' }, { status: 403 });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        if (filename.includes('..') || filename.includes('/')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        fs.unlinkSync(filePath);

        return NextResponse.json({ message: 'Backup deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
