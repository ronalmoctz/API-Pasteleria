import { createClient, RedisClientType } from 'redis';
import { ENV } from './env.js';
import { logger } from '@/utils/logger.js';

const DEFAULT_CONNECT_TIMEOUT = 10000;
const MAX_ATTEMPTS = 5;

function parseDb(value?: string | number) {
    if (value === undefined || value === null || value === '') return 0;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : 0; // fallback a 0 si no es válido
}

const buildRedisOptions = () => {
    const tlsEnabled = ENV.REDIS_FORCE_TLS === 'true';
    
    if (ENV.REDIS_URL) {
        const socketConfig: any = {
            connectTimeout: Number(ENV.REDIS_CONNECT_TIMEOUT ?? DEFAULT_CONNECT_TIMEOUT),
            reconnectStrategy: (retries: number) => Math.min(100 * Math.pow(2, retries), 5000),
        };
        if (tlsEnabled) {
            socketConfig.tls = true;
        }
        
        return {
            url: ENV.REDIS_URL,
            socket: socketConfig,
            username: ENV.REDIS_USERNAME || undefined,
            password: ENV.REDIS_PASSWORD || undefined,
            database: parseDb(ENV.REDIS_DB),
        };
    }

    const socketConfig: any = {
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT ? Number(ENV.REDIS_PORT) : undefined,
        connectTimeout: Number(ENV.REDIS_CONNECT_TIMEOUT ?? DEFAULT_CONNECT_TIMEOUT),
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 5000),
    };
    if (tlsEnabled) {
        socketConfig.tls = true;
    }

    return {
        socket: socketConfig,
        username: ENV.REDIS_USERNAME || undefined,
        password: ENV.REDIS_PASSWORD || undefined,
        database: parseDb(ENV.REDIS_DB),
    };
};

const redisOptions = buildRedisOptions();
export const redisClient: RedisClientType = createClient(redisOptions);

// Listeners con logging completo
redisClient.on('error', (err) => {
    // usa console.error para asegurar que se vea el stack en terminal mientras debugging
    console.error('Redis Client Error (stack):', err instanceof Error ? err.stack : err);
    logger.error('Redis Client Error', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
});

redisClient.on('connect', () => logger.info('Redis client connecting...'));
redisClient.on('ready', () => logger.info('Redis ready and accepting commands'));
redisClient.on('reconnecting', () => logger.warn('Redis client attempting to reconnect...'));
redisClient.on('end', () => logger.warn('Redis connection closed (end)'));

// Init con reintentos controlados
export const initRedisConnection = async (maxAttempts = MAX_ATTEMPTS): Promise<boolean> => {
    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            logger.info(`Attempting to connect to Redis (attempt ${attempt}/${maxAttempts})`);
            if (!redisClient.isOpen) await redisClient.connect();
            const pong = await redisClient.ping();
            logger.info('Redis ping response', { pong });
            return true;
        } catch (error) {
            const msg = error instanceof Error ? (error.stack || error.message) : String(error);
            logger.error('Redis connection attempt failed', { attempt, error: msg });
            const backoff = Math.min(200 * Math.pow(2, attempt), 5000);
            await new Promise((r) => setTimeout(r, backoff));
        }
    }
    logger.error('All Redis connection attempts failed');
    return false;
};

export const closeRedisConnection = async (): Promise<void> => {
    try {
        if (redisClient.isOpen) await redisClient.quit();
        logger.info('Redis connection closed correctly');
    } catch (error) {
        console.error('Error closing Redis connection', error instanceof Error ? error.stack : error);
        logger.error('Error closing Redis connection', { error: error instanceof Error ? error.message : String(error) });
    }
};

export const getRedisStats = async () => {
    try {
        if (!redisClient.isOpen) return { connected: false };

        // info devuelve bloques de texto tipo "key:value"
        const serverInfoRaw = await redisClient.info('server');
        const memoryInfoRaw = await redisClient.info('memory');
        const statsRaw = await redisClient.info('stats');
        const keyspaceRaw = await redisClient.info('keyspace').catch(() => '');

        const parseInfo = (infoStr: string) => {
            const obj: Record<string, string> = {};
            infoStr.split('\n').forEach((line) => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;
                const idx = line.indexOf(':');
                if (idx === -1) return;
                const k = line.slice(0, idx).trim();
                const v = line.slice(idx + 1).trim();
                obj[k] = v;
            });
            return obj;
        };

        const server = parseInfo(serverInfoRaw);
        const memory = parseInfo(memoryInfoRaw);
        const stats = parseInfo(statsRaw);
        const keyspace = parseInfo(keyspaceRaw);

        // resumen legible
        const summary = {
            connected: true,
            isReady: redisClient.isReady,
            server_version: server.redis_version ?? server.redis_version,
            role: server.role ?? 'unknown',
            uptime_seconds: server.uptime_in_seconds ? Number(server.uptime_in_seconds) : undefined,
            connected_clients: stats.connected_clients ? Number(stats.connected_clients) : undefined,
            total_commands_processed: stats.total_commands_processed ? Number(stats.total_commands_processed) : undefined,
            used_memory_bytes: memory.used_memory ? Number(memory.used_memory) : undefined,
            used_memory_rss_bytes: memory.used_memory_rss ? Number(memory.used_memory_rss) : undefined,
            memory_peak_bytes: memory.used_memory_peak ? Number(memory.used_memory_peak) : undefined,
            keyspace: keyspace ? keyspace : {},
            raw: {
                server: serverInfoRaw,
                memory: memoryInfoRaw,
            },
        };

        return summary;
    } catch (error) {
        logger.error('Error getting Redis stats', { error: error instanceof Error ? error.message : String(error) });
        return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

