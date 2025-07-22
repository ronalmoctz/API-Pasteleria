import type { Request, Response, NextFunction } from 'express';
import { ENV } from '@/config/env.js';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey || apiKey !== ENV.API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or missing API key.'
        });
    }
}