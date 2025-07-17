// src/routes/orders_routes.ts

import { Router } from 'express';
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
} from '@/controllers/orders_controller';
import { authenticateToken, requireAdmin, requireCustomer } from '@/middlewares/auth';
import { apiLimiter } from '@/middlewares/rate_limit';

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
router.post('/orders', authenticateToken, requireAdmin, requireCustomer, createOrder);

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
router.get('/orders', getAllOrders);

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
router.get('/orders/:id', authenticateToken, requireAdmin, requireCustomer, getOrderById);

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
router.put('/orders/:id', authenticateToken, requireAdmin, requireCustomer, updateOrder);

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
router.delete('/orders/:id', authenticateToken, requireAdmin, requireCustomer, deleteOrder);

export default router;
