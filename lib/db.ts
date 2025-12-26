import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'database_config.json');

export interface DbConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    enabled: boolean;
}

export function getDbConfig(): DbConfig | null {
    // Priority 1: Environment Variables
    if (process.env.DB_HOST) {
        return {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'velox_panel',
            enabled: true
        };
    }

    // Priority 2: Config File
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export function saveDbConfig(config: DbConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

let pool: any = null;

export async function getPool() {
    const config = getDbConfig();
    if (!config || !config.enabled) return null;

    if (!pool) {
        pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

export async function query(sql: string, params?: any[]) {
    const p = await getPool();
    if (!p) throw new Error("Database not configured or disabled.");
    const [results] = await p.execute(sql, params);
    return results;
}
