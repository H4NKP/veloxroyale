import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const filename = file.name;

        // Security Validation
        if (!filename.endsWith('.tar.gz') && !filename.endsWith('.json')) {
            return NextResponse.json({ error: 'Invalid file type. Only .tar.gz or .json allowed.' }, { status: 400 });
        }

        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename security violation.' }, { status: 400 });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        // Convert web File to Node stream and save
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        fs.writeFileSync(filePath, buffer);

        const stats = fs.statSync(filePath);

        return NextResponse.json({
            message: 'File uploaded successfully',
            backup: {
                id: filename,
                filename: filename,
                size: stats.size,
                createdAt: stats.mtime.toISOString(),
            }
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
