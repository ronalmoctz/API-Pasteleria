import pino from 'pino';

export const logger = pino({
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