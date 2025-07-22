import { ENV } from "./env.js";

if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables.");
}

export const jwtConfig = {
    secret: ENV.JWT_SECRET,
    expiresIn: '1h',
}