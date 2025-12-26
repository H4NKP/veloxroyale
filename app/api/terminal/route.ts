import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

// WARNING: This is a powerful feature. In a real production app, 
// you would want extreme security/authentication here.

export async function POST(request: NextRequest) {
    try {
        const { command } = await request.json();

        if (!command) {
            return NextResponse.json({ error: 'No command provided' }, { status: 400 });
        }

        // Determine the project root
        const projectRoot = process.cwd();

        return new Promise<NextResponse>((resolve) => {
            // Execute command in the project root
            exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
                const output = stdout || stderr || '';
                const isError = !!error || !!stderr;

                resolve(
                    NextResponse.json({
                        output,
                        isError,
                        exitCode: error?.code || 0
                    })
                );
            });
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
