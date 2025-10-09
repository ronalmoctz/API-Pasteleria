import { redisClient } from '@/config/redis.js';
import { logger } from '@/utils/logger.js';
import type { ICacheStrategy } from '@/interfaces/cache_strategy_interface.js';

/**
 * Redis implementation of cache strategy
 * Provides caching using Redis as backend
 * @implements {ICacheStrategy}
 */
export class RedisCacheStrategy implements ICacheStrategy {
    /**
     * Default TTL in seconds (5 minutes)
     */
    private readonly DEFAULT_TTL = 300;

    /**
     * Retrieves a value from Redis cache
     * @param key - Cache key
     * @returns Parsed value or undefined if not found or error occurs
     */
    async get<T>(key: string): Promise<T | undefined> {
        try {
            if (!redisClient.isOpen) {
                logger.warn('Redis client not connected, cache miss', { key });
                return undefined;
            }

            const value = await redisClient.get(key);
            if (!value) return undefined;

            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('Error getting value from Redis cache', {
                error: error instanceof Error ? error.message : String(error),
                key
            });
            return undefined;
        }
    }

    /**
     * Stores a value in Redis cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in seconds (default: 300)
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            if (!redisClient.isOpen) {
                logger.warn('Redis client not connected, skipping cache set', { key });
                return;
            }

            const serializedValue = JSON.stringify(value);
            const expiration = ttl ?? this.DEFAULT_TTL;

            await redisClient.setEx(key, expiration, serializedValue);
            
            logger.debug('Value cached in Redis', { key, ttl: expiration });
        } catch (error) {
            logger.error('Error setting value in Redis cache', {
                error: error instanceof Error ? error.message : String(error),
                key
            });
        }
    }

    /**
     * Deletes a specific key from Redis cache
     * @param key - Cache key to delete
     */
    async del(key: string): Promise<void> {
        try {
            if (!redisClient.isOpen) {
                logger.warn('Redis client not connected, skipping cache delete', { key });
                return;
            }

            await redisClient.del(key);
            logger.debug('Key deleted from Redis cache', { key });
        } catch (error) {
            logger.error('Error deleting key from Redis cache', {
                error: error instanceof Error ? error.message : String(error),
                key
            });
        }
    }

    /**
     * Deletes all keys matching a pattern
     * @param pattern - Key pattern (e.g., "orders:*")
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            if (!redisClient.isOpen) {
                logger.warn('Redis client not connected, skipping pattern delete', { pattern });
                return;
            }

            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.debug('Keys deleted from Redis cache', { pattern, count: keys.length });
            }
        } catch (error) {
            logger.error('Error deleting pattern from Redis cache', {
                error: error instanceof Error ? error.message : String(error),
                pattern
            });
        }
    }

    /**
     * Checks if Redis is available and connected
     * @returns true if Redis is operational
     */
    async isAvailable(): Promise<boolean> {
        try {
            if (!redisClient.isOpen) return false;
            
            const pong = await redisClient.ping();
            return pong === 'PONG';
        } catch (error) {
            logger.error('Redis availability check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
}
