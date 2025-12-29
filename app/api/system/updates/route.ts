import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const REPO_URL = 'https://github.com/H4NKP/veloxroyal.git';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const action = body.action || 'check';

        if (action === 'update') {
            try {
                // Perform Update
                const { stdout, stderr } = await execAsync('git pull');
                return NextResponse.json({
                    status: 'success',
                    message: 'System updated successfully.',
                    logs: stdout + '\n' + stderr
                });
            } catch (e: any) {
                console.error("Update failed:", e);
                return NextResponse.json({
                    status: 'error',
                    message: 'Update failed: ' + e.message
                }, { status: 500 });
            }
        }

        // 1. Check Source Availability (Basic connectivity check)
        try {
            const checkRes = await fetch(REPO_URL, { method: 'HEAD' });
            if (!checkRes.ok && checkRes.status !== 405) {
                // If not OK and not 405 (Method Not Allowed - common for GitHub repos), duplicate check?
            }
        } catch (e) {
            return NextResponse.json({ status: 'unavailable', message: 'Error while connecting to repository' });
        }

        // 2. Get Remote Head
        let remoteHash = '';
        try {
            const { stdout } = await execAsync(`git ls-remote ${REPO_URL} HEAD`);
            // Output format: <hash>\tHEAD
            remoteHash = stdout.split('\t')[0].trim();
        } catch (e) {
            console.error("Git ls-remote failed:", e);
            // If git fails, it might be connection.
            return NextResponse.json({ status: 'unavailable', message: 'Error while connecting (Git failed)' });
        }

        if (!remoteHash) {
            return NextResponse.json({ status: 'unavailable', message: 'Source unavailable (No hash found)' });
        }

        // 3. Get Local Head
        let localHash = '';
        try {
            const { stdout } = await execAsync('git rev-parse HEAD');
            localHash = stdout.trim();
        } catch (e) {
            console.warn("Local git rev-parse failed (maybe not a git repo?)", e);
            // If local is not a git repo, we assume it's "Unknown" or maybe "Up to date" to avoid scaring? 
            // Or "Update available" if we assume we are behind?
            // Let's return local_unknown.
            localHash = 'unknown';
        }

        // 4. Compare
        if (localHash === 'unknown') {
            // FALLBACK: Version Check via package.json
            try {
                // 1. Read Local Version
                // We use dynamic import so it doesn't break if file missing, though package.json should exist.
                const localPackage = await import('@/package.json');
                const localVersion = localPackage.version || '0.0.0';

                // 2. Fetch Remote Version
                const rawUrl = 'https://raw.githubusercontent.com/H4NKP/veloxroyal/main/package.json';
                const res = await fetch(rawUrl);
                if (res.ok) {
                    const remotePackage = await res.json();
                    const remoteVersion = remotePackage.version;

                    if (remoteVersion !== localVersion) {
                        return NextResponse.json({
                            status: 'update_available',
                            message: `Update available (v${remoteVersion})`,
                            local: `v${localVersion}`,
                            remote: `v${remoteVersion}`
                        });
                    } else {
                        return NextResponse.json({
                            status: 'up_to_date',
                            message: `System is up to date (v${localVersion})`,
                            local: `v${localVersion}`,
                            remote: `v${remoteVersion}`
                        });
                    }
                }
            } catch (err) {
                console.warn("Fallback version check failed", err);
            }

            // If fallback also failed or yielded no result, return unknown
            return NextResponse.json({
                status: 'update_available',
                message: 'Local version unknown, but remote exists.',
                local: 'Unknown',
                remote: remoteHash
            });
        }

        if (localHash === remoteHash) {
            return NextResponse.json({
                status: 'up_to_date',
                message: 'System is up to date',
                local: localHash,
                remote: remoteHash
            });
        } else {
            return NextResponse.json({
                status: 'update_available',
                message: 'New update available',
                local: localHash,
                remote: remoteHash
            });
        }

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
