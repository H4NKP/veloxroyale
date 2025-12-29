/**
 * Timezone utility for Velox AI Panel.
 * Enforces Canary Islands (Atlantic/Canary) time for critical system functions.
 */

// Canary Islands is usually UTC+0 (WET) in winter and UTC+1 (WEST) in summer.
// We will use Intl.DateTimeFormat to reliably get the time.

export const TIMEZONE = 'Atlantic/Canary';

export function getCanaryDate(): Date {
    // Get current time in tracking timezone
    const now = new Date();
    const canaryString = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    return new Date(canaryString);
}

export function formatCanaryDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-GB', {
        timeZone: TIMEZONE,
        ...options
    });
}

/**
 * Returns the number of days between now (Canary time) and a target date.
 */
export function getDaysRemaining(targetDateStr: string): number {
    const today = getCanaryDate();
    // Normalize today to start of day
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDateStr);
    // Normalize target to start of day (assuming string is YYYY-MM-DD or ISO)
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

export function isExpired(targetDateStr: string): boolean {
    const today = getCanaryDate();
    const target = new Date(targetDateStr);
    // Set target to end of that day effectively
    target.setHours(23, 59, 59, 999);
    return today > target;
}
