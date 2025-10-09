import { turso } from "@/config/tursoClient.js";
import { logger } from "@/utils/logger.js";
import type { Order } from "@/interfaces/orders_interface.js";
import type { CreateOrder, UpdateOrder } from "@/schemas/orders_schema.js";
import { orderSchema } from "@/schemas/orders_schema.js";
import { BaseRepository, type Query } from "@/base/base_repository.js";
import type { IOrdersRepository } from "@/interfaces/repositories/orders_repository_interface.js";
import type { ICacheStrategy } from "@/interfaces/cache_strategy_interface.js";
import { DatabaseError } from "@/errors/repository_errors.js";

/**
 * Cache configuration for orders
 */
const CACHE_KEYS = {
    ALL_ORDERS: "all",
    ORDER_BY_ID: (id: number) => `id:${id}`,
    ORDERS_BY_USER: (userId: number) => `user:${userId}`,
    ORDERS_BY_STATUS: (statusId: number) => `status:${statusId}`,
} as const;

/**
 * Cache TTL configuration in seconds
 */
const CACHE_TTL = {
    ORDERS: 180,
    SINGLE_ORDER: 300,
    USER_ORDERS: 240,
    STATUS_ORDERS: 300,
} as const;

/**
 * Repository for Order entity operations
 * Extends BaseRepository to follow DRY principle
 * Implements IOrdersRepository for dependency inversion
 * 
 * @implements {IOrdersRepository}
 * @extends {BaseRepository<Order, CreateOrder, UpdateOrder>}
 */
export class OrdersRepository extends BaseRepository<Order, CreateOrder, UpdateOrder> implements IOrdersRepository {
    protected readonly tableName = 'orders';
    protected readonly cachePrefix = 'orders';
    protected readonly schema = orderSchema;

    /**
     * Creates a new instance of OrdersRepository
     * 
     * @param cacheStrategy - Cache strategy implementation (injected dependency)
     */
    constructor(cacheStrategy: ICacheStrategy) {
        super(turso, cacheStrategy);
    }

    /**
     * Creates a new order in the database
     * 
     * @param orderData - Order creation data
     * @returns Created order with generated ID
     * @throws {DatabaseError} If creation fails
     * @throws {ValidationError} If returned data is invalid
     */
    async create(orderData: CreateOrder): Promise<Order> {
        const insertQuery: Query = {
            sql: `INSERT INTO orders (user_id, status_id, order_date, total_amount, special_instructions) 
                  VALUES (?, ?, datetime('now'), ?, ?) RETURNING *`,
            args: [
                orderData.user_id,
                orderData.status_id,
                orderData.total_amount,
                orderData.special_instructions ?? ''
            ],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create order");
        const createdOrderRow = queryResult.rows[0];

        if (!createdOrderRow) {
            const errorMessage = "No data returned after order creation";
            logger.error(errorMessage, { orderData });
            throw new DatabaseError(errorMessage);
        }

        const validatedOrder = this.validateData(createdOrderRow, "order creation");

        // Invalidate relevant cache entries
        await this.invalidateAllCache();
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(orderData.user_id)));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(orderData.status_id)));

        logger.info("Order created successfully", {
            orderId: validatedOrder.id,
            userId: validatedOrder.user_id,
            totalAmount: validatedOrder.total_amount
        });

        return validatedOrder;
    }

    /**
     * Retrieves all orders with caching
     * Orders are sorted by order_date in descending order
     * 
     * @returns Array of all orders
     * @throws {DatabaseError} If query fails
     */
    async findAll(): Promise<Order[]> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.ALL_ORDERS);
        const query: Query = {
            sql: `SELECT * FROM orders ORDER BY order_date DESC`
        };

        return await this.getListFromCacheOrDB(
            cacheKey,
            query,
            CACHE_TTL.ORDERS,
            "fetch all orders"
        );
    }

    /**
     * Finds an order by ID with caching
     * 
     * @param orderId - Order ID to search for
     * @returns Order if found, null otherwise
     * @throws {DatabaseError} If query fails
     */
    async findById(orderId: number): Promise<Order | null> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.ORDER_BY_ID(orderId));
        const query: Query = {
            sql: `SELECT * FROM orders WHERE id = ?`,
            args: [orderId],
        };

        return await this.getFromCacheOrDB(
            cacheKey,
            query,
            CACHE_TTL.SINGLE_ORDER,
            `find order by ID: ${orderId}`
        );
    }

    /**
     * Finds all orders for a specific user with caching
     * Results are sorted by order_date in descending order
     * 
     * @param userId - User ID to search for
     * @returns Array of user's orders
     * @throws {DatabaseError} If query fails
     */
    async findByUserId(userId: number): Promise<Order[]> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(userId));
        const query: Query = {
            sql: `SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC`,
            args: [userId],
        };

        return await this.getListFromCacheOrDB(
            cacheKey,
            query,
            CACHE_TTL.USER_ORDERS,
            `find orders by user ID: ${userId}`
        );
    }

    /**
     * Finds all orders with a specific status with caching
     * Results are sorted by order_date in descending order
     * 
     * @param statusId - Status ID to search for
     * @returns Array of orders with specified status
     * @throws {DatabaseError} If query fails
     */
    async findByStatus(statusId: number): Promise<Order[]> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(statusId));
        const query: Query = {
            sql: `SELECT * FROM orders WHERE status_id = ? ORDER BY order_date DESC`,
            args: [statusId],
        };

        return await this.getListFromCacheOrDB(
            cacheKey,
            query,
            CACHE_TTL.STATUS_ORDERS,
            `find orders by status ID: ${statusId}`
        );
    }

    /**
     * Updates an existing order
     * Merges update data with existing order data
     * 
     * @param orderId - Order ID to update
     * @param updateData - Partial order data to update
     * @returns Updated order or null if not found
     * @throws {DatabaseError} If update fails
     * @throws {ValidationError} If returned data is invalid
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

        const updateQuery: Query = {
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

        const validatedUpdatedOrder = this.validateData(
            updatedOrderRow,
            `order update for ID: ${orderId}`
        );

        // Invalidate relevant cache entries
        await this.invalidateAllCache();
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDER_BY_ID(orderId)));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(existingOrder.user_id)));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(existingOrder.status_id)));

        // If user or status changed, invalidate new cache entries too
        if (updateData.user_id && updateData.user_id !== existingOrder.user_id) {
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(updateData.user_id)));
        }
        if (updateData.status_id && updateData.status_id !== existingOrder.status_id) {
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(updateData.status_id)));
        }

        logger.info("Order updated successfully", {
            orderId,
            changedFields: Object.keys(updateData)
        });

        return validatedUpdatedOrder;
    }

    /**
     * Deletes an order by ID
     * Invalidates all related cache entries
     * 
     * @param orderId - Order ID to delete
     * @returns true if deleted, false if not found
     * @throws {DatabaseError} If deletion fails
     */
    async delete(orderId: number): Promise<boolean> {
        const existingOrder = await this.findById(orderId);
        if (!existingOrder) {
            logger.warn("Order not found for deletion", { orderId });
            return false;
        }

        const deleteQuery: Query = {
            sql: `DELETE FROM orders WHERE id = ?`,
            args: [orderId],
        };

        const queryResult = await this.executeDatabaseQuery(deleteQuery, "delete order");
        const wasDeleted = queryResult.rowsAffected > 0;

        if (wasDeleted) {
            // Invalidate relevant cache entries
            await this.invalidateAllCache();
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDER_BY_ID(orderId)));
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(existingOrder.user_id)));
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(existingOrder.status_id)));

            logger.info("Order deleted successfully", { orderId });
        }

        return wasDeleted;
    }

    /**
     * Checks if an order exists by ID
     * Uses findById with caching
     * 
     * @param orderId - Order ID to check
     * @returns true if order exists, false otherwise
     */
    async exists(orderId: number): Promise<boolean> {
        const order = await this.findById(orderId);
        return order !== null;
    }

    /**
     * Marks an order as completed
     * Sets completed_at to current timestamp
     * 
     * @param orderId - Order ID to mark as completed
     * @returns Updated order or null if not found
     * @throws {DatabaseError} If update fails
     * @throws {ValidationError} If returned data is invalid
     */
    async markAsCompleted(orderId: number): Promise<Order | null> {
        const updateQuery: Query = {
            sql: `UPDATE orders SET completed_at = datetime('now') WHERE id = ? RETURNING *`,
            args: [orderId],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "mark order as completed");
        const updatedOrderRow = queryResult.rows[0];

        if (!updatedOrderRow) {
            logger.debug("Order not found for completion", { orderId });
            return null;
        }

        const validatedOrder = this.validateData(
            updatedOrderRow,
            `order completion for ID: ${orderId}`
        );

        // Invalidate relevant cache entries
        await this.invalidateAllCache();
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDER_BY_ID(orderId)));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_USER(validatedOrder.user_id)));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ORDERS_BY_STATUS(validatedOrder.status_id)));

        logger.info("Order marked as completed", { orderId });
        return validatedOrder;
    }

    /**
     * Gets total amount spent by a user across all their orders
     * 
     * @param userId - User ID
     * @returns Total amount spent
     * @throws {DatabaseError} If query fails
     */
    async getTotalAmountByUser(userId: number): Promise<number> {
        const selectQuery: Query = {
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
     * Results are sorted by order_date in descending order
     * Not cached due to dynamic nature of date range queries
     * 
     * @param startDate - Start date (ISO string)
     * @param endDate - End date (ISO string)
     * @returns Array of orders within date range
     * @throws {DatabaseError} If query fails
     */
    async getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
        const selectQuery: Query = {
            sql: `SELECT * FROM orders WHERE order_date BETWEEN ? AND ? ORDER BY order_date DESC`,
            args: [startDate, endDate],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch orders by date range");
        const validatedOrders = this.validateRows(
            queryResult.rows,
            `date range order retrieval: ${startDate} to ${endDate}`
        );

        logger.debug("Orders found by date range", {
            startDate,
            endDate,
            resultCount: validatedOrders.length
        });

        return validatedOrders;
    }
}