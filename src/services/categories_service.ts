import { CategoryRepository } from "@/repositories/categories_repository";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import type { CreateCategoryDTO, UpdateCategoryDTO } from "@/schemas/categories_schema";
import type { Categories } from "@/interfaces/categories_interface";

export class CategoryService {
    private repository = new CategoryRepository()
    async create(data: CreateCategoryDTO): Promise<Categories> {
        try {
            const category = await this.repository.create(data)
            logger.info("Categoria creada con exito", { id: category.id })
            return category
        } catch (err) {
            logger.error("Error al crear categoria", { error: err })
            throw new AppError("Error al crear la categoria", 400)
        }
    }

    async findAll(): Promise<Categories[]> {
        logger.debug("Obtener todas las categorias")
        try {
            return await this.repository.findAll()

        } catch (err) {
            logger.error("Erro al obtener todas las categorias", { error: err })
            throw new AppError("Error al intentar obtener todas las categorias", 500)
        }
    }

    async findById(id: string): Promise<Categories> {
        logger.debug("Buscando por categoriavia id", { id })
        const category = await this.repository.findById(id)
        if (!category) {
            logger.warn("Categoria no encontrada", { id })
            throw new AppError("Categoria no encontrada", 404)
        }
        return category
    }

    async update(id: string, data: UpdateCategoryDTO): Promise<Categories> {
        logger.debug("Actualizando categoría", { id, data });
        const updated = await this.repository.update(id, data);
        if (!updated) {
            logger.warn("No se pudo actualizar la categoría", { id });
            throw new AppError("No se pudo actualizar la categoría", 404);
        }
        logger.info("Categoría actualizada", { id });
        return updated;
    }

    async delete(id: string): Promise<void> {
        logger.debug("Eliminando categoría", { id });
        const deleted = await this.repository.delete(id);
        if (!deleted) {
            logger.warn("No se pudo eliminar la categoría", { id });
            throw new AppError("No se pudo eliminar la categoría", 404);
        }
        logger.info("Categoría eliminada", { id });
    }
}