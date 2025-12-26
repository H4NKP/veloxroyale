// lib/sync.ts
// Aquí manejamos las versiones del sync global

export async function triggerSync() {
    try {
        await fetch('/api/sync', { method: 'POST' });
        // También lanzamos un evento de local storage para cuando estamos en modo local-only
        if (typeof window !== 'undefined') {
            const current = parseInt(localStorage.getItem('veloxai_sync_version') || '1');
            localStorage.setItem('veloxai_sync_version', (current + 1).toString());
            window.dispatchEvent(new Event('veloxai_sync'));
        }
    } catch (e) {
        console.error("Failed to trigger global sync:", e);
    }
}

export async function getSyncVersion(): Promise<number> {
    try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        return data.version || 1;
    } catch {
        // Por si acaso falla, tiramos del modo local
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem('veloxai_sync_version') || '1');
        }
        return 1;
    }
}
