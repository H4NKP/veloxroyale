import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'system_config.json');

export interface SystemConfig {
    server_mode: 'local' | 'ubuntu';
}

export function getSystemConfig(): SystemConfig {
    if (!fs.existsSync(CONFIG_PATH)) {
        // Default to local if not set
        const defaultConfig: SystemConfig = { server_mode: 'local' };
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
        } catch (error) {
            console.error("Failed to write default system config:", error);
        }
        return defaultConfig;
    }

    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to read system config:", error);
        return { server_mode: 'local' };
    }
}

export function saveSystemConfig(config: SystemConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function isServerMode(): boolean {
    const config = getSystemConfig();
    return config.server_mode === 'ubuntu';
}
