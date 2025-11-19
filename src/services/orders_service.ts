import type { IOrdersRepository } from "@/interfaces/repositories/orders_repository_interface.js";
import { AppError } from "@/utils/app_error.js";
import { logger } from "@/utils/logger.js";
import { HTTP_STATUS } from "@/constants/http_status.js";
import type { CreateOrder, UpdateOrder, OrderItemInput } from "@/schemas/orders_schema.js";
import type { Order } from "@/interfaces/orders_interface.js";
import type { Product } from "@/schemas/products_schema.js";

/**
 * Service-specific error messages
 * Centralized error messages for consistency
 */
const ERROR_MESSAGES = {
    ORDER_NOT_FOUND: "Orden no encontrada",
    ORDER_CREATION_FAILED: "Error al crear la orden",
    ORDER_UPDATE_FAILED: "Error al actualizar la orden",
    ORDER_DELETE_FAILED: "Error al eliminar la orden",
    ORDER_RETRIEVAL_FAILED: "Error al obtener órdenes",
    ORDER_COMPLETION_FAILED: "Error al marcar la orden como completada",
    INVALID_ORDER_DATA: "Datos de orden inválidos",
    INVALID_USER_ID: "ID de usuario inválido",
    INVALID_STATUS_ID: "ID de estado inválido",
    INVALID_TOTAL_AMOUNT: "Monto total inválido",
    INVALID_DATE_RANGE: "Rango de fechas inválido",
    ORDER_ALREADY_COMPLETED: "La orden ya está completada",
    STATUS_NOT_FOUND: "Estado de orden no encontrado",
    USER_NOT_FOUND: "Usuario no encontrado",
    CALCULATION_ERROR: "Error en cálculo de totales",
    PRODUCT_NOT_FOUND: "Uno o más productos no encontrados",
    PRODUCT_UNAVAILABLE: "Uno o más productos no están disponibles",
    EMPTY_ORDER: "La orden debe tener al menos un item",
} as const;

/**
 * Interface for order status repository
 * Used for dependency injection and to follow ISP (SOLID)
 */
interface IOrderStatusRepository {
    exists(statusId: number): Promise<boolean>;
}

/**
 * Interface for products repository
 * Used for product validation
 */
interface IProductsRepository {
    findById(productId: number): Promise<Product | null>;
}

/**
 * Service layer for Order business logic
 * Follows Dependency Injection principle (SOLID - D)
 * Separates business logic from data access layer
 */
export class OrdersService {
    /**
     * Creates a new instance of OrdersService
     * Dependencies are injected via constructor (Dependency Injection pattern)
     * 
     * @param ordersRepository - Orders repository implementation
     * @param orderStatusRepository - Order status repository implementation
     * @param productsRepository - Products repository for validation
     */
    constructor(
        private readonly ordersRepository: IOrdersRepository,
        private readonly orderStatusRepository: IOrderStatusRepository,
        private readonly productsRepository: IProductsRepository
    ) { }

    /**
     * Creates a new order with items
     * Validates products, calculates total_amount server-side, and creates order with items atomically
     * 
     * @param orderData - Order creation data with items array
     * @returns Created order with generated ID and timestamp
     * @throws {AppError} If validation fails or creation fails
     * 
     * @example
     * const order = await service.createOrder({
     *   user_id: 1,
     *   status_id: 1,
     *   items: [{ product_id: 5, quantity: 2 }],
     *   special_instructions: 'Sin cebolla'
     * });
     */
    async createOrder(orderData: CreateOrder): Promise<Order> {
        const operationContext = "order creation";

        logger.debug("Starting order creation with items", {
            userId: orderData.user_id,
            statusId: orderData.status_id,
            itemCount: orderData.items.length,
            operation: operationContext
        });

        try {
            // Validate user_id
            if (!orderData.user_id || orderData.user_id <= 0) {
                logger.warn("Attempt to create order with invalid user ID", {
                    userId: orderData.user_id,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_USER_ID, HTTP_STATUS.BAD_REQUEST);
            }

            // Validate status_id exists
            const statusExists = await this.orderStatusRepository.exists(orderData.status_id);
            if (!statusExists) {
                logger.warn("Attempt to create order with non-existent status", {
                    statusId: orderData.status_id,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.STATUS_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
            }

            // Validate items array
            if (!orderData.items || orderData.items.length === 0) {
                logger.warn("Attempt to create order without items", {
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.EMPTY_ORDER, HTTP_STATUS.BAD_REQUEST);
            }

            // Validate all products exist and are available, fetch prices
            const itemsWithPrices: Array<{ product_id: number; quantity: number; price_per_unit: number }> = [];
            let totalAmount = 0;

            for (const item of orderData.items) {
                const product = await this.productsRepository.findById(item.product_id);

                if (!product) {
                    logger.warn("Product not found", {
                        productId: item.product_id,
                        operation: operationContext
                    });
                    throw new AppError(
                        `${ERROR_MESSAGES.PRODUCT_NOT_FOUND}: ID ${item.product_id}`,
                        HTTP_STATUS.BAD_REQUEST
                    );
                }

                if (!product.is_available) {
                    logger.warn("Product not available", {
                        productId: item.product_id,
                        productName: product.name,
                        operation: operationContext
                    });
                    throw new AppError(
                        `${ERROR_MESSAGES.PRODUCT_UNAVAILABLE}: ${product.name}`,
                        HTTP_STATUS.BAD_REQUEST
                    );
                }

                // Use product price from database (server-side pricing)
                const itemTotal = product.price * item.quantity;
                totalAmount += itemTotal;

                itemsWithPrices.push({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_unit: product.price
                });

                logger.debug("Product validated", {
                    productId: product.id,
                    productName: product.name,
                    quantity: item.quantity,
                    price: product.price,
                    itemTotal
                });
            }

            logger.info("All products validated, total calculated", {
                itemCount: itemsWithPrices.length,
                calculatedTotal: totalAmount,
                operation: operationContext
            });

            // Create order with items using repository transaction method
            const createdOrder = await this.ordersRepository.createWithItems(
                {
                    user_id: orderData.user_id,
                    status_id: orderData.status_id,
                    total_amount: totalAmount,
                    special_instructions: orderData.special_instructions?.trim() || undefined
                },
                itemsWithPrices
            );

            logger.info("Order with items created successfully", {
                orderId: createdOrder.id,
                userId: createdOrder.user_id,
                itemCount: itemsWithPrices.length,
                totalAmount: createdOrder.total_amount,
                operation: operationContext
            });

            return createdOrder;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to create order with items", {
                error,
                orderData: {
                    user_id: orderData.user_id,
                    status_id: orderData.status_id,
                    itemCount: orderData.items?.length
                },
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_CREATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retrieves all orders from the system
     * Results are cached for better performance
     * 
     * @returns Array of all orders, sorted by order_date DESC
     * @throws {AppError} If retrieval fails
     */
    async getAllOrders(): Promise<Order[]> {
        const operationContext = "fetch all orders";

        logger.debug("Retrieving all orders", { operation: operationContext });

        try {
            const orders = await this.ordersRepository.findAll();

            logger.debug("Successfully retrieved orders", {
                orderCount: orders.length,
                operation: operationContext
            });

            return orders;
        } catch (error) {
            logger.error("Failed to retrieve orders", {
                error,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Finds a specific order by ID
     * Throws error if order doesn't exist
     * 
     * @param orderId - Order ID to search for
     * @returns Order if found
     * @throws {AppError} With NOT_FOUND status if order doesn't exist
     * @throws {AppError} With INTERNAL_SERVER_ERROR if retrieval fails
     */
    async getOrderById(orderId: number): Promise<Order> {
        const operationContext = "find order by ID";

        logger.debug("Searching for order by ID", {
            orderId,
            operation: operationContext
        });

        try {
            const foundOrder = await this.ordersRepository.findById(orderId);

            if (!foundOrder) {
                logger.warn("Order not found", {
                    orderId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            logger.debug("Order found successfully", {
                orderId,
                userId: foundOrder.user_id,
                totalAmount: foundOrder.total_amount,
                operation: operationContext
            });

            return foundOrder;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Error while finding order", {
                error,
                orderId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets all orders for a specific user
     * Validates user_id before querying
     * 
     * @param userId - User ID to filter orders
     * @returns Array of user's orders, sorted by order_date DESC
     * @throws {AppError} If user_id is invalid or retrieval fails
     */
    async getOrdersByUserId(userId: number): Promise<Order[]> {
        const operationContext = "fetch orders by user ID";

        logger.debug("Retrieving orders by user ID", {
            userId,
            operation: operationContext
        });

        try {
            if (!userId || userId <= 0) {
                logger.warn("Invalid user ID provided", {
                    userId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_USER_ID, HTTP_STATUS.BAD_REQUEST);
            }

            const orders = await this.ordersRepository.findByUserId(userId);

            logger.debug("Successfully retrieved user orders", {
                userId,
                orderCount: orders.length,
                operation: operationContext
            });

            return orders;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to retrieve orders by user ID", {
                error,
                userId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets all orders with a specific status
     * Validates that status exists before querying
     * 
     * @param statusId - Status ID to filter orders
     * @returns Array of orders with specified status
     * @throws {AppError} If status doesn't exist or retrieval fails
     */
    async getOrdersByStatus(statusId: number): Promise<Order[]> {
        const operationContext = "fetch orders by status";

        logger.debug("Retrieving orders by status", {
            statusId,
            operation: operationContext
        });

        try {
            if (!statusId || statusId <= 0) {
                logger.warn("Invalid status ID provided", {
                    statusId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_STATUS_ID, HTTP_STATUS.BAD_REQUEST);
            }

            // Validate status exists
            const statusExists = await this.orderStatusRepository.exists(statusId);
            if (!statusExists) {
                logger.warn("Status not found", {
                    statusId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.STATUS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            const orders = await this.ordersRepository.findByStatus(statusId);

            logger.debug("Successfully retrieved orders by status", {
                statusId,
                orderCount: orders.length,
                operation: operationContext
            });

            return orders;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to retrieve orders by status", {
                error,
                statusId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Updates an existing order
     * Validates existence, user_id, status_id, and total_amount
     * Partial updates supported - only provided fields are updated
     * 
     * @param orderId - Order ID to update
     * @param updateData - Partial order data to update
     * @returns Updated order
     * @throws {AppError} If order not found or validation fails
     */
    async updateOrder(orderId: number, updateData: UpdateOrder): Promise<Order> {
        const operationContext = "order update";

        logger.debug("Starting order update", {
            orderId,
            updateData,
            operation: operationContext
        });

        try {
            // Check if order exists first
            await this.getOrderById(orderId);

            // Validate update data
            if (updateData.user_id !== undefined && updateData.user_id <= 0) {
                logger.warn("Attempt to update order with invalid user ID", {
                    orderId,
                    userId: updateData.user_id,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_USER_ID, HTTP_STATUS.BAD_REQUEST);
            }

            if (updateData.status_id !== undefined) {
                const statusExists = await this.orderStatusRepository.exists(updateData.status_id);
                if (!statusExists) {
                    logger.warn("Attempt to update order with non-existent status", {
                        orderId,
                        statusId: updateData.status_id,
                        operation: operationContext
                    });
                    throw new AppError(ERROR_MESSAGES.STATUS_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
                }
            }

            if (updateData.total_amount !== undefined && updateData.total_amount < 0) {
                logger.warn("Attempt to update order with negative total amount", {
                    orderId,
                    totalAmount: updateData.total_amount,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_TOTAL_AMOUNT, HTTP_STATUS.BAD_REQUEST);
            }

            // Clean special_instructions if provided
            const cleanedUpdateData = {
                ...updateData,
                special_instructions: updateData.special_instructions?.trim() || updateData.special_instructions
            };

            const updatedOrder = await this.ordersRepository.update(orderId, cleanedUpdateData);

            if (!updatedOrder) {
                logger.error("Order update returned null unexpectedly", {
                    orderId,
                    updateData,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Order updated successfully", {
                orderId,
                updatedFields: Object.keys(updateData),
                operation: operationContext
            });

            return updatedOrder;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to update order", {
                error,
                orderId,
                updateData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Deletes an order by ID
     * Validates existence before deletion
     * 
     * @param orderId - Order ID to delete
     * @returns void
     * @throws {AppError} If order not found or deletion fails
     */
    async deleteOrder(orderId: number): Promise<void> {
        const operationContext = "order deletion";

        logger.debug("Starting order deletion", {
            orderId,
            operation: operationContext
        });

        try {
            // Check if order exists first
            const existingOrder = await this.getOrderById(orderId);

            const wasDeleted = await this.ordersRepository.delete(orderId);

            if (!wasDeleted) {
                logger.error("Order deletion returned false unexpectedly", {
                    orderId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Order deleted successfully", {
                orderId,
                deletedOrderUserId: existingOrder.user_id,
                operation: operationContext
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to delete order", {
                error,
                orderId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Marks an order as completed
     * Sets completed_at timestamp to current datetime
     * Prevents marking already completed orders
     * 
     * @param orderId - Order ID to mark as completed
     * @returns Updated order with completed_at timestamp
     * @throws {AppError} With CONFLICT status if already completed
     * @throws {AppError} If order not found or update fails
     */
    async markOrderAsCompleted(orderId: number): Promise<Order> {
        const operationContext = "mark order as completed";

        logger.debug("Starting order completion", {
            orderId,
            operation: operationContext
        });

        try {
            // Check if order exists and get current state
            const existingOrder = await this.getOrderById(orderId);

            // Check if order is already completed
            if (existingOrder.completed_at) {
                logger.warn("Attempt to complete already completed order", {
                    orderId,
                    completedAt: existingOrder.completed_at,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_ALREADY_COMPLETED, HTTP_STATUS.CONFLICT);
            }

            const completedOrder = await this.ordersRepository.markAsCompleted(orderId);

            if (!completedOrder) {
                logger.error("Order completion returned null unexpectedly", {
                    orderId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_COMPLETION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Order marked as completed successfully", {
                orderId,
                completedAt: completedOrder.completed_at,
                operation: operationContext
            });

            return completedOrder;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to mark order as completed", {
                error,
                orderId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_COMPLETION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets total amount spent by a user
     */
    async getUserTotalSpent(userId: number): Promise<number> {
        const operationContext = "calculate user total spent";

        logger.debug("Calculating user total spent", {
            userId,
            operation: operationContext
        });

        try {
            if (!userId || userId <= 0) {
                logger.warn("Invalid user ID provided for total calculation", {
                    userId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_USER_ID, HTTP_STATUS.BAD_REQUEST);
            }

            const totalAmount = await this.ordersRepository.getTotalAmountByUser(userId);

            logger.debug("User total spent calculated successfully", {
                userId,
                totalAmount,
                operation: operationContext
            });

            return totalAmount;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to calculate user total spent", {
                error,
                userId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CALCULATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets orders within a date range
     */
    async getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
        const operationContext = "fetch orders by date range";

        logger.debug("Retrieving orders by date range", {
            startDate,
            endDate,
            operation: operationContext
        });

        try {
            // Validate date format (basic validation)
            if (!startDate || !endDate) {
                logger.warn("Missing date parameters", {
                    startDate,
                    endDate,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_DATE_RANGE, HTTP_STATUS.BAD_REQUEST);
            }

            // Validate date order
            if (new Date(startDate) > new Date(endDate)) {
                logger.warn("Start date is after end date", {
                    startDate,
                    endDate,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_DATE_RANGE, HTTP_STATUS.BAD_REQUEST);
            }

            const orders = await this.ordersRepository.getOrdersByDateRange(startDate, endDate);

            logger.debug("Successfully retrieved orders by date range", {
                startDate,
                endDate,
                orderCount: orders.length,
                operation: operationContext
            });

            return orders;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to retrieve orders by date range", {
                error,
                startDate,
                endDate,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Checks if an order exists
     */
    async checkOrderExists(orderId: number): Promise<boolean> {
        const operationContext = "order existence check";

        logger.debug("Checking order existence", {
            orderId,
            operation: operationContext
        });

        try {
            const exists = await this.ordersRepository.exists(orderId);

            logger.debug("Order existence check completed", {
                orderId,
                exists,
                operation: operationContext
            });

            return exists;
        } catch (error) {
            logger.error("Failed to check order existence", {
                error,
                orderId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets order statistics for a user
     */
    async getUserOrderStatistics(userId: number): Promise<{
        totalOrders: number;
        totalSpent: number;
        completedOrders: number;
        averageOrderValue: number;
        lastOrderDate?: string;
    }> {
        const operationContext = "get user order statistics";

        logger.debug("Calculating user order statistics", {
            userId,
            operation: operationContext
        });

        try {
            if (!userId || userId <= 0) {
                logger.warn("Invalid user ID provided for statistics", {
                    userId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_USER_ID, HTTP_STATUS.BAD_REQUEST);
            }

            const userOrders = await this.ordersRepository.findByUserId(userId);
            const totalSpent = await this.ordersRepository.getTotalAmountByUser(userId);

            const completedOrders = userOrders.filter(order => order.completed_at !== null).length;
            const averageOrderValue = userOrders.length > 0 ? totalSpent / userOrders.length : 0;
            const lastOrderDate = userOrders.length > 0 ? userOrders[0].order_date : undefined;

            const statistics = {
                totalOrders: userOrders.length,
                totalSpent,
                completedOrders,
                averageOrderValue,
                lastOrderDate
            };

            logger.debug("User order statistics calculated successfully", {
                userId,
                statistics,
                operation: operationContext
            });

            return statistics;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to calculate user order statistics", {
                error,
                userId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CALCULATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets recent orders (last 10 orders)
     */
    async getRecentOrders(limit: number = 10): Promise<Order[]> {
        const operationContext = "fetch recent orders";

        logger.debug("Retrieving recent orders", {
            limit,
            operation: operationContext
        });

        try {
            const allOrders = await this.ordersRepository.findAll();
            const recentOrders = allOrders.slice(0, limit);

            logger.debug("Successfully retrieved recent orders", {
                limit,
                retrievedCount: recentOrders.length,
                operation: operationContext
            });

            return recentOrders;
        } catch (error) {
            logger.error("Failed to retrieve recent orders", {
                error,
                limit,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}