/**
 * Utility para formatear diferencias de tiempo de manera legible
 */

interface TimeFormatted {
    value: number;
    unit: string;
    formatted: string;
}

export function formatTimeDifference(startDate: Date | string, endDate: Date | string = new Date()): TimeFormatted {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
        return {
            value: diffYears,
            unit: 'year',
            formatted: `${diffYears}${diffYears === 1 ? 'y' : 'y'}`
        };
    }

    if (diffMonths > 0) {
        return {
            value: diffMonths,
            unit: 'month',
            formatted: `${diffMonths}${diffMonths === 1 ? 'mo' : 'mo'}`
        };
    }

    if (diffWeeks > 0) {
        return {
            value: diffWeeks,
            unit: 'week',
            formatted: `${diffWeeks}${diffWeeks === 1 ? 'w' : 'w'}`
        };
    }

    if (diffDays > 0) {
        return {
            value: diffDays,
            unit: 'day',
            formatted: `${diffDays}${diffDays === 1 ? 'd' : 'd'}`
        };
    }

    if (diffHours > 0) {
        return {
            value: diffHours,
            unit: 'hour',
            formatted: `${diffHours}${diffHours === 1 ? 'h' : 'h'}`
        };
    }

    if (diffMinutes > 0) {
        return {
            value: diffMinutes,
            unit: 'minute',
            formatted: `${diffMinutes}${diffMinutes === 1 ? 'min' : 'min'}`
        };
    }

    return {
        value: diffSeconds,
        unit: 'second',
        formatted: `${diffSeconds}${diffSeconds === 1 ? 's' : 's'}`
    };
}

/**
 * Retorna el estado formateado: "online 5min", "offline 2d", etc.
 */
export function getFormattedStatus(lastSeen: string | null | undefined, isOnline: boolean): string {
    if (!lastSeen) {
        return 'nunca conectado';
    }

    const timeInfo = formatTimeDifference(lastSeen);
    const status = isOnline ? 'online' : 'offline';

    return `${status} ${timeInfo.formatted}`;
}
