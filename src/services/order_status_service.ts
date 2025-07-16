import { OrderStatusRepository } from "@/repositories/orders_status_reporsitory";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import type { CreateOrderStatus, UpdateOrderStatus } from "@/schemas/orders_status_schema";
import type { OrderStatus } from "@/interfaces/orders_status_interface";

// Service-specific error messages
const ERROR_MESSAGES = {
    ORDER_STATUS_NOT_FOUND: "Estado de orden no encontrado",
    ORDER_STATUS_CREATION_FAILED: "Error al crear el estado de orden",
    ORDER_STATUS_UPDATE_FAILED: "Error al actualizar el estado de orden",
    ORDER_STATUS_DELETE_FAILED: "Error al eliminar el estado de orden",
    ORDER_STATUS_RETRIEVAL_FAILED: "Error al obtener estados de orden",
    ORDER_STATUS_ALREADY_EXISTS: "Ya existe un estado de orden con este nombre",
    ORDER_STATUS_IN_USE: "No se puede eliminar el estado de orden porque está siendo utilizado",
    INVALID_STATUS_NAME: "El nombre del estado de orden no es válido",
} as const;

// HTTP status codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export class OrderStatusService {
    private orderStatusRepository = new OrderStatusRepository();

    /**
     * Creates a new order status with validation
     */
    async createOrderStatus(orderStatusData: CreateOrderStatus): Promise<OrderStatus> {
        const operationContext = "order status creation";

        logger.debug("Starting order status creation", {
            statusName: orderStatusData.status_name,
            operation: operationContext
        });

        try {
            // Validate status name
            if (!orderStatusData.status_name || orderStatusData.status_name.trim().length === 0) {
                logger.warn("Attempt to create order status with empty name", {
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_STATUS_NAME, HTTP_STATUS.BAD_REQUEST);
            }

            // Check if order status with same name already exists
            const existingOrderStatus = await this.orderStatusRepository.findByExactName(
                orderStatusData.status_name.trim()
            );

            if (existingOrderStatus) {
                logger.warn("Attempt to create duplicate order status", {
                    statusName: orderStatusData.status_name,
                    existingOrderStatusId: existingOrderStatus.id
                });
                throw new AppError(ERROR_MESSAGES.ORDER_STATUS_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
            }

            const createdOrderStatus = await this.orderStatusRepository.create({
                status_name: orderStatusData.status_name.trim()
            });

            logger.info("Order status created successfully", {
                orderStatusId: createdOrderStatus.id,
                statusName: createdOrderStatus.status_name
            });

            return createdOrderStatus;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to create order status", {
                error,
                orderStatusData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_CREATION_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Retrieves all order statuses
     */
    async getAllOrderStatuses(): Promise<OrderStatus[]> {
        const operationContext = "fetch all order statuses";

        logger.debug("Retrieving all order statuses", { operation: operationContext });

        try {
            const orderStatuses = await this.orderStatusRepository.findAll();

            logger.debug("Successfully retrieved order statuses", {
                orderStatusCount: orderStatuses.length,
                operation: operationContext
            });

            return orderStatuses;
        } catch (error) {
            logger.error("Failed to retrieve order statuses", {
                error,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Finds order status by ID with existence validation
     */
    async getOrderStatusById(orderStatusId: number): Promise<OrderStatus> {
        const operationContext = "find order status by ID";

        logger.debug("Searching for order status by ID", {
            orderStatusId,
            operation: operationContext
        });

        try {
            const foundOrderStatus = await this.orderStatusRepository.findById(orderStatusId);

            if (!foundOrderStatus) {
                logger.warn("Order status not found", {
                    orderStatusId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_STATUS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            logger.debug("Order status found successfully", {
                orderStatusId,
                statusName: foundOrderStatus.status_name,
                operation: operationContext
            });

            return foundOrderStatus;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Error while finding order status", {
                error,
                orderStatusId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Updates an existing order status
     */
    async updateOrderStatus(orderStatusId: number, updateData: UpdateOrderStatus): Promise<OrderStatus> {
        const operationContext = "order status update";

        logger.debug("Starting order status update", {
            orderStatusId,
            updateData,
            operation: operationContext
        });

        try {
            // Check if order status exists first
            await this.getOrderStatusById(orderStatusId);

            // If updating name, validate and check for duplicates
            if (updateData.status_name) {
                const trimmedName = updateData.status_name.trim();

                if (trimmedName.length === 0) {
                    logger.warn("Attempt to update order status with empty name", {
                        orderStatusId,
                        operation: operationContext
                    });
                    throw new AppError(ERROR_MESSAGES.INVALID_STATUS_NAME, HTTP_STATUS.BAD_REQUEST);
                }

                const existingOrderStatus = await this.orderStatusRepository.findByExactName(trimmedName);

                if (existingOrderStatus && existingOrderStatus.id !== orderStatusId) {
                    logger.warn("Attempt to update order status with duplicate name", {
                        orderStatusId,
                        newName: trimmedName,
                        conflictingOrderStatusId: existingOrderStatus.id
                    });
                    throw new AppError(ERROR_MESSAGES.ORDER_STATUS_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
                }

                updateData.status_name = trimmedName;
            }

            const updatedOrderStatus = await this.orderStatusRepository.update(orderStatusId, updateData);

            if (!updatedOrderStatus) {
                logger.error("Order status update returned null unexpectedly", {
                    orderStatusId,
                    updateData,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_STATUS_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Order status updated successfully", {
                orderStatusId,
                updatedFields: Object.keys(updateData),
                operation: operationContext
            });

            return updatedOrderStatus;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to update order status", {
                error,
                orderStatusId,
                updateData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_UPDATE_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Deletes an order status by ID
     */
    async deleteOrderStatus(orderStatusId: number): Promise<void> {
        const operationContext = "order status deletion";

        logger.debug("Starting order status deletion", {
            orderStatusId,
            operation: operationContext
        });

        try {
            // Check if order status exists first
            const existingOrderStatus = await this.getOrderStatusById(orderStatusId);

            // TODO: Add check for order status usage in orders
            // const isOrderStatusInUse = await this.checkOrderStatusUsage(orderStatusId);
            // if (isOrderStatusInUse) {
            //     throw new AppError(ERROR_MESSAGES.ORDER_STATUS_IN_USE, HTTP_STATUS.CONFLICT);
            // }

            const wasDeleted = await this.orderStatusRepository.delete(orderStatusId);

            if (!wasDeleted) {
                logger.error("Order status deletion returned false unexpectedly", {
                    orderStatusId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_STATUS_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Order status deleted successfully", {
                orderStatusId,
                deletedStatusName: existingOrderStatus.status_name,
                operation: operationContext
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to delete order status", {
                error,
                orderStatusId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Searches order statuses by name
     */
    async searchOrderStatusesByName(searchTerm: string): Promise<OrderStatus[]> {
        const operationContext = "order status search by name";

        logger.debug("Searching order statuses by name", {
            searchTerm,
            operation: operationContext
        });

        if (!searchTerm || searchTerm.trim().length === 0) {
            logger.warn("Empty search term provided", { operation: operationContext });
            return [];
        }

        try {
            const foundOrderStatuses = await this.orderStatusRepository.findByName(searchTerm.trim());

            logger.debug("Order status search completed", {
                searchTerm,
                resultCount: foundOrderStatuses.length,
                operation: operationContext
            });

            return foundOrderStatuses;
        } catch (error) {
            logger.error("Failed to search order statuses", {
                error,
                searchTerm,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Finds order status by exact name
     */
    async getOrderStatusByName(statusName: string): Promise<OrderStatus> {
        const operationContext = "find order status by exact name";

        logger.debug("Searching for order status by exact name", {
            statusName,
            operation: operationContext
        });

        if (!statusName || statusName.trim().length === 0) {
            logger.warn("Empty status name provided", { operation: operationContext });
            throw new AppError(ERROR_MESSAGES.INVALID_STATUS_NAME, HTTP_STATUS.BAD_REQUEST);
        }

        try {
            const foundOrderStatus = await this.orderStatusRepository.findByExactName(statusName.trim());

            if (!foundOrderStatus) {
                logger.warn("Order status not found by name", {
                    statusName,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.ORDER_STATUS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            logger.debug("Order status found by name successfully", {
                statusName,
                orderStatusId: foundOrderStatus.id,
                operation: operationContext
            });

            return foundOrderStatus;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Error while finding order status by name", {
                error,
                statusName,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Checks if an order status exists
     */
    async checkOrderStatusExists(orderStatusId: number): Promise<boolean> {
        const operationContext = "order status existence check";

        logger.debug("Checking order status existence", {
            orderStatusId,
            operation: operationContext
        });

        try {
            const exists = await this.orderStatusRepository.exists(orderStatusId);

            logger.debug("Order status existence check completed", {
                orderStatusId,
                exists,
                operation: operationContext
            });

            return exists;
        } catch (error) {
            logger.error("Failed to check order status existence", {
                error,
                orderStatusId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Gets common order statuses for quick access
     */
    async getCommonOrderStatuses(): Promise<{
        pending?: OrderStatus;
        inProgress?: OrderStatus;
        completed?: OrderStatus;
        cancelled?: OrderStatus;
    }> {
        const operationContext = "get common order statuses";

        logger.debug("Retrieving common order statuses", { operation: operationContext });

        try {
            const allStatuses = await this.getAllOrderStatuses();
            const commonStatuses: Record<string, OrderStatus> = {};

            // Common status names to look for
            const statusMappings = {
                pending: ["pendiente", "pending", "nuevo", "new"],
                inProgress: ["en proceso", "in progress", "procesando", "processing"],
                completed: ["completado", "completed", "terminado", "finished"],
                cancelled: ["cancelado", "cancelled", "anulado", "canceled"]
            };

            for (const status of allStatuses) {
                const statusNameLower = status.status_name.toLowerCase();

                for (const [key, variations] of Object.entries(statusMappings)) {
                    if (variations.some(variation => statusNameLower.includes(variation))) {
                        commonStatuses[key] = status;
                        break;
                    }
                }
            }

            logger.debug("Common order statuses retrieved", {
                foundStatuses: Object.keys(commonStatuses),
                operation: operationContext
            });

            return commonStatuses;
        } catch (error) {
            logger.error("Failed to retrieve common order statuses", {
                error,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.ORDER_STATUS_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}