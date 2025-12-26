import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const STATE_FILE = path.join(process.cwd(), 'system_state.json');

export async function POST(request: NextRequest) {
    try {
        const { filename, userId, adminAccess } = await request.json();

        if (!filename) {
            return NextResponse.json({ error: 'No backup filename provided' }, { status: 400 });
        }

        // Security Check: Ensure user owns this backup
        if (!adminAccess && (!userId || !filename.includes(`user_${userId}_`))) {
            return NextResponse.json({ error: 'Access denied: You can only restore your own backups' }, { status: 403 });
        }

        if (filename.includes('..') || filename.includes('/')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        // Run the restore script (extracts files)
        const { stdout, stderr } = await execAsync(`bash scripts/restore.sh ${filename}`);

        if (stderr && !stdout.includes('Success')) {
            throw new Error(stderr);
        }

        // Read the restored state file
        let systemState = {};
        if (fs.existsSync(STATE_FILE)) {
            try {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                systemState = JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse state file', e);
            }
        }

        return NextResponse.json({
            message: 'System restoration initiated successfully',
            state: systemState,
            log: stdout
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
