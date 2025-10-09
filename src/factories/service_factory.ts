import { OrdersService } from '@/services/orders_service.js';
import { OrdersRepository } from '@/repositories/orders_repository.js';
import { OrderStatusRepository } from '@/repositories/orders_status_reporsitory.js';
import { ProductService } from '@/services/products_service.js';
import { RedisCacheStrategy } from '@/strategies/redis_cache_strategy.js';
import { logger } from '@/utils/logger.js';

/**
 * Service Factory
 * Centralizes dependency injection and service instantiation
 * Follows Factory Pattern and Dependency Injection principles
 */
class ServiceFactory {
    private static ordersServiceInstance: OrdersService | null = null;
    private static productServiceInstance: ProductService | null = null;
    private static cacheStrategy = new RedisCacheStrategy();

    /**
     * Gets or creates OrdersService instance
     * Implements lazy initialization
     * 
     * @returns OrdersService instance with all dependencies injected
     */
    static getOrdersService(): OrdersService {
        if (!this.ordersServiceInstance) {
            logger.info('Initializing OrdersService with dependencies');

            // Create repository instances with injected dependencies
            const ordersRepository = new OrdersRepository(this.cacheStrategy);
            // Note: OrderStatusRepository not yet refactored, uses old cache system
            const orderStatusRepository = new OrderStatusRepository();

            // Create service with injected repositories
            this.ordersServiceInstance = new OrdersService(
                ordersRepository,
                orderStatusRepository
            );

            logger.info('OrdersService initialized successfully');
        }

        return this.ordersServiceInstance;
    }

    /**
     * Gets or creates ProductService instance
     * Implements lazy initialization
     * 
     * @returns ProductService instance with all dependencies injected
     */
    static getProductService(): ProductService {
        if (!this.productServiceInstance) {
            logger.info('Initializing ProductService with dependencies');

            // Create service with injected cache strategy
            this.productServiceInstance = new ProductService(this.cacheStrategy);

            logger.info('ProductService initialized successfully');
        }

        return this.productServiceInstance;
    }

    /**
     * Resets all service instances
     * Useful for testing or reinitialization
     */
    static reset(): void {
        this.ordersServiceInstance = null;
        this.productServiceInstance = null;
        logger.info('Service factory reset');
    }
}

/**
 * Exported singleton instance getters
 * Provides easy access to services
 */
export const getOrdersService = () => ServiceFactory.getOrdersService();
export const getProductService = () => ServiceFactory.getProductService();

/**
 * Resets service instances
 * Useful for testing
 */
export const resetServiceFactory = () => ServiceFactory.reset();
