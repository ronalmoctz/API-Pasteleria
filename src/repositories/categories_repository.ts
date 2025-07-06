import { cache } from "@/utils/chache";
import { turso } from "@/config/tursoClient";
import type { Categories } from "@/interfaces/categories_interface";
import type { CreateCategoryDTO, UpdateCategoryDTO } from "@/schemas/categories_schema";
import { CategorySchema } from "@/schemas/categories_schema";
import { logger } from "@/utils/logger";



const CATEGORY_CACHE_KEY = 'categories:all';


export class CategoryRepository {
    async create(data: CreateCategoryDTO): Promise<Categories> {
        const result = await turso.execute({
            sql: `INSERT INTO categories (name, description) VALUES (?,?) RETURNING *`,
            args: [data.name, data.description ?? null]
        })

        if (!result.rows.length) {
            logger.error("Error al crear la categoría", { data });
            throw new Error("Error al crear la categoría");
        }
        const parseResult = CategorySchema.safeParse(result.rows[0]);
        if (!parseResult.success) {
            logger.error("La fila devuelta no cumple con el esquema de categoría", { error: parseResult.error });
            throw new Error("La fila devuelta no cumple con el esquema de categoría");
        }
        cache.del(CATEGORY_CACHE_KEY)
        return parseResult.data;
    }

    async findAll(): Promise<Categories[]> {
        const cached = cache.get<Categories[]>(CATEGORY_CACHE_KEY);
        if (cached) {
            logger.info("Obteniendo categorías desde la caché");
            return cached;
        }

        const result = await turso.execute(`SELECT * FROM categories`);
        const categories = result.rows.map(row => {
            const parseResult = CategorySchema.safeParse(row);
            if (!parseResult.success) {
                logger.error("La fila devuelta no cumple con el esquema de categoría", { error: parseResult.error });
                throw new Error("La fila devuelta no cumple con el esquema de categoría");
            }
            return parseResult.data;
        })
        cache.set(CATEGORY_CACHE_KEY, categories)
        logger.info("Obteniendo categorías desde la base de datos");
        return categories;
    }

}