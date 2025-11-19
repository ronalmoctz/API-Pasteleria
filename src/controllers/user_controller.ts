// src/controllers/user_controller.ts
import type { Request, Response, NextFunction } from "express";
import { UserService } from "@/services/user_service.js";
import { logger } from "@/utils/logger.js";

const userService = new UserService();

// Rate limiting por IP para prevenir abuso
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutos

function getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (!attempts) return true;

    // Limpiar intentos antiguos
    if (now - attempts.lastAttempt > LOGIN_WINDOW) {
        loginAttempts.delete(ip);
        return true;
    }

    return attempts.count < MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(ip: string, success: boolean): void {
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: now };

    if (success) {
        // Reset counter on successful login
        loginAttempts.delete(ip);
    } else {
        // Increment failed attempts
        attempts.count++;
        attempts.lastAttempt = now;
        loginAttempts.set(ip, attempts);
    }
}

/**
 * Register new user
 * @router POST /api/auth/register
 * @group Users - Operations about users
 * @param {RegisterUserDTO} request.body.required - User registration data
 * @returns 201 - User registered successfully
 * @returns 400 - Bad request if validation fails or email already exists
 */
export async function register(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        logger.info('Iniciando registro de usuario', {
            requestId,
            email: req.body?.email,
            ip: getClientIP(req)
        });

        const user = await userService.register(req.body);

        const duration = Date.now() - startTime;
        logger.info('Usuario registrado exitosamente', {
            requestId,
            userId: user.id,
            email: user.email,
            duration: `${duration}ms`
        });

        res.status(201).json({
            success: true,
            data: user,
            message: "User registered successfully",
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error en registro de usuario', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            email: req.body?.email,
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Login user
 * @router POST /api/auth/login
 * @param {LoginDTO} request.body.required - User login credentials
 * @returns 200 - User logged in successfully
 * @returns 401 - Unauthorized if credentials are invalid
 * @returns 429 - Too many login attempts
 */
export async function login(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    const clientIP = getClientIP(req);

    try {
        logger.info('Iniciando proceso de login', {
            requestId,
            email: req.body?.email,
            ip: clientIP
        });

        // Verificar rate limiting
        if (!checkRateLimit(clientIP)) {
            logger.warn('Rate limit excedido para login', {
                requestId,
                ip: clientIP,
                email: req.body?.email
            });

            return res.status(429).json({
                success: false,
                error: "Demasiados intentos de login. Inténtalo más tarde.",
                retryAfter: 15 * 60, // 15 minutos
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }

        // Validación básica del body
        if (!req.body || !req.body.email || !req.body.password) {
            logger.warn('Datos de login incompletos', {
                requestId,
                hasEmail: !!req.body?.email,
                hasPassword: !!req.body?.password
            });

            recordLoginAttempt(clientIP, false);
            return res.status(400).json({
                success: false,
                error: "Email y contraseña son requeridos",
                code: 'MISSING_CREDENTIALS'
            });
        }

        const loginResult = await userService.login(req.body);

        // Registro exitoso
        recordLoginAttempt(clientIP, true);

        const duration = Date.now() - startTime;
        logger.info('Login exitoso', {
            requestId,
            userId: loginResult.user.id,
            email: loginResult.user.email,
            role: loginResult.user.role,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: {
                user: loginResult.user,
                token: loginResult.token
            },
            message: "User logged in successfully",
        });

    } catch (err) {
        // Registro de intento fallido
        recordLoginAttempt(clientIP, false);

        const duration = Date.now() - startTime;
        logger.error('Error en login', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            email: req.body?.email,
            ip: clientIP,
            duration: `${duration}ms`
        });

        next(err);
    }
}

/**
 * Get user by email
 * @router GET /api/users/email/{email}
 * @param {string} email.path.required - User email
 * @returns 200 - User found
 * @returns 404 - User not found
 * @returns 400 - Bad request if email is invalid
 */
export async function getUserByEmail(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        logger.debug('Buscando usuario por email', {
            requestId,
            email: req.params.email
        });

        const user = await userService.getUserByEmail(req.params.email);

        const duration = Date.now() - startTime;
        logger.debug('Usuario encontrado', {
            requestId,
            userId: user.id,
            email: user.email,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: user,
            message: "User found successfully",
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error buscando usuario', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            email: req.params.email,
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Get all users with pagination and filtering
 * @router GET /api/users
 * @returns 200 - Users retrieved successfully
 * @returns 401 - Unauthorized
 * @returns 403 - Forbidden (requires admin)
 */
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        logger.info('Obteniendo lista de usuarios', {
            requestId,
            ip: getClientIP(req),
            query: req.query
        });

        const query = {
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 10,
            role: req.query.role as 'customer' | 'admin' | undefined,
            is_active: req.query.is_active ? req.query.is_active === 'true' : undefined
        };

        const result = await userService.getAllUsers(query);

        const duration = Date.now() - startTime;
        logger.info('Lista de usuarios obtenida', {
            requestId,
            total: result.total,
            page: result.page,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: result.users,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                pages: Math.ceil(result.total / result.limit)
            },
            message: "Users retrieved successfully"
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error obteniendo usuarios', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Get user by ID
 * @router GET /api/users/:id
 * @returns 200 - User found
 * @returns 401 - Unauthorized
 * @returns 404 - User not found
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        const userId = Number(req.params.id);

        logger.debug('Buscando usuario por ID', {
            requestId,
            userId
        });

        const user = await userService.getUserById(userId);

        const duration = Date.now() - startTime;
        logger.debug('Usuario encontrado', {
            requestId,
            userId,
            email: user.email,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: user,
            message: "User found successfully"
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error buscando usuario', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: req.params.id,
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Update user
 * @router PATCH /api/users/:id
 * @param {EditUserDTO} request.body - User data to update
 * @returns 200 - User updated successfully
 * @returns 400 - Bad request
 * @returns 401 - Unauthorized
 * @returns 404 - User not found
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        const userId = Number(req.params.id);

        logger.info('Actualizando usuario', {
            requestId,
            userId,
            fields: Object.keys(req.body || {})
        });

        const updatedUser = await userService.updateUser(userId, req.body);

        const duration = Date.now() - startTime;
        logger.info('Usuario actualizado exitosamente', {
            requestId,
            userId,
            email: updatedUser.email,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: updatedUser,
            message: "User updated successfully"
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error actualizando usuario', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: req.params.id,
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Soft delete user (desactivate)
 * @router DELETE /api/users/:id
 * @returns 204 - User deactivated successfully
 * @returns 401 - Unauthorized
 * @returns 403 - Forbidden (requires admin)
 * @returns 404 - User not found
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        const userId = Number(req.params.id);

        logger.info('Desactivando usuario (soft delete)', {
            requestId,
            userId
        });

        await userService.softDeleteUser(userId);

        const duration = Date.now() - startTime;
        logger.info('Usuario desactivado exitosamente', {
            requestId,
            userId,
            duration: `${duration}ms`
        });

        res.status(204).send();

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error desactivando usuario', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: req.params.id,
            duration: `${duration}ms`
        });
        next(err);
    }
}

/**
 * Get user online status
 * @router GET /api/users/:id/status
 * @returns 200 - User status retrieved
 * @returns 401 - Unauthorized
 * @returns 404 - User not found
 */
export async function getUserStatus(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
        const userId = Number(req.params.id);

        logger.debug('Obteniendo estado del usuario', {
            requestId,
            userId
        });

        const status = await userService.getOnlineStatus(userId);

        const duration = Date.now() - startTime;
        logger.debug('Estado obtenido', {
            requestId,
            userId,
            is_online: status.is_online,
            duration_desc: status.status,
            duration: `${duration}ms`
        });

        res.status(200).json({
            success: true,
            data: {
                id: status.id,
                email: status.email,
                is_online: status.is_online,
                status: status.status,
                last_seen: status.last_seen,
                duration: status.duration
            },
            message: "User status retrieved successfully"
        });

    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error('Error obteniendo estado', {
            requestId,
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: req.params.id,
            duration: `${duration}ms`
        });
        next(err);
    }
}