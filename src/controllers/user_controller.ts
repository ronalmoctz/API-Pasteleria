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

setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
        if (now - attempts.lastAttempt > LOGIN_WINDOW) {
            loginAttempts.delete(ip);
        }
    }
}, 60 * 60 * 1000); // 1 hora