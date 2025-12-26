import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(req: NextRequest) {
    try {
        // Authenticate - minimal check (e.g. only Admin can hit this normally via UI)
        // In strictly production, might want session check, but for V1.0 UI gate is primary.

        const logs: string[] = [];

        // 1. Git Pull
        logs.push("Executing: git pull");
        const { stdout: gitOut, stderr: gitErr } = await execAsync('git pull');
        if (gitOut) logs.push(`[git]: ${gitOut}`);
        if (gitErr) logs.push(`[git error]: ${gitErr}`); // git often outputs progress to stderr, not necessarily error

        // 2. NPM Install (optional but recommended if deps change)
        logs.push("Executing: npm install");
        const { stdout: npmOut, stderr: npmErr } = await execAsync('npm install');
        if (npmOut) logs.push(`[npm]: ${npmOut}`);
        // npm stderr is often just warnings/progress

        // 3. Build? (Usually in dev mode no, in prod maybe)
        // For now, let's assume we just update code and restart.
        // If we need to build: 
        // logs.push("Executing: npm run build");
        // await execAsync('npm run build');

        return NextResponse.json({
            success: true,
            message: "Update process completed. Please restart the application if using PM2, or wait for dev server reload.",
            logs
        });

    } catch (error: any) {
        console.error("Update failed:", error);
        return NextResponse.json({
            success: false,
            message: "Update failed: " + error.message
        }, { status: 500 });
    }
}
