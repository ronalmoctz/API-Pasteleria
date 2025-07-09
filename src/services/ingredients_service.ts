import { IngredientRepository } from "@/repositories/ingredient_repository";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import type { CreateIngredient, UpdateIngredient } from "@/schemas/ingredients_schema";
import type { Ingredient } from "@/interfaces/ingredient_interfaces";

export class IngredientService {
    private repository = new IngredientRepository();

    async create(data: CreateIngredient): Promise<Ingredient> {
        try {
            const ingredient = await this.repository.create(data);
            logger.info("Ingrediente creado con éxito", { id: ingredient.id });
            return ingredient;
        } catch (err) {
            logger.error("Error al crear el ingrediente", { error: err });
            throw new AppError("Error al crear el ingrediente", 400);
        }
    }

    async findAll(): Promise<Ingredient[]> {
        logger.debug("Obteniendo todos los ingredientes");
        try {
            return await this.repository.findAll();
        } catch (err) {
            logger.error("Error al obtener ingredientes", { error: err });
            throw new AppError("Error al obtener ingredientes", 500);
        }
    }

    async findById(id: number): Promise<Ingredient> {
        logger.debug("Buscando ingrediente por ID", { id });
        const ingredient = await this.repository.findById(id);
        if (!ingredient) {
            logger.warn("Ingrediente no encontrado", { id });
            throw new AppError("Ingrediente no encontrado", 404);
        }
        return ingredient;
    }

    async update(id: number, data: UpdateIngredient): Promise<Ingredient> {
        logger.debug("Actualizando ingrediente", { id, data });
        const updated = await this.repository.update(id, data);
        if (!updated) {
            logger.warn("No se pudo actualizar el ingrediente", { id });
            throw new AppError("No se pudo actualizar el ingrediente", 404);
        }
        logger.info("Ingrediente actualizado", { id });
        return updated;
    }

    async delete(id: number): Promise<void> {
        logger.debug("Eliminando ingrediente", { id });
        const deleted = await this.repository.delete(id);
        if (!deleted) {
            logger.warn("No se pudo eliminar el ingrediente", { id });
            throw new AppError("No se pudo eliminar el ingrediente", 404);
        }
        logger.info("Ingrediente eliminado", { id });
    }
}
