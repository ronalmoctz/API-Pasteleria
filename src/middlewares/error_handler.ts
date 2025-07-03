import type { ErrorRequestHandler } from "express";
import { logger } from "@/utils/logger";
import { ENV } from "@/config/env";
import { AppError } from "@/utils/app_error";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const isDev = ENV.NODE_ENV === 'development';
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : "Error interno del servidor";

    if (isDev) {
        logger.error(err, "Error atrapado en middleware");
    } else {
        logger.error({ message }, "Error de aplicación");
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(isDev && err instanceof Error && { stack: err.stack }),
    });
};
