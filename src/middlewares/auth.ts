import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader } from '@/utils/jwt'
import type { TokenPayload } from '@/utils/jwt'
import { logger } from '@/utils/logger'
import { error } from 'console'

// Extend the interface Request for user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload
        }
    }
}

/**
 * Verify the authenticated user and her token is valid
 */
export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization)

        if (!token) {
            res.status(401).json({
                error: 'Token de autorizacion requerido',
                message: 'Debe proporcionar un token valido en el header Authorization'
            })
            return
        }

        const payload = await verifyToken(token)
        req.user = payload;

        logger.debug('Usuario autenticado', {
            userId: payload.sub,
            role: payload.role
        })

        next()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('Falló la autenticación', { error: errorMessage });
        res.status(403).json({
            error: 'Token inválido o expirado',
            message: 'El token proporcionado no es válido o ha expirado'
        });
    }
}


export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            error: 'Usuario no autenticado',
            message: 'Debe estar autenticado para acceder a este recurso'
        });
        return;
    }

    if (req.user.role !== 'admin') {
        logger.warn('Acceso denegado - Se requiere rol admin', {
            userId: req.user.sub,
            userRole: req.user.role
        });

        res.status(403).json({
            error: 'Acceso denegado',
            message: 'Solo los administradores pueden acceder a este recurso'
        });
        return;
    }

    logger.debug('Autorización admin exitosa', {
        userId: req.user.sub
    });
    next();
};


export const requireCustomer = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            error: 'Usuario no autenticado',
            message: 'Debe estar autenticado para acceder a este recurso'
        });
        return;
    }

    if (req.user.role !== 'customer') {
        logger.warn('Acceso denegado - Se requiere rol customer', {
            userId: req.user.sub,
            userRole: req.user.role
        });

        res.status(403).json({
            error: 'Acceso denegado',
            message: 'Solo los clientes pueden acceder a este recurso'
        });
        return;
    }

    logger.debug('Autorización customer exitosa', {
        userId: req.user.sub
    });
    next();
};



export const requireAuthenticated = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            error: 'Usuario no autenticado',
            message: 'Debe estar autenticado para acceder a este recurso'
        });
        return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'customer') {
        logger.warn('Acceso denegado - Rol inválido', {
            userId: req.user.sub,
            userRole: req.user.role
        });

        res.status(403).json({
            error: 'Acceso denegado',
            message: 'Rol de usuario inválido'
        });
        return;
    }

    logger.debug('Autorización exitosa', {
        userId: req.user.sub,
        role: req.user.role
    });
    next();
};
