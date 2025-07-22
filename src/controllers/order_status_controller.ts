import type { Request, Response, NextFunction } from 'express';
import { OrderStatusService } from '@/services/order_status_service.js';

const orderStatusService = new OrderStatusService();

/**
 * @openapi
 * /api/v1/order-statuses:
 *   post:
 *     tags:
 *       - Estados de Orden
 *     summary: Crear un nuevo estado de orden
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderStatus'
 *     responses:
 *       201:
 *         description: Estado de orden creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: El estado ya existe
 */
export async function createOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const status = await orderStatusService.createOrderStatus(req.body);
        res.status(201).json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/order-statuses:
 *   get:
 *     tags:
 *       - Estados de Orden
 *     summary: Obtener todos los estados de orden
 *     responses:
 *       200:
 *         description: Lista de estados de orden
 */
export async function getAllOrderStatuses(_req: Request, res: Response, next: NextFunction) {
    try {
        const statuses = await orderStatusService.getAllOrderStatuses();
        res.status(200).json({ success: true, data: statuses, count: statuses.length });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   get:
 *     tags:
 *       - Estados de Orden
 *     summary: Obtener estado de orden por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de orden encontrado
 *       404:
 *         description: No encontrado
 */
export async function getOrderStatusById(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        const status = await orderStatusService.getOrderStatusById(id);
        res.status(200).json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   put:
 *     tags:
 *       - Estados de Orden
 *     summary: Actualizar estado de orden
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
 *             $ref: '#/components/schemas/UpdateOrderStatus'
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Estado no encontrado
 */
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        const status = await orderStatusService.updateOrderStatus(id, req.body);
        res.status(200).json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
}

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   delete:
 *     tags:
 *       - Estados de Orden
 *     summary: Eliminar estado de orden
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eliminado exitosamente
 *       404:
 *         description: No encontrado
 */
export async function deleteOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        await orderStatusService.deleteOrderStatus(id);
        res.status(200).json({ success: true, message: 'Estado eliminado exitosamente' });
    } catch (err) {
        next(err);
    }
}
