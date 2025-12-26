const T1 = '4c4943454e4349415052495641444f3738393839';
const T2 = '56454c4f582d41444d494e2d323032352d5052454d49554d';

function h(s: string): string {
    let r = '';
    for (let i = 0; i < s.length; i++) {
        r += s.charCodeAt(i).toString(16);
    }
    return r;
}

export function validateLicenseKey(k: string): boolean {
    if (!k) return false;
    const x = h(k.trim().toUpperCase());
    return x === T1 || x === T2;
}

export function isActivated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('veloxai_license_active') === 'true';
}

export function setActivated(s: boolean): void {
    if (typeof window === 'undefined') return;
    if (s) {
        localStorage.setItem('veloxai_license_active', 'true');
        localStorage.setItem('veloxai_activation_date', new Date().toISOString());
    } else {
        localStorage.removeItem('veloxai_license_active');
        localStorage.removeItem('veloxai_activation_date');
    }
}

export function getLicenseInfo() {
    if (typeof window === 'undefined') return { status: 'Unknown', type: 'N/A' };
    const a = isActivated();
    return {
        status: a ? 'Activated' : 'Locked',
        type: a ? 'Permanent' : 'Unlicensed',
        activationDate: localStorage.getItem('veloxai_activation_date') || 'N/A'
    };
}
