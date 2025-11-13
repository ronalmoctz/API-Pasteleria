import pino from 'pino';

const pinoLogger = pino({
    // Solo usar pino-pretty en desarrollo
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Configuración para producción
    ...(process.env.NODE_ENV === 'production' && {
        formatters: {
            level: (label) => {
                return { level: label };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    }),
});

/**
 * Logger wrapper that accepts (message, meta) signature
 * and converts it to Pino's (meta, message) signature
 */
export const logger = {
    debug: (message: string, meta?: unknown) => pinoLogger.debug(meta || {}, message),
    info: (message: string, meta?: unknown) => pinoLogger.info(meta || {}, message),
    warn: (message: string, meta?: unknown) => pinoLogger.warn(meta || {}, message),
    error: (message: string, meta?: unknown) => pinoLogger.error(meta || {}, message),
};