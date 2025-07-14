import { Router } from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsByAvailability,
    getProductsByCategory
} from '@/controllers/products_controller';
import { apiLimiter } from '@/middlewares/rate_limit';

const router = Router();
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/products:
 *   post:
 *     tags:
 *       - Productos
 *     summary: Crear un nuevo producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProduct'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Error de validación o conflicto
 */
router.post('/products', createProduct);

/**
 * @openapi
 * /api/v1/products:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Obtener todos los productos
 *     responses:
 *       200:
 *         description: Lista de productos
 *       500:
 *         description: Error al obtener productos
 */
router.get('/products', getAllProducts);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Obtener un producto por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.get('/products/:id', getProductById);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   put:
 *     tags:
 *       - Productos
 *     summary: Actualizar un producto por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProduct'
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *       404:
 *         description: Producto no encontrado
 */
router.put('/products/:id', updateProduct);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   delete:
 *     tags:
 *       - Productos
 *     summary: Eliminar un producto por su ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       404:
 *         description: Producto no encontrado
 */
router.delete('/products/:id', deleteProduct);

/**
 * @openapi
 * /api/v1/products/search:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Buscar productos por texto
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Texto a buscar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 *       400:
 *         description: Query de búsqueda requerida
 */
router.get('/products/search', searchProducts);

/**
 * @openapi
 * /api/v1/products/availability/{status}:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Obtener productos por disponibilidad
 *     parameters:
 *       - name: status
 *         in: path
 *         required: true
 *         description: Estado de disponibilidad (available/unavailable)
 *         schema:
 *           type: string
 *           enum: [available, unavailable]
 *     responses:
 *       200:
 *         description: Productos filtrados por disponibilidad
 *       400:
 *         description: Estado inválido
 */
router.get('/products/availability/:status', getProductsByAvailability);

/**
 * @openapi
 * /api/v1/products/category/{categoryId}:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Obtener productos por categoría
 *     parameters:
 *       - name: categoryId
 *         in: path
 *         required: true
 *         description: ID de la categoría
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Productos de la categoría
 *       400:
 *         description: ID de categoría inválido
 */
router.get('/products/category/:categoryId', getProductsByCategory);

export default router;
