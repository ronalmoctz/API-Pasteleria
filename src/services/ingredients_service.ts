import { IngredientRepository } from "@/repositories/ingredient_repository.js";
import { AppError } from "@/utils/app_error.js";
import { logger } from "@/utils/logger.js";
import type { CreateIngredient, UpdateIngredient } from "@/schemas/ingredients_schema.js";
import type { Ingredient } from "@/interfaces/ingredient_interfaces.js";

// Service-specific error messages
const ERROR_MESSAGES = {
    INGREDIENT_NOT_FOUND: "Ingrediente no encontrado",
    INGREDIENT_CREATION_FAILED: "Error al crear el ingrediente",
    INGREDIENT_UPDATE_FAILED: "Error al actualizar el ingrediente",
    INGREDIENT_DELETE_FAILED: "Error al eliminar el ingrediente",
    INGREDIENT_RETRIEVAL_FAILED: "Error al obtener ingredientes",
    INGREDIENT_ALREADY_EXISTS: "Ya existe un ingrediente con este nombre",
    INGREDIENT_IN_USE: "No se puede eliminar el ingrediente porque está siendo utilizado",
} as const;

// HTTP status codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export class IngredientService {
    private ingredientRepository = new IngredientRepository();

    /**
     * Creates a new ingredient with validation
     */
    async createIngredient(ingredientData: CreateIngredient): Promise<Ingredient> {
        const operationContext = "ingredient creation";

        logger.debug("Starting ingredient creation", {
            ingredientName: ingredientData.name,
            operation: operationContext
        });

        try {
            // Check if ingredient with same name already exists
            const existingIngredients = await this.ingredientRepository.findByName(ingredientData.name);
            const exactMatch = existingIngredients.find(
                ingredient => ingredient.name.toLowerCase() === ingredientData.name.toLowerCase()
            );

            if (exactMatch) {
                logger.warn("Attempt to create duplicate ingredient", {
                    ingredientName: ingredientData.name,
                    existingIngredientId: exactMatch.id
                });
                throw new AppError(ERROR_MESSAGES.INGREDIENT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
            }

            const createdIngredient = await this.ingredientRepository.create(ingredientData);

            logger.info("Ingredient created successfully", {
                ingredientId: createdIngredient.id,
                ingredientName: createdIngredient.name,
                stockQuantity: createdIngredient.stock_quantity
            });

            return createdIngredient;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to create ingredient", {
                error,
                ingredientData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_CREATION_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Retrieves all ingredients
     */
    async getAllIngredients(): Promise<Ingredient[]> {
        const operationContext = "fetch all ingredients";

        logger.debug("Retrieving all ingredients", { operation: operationContext });

        try {
            const ingredients = await this.ingredientRepository.findAll();

            logger.debug("Successfully retrieved ingredients", {
                ingredientCount: ingredients.length,
                operation: operationContext
            });

            return ingredients;
        } catch (error) {
            logger.error("Failed to retrieve ingredients", {
                error,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Finds ingredient by ID with existence validation
     */
    async getIngredientById(ingredientId: number): Promise<Ingredient> {
        const operationContext = "find ingredient by ID";

        logger.debug("Searching for ingredient by ID", {
            ingredientId,
            operation: operationContext
        });

        try {
            const foundIngredient = await this.ingredientRepository.findById(ingredientId);

            if (!foundIngredient) {
                logger.warn("Ingredient not found", {
                    ingredientId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INGREDIENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            logger.debug("Ingredient found successfully", {
                ingredientId,
                ingredientName: foundIngredient.name,
                operation: operationContext
            });

            return foundIngredient;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Error while finding ingredient", {
                error,
                ingredientId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Updates an existing ingredient
     */
    async updateIngredient(ingredientId: number, updateData: UpdateIngredient): Promise<Ingredient> {
        const operationContext = "ingredient update";

        logger.debug("Starting ingredient update", {
            ingredientId,
            updateData,
            operation: operationContext
        });

        try {
            // Check if ingredient exists first
            await this.getIngredientById(ingredientId);

            // If updating name, check for duplicates
            if (updateData.name) {
                const existingIngredients = await this.ingredientRepository.findByName(updateData.name);
                const exactMatch = existingIngredients.find(
                    ingredient =>
                        ingredient.name.toLowerCase() === updateData.name!.toLowerCase() &&
                        ingredient.id !== ingredientId
                );

                if (exactMatch) {
                    logger.warn("Attempt to update ingredient with duplicate name", {
                        ingredientId,
                        newName: updateData.name,
                        conflictingIngredientId: exactMatch.id
                    });
                    throw new AppError(ERROR_MESSAGES.INGREDIENT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
                }
            }

            const updatedIngredient = await this.ingredientRepository.update(ingredientId, updateData);

            if (!updatedIngredient) {
                logger.error("Ingredient update returned null unexpectedly", {
                    ingredientId,
                    updateData,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INGREDIENT_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Ingredient updated successfully", {
                ingredientId,
                updatedFields: Object.keys(updateData),
                operation: operationContext
            });

            return updatedIngredient;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to update ingredient", {
                error,
                ingredientId,
                updateData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_UPDATE_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Deletes an ingredient by ID
     */
    async deleteIngredient(ingredientId: number): Promise<void> {
        const operationContext = "ingredient deletion";

        logger.debug("Starting ingredient deletion", {
            ingredientId,
            operation: operationContext
        });

        try {
            // Check if ingredient exists first
            const existingIngredient = await this.getIngredientById(ingredientId);

            // TODO: Add check for ingredient usage in recipes/orders
            // const isIngredientInUse = await this.checkIngredientUsage(ingredientId);
            // if (isIngredientInUse) {
            //     throw new AppError(ERROR_MESSAGES.INGREDIENT_IN_USE, HTTP_STATUS.CONFLICT);
            // }

            const wasDeleted = await this.ingredientRepository.delete(ingredientId);

            if (!wasDeleted) {
                logger.error("Ingredient deletion returned false unexpectedly", {
                    ingredientId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INGREDIENT_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Ingredient deleted successfully", {
                ingredientId,
                deletedIngredientName: existingIngredient.name,
                operation: operationContext
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to delete ingredient", {
                error,
                ingredientId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Searches ingredients by name
     */
    async searchIngredientsByName(searchTerm: string): Promise<Ingredient[]> {
        const operationContext = "ingredient search by name";

        logger.debug("Searching ingredients by name", {
            searchTerm,
            operation: operationContext
        });

        if (!searchTerm || searchTerm.trim().length === 0) {
            logger.warn("Empty search term provided", { operation: operationContext });
            return [];
        }

        try {
            const foundIngredients = await this.ingredientRepository.findByName(searchTerm.trim());

            logger.debug("Ingredient search completed", {
                searchTerm,
                resultCount: foundIngredients.length,
                operation: operationContext
            });

            return foundIngredients;
        } catch (error) {
            logger.error("Failed to search ingredients", {
                error,
                searchTerm,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Checks if an ingredient exists
     */
    async checkIngredientExists(ingredientId: number): Promise<boolean> {
        const operationContext = "ingredient existence check";

        logger.debug("Checking ingredient existence", {
            ingredientId,
            operation: operationContext
        });

        try {
            const exists = await this.ingredientRepository.exists(ingredientId);

            logger.debug("Ingredient existence check completed", {
                ingredientId,
                exists,
                operation: operationContext
            });

            return exists;
        } catch (error) {
            logger.error("Failed to check ingredient existence", {
                error,
                ingredientId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Updates ingredient stock quantity
     */
    async updateIngredientStock(ingredientId: number, newQuantity: number): Promise<Ingredient> {
        const operationContext = "ingredient stock update";

        logger.debug("Updating ingredient stock", {
            ingredientId,
            newQuantity,
            operation: operationContext
        });

        if (newQuantity < 0) {
            logger.warn("Attempt to set negative stock quantity", {
                ingredientId,
                newQuantity,
                operation: operationContext
            });
            throw new AppError("La cantidad en stock no puede ser negativa", HTTP_STATUS.BAD_REQUEST);
        }

        try {
            const updatedIngredient = await this.updateIngredient(ingredientId, {
                stock_quantity: newQuantity
            });

            logger.info("Ingredient stock updated successfully", {
                ingredientId,
                newQuantity,
                operation: operationContext
            });

            return updatedIngredient;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to update ingredient stock", {
                error,
                ingredientId,
                newQuantity,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.INGREDIENT_UPDATE_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }
}