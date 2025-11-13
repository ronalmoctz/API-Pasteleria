import { Router } from 'express';
import { login, register, getUserByEmail, getAllUsers, getUserById, updateUser, deleteUser, getUserStatus } from '@/controllers/user_controller.js';
import { authenticateToken, requireAdmin } from '@/middlewares/auth.js';
import { apiLimiter } from '@/middlewares/rate_limit.js';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserDTO'
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Error en datos de registro
 */
router.post('/auth/register', apiLimiter, requireAdmin, register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login de usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/auth/login', apiLimiter, login);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener todos los usuarios con paginación
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Número de página
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Cantidad de usuarios por página
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: role
 *         in: query
 *         required: false
 *         description: Filtrar por rol
 *         schema:
 *           type: string
 *           enum: [customer, admin]
 *       - name: is_active
 *         in: query
 *         required: false
 *         description: Filtrar por estado activo
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (requiere admin)
 */
router.get('/users', apiLimiter, authenticateToken, requireAdmin, getAllUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *   patch:
 *     tags:
 *       - Users
 *     summary: Actualizar datos del usuario
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EditUserDTO'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *   delete:
 *     tags:
 *       - Users
 *     summary: Desactivar usuario (soft delete)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario a desactivar
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Usuario desactivado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (requiere admin)
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/users/:id', apiLimiter, authenticateToken, getUserById);
router.patch('/users/:id', apiLimiter, authenticateToken, updateUser);
router.delete('/users/:id', apiLimiter, authenticateToken, requireAdmin, deleteUser);

/**
 * @openapi
 * /api/users/{id}/status:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener estado online/offline del usuario
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado del usuario obtenido
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/users/:id/status', apiLimiter, authenticateToken, getUserStatus);

/**
 * @openapi
 * /api/users/email/{email}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener usuario por email
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *         description: Email del usuario
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/users/email/:email', apiLimiter, authenticateToken, requireAdmin, getUserByEmail);

router.get('/auth/register', (req, res) => {
    return res.status(405).json({
        message: 'Método GET no permitido. Usa POST para registrar un usuario.',
    });
});


export default router;
