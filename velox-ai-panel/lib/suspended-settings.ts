// Mock storage for suspended page settings with localStorage persistence
export interface SuspendedPageSettings {
    supportEmail: string;
    customMessage: string;
    reasons: string[];
}

const initialSettings: SuspendedPageSettings = {
    supportEmail: 'support@example.com',
    customMessage: 'Your access to the VeloxAI system has been temporarily suspended.',
    reasons: [
        'Pending payment verification',
        'Terms of service violation',
        'Administrative review',
        'Security concerns'
    ]
};

// Load from localStorage or use initial data
function loadSettings(): SuspendedPageSettings {
    if (typeof window === 'undefined') return initialSettings;

    const stored = localStorage.getItem('veloxai_suspended_settings');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return initialSettings;
        }
    }
    return initialSettings;
}

// Save to localStorage
function saveSettings(settings: SuspendedPageSettings): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('veloxai_suspended_settings', JSON.stringify(settings));
    }
}

let suspendedSettings: SuspendedPageSettings = loadSettings();

export function getSuspendedPageSettings(): SuspendedPageSettings {
    return { ...suspendedSettings };
}

export function updateSuspendedPageSettings(settings: Partial<SuspendedPageSettings>): SuspendedPageSettings {
    suspendedSettings = { ...suspendedSettings, ...settings };
    saveSettings(suspendedSettings);
    return { ...suspendedSettings };
}
