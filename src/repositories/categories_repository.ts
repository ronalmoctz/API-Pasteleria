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
            sql: `INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *`,
            args: [data.name, data.description ?? null],
        });

        if (!result.rows.length) {
            logger.error("Error al crear la categoría", { data });
            throw new Error("Error al crear la categoría");
        }

        const parseResult = CategorySchema.safeParse(result.rows[0]);
        if (!parseResult.success) {
            logger.error("La fila devuelta no cumple con el esquema de categoría", { error: parseResult.error });
            throw new Error("La fila devuelta no cumple con el esquema de categoría");
        }

        cache.del(CATEGORY_CACHE_KEY);
        return parseResult.data;
    }

    async findAll(): Promise<Categories[]> {
        const cached = cache.get<Categories[]>(CATEGORY_CACHE_KEY);
        if (cached) {
            logger.info("Obteniendo categorías desde la caché");
            return cached;
        }

        const result = await turso.execute(`SELECT * FROM categories`);

        const categories = result.rows.map((row) => {
            const parseResult = CategorySchema.safeParse(row);
            if (!parseResult.success) {
                logger.error("Fila inválida en base de datos", { error: parseResult.error });
                throw new Error("Error validando datos desde la base de datos");
            }
            return parseResult.data;
        });

        cache.set(CATEGORY_CACHE_KEY, categories);
        logger.info("Obteniendo categorías desde la base de datos");
        return categories;
    }

    async findById(id: string): Promise<Categories | null> {
        const result = await turso.execute({
            sql: `SELECT * FROM categories WHERE id = ?`,
            args: [id],
        });

        const row = result.rows[0];
        if (!row) return null;

        const parseResult = CategorySchema.safeParse(row);
        if (!parseResult.success) {
            logger.error("La fila devuelta no cumple con el esquema de categoría", { error: parseResult.error });
            throw new Error("La fila devuelta no cumple con el esquema de categoría");
        }

        return parseResult.data;
    }

    async update(id: string, data: UpdateCategoryDTO): Promise<Categories | null> {
        const existing = await this.findById(id);
        if (!existing) return null;

        const updatedName = data.name ?? existing.name;
        const updatedDescription = data.description ?? existing.description ?? null;

        const result = await turso.execute({
            sql: `UPDATE categories SET name = ?, description = ? WHERE id = ? RETURNING *`,
            args: [updatedName, updatedDescription, id],
        });

        if (!result.rows.length) {
            logger.warn("Error al actualizar, no se encontró la categoría", { id });
            return null;
        }

        const parseResult = CategorySchema.safeParse(result.rows[0]);
        if (!parseResult.success) {
            logger.error("Error validando categoría actualizada", { error: parseResult.error });
            throw new Error("La categoría actualizada no es válida");
        }

        cache.del(CATEGORY_CACHE_KEY);
        return parseResult.data;
    }

    async delete(id: string): Promise<boolean> {
        const result = await turso.execute({
            sql: `DELETE FROM categories WHERE id = ?`,
            args: [id],
        });

        if (result.rowsAffected > 0) {
            cache.del(CATEGORY_CACHE_KEY);
            logger.info("Categoría eliminada correctamente", { id });
            return true;
        }

        logger.warn("No se encontró la categoría para eliminar", { id });
        return false;
    }
}
