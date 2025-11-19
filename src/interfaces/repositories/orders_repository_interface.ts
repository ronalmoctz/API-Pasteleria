import type { Order } from '@/interfaces/orders_interface.js';
import type { CreateOrder, UpdateOrder } from '@/schemas/orders_schema.js';

/**
 * Interface for Orders Repository
 * Defines contract for order data operations
 * Follows Interface Segregation Principle (SOLID)
 */
export interface IOrdersRepository {
    /**
     * Creates a new order with items in a transaction
     * @param orderData - Order data with calculated total_amount
     * @param items - Array of order items with product_id, quantity, and price_per_unit
     * @returns Created order
     */
    createWithItems(
        orderData: { user_id: number; status_id: number; total_amount: number; special_instructions?: string },
        items: Array<{ product_id: number; quantity: number; price_per_unit: number }>
    ): Promise<Order>;

    /**
     * Retrieves all orders
     * @returns Array of all orders
     */
    findAll(): Promise<Order[]>;

    /**
     * Finds an order by ID
     * @param orderId - Order ID
     * @returns Order or null if not found
     */
    findById(orderId: number): Promise<Order | null>;

    /**
     * Finds orders by user ID
     * @param userId - User ID
     * @returns Array of user's orders
     */
    findByUserId(userId: number): Promise<Order[]>;

    /**
     * Finds orders by status ID
     * @param statusId - Status ID
     * @returns Array of orders with specified status
     */
    findByStatus(statusId: number): Promise<Order[]>;

    /**
     * Updates an existing order
     * @param orderId - Order ID
     * @param updateData - Update data
     * @returns Updated order or null if not found
     */
    update(orderId: number, updateData: UpdateOrder): Promise<Order | null>;

    /**
     * Deletes an order
     * @param orderId - Order ID
     * @returns true if deleted, false if not found
     */
    delete(orderId: number): Promise<boolean>;

    /**
     * Checks if an order exists
     * @param orderId - Order ID
     * @returns true if exists, false otherwise
     */
    exists(orderId: number): Promise<boolean>;

    /**
     * Marks an order as completed
     * @param orderId - Order ID
     * @returns Updated order or null if not found
     */
    markAsCompleted(orderId: number): Promise<Order | null>;

    /**
     * Gets total amount spent by a user
     * @param userId - User ID
     * @returns Total amount
     */
    getTotalAmountByUser(userId: number): Promise<number>;

    /**
     * Gets orders within a date range
     * @param startDate - Start date (ISO string)
     * @param endDate - End date (ISO string)
     * @returns Array of orders in date range
     */
    getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]>;
}
