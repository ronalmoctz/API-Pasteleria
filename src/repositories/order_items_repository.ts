import { turso } from "@/config/tursoClient.js";
import { logger } from "@/utils/logger.js";
import type { OrderItem } from "@/interfaces/order_items_interface.js";
import type { CreateOrderItem, UpdateOrderItem } from "@/schemas/order_items_schema.js";
import { orderItemSchema } from "@/schemas/order_items_schema.js";
import { BaseRepository, type Query } from "@/base/base_repository.js";
import type { ICacheStrategy } from "@/interfaces/cache_strategy_interface.js";
import { DatabaseError } from "@/errors/repository_errors.js";

const CACHE_KEYS = {
    ITEMS_BY_ORDER: (orderId: number) => `order:${orderId}`,
} as const;

const CACHE_TTL = {
    ORDER_ITEMS: 300,
} as const;

export class OrderItemsRepository extends BaseRepository<OrderItem, CreateOrderItem, UpdateOrderItem> {
    protected readonly tableName = 'order_items';
    protected readonly cachePrefix = 'order_items';
    protected readonly schema = orderItemSchema;

    constructor(cacheStrategy: ICacheStrategy) {
        super(turso, cacheStrategy);
    }

    async create(itemData: CreateOrderItem): Promise<OrderItem> {
        const insertQuery: Query = {
            sql: `INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) 
                  VALUES (?, ?, ?, ?) RETURNING *`,
            args: [
                itemData.order_id,
                itemData.product_id,
                itemData.quantity,
                itemData.price_per_unit
            ],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create order item");
        const createdItemRow = queryResult.rows[0];

        if (!createdItemRow) {
            const errorMessage = "No data returned after order item creation";
            logger.error(errorMessage, { itemData });
            throw new DatabaseError(errorMessage);
        }

        const validatedItem = this.validateData(createdItemRow, "order item creation");

        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ITEMS_BY_ORDER(itemData.order_id)));

        logger.info("Order item created successfully", {
            itemId: validatedItem.id,
            orderId: validatedItem.order_id
        });

        return validatedItem;
    }

    async findByOrderId(orderId: number): Promise<OrderItem[]> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.ITEMS_BY_ORDER(orderId));
        const query: Query = {
            sql: `SELECT * FROM order_items WHERE order_id = ?`,
            args: [orderId],
        };

        return await this.getListFromCacheOrDB(
            cacheKey,
            query,
            CACHE_TTL.ORDER_ITEMS,
            `find items by order ID: ${orderId}`
        );
    }

    async update(itemId: number, updateData: UpdateOrderItem): Promise<OrderItem | null> {
        // Note: This is a basic update. In a real scenario, updating quantity might require updating order total.
        // For now, we assume the service layer handles the logic of updating the order total if needed.

        // First get the item to know the order_id for cache invalidation
        const selectQuery: Query = { sql: `SELECT * FROM order_items WHERE id = ?`, args: [itemId] };
        const existingItemResult = await this.executeDatabaseQuery(selectQuery, "find item for update");
        const existingItem = existingItemResult.rows[0];

        if (!existingItem) return null;

        const updateQuery: Query = {
            sql: `UPDATE order_items SET quantity = COALESCE(?, quantity), price_per_unit = COALESCE(?, price_per_unit) WHERE id = ? RETURNING *`,
            args: [updateData.quantity, updateData.price_per_unit, itemId],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "update order item");
        const updatedItemRow = queryResult.rows[0];

        if (!updatedItemRow) return null;

        const validatedItem = this.validateData(updatedItemRow, "order item update");

        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ITEMS_BY_ORDER(Number(existingItem.order_id))));

        return validatedItem;
    }

    async delete(itemId: number): Promise<boolean> {
        // First get the item to know the order_id for cache invalidation
        const selectQuery: Query = { sql: `SELECT * FROM order_items WHERE id = ?`, args: [itemId] };
        const existingItemResult = await this.executeDatabaseQuery(selectQuery, "find item for deletion");
        const existingItem = existingItemResult.rows[0];

        if (!existingItem) return false;

        const deleteQuery: Query = {
            sql: `DELETE FROM order_items WHERE id = ?`,
            args: [itemId],
        };

        await this.executeDatabaseQuery(deleteQuery, "delete order item");

        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ITEMS_BY_ORDER(Number(existingItem.order_id))));

        return true;
    }
}
