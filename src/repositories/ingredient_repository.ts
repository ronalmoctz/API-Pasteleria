import { cache } from "@/utils/chache";
import { turso } from "@/config/tursoClient";
import { logger } from "@/utils/logger";
import type { Ingredient } from "@/interfaces/ingredient_interfaces";
import type { CreateIngredient, UpdateIngredient } from "@/schemas/ingredients_schema";
import { ingredientSchema } from "@/schemas/ingredients_schema";

const INGREDIENT_CACHE_KEY = "ingredients:all";

export class IngredientRepository {
    async create(data: CreateIngredient): Promise<Ingredient> {
        const result = await turso.execute({
            sql: `INSERT INTO ingredients (name, stock_quantity, unit) VALUES (?, ?, ?) RETURNING *`,
            args: [data.name, data.stock_quantity, data.unit],
        });

        const row = result.rows[0];
        if (!row) {
            logger.error("Error al crear el ingrediente", { data });
            throw new Error("Error al crear el ingrediente");
        }

        const parseResult = ingredientSchema.safeParse(row);
        if (!parseResult.success) {
            logger.error("El ingrediente creado no cumple con el esquema", { error: parseResult.error });
            throw new Error("Datos de ingrediente no válidos desde la base de datos");
        }

        cache.del(INGREDIENT_CACHE_KEY);
        return parseResult.data;
    }

    async findAll(): Promise<Ingredient[]> {
        const cached = cache.get<Ingredient[]>(INGREDIENT_CACHE_KEY);
        if (cached) {
            logger.info("Obteniendo ingredientes desde la caché");
            return cached;
        }

        const result = await turso.execute(`SELECT * FROM ingredients`);
        const ingredients: Ingredient[] = [];

        for (const row of result.rows) {
            const parsed = ingredientSchema.safeParse(row);
            if (!parsed.success) {
                logger.error("Fila inválida en la tabla de ingredientes", { error: parsed.error });
                throw new Error("Error al validar un ingrediente");
            }
            ingredients.push(parsed.data);
        }

        cache.set(INGREDIENT_CACHE_KEY, ingredients);
        logger.info("Obteniendo ingredientes desde la base de datos");
        return ingredients;
    }

    async findById(id: number): Promise<Ingredient | null> {
        const result = await turso.execute({
            sql: `SELECT * FROM ingredients WHERE id = ?`,
            args: [id],
        });

        const row = result.rows[0];
        if (!row) return null;

        const parsed = ingredientSchema.safeParse(row);
        if (!parsed.success) {
            logger.error("Ingrediente no válido encontrado por ID", { error: parsed.error });
            throw new Error("Ingrediente inválido al buscar por ID");
        }

        return parsed.data;
    }

    async update(id: number, data: UpdateIngredient): Promise<Ingredient | null> {
        const existing = await this.findById(id);
        if (!existing) return null;

        const updatedName = data.name ?? existing.name;
        const updatedQty = data.stock_quantity ?? existing.stock_quantity;
        const updatedUnit = data.unit ?? existing.unit;

        const result = await turso.execute({
            sql: `UPDATE ingredients SET name = ?, stock_quantity = ?, unit = ? WHERE id = ? RETURNING *`,
            args: [updatedName, updatedQty, updatedUnit, id],
        });

        const row = result.rows[0];
        if (!row) return null;

        const parsed = ingredientSchema.safeParse(row);
        if (!parsed.success) {
            logger.error("Ingrediente actualizado inválido", { error: parsed.error });
            throw new Error("Ingrediente actualizado inválido");
        }

        cache.del(INGREDIENT_CACHE_KEY);
        return parsed.data;
    }

    async delete(id: number): Promise<boolean> {
        const result = await turso.execute({
            sql: `DELETE FROM ingredients WHERE id = ?`,
            args: [id],
        });

        if (result.rowsAffected > 0) {
            cache.del(INGREDIENT_CACHE_KEY);
            logger.info("Ingrediente eliminado", { id });
            return true;
        }

        logger.warn("Ingrediente no encontrado para eliminar", { id });
        return false;
    }
}
