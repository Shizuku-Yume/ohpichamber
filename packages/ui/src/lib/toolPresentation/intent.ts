/** OMP trims the intent and drops a trailing run of dots ("Reading files..."). */
export const normalizeIntent = (intent: string): string | null => {
    const trimmed = intent.trim().replace(/\s*\.+$/, '').trim();
    return trimmed.length > 0 ? trimmed : null;
};
