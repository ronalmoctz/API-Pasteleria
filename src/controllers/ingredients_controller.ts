import type { Request, Response, NextFunction } from "express";
import { IngredientService } from "@/services/ingredients_service";

const ingredientService = new IngredientService();

/**
 * Crear un nuevo ingrediente
 * @route POST /ingredients
 * @group Ingredientes - Operaciones sobre los ingredientes disponibles
 * @param {CreateIngredient.model} request.body.required - Datos del ingrediente
 * @returns 201 - Ingrediente creado exitosamente
 * @returns 400 - Error de validación o creación
 */
export async function createIngredient(req: Request, res: Response, next: NextFunction) {
    try {
        const ingredient = await ingredientService.create(req.body);
        return res.status(201).json({
            success: true,
            data: ingredient,
            message: "Ingrediente creado exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener todos los ingredientes
 * @route GET /ingredients
 * @group Ingredientes - Operaciones sobre los ingredientes disponibles
 * @returns 200 - Lista de ingredientes
 * @returns 500 - Error al obtener ingredientes
 */
export async function getAllIngredients(_req: Request, res: Response, next: NextFunction) {
    try {
        const ingredients = await ingredientService.findAll();
        return res.status(200).json({
            success: true,
            data: ingredients,
            message: "Lista de ingredientes obtenida exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener un ingrediente por ID
 * @route GET /ingredients/{id}
 * @group Ingredientes - Operaciones sobre los ingredientes disponibles
 * @param {number} id.path.required - ID del ingrediente
 * @returns 200 - Ingrediente encontrado
 * @returns 404 - Ingrediente no encontrado
 */
export async function getIngredientById(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.params.id);
        const ingredient = await ingredientService.findById(id);
        return res.status(200).json({
            success: true,
            data: ingredient,
            message: "Ingrediente encontrado"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Actualizar un ingrediente por ID
 * @route PUT /ingredients/{id}
 * @group Ingredientes - Operaciones sobre los ingredientes disponibles
 * @param {number} id.path.required - ID del ingrediente
 * @param {UpdateIngredient.model} request.body.required - Nuevos datos del ingrediente
 * @returns 200 - Ingrediente actualizado exitosamente
 * @returns 404 - Ingrediente no encontrado
 */
export async function updateIngredient(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.params.id);
        const ingredient = await ingredientService.update(id, req.body);
        return res.status(200).json({
            success: true,
            data: ingredient,
            message: "Ingrediente actualizado exitosamente"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Eliminar un ingrediente por ID
 * @route DELETE /ingredients/{id}
 * @group Ingredientes - Operaciones sobre los ingredientes disponibles
 * @param {number} id.path.required - ID del ingrediente
 * @returns 200 - Ingrediente eliminado exitosamente
 * @returns 404 - Ingrediente no encontrado
 */
export async function deleteIngredient(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.params.id);
        await ingredientService.delete(id);
        return res.status(200).json({
            success: true,
            message: "Ingrediente eliminado exitosamente"
        });
    } catch (err) {
        next(err);
    }
}
