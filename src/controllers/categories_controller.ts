import type { Request, Response, NextFunction } from "express";
import { CategoryService } from "@/services/categories_service.js";

const categoryService = new CategoryService();

/**
 * Crear una nueva categoría
 * @route POST /categories
 * @group Categorías - Operaciones sobre categorías de productos
 * @param {CreateCategoryDTO.model} request.body.required - Datos de la categoría
 * @returns 201 - Categoría creada exitosamente
 * @returns 400 - Error de validación o fallo en la creación
 */
export async function createCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({
            success: true,
            data: category,
            message: "Categoría creada exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener todas las categorías
 * @route GET /categories
 * @group Categorías - Operaciones sobre categorías de productos
 * @returns 200 - Lista de categorías
 * @returns 500 - Error al obtener las categorías
 */
export async function getAllCategories(_req: Request, res: Response, next: NextFunction) {
    try {
        const categories = await categoryService.getAllCategories();
        res.status(200).json({
            success: true,
            data: categories,
            message: "Lista de categorías obtenida exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener una categoría por ID
 * @route GET /categories/{id}
 * @group Categorías - Operaciones sobre categorías de productos
 * @param {string} id.path.required - ID de la categoría
 * @returns 200 - Categoría encontrada
 * @returns 404 - Categoría no encontrada
 */
export async function getCategoryById(_req: Request, res: Response, next: NextFunction) {
    try {
        const category = await categoryService.
            getCategoryById(_req.params.id);
        res.status(200).json({
            success: true,
            data: category,
            message: "Categoría encontrada"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Actualizar una categoría por ID
 * @route PUT /categories/{id}
 * @group Categorías - Operaciones sobre categorías de productos
 * @param {string} id.path.required - ID de la categoría
 * @param {UpdateCategoryDTO.model} request.body.required - Nuevos datos de la categoría
 * @returns 200 - Categoría actualizada exitosamente
 * @returns 404 - Categoría no encontrada
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        res.status(200).json({
            success: true,
            data: category,
            message: "Categoría actualizada exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Eliminar una categoría por ID
 * @route DELETE /categories/{id}
 * @group Categorías - Operaciones sobre categorías de productos
 * @param {string} id.path.required - ID de la categoría
 * @returns 200 - Categoría eliminada exitosamente
 * @returns 404 - Categoría no encontrada
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
        await categoryService.deleteCategory(req.params.id);
        res.status(200).json({
            success: true,
            message: "Categoría eliminada exitosamente"
        });
    } catch (err) {
        next(err);
    }
}
