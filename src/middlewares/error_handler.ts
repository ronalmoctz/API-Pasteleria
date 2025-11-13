import type { ErrorRequestHandler } from "express";
import { logger } from "@/utils/logger.js";
import { ENV } from "@/config/env.js";
import { AppError } from "@/utils/app_error.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const isDev = ENV.NODE_ENV === 'development';
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : "Error interno del servidor";

    if (isDev) {
        logger.error("Error atrapado en middleware", err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) });
    } else {
        logger.error("Error de aplicación", { message });
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(isDev && err instanceof Error && { stack: err.stack }),
    });
};
