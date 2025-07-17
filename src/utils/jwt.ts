import jwt from 'jsonwebtoken';
import type { SignOptions, Algorithm } from 'jsonwebtoken';
import { ENV } from '@/config/env';
import { logger } from '@/utils/logger';

// Validar configuración JWT
const validateJWTConfig = (): void => {
    if (!ENV.JWT_SECRET) {
        logger.error('JWT_SECRET no definido en las variables de entorno');
        throw new Error('Falta JWT_SECRET en configuración');
    }
    if (!ENV.JWT_EXPIRATION) {
        logger.error('JWT_EXPIRATION no definido en las variables de entorno');
        throw new Error('Falta JWT_EXPIRATION en configuración');
    }
};

validateJWTConfig();

export interface TokenPayload {
    sub: number;           // ID del usuario
    user_name: string;     // Nombre del usuario
    role: 'admin' | 'customer';
    iat?: number;          // Issued at
    exp?: number;          // Expires at
}

const JWT_SECRET = ENV.JWT_SECRET!;
const JWT_EXPIRATION = ENV.JWT_EXPIRATION!;

// Generar token
export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
    return new Promise((resolve, reject) => {
        const options: SignOptions = {
            algorithm: 'HS256',
            expiresIn: JWT_EXPIRATION as SignOptions['expiresIn'],
        };

        jwt.sign(payload, JWT_SECRET, options, (err, token) => {
            if (err || !token) {
                logger.error('Error generando token', { error: err, payload });
                return reject(err || new Error('Token no generado'));
            }

            logger.debug('Token generado correctamente', { sub: payload.sub });
            resolve(token);
        });
    });
}

// Verificar token
export function verifyToken(token: string): Promise<TokenPayload> {
    return new Promise((resolve, reject) => {
        const options = {
            algorithms: ['HS256' as Algorithm],
        };

        jwt.verify(token, JWT_SECRET, options, (err, decoded) => {
            if (err || !decoded || typeof decoded === 'string') {
                logger.warn('Token inválido o expirado', { error: err?.message });
                return reject(new Error('Token inválido o expirado'));
            }

            const payload = decoded as unknown as TokenPayload;

            // Validar campos requeridos
            if (!payload.sub || !payload.user_name || !payload.role) {
                logger.warn('Token con payload inválido', { payload });
                return reject(new Error('Payload inválido'));
            }

            resolve(payload);
        });
    });
}

// Función auxiliar para extraer token del header Authorization
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

// Middleware para Express (opcional)
export function authenticateToken(req: any, res: any, next: any) {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    verifyToken(token)
        .then(payload => {
            req.user = payload;
            next();
        })
        .catch(err => {
            logger.warn('Falló la autenticación', { error: err.message });
            res.status(403).json({ error: 'Token inválido' });
        });
}