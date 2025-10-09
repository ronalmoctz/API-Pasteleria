import type { ICacheStrategy } from '@/interfaces/cache_strategy_interface.js';
import { ValidationError, DatabaseError } from '@/errors/repository_errors.js';
import { logger } from '@/utils/logger.js';

/**
 * Query structure for database operations
 */
export interface Query {
    sql: string;
    args?: any[];
}

/**
 * Database client interface
 */
interface DBClient {
    execute(query: Query): Promise<any>;
}

/**
 * Schema validator interface
 */
interface SchemaValidator<T> {
    safeParse(data: any): { success: true; data: T } | { success: false; error: any };
}

/**
 * Abstract base repository implementing common CRUD operations
 * Follows Template Method Pattern and DRY principle
 * 
 * @template T - Entity type
 * @template CreateDTO - DTO for creating entity
 * @template UpdateDTO - DTO for updating entity
 */
export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
    /**
     * @param dbClient - Database client instance (Turso/LibSQL)
     * @param cacheStrategy - Cache strategy implementation (Redis, NodeCache, etc.)
     */
    constructor(
        protected readonly dbClient: DBClient,
        protected readonly cacheStrategy: ICacheStrategy
    ) {}

    /**
     * Table name for this repository
     * Must be implemented by concrete repositories
     */
    protected abstract readonly tableName: string;

    /**
     * Cache key prefix for this repository
     * Must be implemented by concrete repositories
     */
    protected abstract readonly cachePrefix: string;

    /**
     * Schema validator for validation
     * Must be implemented by concrete repositories
     */
    protected abstract readonly schema: SchemaValidator<T>;

    /**
     * Default cache TTL in seconds
     */
    protected readonly defaultCacheTTL = 300;

    /**
     * Validates raw data against the schema
     * 
     * @param rawData - Raw data from database
     * @param context - Context for error logging
     * @returns Validated and typed data
     * @throws {ValidationError} If validation fails
     */
    protected validateData(rawData: any, context: string): T {
        const validationResult = this.schema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = `Invalid ${this.tableName} data during ${context}`;
            logger.error(errorMessage, {
                error: validationResult.error,
                rawData,
                context,
                table: this.tableName
            });
            throw new ValidationError(errorMessage, validationResult.error);
        }

        return validationResult.data;
    }

    /**
     * Executes a database query with error handling
     * 
     * @param query - Query object with SQL and arguments
     * @param operation - Operation description for logging
     * @returns Query result
     * @throws {DatabaseError} If query execution fails
     */
    protected async executeDatabaseQuery(query: Query, operation: string) {
        try {
            logger.debug(`Executing database query: ${operation}`, {
                table: this.tableName,
                operation
            });
            
            return await this.dbClient.execute(query);
        } catch (databaseError) {
            const errorMessage = `Database operation failed: ${operation}`;
            logger.error(errorMessage, {
                error: databaseError,
                query: { ...query, args: query.args ? '[REDACTED]' : undefined },
                table: this.tableName,
                operation
            });
            throw new DatabaseError(errorMessage, databaseError);
        }
    }

    /**
     * Invalidates all cache entries for this repository
     */
    protected async invalidateAllCache(): Promise<void> {
        await this.cacheStrategy.delPattern(`${this.cachePrefix}:*`);
        logger.debug('All cache invalidated', { cachePrefix: this.cachePrefix });
    }

    /**
     * Invalidates a specific cache entry
     * 
     * @param key - Cache key to invalidate
     */
    protected async invalidateCache(key: string): Promise<void> {
        await this.cacheStrategy.del(key);
        logger.debug('Cache invalidated', { key, cachePrefix: this.cachePrefix });
    }

    /**
     * Generates a cache key
     * 
     * @param suffix - Suffix to append to cache prefix
     * @returns Full cache key
     */
    protected getCacheKey(suffix: string): string {
        return `${this.cachePrefix}:${suffix}`;
    }

    /**
     * Validates an array of rows from database
     * Skips invalid rows and logs warnings
     * 
     * @param rows - Array of raw rows from database
     * @param context - Context for error logging
     * @returns Array of validated entities
     */
    protected validateRows(rows: any[], context: string): T[] {
        const validatedItems: T[] = [];

        for (const row of rows) {
            try {
                const validatedItem = this.validateData(row, context);
                validatedItems.push(validatedItem);
            } catch (validationError) {
                logger.warn(`Skipping invalid ${this.tableName} row`, {
                    error: validationError,
                    row,
                    context
                });
            }
        }

        return validatedItems;
    }

    /**
     * Gets an item from cache or database
     * Template method for cached retrieval
     * 
     * @param cacheKey - Cache key
     * @param query - Database query to execute if cache misses
     * @param cacheTTL - Cache TTL in seconds
     * @param context - Context for logging
     * @returns Entity or null if not found
     */
    protected async getFromCacheOrDB(
        cacheKey: string,
        query: Query,
        cacheTTL: number,
        context: string
    ): Promise<T | null> {
        // Check cache first
        const cached = await this.cacheStrategy.get<T>(cacheKey);
        if (cached) {
            logger.debug(`${this.tableName} retrieved from cache`, { cacheKey });
            return cached;
        }

        // Query database
        const queryResult = await this.executeDatabaseQuery(query, context);
        const row = queryResult.rows[0];

        if (!row) {
            logger.debug(`${this.tableName} not found`, { context });
            return null;
        }

        const validated = this.validateData(row, context);

        // Cache the result
        await this.cacheStrategy.set(cacheKey, validated, cacheTTL);

        logger.debug(`${this.tableName} retrieved from database and cached`, { cacheKey });
        return validated;
    }

    /**
     * Gets multiple items from cache or database
     * Template method for cached list retrieval
     * 
     * @param cacheKey - Cache key
     * @param query - Database query to execute if cache misses
     * @param cacheTTL - Cache TTL in seconds
     * @param context - Context for logging
     * @returns Array of entities
     */
    protected async getListFromCacheOrDB(
        cacheKey: string,
        query: Query,
        cacheTTL: number,
        context: string
    ): Promise<T[]> {
        // Check cache first
        const cached = await this.cacheStrategy.get<T[]>(cacheKey);
        if (cached) {
            logger.debug(`${this.tableName} list retrieved from cache`, { cacheKey });
            return cached;
        }

        // Query database
        const queryResult = await this.executeDatabaseQuery(query, context);
        const validatedItems = this.validateRows(queryResult.rows, context);

        // Cache the results
        await this.cacheStrategy.set(cacheKey, validatedItems, cacheTTL);

        logger.info(`${this.tableName} list retrieved from database`, {
            count: validatedItems.length,
            context
        });

        return validatedItems;
    }
}
