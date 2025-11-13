import NodeCache from 'node-cache';
import { logger } from '@/utils/logger.js';
import type { ICacheStrategy } from '@/interfaces/cache_strategy_interface.js';

/**
 * Node-Cache implementation of cache strategy
 * Provides in-memory caching using node-cache
 * @implements {ICacheStrategy}
 */
export class NodeCacheStrategy implements ICacheStrategy {
    /**
     * Node-Cache instance with default TTL of 5 minutes (300 seconds)
     */
    private cache: NodeCache;

    /**
     * Default TTL in seconds (5 minutes)
     */
    private readonly DEFAULT_TTL = 300;

    constructor() {
        // Initialize node-cache with default TTL of 300 seconds
        // stdTTL: standard time to live for every generated cache element
        // checkperiod: automatic delete check interval in seconds
        this.cache = new NodeCache({ stdTTL: this.DEFAULT_TTL, checkperiod: 120 });

        // Log cache initialization
        logger.info('NodeCache strategy initialized');
    }

    /**
     * Retrieves a value from cache
     * @param key - Cache key
     * @returns Parsed value or undefined if not found or error occurs
     */
    async get<T>(key: string): Promise<T | undefined> {
        try {
            const value = this.cache.get<T>(key);
            if (!value) {
                logger.debug('Cache miss', { key });
                return undefined;
            }

            logger.debug('Cache hit', { key });
            return value;
        } catch (error) {
            logger.error('Error getting value from cache', {
                error: error instanceof Error ? error.message : String(error),
                key
            });
            return undefined;
        }
    }

    /**
     * Stores a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in seconds (default: 300)
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            const expiration = ttl ?? this.DEFAULT_TTL;
            this.cache.set(key, value, expiration);
            logger.debug('Value cached', { key, ttl: expiration });
        } catch (error) {
            logger.error('Error setting value in cache', {
                error: error instanceof Error ? error.message : String(error),
                key
            });
        }
    }

    /**
     * Deletes a specific key from cache
     * @param key - Cache key to delete
     */
    async del(key: string): Promise<void> {
        try {
            this.cache.del(key);
            logger.debug('Key deleted from cache', { key });
        } catch (error) {
            logger.error('Error deleting key from cache', {
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
            const keys = this.cache.keys();
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            const matchingKeys = keys.filter(key => regex.test(key));

            if (matchingKeys.length > 0) {
                this.cache.del(matchingKeys);
                logger.debug('Keys deleted from cache', { pattern, count: matchingKeys.length });
            }
        } catch (error) {
            logger.error('Error deleting pattern from cache', {
                error: error instanceof Error ? error.message : String(error),
                pattern
            });
        }
    }

    /**
     * Checks if cache is available
     * @returns true if cache is operational (always true for node-cache)
     */
    async isAvailable(): Promise<boolean> {
        try {
            // Node-cache is always available since it's in-memory
            return true;
        } catch (error) {
            logger.error('Cache availability check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
}
