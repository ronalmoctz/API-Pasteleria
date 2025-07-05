import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 10,
    message: {
        success: false,
        message: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,

})