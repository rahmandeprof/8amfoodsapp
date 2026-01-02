/**
 * Generate a human-readable order code like "8AM-047"
 * Uses a simple counter approach with daily reset
 */

let dailyCounter = Math.floor(Math.random() * 100); // Start with random offset

export function generateOrderCode(): string {
    dailyCounter = (dailyCounter + 1) % 1000;
    const paddedNumber = String(dailyCounter).padStart(3, '0');
    return `8AM-${paddedNumber}`;
}

/**
 * Reset counter at midnight (call from cron or on first request of day)
 */
export function resetDailyCounter(): void {
    dailyCounter = 0;
}
