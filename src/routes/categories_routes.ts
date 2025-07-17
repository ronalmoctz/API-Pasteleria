import { Router } from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '@/controllers/categories_controller';
import { authenticateToken, requireAdmin } from '@/middlewares/auth';
import { apiLimiter } from '@/middlewares/rate_limit';

const router = Router();
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/categories:
 *   post:
 *     tags:
 *       - Categorías
 *     summary: Crear una nueva categoría
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryDTO'
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       400:
 *         description: Error de validación o conflicto
 */
router.post('/categories', authenticateToken, requireAdmin, createCategory);

/**
 * @openapi
 * /api/v1/categories:
 *   get:
 *     tags:
 *       - Categorías
 *     summary: Obtener todas las categorías
 *     responses:
 *       200:
 *         description: Lista de categorías
 *       500:
 *         description: Error interno al obtener categorías
 */
router.get('/categories', getAllCategories);

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   get:
 *     tags:
 *       - Categorías
 *     summary: Obtener una categoría por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la categoría
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *       404:
 *         description: Categoría no encontrada
 */
router.get('/categories/:id', getCategoryById);

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   put:
 *     tags:
 *       - Categorías
 *     summary: Actualizar una categoría por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la categoría a actualizar
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategoryDTO'
 *     responses:
 *       200:
 *         description: Categoría actualizada exitosamente
 *       404:
 *         description: Categoría no encontrada
 */
router.put('/categories/:id', updateCategory);

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   delete:
 *     tags:
 *       - Categorías
 *     summary: Eliminar una categoría por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la categoría
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoría eliminada exitosamente
 *       404:
 *         description: Categoría no encontrada
 */
router.delete('/categories/:id', deleteCategory);

export default router;
