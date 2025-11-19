import type { Request, Response } from 'express';
import { OrderItemsRepository } from '@/repositories/order_items_repository.js';
import { NodeCacheStrategy } from '@/strategies/node_cache_strategy.js';
import { logger } from '@/utils/logger.js';
import { createOrderItemSchema, updateOrderItemSchema } from '@/schemas/order_items_schema.js';

const cacheStrategy = new NodeCacheStrategy();
const orderItemsRepository = new OrderItemsRepository(cacheStrategy);

export const createOrderItem = async (req: Request, res: Response) => {
    try {
        const validation = createOrderItemSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error });
        }

        const newItem = await orderItemsRepository.create(validation.data);
        res.status(201).json(newItem);
    } catch (error) {
        logger.error('Error creating order item', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrderItemsByOrderId = async (req: Request, res: Response) => {
    try {
        const orderId = parseInt(req.params.orderId);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const items = await orderItemsRepository.findByOrderId(orderId);
        res.json(items);
    } catch (error) {
        logger.error('Error fetching order items', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOrderItem = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid item ID' });
        }

        const validation = updateOrderItemSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error });
        }

        const updatedItem = await orderItemsRepository.update(id, validation.data);
        if (!updatedItem) {
            return res.status(404).json({ error: 'Order item not found' });
        }

        res.json(updatedItem);
    } catch (error) {
        logger.error('Error updating order item', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteOrderItem = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid item ID' });
        }

        const success = await orderItemsRepository.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Order item not found' });
        }

        res.json({ message: 'Order item deleted successfully' });
    } catch (error) {
        logger.error('Error deleting order item', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
};
