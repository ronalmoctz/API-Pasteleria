import { cache } from "@/utils/cache.js";
import { turso } from "@/config/tursoClient.js";
import { logger } from "@/utils/logger.js";
import type { OrderStatus } from "@/interfaces/orders_status_interface.js";
import type { CreateOrderStatus, UpdateOrderStatus } from "@/schemas/orders_status_schema.js";
import { orderStatusSchema } from "@/schemas/orders_status_schema.js";

// Cache configuration
const CACHE_KEYS = {
    ALL_ORDER_STATUSES: "order_statuses:all",
    ORDER_STATUS_BY_ID: (id: number) => `order_statuses:id:${id}`,
} as const;

const CACHE_TTL = {
    ORDER_STATUSES: 600, // 10 minutes (statuses change less frequently)
    SINGLE_ORDER_STATUS: 900, // 15 minutes
} as const;

// Custom error classes
class ValidationError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = 'ValidationError';
    }
}

class DatabaseError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export class OrderStatusRepository {
    /**
     * Validates order status data using Zod schema
     */
    private validateOrderStatusData(rawData: any, context: string): OrderStatus {
        const validationResult = orderStatusSchema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = `Invalid order status data during ${context}`;
            logger.error(errorMessage, {
                error: validationResult.error,
                rawData,
                context
            });
            throw new ValidationError(errorMessage, validationResult.error);
        }

        return validationResult.data;
    }

    /**
     * Invalidates all order status-related cache entries
     */
    private invalidateOrderStatusCache(): void {
        cache.del(CACHE_KEYS.ALL_ORDER_STATUSES);
        logger.debug("Order status cache invalidated");
    }

    /**
     * Invalidates specific order status cache entry
     */
    private invalidateSingleOrderStatusCache(orderStatusId: number): void {
        cache.del(CACHE_KEYS.ORDER_STATUS_BY_ID(orderStatusId));
        logger.debug("Single order status cache invalidated", { orderStatusId });
    }

    /**
     * Executes database query with error handling
     */
    private async executeDatabaseQuery(query: { sql: string; args?: any[] }, operation: string) {
        try {
            return await turso.execute(query);
        } catch (databaseError) {
            const errorMessage = `Database operation failed: ${operation}`;
            logger.error(errorMessage, { error: databaseError, query });
            throw new DatabaseError(errorMessage, databaseError);
        }
    }

    /**
     * Creates a new order status
     */
    async create(orderStatusData: CreateOrderStatus): Promise<OrderStatus> {
        const insertQuery = {
            sql: `INSERT INTO order_statuses (status_name) VALUES (?) RETURNING *`,
            args: [orderStatusData.status_name],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create order status");
        const createdOrderStatusRow = queryResult.rows[0];

        if (!createdOrderStatusRow) {
            const errorMessage = "No data returned after order status creation";
            logger.error(errorMessage, { orderStatusData });
            throw new DatabaseError(errorMessage);
        }

        const validatedOrderStatus = this.validateOrderStatusData(
            createdOrderStatusRow,
            "order status creation"
        );

        // Invalidate cache after successful creation
        this.invalidateOrderStatusCache();

        logger.info("Order status created successfully", {
            orderStatusId: validatedOrderStatus.id,
            statusName: validatedOrderStatus.status_name
        });

        return validatedOrderStatus;
    }

    /**
     * Retrieves all order statuses with caching
     */
    async findAll(): Promise<OrderStatus[]> {
        // Check cache first
        const cachedOrderStatuses = cache.get<OrderStatus[]>(CACHE_KEYS.ALL_ORDER_STATUSES);
        if (cachedOrderStatuses) {
            logger.debug("Order statuses retrieved from cache");
            return cachedOrderStatuses;
        }

        // Query database
        const selectQuery = { sql: `SELECT * FROM order_statuses ORDER BY status_name` };
        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch all order statuses");

        const validatedOrderStatuses: OrderStatus[] = [];

        for (const orderStatusRow of queryResult.rows) {
            try {
                const validatedOrderStatus = this.validateOrderStatusData(
                    orderStatusRow,
                    "bulk order status retrieval"
                );
                validatedOrderStatuses.push(validatedOrderStatus);
            } catch (validationError) {
                logger.warn("Skipping invalid order status row", {
                    error: validationError,
                    row: orderStatusRow
                });
                // Continue processing other rows instead of throwing
            }
        }

        // Cache the results
        cache.set(CACHE_KEYS.ALL_ORDER_STATUSES, validatedOrderStatuses, CACHE_TTL.ORDER_STATUSES);

        logger.info("Order statuses retrieved from database", {
            count: validatedOrderStatuses.length
        });

        return validatedOrderStatuses;
    }

    /**
     * Finds order status by ID with caching
     */
    async findById(orderStatusId: number): Promise<OrderStatus | null> {
        const cacheKey = CACHE_KEYS.ORDER_STATUS_BY_ID(orderStatusId);

        // Check cache first
        const cachedOrderStatus = cache.get<OrderStatus>(cacheKey);
        if (cachedOrderStatus) {
            logger.debug("Order status retrieved from cache", { orderStatusId });
            return cachedOrderStatus;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM order_statuses WHERE id = ?`,
            args: [orderStatusId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find order status by ID");
        const orderStatusRow = queryResult.rows[0];

        if (!orderStatusRow) {
            logger.debug("Order status not found", { orderStatusId });
            return null;
        }

        const validatedOrderStatus = this.validateOrderStatusData(
            orderStatusRow,
            `order status retrieval by ID: ${orderStatusId}`
        );

        // Cache the result
        cache.set(cacheKey, validatedOrderStatus, CACHE_TTL.SINGLE_ORDER_STATUS);

        logger.debug("Order status retrieved from database", { orderStatusId });
        return validatedOrderStatus;
    }

    /**
     * Updates an existing order status
     */
    async update(orderStatusId: number, updateData: UpdateOrderStatus): Promise<OrderStatus | null> {
        const existingOrderStatus = await this.findById(orderStatusId);
        if (!existingOrderStatus) {
            logger.debug("Order status not found for update", { orderStatusId });
            return null;
        }

        // Merge existing data with updates
        const updatedOrderStatusData = {
            status_name: updateData.status_name ?? existingOrderStatus.status_name,
        };

        const updateQuery = {
            sql: `UPDATE order_statuses SET status_name = ? WHERE id = ? RETURNING *`,
            args: [updatedOrderStatusData.status_name, orderStatusId],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "update order status");
        const updatedOrderStatusRow = queryResult.rows[0];

        if (!updatedOrderStatusRow) {
            const errorMessage = "No data returned after order status update";
            logger.error(errorMessage, { orderStatusId, updateData });
            throw new DatabaseError(errorMessage);
        }

        const validatedUpdatedOrderStatus = this.validateOrderStatusData(
            updatedOrderStatusRow,
            `order status update for ID: ${orderStatusId}`
        );

        // Invalidate relevant cache entries
        this.invalidateOrderStatusCache();
        this.invalidateSingleOrderStatusCache(orderStatusId);

        logger.info("Order status updated successfully", {
            orderStatusId,
            changedFields: Object.keys(updateData)
        });

        return validatedUpdatedOrderStatus;
    }

    /**
     * Deletes an order status by ID
     */
    async delete(orderStatusId: number): Promise<boolean> {
        const deleteQuery = {
            sql: `DELETE FROM order_statuses WHERE id = ?`,
            args: [orderStatusId],
        };

        const queryResult = await this.executeDatabaseQuery(deleteQuery, "delete order status");
        const wasDeleted = queryResult.rowsAffected > 0;

        if (wasDeleted) {
            // Invalidate relevant cache entries
            this.invalidateOrderStatusCache();
            this.invalidateSingleOrderStatusCache(orderStatusId);

            logger.info("Order status deleted successfully", { orderStatusId });
        } else {
            logger.warn("Order status not found for deletion", { orderStatusId });
        }

        return wasDeleted;
    }

    /**
     * Checks if an order status exists by ID
     */
    async exists(orderStatusId: number): Promise<boolean> {
        const orderStatus = await this.findById(orderStatusId);
        return orderStatus !== null;
    }

    /**
     * Finds order statuses by name (partial match)
     */
    async findByName(searchTerm: string): Promise<OrderStatus[]> {
        const searchQuery = {
            sql: `SELECT * FROM order_statuses WHERE status_name ILIKE ? ORDER BY status_name`,
            args: [`%${searchTerm}%`],
        };

        const queryResult = await this.executeDatabaseQuery(searchQuery, "search order statuses by name");
        const matchingOrderStatuses: OrderStatus[] = [];

        for (const orderStatusRow of queryResult.rows) {
            try {
                const validatedOrderStatus = this.validateOrderStatusData(
                    orderStatusRow,
                    "order status search by name"
                );
                matchingOrderStatuses.push(validatedOrderStatus);
            } catch (validationError) {
                logger.warn("Skipping invalid order status row in search", {
                    error: validationError,
                    row: orderStatusRow
                });
            }
        }

        logger.debug("Order statuses found by name search", {
            searchTerm,
            resultCount: matchingOrderStatuses.length
        });

        return matchingOrderStatuses;
    }

    /**
     * Finds order status by exact name match
     */
    async findByExactName(statusName: string): Promise<OrderStatus | null> {
        const searchQuery = {
            sql: `SELECT * FROM order_statuses WHERE status_name = ?`,
            args: [statusName],
        };

        const queryResult = await this.executeDatabaseQuery(searchQuery, "find order status by exact name");
        const orderStatusRow = queryResult.rows[0];

        if (!orderStatusRow) {
            logger.debug("Order status not found by exact name", { statusName });
            return null;
        }

        const validatedOrderStatus = this.validateOrderStatusData(
            orderStatusRow,
            `order status retrieval by exact name: ${statusName}`
        );

        logger.debug("Order status found by exact name", { statusName });
        return validatedOrderStatus;
    }
}