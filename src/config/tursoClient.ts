import { ENV } from "./env";
import { logger } from "@/utils/logger";
import { createClient } from "@libsql/client";


export const turso = createClient({
    url: ENV.TURSO_DATABASE_URL!,
    authToken: ENV.TURSO_AUTH_TOKEN,
});

export async function checkTursoConnection() {
    try {
        const result = await turso.execute("SELECT 1 AS connection");
        if (result.rows.length > 0) {
            logger.info("Turso database connection established successfully.");
            return true;
        } else {
            logger.error("Turso database connection test query returned no rows.");
            return false;
        }
    } catch (err) {
        logger.error("Failed to connect to Turso database:", err);
        return false;
    }
}

