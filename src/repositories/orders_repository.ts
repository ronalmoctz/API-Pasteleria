import { cache } from "@/utils/chache";
import { turso } from "@/config/tursoClient";
import { logger } from "@/utils/logger";
import type { Order } from "@/interfaces/orders_interface";
import type { CreateOrder, UpdateOrder } from "@/schemas/orders_schema";
import { orderSchema } from "@/schemas/orders_schema";

// Cache configuration
const CACHE_KEYS = {
    ALL_ORDERS: "orders:all",
    ORDER_BY_ID: (id: number) => `orders:id:${id}`,
    ORDERS_BY_USER: (userId: number) => `orders:user:${userId}`,
    ORDERS_BY_STATUS: (statusId: number) => `orders:status:${statusId}`,
} as const;

const CACHE_TTL = {
    ORDERS: 180,
    SINGLE_ORDER: 300,
    USER_ORDERS: 240,
    STATUS_ORDERS: 300,
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

export class OrdersRepository {
    /**
     * Validates order data using Zod schema
     */
    private validateOrderData(rawData: any, context: string): Order {
        const validationResult = orderSchema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = `Invalid order data during ${context}`;
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
     * Invalidates all order-related cache entries
     */
    private invalidateOrderCache(): void {
        cache.del(CACHE_KEYS.ALL_ORDERS);
        logger.debug("Order cache invalidated");
    }

    /**
     * Invalidates specific order cache entry
     */
    private invalidateSingleOrderCache(orderId: number): void {
        cache.del(CACHE_KEYS.ORDER_BY_ID(orderId));
        logger.debug("Single order cache invalidated", { orderId });
    }

    /**
     * Invalidates user-specific order cache
     */
    private invalidateUserOrderCache(userId: number): void {
        cache.del(CACHE_KEYS.ORDERS_BY_USER(userId));
        logger.debug("User order cache invalidated", { userId });
    }

    /**
     * Invalidates status-specific order cache
     */
    private invalidateStatusOrderCache(statusId: number): void {
        cache.del(CACHE_KEYS.ORDERS_BY_STATUS(statusId));
        logger.debug("Status order cache invalidated", { statusId });
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
     * Creates a new order
     */
    async create(orderData: CreateOrder): Promise<Order> {
        const insertQuery = {
            sql: `INSERT INTO orders (user_id, status_id, order_date, total_amount, special_instructions) 
                  VALUES (?, ?, datetime('now'), ?, ?) RETURNING *`,
            args: [
                orderData.user_id,
                orderData.status_id,
                orderData.total_amount,
                orderData.special_instructions
            ],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create order");
        const createdOrderRow = queryResult.rows[0];

        if (!createdOrderRow) {
            const errorMessage = "No data returned after order creation";
            logger.error(errorMessage, { orderData });
            throw new DatabaseError(errorMessage);
        }

        const validatedOrder = this.validateOrderData(
            createdOrderRow,
            "order creation"
        );

        // Invalidate relevant cache entries
        this.invalidateOrderCache();
        this.invalidateUserOrderCache(orderData.user_id);
        this.invalidateStatusOrderCache(orderData.status_id);

        logger.info("Order created successfully", {
            orderId: validatedOrder.id,
            userId: validatedOrder.user_id,
            totalAmount: validatedOrder.total_amount
        });

        return validatedOrder;
    }

    /**
     * Retrieves all orders with caching
     */
    async findAll(): Promise<Order[]> {
        // Check cache first
        const cachedOrders = cache.get<Order[]>(CACHE_KEYS.ALL_ORDERS);
        if (cachedOrders) {
            logger.debug("Orders retrieved from cache");
            return cachedOrders;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM orders ORDER BY order_date DESC`
        };
        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch all orders");

        const validatedOrders: Order[] = [];

        for (const orderRow of queryResult.rows) {
            try {
                const validatedOrder = this.validateOrderData(
                    orderRow,
                    "bulk order retrieval"
                );
                validatedOrders.push(validatedOrder);
            } catch (validationError) {
                logger.warn("Skipping invalid order row", {
                    error: validationError,
                    row: orderRow
                });
                // Continue processing other rows instead of throwing
            }
        }

        // Cache the results
        cache.set(CACHE_KEYS.ALL_ORDERS, validatedOrders, CACHE_TTL.ORDERS);

        logger.info("Orders retrieved from database", {
            count: validatedOrders.length
        });

        return validatedOrders;
    }

    /**
     * Finds order by ID with caching
     */
    async findById(orderId: number): Promise<Order | null> {
        const cacheKey = CACHE_KEYS.ORDER_BY_ID(orderId);

        // Check cache first
        const cachedOrder = cache.get<Order>(cacheKey);
        if (cachedOrder) {
            logger.debug("Order retrieved from cache", { orderId });
            return cachedOrder;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM orders WHERE id = ?`,
            args: [orderId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find order by ID");
        const orderRow = queryResult.rows[0];

        if (!orderRow) {
            logger.debug("Order not found", { orderId });
            return null;
        }

        const validatedOrder = this.validateOrderData(
            orderRow,
            `order retrieval by ID: ${orderId}`
        );

        // Cache the result
        cache.set(cacheKey, validatedOrder, CACHE_TTL.SINGLE_ORDER);

        logger.debug("Order retrieved from database", { orderId });
        return validatedOrder;
    }

    /**
     * Finds orders by user ID with caching
     */
    async findByUserId(userId: number): Promise<Order[]> {
        const cacheKey = CACHE_KEYS.ORDERS_BY_USER(userId);

        // Check cache first
        const cachedOrders = cache.get<Order[]>(cacheKey);
        if (cachedOrders) {
            logger.debug("User orders retrieved from cache", { userId });
            return cachedOrders;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC`,
            args: [userId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find orders by user ID");
        const validatedOrders: Order[] = [];

        for (const orderRow of queryResult.rows) {
            try {
                const validatedOrder = this.validateOrderData(
                    orderRow,
                    `user orders retrieval for user: ${userId}`
                );
                validatedOrders.push(validatedOrder);
            } catch (validationError) {
                logger.warn("Skipping invalid order row in user search", {
                    error: validationError,
                    row: orderRow,
                    userId
                });
            }
        }

        // Cache the results
        cache.set(cacheKey, validatedOrders, CACHE_TTL.USER_ORDERS);

        logger.debug("User orders retrieved from database", {
            userId,
            count: validatedOrders.length
        });

        return validatedOrders;
    }

    /**
     * Finds orders by status ID with caching
     */
    async findByStatus(statusId: number): Promise<Order[]> {
        const cacheKey = CACHE_KEYS.ORDERS_BY_STATUS(statusId);

        // Check cache first
        const cachedOrders = cache.get<Order[]>(cacheKey);
        if (cachedOrders) {
            logger.debug("Status orders retrieved from cache", { statusId });
            return cachedOrders;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM orders WHERE status_id = ? ORDER BY order_date DESC`,
            args: [statusId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find orders by status");
        const validatedOrders: Order[] = [];

        for (const orderRow of queryResult.rows) {
            try {
                const validatedOrder = this.validateOrderData(
                    orderRow,
                    `status orders retrieval for status: ${statusId}`
                );
                validatedOrders.push(validatedOrder);
            } catch (validationError) {
                logger.warn("Skipping invalid order row in status search", {
                    error: validationError,
                    row: orderRow,
                    statusId
                });
            }
        }

        // Cache the results
        cache.set(cacheKey, validatedOrders, CACHE_TTL.STATUS_ORDERS);

        logger.debug("Status orders retrieved from database", {
            statusId,
            count: validatedOrders.length
        });

        return validatedOrders;
    }

    /**
     * Updates an existing order
     */
    async update(orderId: number, updateData: UpdateOrder): Promise<Order | null> {
        const existingOrder = await this.findById(orderId);
        if (!existingOrder) {
            logger.debug("Order not found for update", { orderId });
            return null;
        }

        // Merge existing data with updates
        const updatedOrderData = {
            user_id: updateData.user_id ?? existingOrder.user_id,
            status_id: updateData.status_id ?? existingOrder.status_id,
            total_amount: updateData.total_amount ?? existingOrder.total_amount,
            special_instructions: updateData.special_instructions ?? existingOrder.special_instructions,
            completed_at: updateData.completed_at ?? existingOrder.completed_at,
        };

        const updateQuery = {
            sql: `UPDATE orders SET user_id = ?, status_id = ?, total_amount = ?, 
                  special_instructions = ?, completed_at = ? WHERE id = ? RETURNING *`,
            args: [
                updatedOrderData.user_id,
                updatedOrderData.status_id,
                updatedOrderData.total_amount,
                updatedOrderData.special_instructions,
                updatedOrderData.completed_at,
                orderId
            ],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "update order");
        const updatedOrderRow = queryResult.rows[0];

        if (!updatedOrderRow) {
            const errorMessage = "No data returned after order update";
            logger.error(errorMessage, { orderId, updateData });
            throw new DatabaseError(errorMessage);
        }

        const validatedUpdatedOrder = this.validateOrderData(
            updatedOrderRow,
            `order update for ID: ${orderId}`
        );

        // Invalidate relevant cache entries
        this.invalidateOrderCache();
        this.invalidateSingleOrderCache(orderId);
        this.invalidateUserOrderCache(existingOrder.user_id);
        this.invalidateStatusOrderCache(existingOrder.status_id);

        // If user or status changed, invalidate new cache entries too
        if (updateData.user_id && updateData.user_id !== existingOrder.user_id) {
            this.invalidateUserOrderCache(updateData.user_id);
        }
        if (updateData.status_id && updateData.status_id !== existingOrder.status_id) {
            this.invalidateStatusOrderCache(updateData.status_id);
        }

        logger.info("Order updated successfully", {
            orderId,
            changedFields: Object.keys(updateData)
        });

        return validatedUpdatedOrder;
    }

    /**
     * Deletes an order by ID
     */
    async delete(orderId: number): Promise<boolean> {
        const existingOrder = await this.findById(orderId);
        if (!existingOrder) {
            logger.warn("Order not found for deletion", { orderId });
            return false;
        }

        const deleteQuery = {
            sql: `DELETE FROM orders WHERE id = ?`,
            args: [orderId],
        };

        const queryResult = await this.executeDatabaseQuery(deleteQuery, "delete order");
        const wasDeleted = queryResult.rowsAffected > 0;

        if (wasDeleted) {
            // Invalidate relevant cache entries
            this.invalidateOrderCache();
            this.invalidateSingleOrderCache(orderId);
            this.invalidateUserOrderCache(existingOrder.user_id);
            this.invalidateStatusOrderCache(existingOrder.status_id);

            logger.info("Order deleted successfully", { orderId });
        }

        return wasDeleted;
    }

    /**
     * Checks if an order exists by ID
     */
    async exists(orderId: number): Promise<boolean> {
        const order = await this.findById(orderId);
        return order !== null;
    }

    /**
     * Marks an order as completed
     */
    async markAsCompleted(orderId: number): Promise<Order | null> {
        const updateQuery = {
            sql: `UPDATE orders SET completed_at = datetime('now') WHERE id = ? RETURNING *`,
            args: [orderId],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "mark order as completed");
        const updatedOrderRow = queryResult.rows[0];

        if (!updatedOrderRow) {
            logger.debug("Order not found for completion", { orderId });
            return null;
        }

        const validatedOrder = this.validateOrderData(
            updatedOrderRow,
            `order completion for ID: ${orderId}`
        );

        // Invalidate relevant cache entries
        this.invalidateOrderCache();
        this.invalidateSingleOrderCache(orderId);
        this.invalidateUserOrderCache(validatedOrder.user_id);
        this.invalidateStatusOrderCache(validatedOrder.status_id);

        logger.info("Order marked as completed", { orderId });
        return validatedOrder;
    }

    /**
     * Gets total amount spent by a user
     */
    async getTotalAmountByUser(userId: number): Promise<number> {
        const selectQuery = {
            sql: `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = ?`,
            args: [userId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "calculate user total amount");
        const totalAmount = parseFloat(String(queryResult.rows[0].total ?? "0")) || 0;

        logger.debug("User total amount calculated", { userId, totalAmount });
        return totalAmount;
    }

    /**
     * Gets orders within a date range
     */
    async getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
        const selectQuery = {
            sql: `SELECT * FROM orders WHERE order_date BETWEEN ? AND ? ORDER BY order_date DESC`,
            args: [startDate, endDate],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch orders by date range");
        const validatedOrders: Order[] = [];

        for (const orderRow of queryResult.rows) {
            try {
                const validatedOrder = this.validateOrderData(
                    orderRow,
                    `date range order retrieval: ${startDate} to ${endDate}`
                );
                validatedOrders.push(validatedOrder);
            } catch (validationError) {
                logger.warn("Skipping invalid order row in date range search", {
                    error: validationError,
                    row: orderRow,
                    startDate,
                    endDate
                });
            }
        }

        logger.debug("Orders found by date range", {
            startDate,
            endDate,
            resultCount: validatedOrders.length
        });

        return validatedOrders;
    }
}