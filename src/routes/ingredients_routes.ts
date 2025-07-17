import { Router } from 'express';
import {
    createIngredient,
    getAllIngredients,
    getIngredientById,
    updateIngredient,
    deleteIngredient
} from '@/controllers/ingredients_controller';
import { authenticateToken, requireAdmin } from '@/middlewares/auth';
import { apiLimiter } from '@/middlewares/rate_limit';

const router = Router();
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/ingredients:
 *   post:
 *     tags:
 *       - Ingredientes
 *     summary: Crear un nuevo ingrediente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateIngredient'
 *     responses:
 *       201:
 *         description: Ingrediente creado exitosamente
 *       400:
 *         description: Error de validación o conflicto
 */
router.post('/ingredients', authenticateToken, requireAdmin, createIngredient);

/**
 * @openapi
 * /api/v1/ingredients:
 *   get:
 *     tags:
 *       - Ingredientes
 *     summary: Obtener todos los ingredientes
 *     responses:
 *       200:
 *         description: Lista de ingredientes
 *       500:
 *         description: Error al obtener ingredientes
 */
router.get('/ingredients', getAllIngredients);

/**
 * @openapi
 * /api/v1/ingredients/{id}:
 *   get:
 *     tags:
 *       - Ingredientes
 *     summary: Obtener un ingrediente por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del ingrediente
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ingrediente encontrado
 *       404:
 *         description: Ingrediente no encontrado
 */
router.get('/ingredients/:id', authenticateToken, requireAdmin, getIngredientById);

/**
 * @openapi
 * /api/v1/ingredients/{id}:
 *   put:
 *     tags:
 *       - Ingredientes
 *     summary: Actualizar un ingrediente por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del ingrediente
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateIngredient'
 *     responses:
 *       200:
 *         description: Ingrediente actualizado exitosamente
 *       404:
 *         description: Ingrediente no encontrado
 */
router.put('/ingredients/:id', authenticateToken, requireAdmin, updateIngredient);

/**
 * @openapi
 * /api/v1/ingredients/{id}:
 *   delete:
 *     tags:
 *       - Ingredientes
 *     summary: Eliminar un ingrediente por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del ingrediente
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ingrediente eliminado exitosamente
 *       404:
 *         description: Ingrediente no encontrado
 */
router.delete('/ingredients/:id', authenticateToken, requireAdmin, deleteIngredient);

export default router;
