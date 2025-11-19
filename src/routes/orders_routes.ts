// src/routes/orders_routes.ts

import { Router } from 'express';
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    markOrderAsCompleted,
} from '@/controllers/orders_controller.js';
import { authenticateToken, requireAdmin, requireCustomer } from '@/middlewares/auth.js';
import { apiLimiter } from '@/middlewares/rate_limit.js';

const router = Router();
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags:
 *       - Órdenes
 *     summary: Crear una nueva orden
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrder'
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *       400:
 *         description: Datos inválidos o conflicto
 */
// Both admins and customers can create orders
router.post('/orders', apiLimiter, authenticateToken, createOrder);

/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     tags:
 *       - Órdenes
 *     summary: Obtener todas las órdenes
 *     responses:
 *       200:
 *         description: Lista de órdenes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/orders', apiLimiter, authenticateToken, requireAdmin, getAllOrders);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     tags:
 *       - Órdenes
 *     summary: Obtener una orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden encontrada
 *       404:
 *         description: Orden no encontrada
 */
// Both admins and customers can view orders (controller validates ownership)
router.get('/orders/:id', authenticateToken, getOrderById);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   put:
 *     tags:
 *       - Órdenes
 *     summary: Actualizar una orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrder'
 *     responses:
 *       200:
 *         description: Orden actualizada
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Orden no encontrada
 */
// Both admins and customers can update orders (controller validates ownership)
router.put('/orders/:id', authenticateToken, updateOrder);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   delete:
 *     tags:
 *       - Órdenes
 *     summary: Eliminar una orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden eliminada exitosamente
 *       404:
 *         description: Orden no encontrada
 */
// Both admins and customers can delete orders (controller validates ownership)
router.delete('/orders/:id', authenticateToken, deleteOrder);

/**
 * @openapi
 * /api/v1/orders/{id}/complete:
 *   patch:
 *     tags:
 *       - Órdenes
 *     summary: Marcar una orden como completada
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden completada exitosamente
 *       404:
 *         description: Orden no encontrada
 *       409:
 *         description: La orden ya está completada
 */
// Only admins can mark orders as completed
router.patch('/orders/:id/complete', authenticateToken, requireAdmin, markOrderAsCompleted);

export default router;
