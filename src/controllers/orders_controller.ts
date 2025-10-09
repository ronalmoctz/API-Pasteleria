import type { Request, Response, NextFunction } from 'express';
import { getOrdersService } from '@/factories/service_factory.js';

// Get service instance from factory (Dependency Injection)
const ordersService = getOrdersService();

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
 */
export async function getAllOrders(_req: Request, res: Response, next: NextFunction) {
    try {
        const orders = await ordersService.getAllOrders();
        res.status(200).json({ success: true, data: orders, count: orders.length });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     tags:
 *       - Órdenes
 *     summary: Obtener orden por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden encontrada
 *       404:
 *         description: Orden no encontrada
 */
export async function getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        const order = await ordersService.getOrderById(id);
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
}

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
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const order = await ordersService.createOrder(req.body);
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   put:
 *     tags:
 *       - Órdenes
 *     summary: Actualizar una orden
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
 *             $ref: '#/components/schemas/UpdateOrder'
 *     responses:
 *       200:
 *         description: Orden actualizada exitosamente
 */
export async function updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        const order = await ordersService.updateOrder(id, req.body);
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   delete:
 *     tags:
 *       - Órdenes
 *     summary: Eliminar una orden
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden eliminada exitosamente
 */
export async function deleteOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        await ordersService.deleteOrder(id);
        res.status(200).json({ success: true, message: 'Orden eliminada exitosamente' });
    } catch (err) {
        next(err);
    }
}
