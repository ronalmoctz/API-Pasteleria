import { cache } from "@/utils/cache.js";
import { turso } from "@/config/tursoClient.js";
import { logger } from "@/utils/logger.js";
import type { Ingredient } from "@/interfaces/ingredient_interfaces.js";
import type { CreateIngredient, UpdateIngredient } from "@/schemas/ingredients_schema.js";
import { ingredientSchema } from "@/schemas/ingredients_schema.js";

// Cache configuration
const CACHE_KEYS = {
    ALL_INGREDIENTS: "ingredients:all",
    INGREDIENT_BY_ID: (id: number) => `ingredients:id:${id}`,
} as const;

const CACHE_TTL = {
    INGREDIENTS: 300, // 5 minutes
    SINGLE_INGREDIENT: 600, // 10 minutes
} as const;

// Custom error classes
class ValidationError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = 'ValidationError';
    }
}

class DatabaseError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export class IngredientRepository {
    /**
     * Validates ingredient data using Zod schema
     */
    private validateIngredientData(rawData: any, context: string): Ingredient {
        const validationResult = ingredientSchema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = `Invalid ingredient data during ${context}`;
            logger.error(errorMessage, {
                error: validationResult.error,
                rawData,
                context
            });
            throw new ValidationError(errorMessage, validationResult.error);
        }

        return validationResult.data;
    }

    /**
     * Invalidates all ingredient-related cache entries
     */
    private invalidateIngredientCache(): void {
        cache.del(CACHE_KEYS.ALL_INGREDIENTS);
        logger.debug("Ingredient cache invalidated");
    }

    /**
     * Invalidates specific ingredient cache entry
     */
    private invalidateSingleIngredientCache(ingredientId: number): void {
        cache.del(CACHE_KEYS.INGREDIENT_BY_ID(ingredientId));
        logger.debug("Single ingredient cache invalidated", { ingredientId });
    }

    /**
     * Executes database query with error handling
     */
    private async executeDatabaseQuery(query: { sql: string; args?: any[] }, operation: string) {
        try {
            return await turso.execute(query);
        } catch (databaseError) {
            const errorMessage = `Database operation failed: ${operation}`;
            logger.error(errorMessage, { error: databaseError, query });
            throw new DatabaseError(errorMessage, databaseError);
        }
    }

    /**
     * Creates a new ingredient
     */
    async create(ingredientData: CreateIngredient): Promise<Ingredient> {
        const insertQuery = {
            sql: `INSERT INTO ingredients (name, stock_quantity, unit) VALUES (?, ?, ?) RETURNING *`,
            args: [ingredientData.name, ingredientData.stock_quantity, ingredientData.unit],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create ingredient");
        const createdIngredientRow = queryResult.rows[0];

        if (!createdIngredientRow) {
            const errorMessage = "No data returned after ingredient creation";
            logger.error(errorMessage, { ingredientData });
            throw new DatabaseError(errorMessage);
        }

        const validatedIngredient = this.validateIngredientData(
            createdIngredientRow,
            "ingredient creation"
        );

        // Invalidate cache after successful creation
        this.invalidateIngredientCache();

        logger.info("Ingredient created successfully", {
            ingredientId: validatedIngredient.id,
            name: validatedIngredient.name
        });

        return validatedIngredient;
    }

    /**
     * Retrieves all ingredients with caching
     */
    async findAll(): Promise<Ingredient[]> {
        // Check cache first
        const cachedIngredients = cache.get<Ingredient[]>(CACHE_KEYS.ALL_INGREDIENTS);
        if (cachedIngredients) {
            logger.debug("Ingredients retrieved from cache");
            return cachedIngredients;
        }

        // Query database
        const selectQuery = { sql: `SELECT * FROM ingredients ORDER BY name` };
        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch all ingredients");

        const validatedIngredients: Ingredient[] = [];

        for (const ingredientRow of queryResult.rows) {
            try {
                const validatedIngredient = this.validateIngredientData(
                    ingredientRow,
                    "bulk ingredient retrieval"
                );
                validatedIngredients.push(validatedIngredient);
            } catch (validationError) {
                logger.warn("Skipping invalid ingredient row", {
                    error: validationError,
                    row: ingredientRow
                });
                // Continue processing other rows instead of throwing
            }
        }

        // Cache the results
        cache.set(CACHE_KEYS.ALL_INGREDIENTS, validatedIngredients, CACHE_TTL.INGREDIENTS);

        logger.info("Ingredients retrieved from database", {
            count: validatedIngredients.length
        });

        return validatedIngredients;
    }

    /**
     * Finds ingredient by ID with caching
     */
    async findById(ingredientId: number): Promise<Ingredient | null> {
        const cacheKey = CACHE_KEYS.INGREDIENT_BY_ID(ingredientId);

        // Check cache first
        const cachedIngredient = cache.get<Ingredient>(cacheKey);
        if (cachedIngredient) {
            logger.debug("Ingredient retrieved from cache", { ingredientId });
            return cachedIngredient;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM ingredients WHERE id = ?`,
            args: [ingredientId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find ingredient by ID");
        const ingredientRow = queryResult.rows[0];

        if (!ingredientRow) {
            logger.debug("Ingredient not found", { ingredientId });
            return null;
        }

        const validatedIngredient = this.validateIngredientData(
            ingredientRow,
            `ingredient retrieval by ID: ${ingredientId}`
        );

        // Cache the result
        cache.set(cacheKey, validatedIngredient, CACHE_TTL.SINGLE_INGREDIENT);

        logger.debug("Ingredient retrieved from database", { ingredientId });
        return validatedIngredient;
    }

    /**
     * Updates an existing ingredient
     */
    async update(ingredientId: number, updateData: UpdateIngredient): Promise<Ingredient | null> {
        const existingIngredient = await this.findById(ingredientId);
        if (!existingIngredient) {
            logger.debug("Ingredient not found for update", { ingredientId });
            return null;
        }

        // Merge existing data with updates
        const updatedIngredientData = {
            name: updateData.name ?? existingIngredient.name,
            stock_quantity: updateData.stock_quantity ?? existingIngredient.stock_quantity,
            unit: updateData.unit ?? existingIngredient.unit,
        };

        const updateQuery = {
            sql: `UPDATE ingredients SET name = ?, stock_quantity = ?, unit = ? WHERE id = ? RETURNING *`,
            args: [
                updatedIngredientData.name,
                updatedIngredientData.stock_quantity,
                updatedIngredientData.unit,
                ingredientId
            ],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "update ingredient");
        const updatedIngredientRow = queryResult.rows[0];

        if (!updatedIngredientRow) {
            const errorMessage = "No data returned after ingredient update";
            logger.error(errorMessage, { ingredientId, updateData });
            throw new DatabaseError(errorMessage);
        }

        const validatedUpdatedIngredient = this.validateIngredientData(
            updatedIngredientRow,
            `ingredient update for ID: ${ingredientId}`
        );

        // Invalidate relevant cache entries
        this.invalidateIngredientCache();
        this.invalidateSingleIngredientCache(ingredientId);

        logger.info("Ingredient updated successfully", {
            ingredientId,
            changedFields: Object.keys(updateData)
        });

        return validatedUpdatedIngredient;
    }

    /**
     * Deletes an ingredient by ID
     */
    async delete(ingredientId: number): Promise<boolean> {
        const deleteQuery = {
            sql: `DELETE FROM ingredients WHERE id = ?`,
            args: [ingredientId],
        };

        const queryResult = await this.executeDatabaseQuery(deleteQuery, "delete ingredient");
        const wasDeleted = queryResult.rowsAffected > 0;

        if (wasDeleted) {
            // Invalidate relevant cache entries
            this.invalidateIngredientCache();
            this.invalidateSingleIngredientCache(ingredientId);

            logger.info("Ingredient deleted successfully", { ingredientId });
        } else {
            logger.warn("Ingredient not found for deletion", { ingredientId });
        }

        return wasDeleted;
    }

    /**
     * Checks if an ingredient exists by ID
     */
    async exists(ingredientId: number): Promise<boolean> {
        const ingredient = await this.findById(ingredientId);
        return ingredient !== null;
    }

    /**
     * Finds ingredients by name (partial match)
     */
    async findByName(searchTerm: string): Promise<Ingredient[]> {
        const searchQuery = {
            sql: `SELECT * FROM ingredients WHERE name ILIKE ? ORDER BY name`,
            args: [`%${searchTerm}%`],
        };

        const queryResult = await this.executeDatabaseQuery(searchQuery, "search ingredients by name");
        const matchingIngredients: Ingredient[] = [];

        for (const ingredientRow of queryResult.rows) {
            try {
                const validatedIngredient = this.validateIngredientData(
                    ingredientRow,
                    "ingredient search by name"
                );
                matchingIngredients.push(validatedIngredient);
            } catch (validationError) {
                logger.warn("Skipping invalid ingredient row in search", {
                    error: validationError,
                    row: ingredientRow
                });
            }
        }

        logger.debug("Ingredients found by name search", {
            searchTerm,
            resultCount: matchingIngredients.length
        });

        return matchingIngredients;
    }
}