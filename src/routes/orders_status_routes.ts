import { Router } from 'express';
import {
    createOrderStatus,
    getAllOrderStatuses,
    getOrderStatusById,
    updateOrderStatus,
    deleteOrderStatus,
} from '@/controllers/order_status_controller';
import { apiLimiter } from '@/middlewares/rate_limit';

const router = Router();
router.use(apiLimiter);

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
 *         description: Datos inválidos o conflicto
 */
router.post('/order-statuses', createOrderStatus);

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
 *       500:
 *         description: Error interno del servidor
 */
router.get('/order-statuses', getAllOrderStatuses);

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   get:
 *     tags:
 *       - Estados de Orden
 *     summary: Obtener un estado de orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del estado de orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de orden encontrado
 *       404:
 *         description: Estado de orden no encontrado
 */
router.get('/order-statuses/:id', getOrderStatusById);

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   put:
 *     tags:
 *       - Estados de Orden
 *     summary: Actualizar un estado de orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del estado de orden
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
 *         description: Estado de orden actualizado
 *       404:
 *         description: Estado no encontrado
 *       400:
 *         description: Datos inválidos
 */
router.put('/order-statuses/:id', updateOrderStatus);

/**
 * @openapi
 * /api/v1/order-statuses/{id}:
 *   delete:
 *     tags:
 *       - Estados de Orden
 *     summary: Eliminar un estado de orden por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del estado de orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de orden eliminado exitosamente
 *       404:
 *         description: Estado no encontrado
 */
router.delete('/order-statuses/:id', deleteOrderStatus);



export default router;
