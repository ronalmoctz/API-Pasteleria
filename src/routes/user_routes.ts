import { Router } from 'express';
import { login, register, getUserByEmail } from '@/controllers/user_controller.js';
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
