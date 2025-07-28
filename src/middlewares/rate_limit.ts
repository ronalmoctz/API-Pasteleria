import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        message: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,

})