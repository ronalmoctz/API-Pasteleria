import { Router } from 'express';
import {
    createOrderItem,
    getOrderItemsByOrderId,
    updateOrderItem,
    deleteOrderItem,
} from '@/controllers/order_items_controller.js';
import { authenticateToken, requireAdmin } from '@/middlewares/auth.js';
import { apiLimiter } from '@/middlewares/rate_limit.js';

const router = Router();
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/order-items:
 *   post:
 *     tags:
 *       - Order Items
 *     summary: Create a new order item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderItem'
 *     responses:
 *       201:
 *         description: Order item created successfully
 *       400:
 *         description: Invalid data
 */
router.post('/order-items', authenticateToken, requireAdmin, createOrderItem);

/**
 * @openapi
 * /api/v1/orders/{orderId}/items:
 *   get:
 *     tags:
 *       - Order Items
 *     summary: Get all items for a specific order
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of order items
 */
router.get('/orders/:orderId/items', authenticateToken, getOrderItemsByOrderId);

/**
 * @openapi
 * /api/v1/order-items/{id}:
 *   put:
 *     tags:
 *       - Order Items
 *     summary: Update an order item
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderItem'
 *     responses:
 *       200:
 *         description: Order item updated
 *       404:
 *         description: Order item not found
 */
router.put('/order-items/:id', authenticateToken, requireAdmin, updateOrderItem);

/**
 * @openapi
 * /api/v1/order-items/{id}:
 *   delete:
 *     tags:
 *       - Order Items
 *     summary: Delete an order item
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order item deleted
 *       404:
 *         description: Order item not found
 */
router.delete('/order-items/:id', authenticateToken, requireAdmin, deleteOrderItem);

export default router;
