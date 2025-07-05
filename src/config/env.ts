import { config } from 'dotenv';

config();

// Load environment variables from .env file
export const ENV = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVER_PORT: process.env.SERVER_PORT,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    JWT_SECRET: process.env.JWT_SECRET,
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION,
    API_KEY: process.env.API_KEY
}