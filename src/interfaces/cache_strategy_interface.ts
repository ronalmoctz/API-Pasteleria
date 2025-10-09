/**
 * Interface for cache strategy implementations
 * Allows different cache backends (Redis, NodeCache, etc.)
 * following the Strategy Pattern
 */
export interface ICacheStrategy {
    /**
     * Retrieves a value from cache
     * @param key - Cache key
     * @returns The cached value or undefined if not found
     */
    get<T>(key: string): Promise<T | undefined>;

    /**
     * Stores a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in seconds (optional)
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;

    /**
     * Deletes a value from cache
     * @param key - Cache key
     */
    del(key: string): Promise<void>;

    /**
     * Deletes multiple keys matching a pattern
     * @param pattern - Key pattern (e.g., "orders:*")
     */
    delPattern(pattern: string): Promise<void>;

    /**
     * Checks if cache is available/connected
     * @returns true if cache is operational
     */
    isAvailable(): Promise<boolean>;
}
