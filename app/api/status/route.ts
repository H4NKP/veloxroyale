import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        // Lógica de reseteo al iniciar (Server Restart Detection)
        // Usamos una variable global "lazy" (en serverless esto puede no ser perfecto, pero funciona para VPS/Docker persistente)
        // o mejor: chequeamos uptime del sistema

        // Simplemente ejecutamos un reset si detectamos que no hay chequeos recientes y el server acaba de arrancar
        // Pero para simplificar y cumplir el requerimiento de "reset on restart":
        // Vamos a usar un "global" flag aquí. En Next.js dev server se reinicia, en prod se mantiene mientras el proceso viva.
        if ((global as any).__velox_uptime_reset !== true) {
            await query('UPDATE status_monitors SET total_checks = 0, successful_checks = 0');
            (global as any).__velox_uptime_reset = true;
        }

        const monitors: any = await query('SELECT * FROM status_monitors ORDER BY created_at DESC');

        // Lógica de chequeo en segundo plano: si han pasado más de 10 segundos, checkeamos de nuevo
        const now = Date.now();
        const updatedMonitors = await Promise.all(monitors.map(async (m: any) => {
            // Si está en mantenimiento, ni lo tocamos
            if (m.status === 'maintenance') return m;

            const lastCheck = m.last_check ? new Date(m.last_check).getTime() : 0;

            if (now - lastCheck > 10000) {
                let isUp = false;

                try {
                    if (m.target.startsWith('http')) {
                        // Check web
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        const res = await fetch(m.target, {
                            method: 'HEAD',
                            signal: controller.signal,
                            mode: 'no-cors'
                        });
                        isUp = true;
                        clearTimeout(timeoutId);
                    } else {
                        // Ping ICMP de verdad (para IPs y Dominios)
                        const { exec } = await import('child_process');
                        const { promisify } = await import('util');
                        const execAsync = promisify(exec);

                        // Limpiamos el target (quitamos puertos y protocolos si los hay)
                        const host = m.target.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];

                        // -c 1: un paquetito, -W 2: timeout de 2s
                        await execAsync(`ping -c 1 -W 2 ${host}`);
                        isUp = true;
                    }
                } catch (e) {
                    isUp = false;
                }

                const newStatus = isUp ? 'active' : 'inactive';
                const successCount = isUp ? m.successful_checks + 1 : m.successful_checks;
                const totalCount = m.total_checks + 1;
                const checkTime = new Date().toISOString();

                await query(
                    'UPDATE status_monitors SET status = ?, total_checks = ?, successful_checks = ?, last_check = ? WHERE id = ?',
                    [newStatus, totalCount, successCount, checkTime, m.id]
                );

                return { ...m, status: newStatus, total_checks: totalCount, successful_checks: successCount, last_check: checkTime };
            }
            return m;
        }));

        return NextResponse.json(updatedMonitors);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { id, status } = await req.json();
        await query('UPDATE status_monitors SET status = ? WHERE id = ?', [status, id]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, target } = await req.json();
        const res: any = await query(
            'INSERT INTO status_monitors (name, target, status, created_at) VALUES (?, ?, ?, ?)',
            [name, target, 'active', new Date().toISOString()]
        );

        return NextResponse.json({ id: res.insertId, name, target, status: 'active' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        await query('DELETE FROM status_monitors WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
