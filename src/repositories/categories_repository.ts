import { cache } from "@/utils/cache.js";
import { turso } from "@/config/tursoClient.js";
import { logger } from "@/utils/logger.js";
import type { Categories } from "@/interfaces/categories_interface.js";
import type { CreateCategoryDTO, UpdateCategoryDTO } from "@/schemas/categories_schema.js";
import { CategorySchema } from "@/schemas/categories_schema.js";

// Cache configuration
const CACHE_KEYS = {
    ALL_CATEGORIES: "categories:all",
    CATEGORY_BY_ID: (id: string) => `categories:id:${id}`,
    CATEGORY_BY_NAME: (name: string) => `categories:name:${name}`,
} as const;

const CACHE_TTL = {
    CATEGORIES: 300,
    SINGLE_CATEGORY: 300,
    CATEGORY_BY_NAME: 300,
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

export class CategoryRepository {
    /**
     * Validates category data using Zod schema
     */
    private validateCategoryData(rawData: any, context: string): Categories {
        const validationResult = CategorySchema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = `Invalid category data during ${context}`;
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
     * Invalidates all category-related cache entries
     */
    private invalidateCategoryCache(): void {
        cache.del(CACHE_KEYS.ALL_CATEGORIES);
        logger.debug("Category cache invalidated");
    }

    /**
     * Invalidates specific category cache entry
     */
    private invalidateSingleCategoryCache(categoryId: string): void {
        cache.del(CACHE_KEYS.CATEGORY_BY_ID(categoryId));
        logger.debug("Single category cache invalidated", { categoryId });
    }

    /**
     * Invalidates category by name cache entry
     */
    private invalidateCategoryByNameCache(categoryName: string): void {
        cache.del(CACHE_KEYS.CATEGORY_BY_NAME(categoryName));
        logger.debug("Category by name cache invalidated", { categoryName });
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
     * Creates a new category
     */
    async create(categoryData: CreateCategoryDTO): Promise<Categories> {
        const insertQuery = {
            sql: `INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *`,
            args: [categoryData.name, categoryData.description ?? null],
        };

        const queryResult = await this.executeDatabaseQuery(insertQuery, "create category");
        const createdCategoryRow = queryResult.rows[0];

        if (!createdCategoryRow) {
            const errorMessage = "No data returned after category creation";
            logger.error(errorMessage, { categoryData });
            throw new DatabaseError(errorMessage);
        }

        const validatedCategory = this.validateCategoryData(
            createdCategoryRow,
            "category creation"
        );

        // Invalidate relevant cache entries
        this.invalidateCategoryCache();

        logger.info("Category created successfully", {
            categoryId: validatedCategory.id,
            categoryName: validatedCategory.name
        });

        return validatedCategory;
    }

    /**
     * Retrieves all categories with caching
     */
    async findAll(): Promise<Categories[]> {
        // Check cache first
        const cachedCategories = cache.get<Categories[]>(CACHE_KEYS.ALL_CATEGORIES);
        if (cachedCategories) {
            logger.debug("Categories retrieved from cache");
            return cachedCategories;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM categories ORDER BY name ASC`
        };
        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch all categories");

        const validatedCategories: Categories[] = [];

        for (const categoryRow of queryResult.rows) {
            try {
                const validatedCategory = this.validateCategoryData(
                    categoryRow,
                    "bulk category retrieval"
                );
                validatedCategories.push(validatedCategory);
            } catch (validationError) {
                logger.warn("Skipping invalid category row", {
                    error: validationError,
                    row: categoryRow
                });
                // Continue processing other rows instead of throwing
            }
        }

        // Cache the results
        cache.set(CACHE_KEYS.ALL_CATEGORIES, validatedCategories, CACHE_TTL.CATEGORIES);

        logger.info("Categories retrieved from database", {
            count: validatedCategories.length
        });

        return validatedCategories;
    }

    /**
     * Finds category by ID with caching
     */
    async findById(categoryId: string): Promise<Categories | null> {
        const cacheKey = CACHE_KEYS.CATEGORY_BY_ID(categoryId);

        // Check cache first
        const cachedCategory = cache.get<Categories>(cacheKey);
        if (cachedCategory) {
            logger.debug("Category retrieved from cache", { categoryId });
            return cachedCategory;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM categories WHERE id = ?`,
            args: [categoryId],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find category by ID");
        const categoryRow = queryResult.rows[0];

        if (!categoryRow) {
            logger.debug("Category not found", { categoryId });
            return null;
        }

        const validatedCategory = this.validateCategoryData(
            categoryRow,
            `category retrieval by ID: ${categoryId}`
        );

        // Cache the result
        cache.set(cacheKey, validatedCategory, CACHE_TTL.SINGLE_CATEGORY);

        logger.debug("Category retrieved from database", { categoryId });
        return validatedCategory;
    }

    /**
     * Finds category by exact name with caching
     */
    async findByExactName(categoryName: string): Promise<Categories | null> {
        const cacheKey = CACHE_KEYS.CATEGORY_BY_NAME(categoryName);

        // Check cache first
        const cachedCategory = cache.get<Categories>(cacheKey);
        if (cachedCategory) {
            logger.debug("Category retrieved from cache by name", { categoryName });
            return cachedCategory;
        }

        // Query database
        const selectQuery = {
            sql: `SELECT * FROM categories WHERE LOWER(name) = LOWER(?)`,
            args: [categoryName],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find category by exact name");
        const categoryRow = queryResult.rows[0];

        if (!categoryRow) {
            logger.debug("Category not found by name", { categoryName });
            return null;
        }

        const validatedCategory = this.validateCategoryData(
            categoryRow,
            `category retrieval by name: ${categoryName}`
        );

        // Cache the result
        cache.set(cacheKey, validatedCategory, CACHE_TTL.CATEGORY_BY_NAME);

        logger.debug("Category retrieved from database by name", { categoryName });
        return validatedCategory;
    }

    /**
     * Finds categories by name pattern (for search functionality)
     */
    async findByName(searchTerm: string): Promise<Categories[]> {
        // Query database
        const selectQuery = {
            sql: `SELECT * FROM categories WHERE LOWER(name) LIKE LOWER(?) ORDER BY name ASC`,
            args: [`%${searchTerm}%`],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "find categories by name pattern");
        const validatedCategories: Categories[] = [];

        for (const categoryRow of queryResult.rows) {
            try {
                const validatedCategory = this.validateCategoryData(
                    categoryRow,
                    `category search by name: ${searchTerm}`
                );
                validatedCategories.push(validatedCategory);
            } catch (validationError) {
                logger.warn("Skipping invalid category row in name search", {
                    error: validationError,
                    row: categoryRow,
                    searchTerm
                });
            }
        }

        logger.debug("Categories found by name pattern", {
            searchTerm,
            count: validatedCategories.length
        });

        return validatedCategories;
    }

    /**
     * Updates an existing category
     */
    async update(categoryId: string, updateData: UpdateCategoryDTO): Promise<Categories | null> {
        const existingCategory = await this.findById(categoryId);
        if (!existingCategory) {
            logger.debug("Category not found for update", { categoryId });
            return null;
        }

        // Merge existing data with updates
        const updatedCategoryData = {
            name: updateData.name ?? existingCategory.name,
            description: updateData.description ?? existingCategory.description ?? null,
        };

        const updateQuery = {
            sql: `UPDATE categories SET name = ?, description = ? WHERE id = ? RETURNING *`,
            args: [
                updatedCategoryData.name,
                updatedCategoryData.description,
                categoryId
            ],
        };

        const queryResult = await this.executeDatabaseQuery(updateQuery, "update category");
        const updatedCategoryRow = queryResult.rows[0];

        if (!updatedCategoryRow) {
            const errorMessage = "No data returned after category update";
            logger.error(errorMessage, { categoryId, updateData });
            throw new DatabaseError(errorMessage);
        }

        const validatedUpdatedCategory = this.validateCategoryData(
            updatedCategoryRow,
            `category update for ID: ${categoryId}`
        );

        // Invalidate relevant cache entries
        this.invalidateCategoryCache();
        this.invalidateSingleCategoryCache(categoryId);

        // If name changed, invalidate old name cache
        if (updateData.name && updateData.name !== existingCategory.name) {
            this.invalidateCategoryByNameCache(existingCategory.name);
        }

        logger.info("Category updated successfully", {
            categoryId,
            changedFields: Object.keys(updateData)
        });

        return validatedUpdatedCategory;
    }

    /**
     * Deletes a category by ID
     */
    async delete(categoryId: string): Promise<boolean> {
        const existingCategory = await this.findById(categoryId);
        if (!existingCategory) {
            logger.warn("Category not found for deletion", { categoryId });
            return false;
        }

        const deleteQuery = {
            sql: `DELETE FROM categories WHERE id = ?`,
            args: [categoryId],
        };

        const queryResult = await this.executeDatabaseQuery(deleteQuery, "delete category");
        const wasDeleted = queryResult.rowsAffected > 0;

        if (wasDeleted) {
            // Invalidate relevant cache entries
            this.invalidateCategoryCache();
            this.invalidateSingleCategoryCache(categoryId);
            this.invalidateCategoryByNameCache(existingCategory.name);

            logger.info("Category deleted successfully", { categoryId });
        }

        return wasDeleted;
    }

    /**
     * Checks if a category exists by ID
     */
    async exists(categoryId: string): Promise<boolean> {
        const category = await this.findById(categoryId);
        return category !== null;
    }

    /**
     * Checks if a category exists by name
     */
    async existsByName(categoryName: string): Promise<boolean> {
        const category = await this.findByExactName(categoryName);
        return category !== null;
    }

    /**
     * Gets categories count
     */
    async getCount(): Promise<number> {
        const selectQuery = {
            sql: `SELECT COUNT(*) as count FROM categories`
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "get categories count");
        const count = parseInt(String(queryResult.rows[0].count ?? "0")) || 0;

        logger.debug("Categories count retrieved", { count });
        return count;
    }

    /**
     * Gets categories with pagination
     */
    async findWithPagination(page: number = 1, limit: number = 10): Promise<{
        categories: Categories[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const offset = (page - 1) * limit;

        // Get total count
        const total = await this.getCount();
        const totalPages = Math.ceil(total / limit);

        // Get paginated results
        const selectQuery = {
            sql: `SELECT * FROM categories ORDER BY name ASC LIMIT ? OFFSET ?`,
            args: [limit, offset],
        };

        const queryResult = await this.executeDatabaseQuery(selectQuery, "fetch categories with pagination");
        const validatedCategories: Categories[] = [];

        for (const categoryRow of queryResult.rows) {
            try {
                const validatedCategory = this.validateCategoryData(
                    categoryRow,
                    "paginated category retrieval"
                );
                validatedCategories.push(validatedCategory);
            } catch (validationError) {
                logger.warn("Skipping invalid category row in pagination", {
                    error: validationError,
                    row: categoryRow
                });
            }
        }

        logger.debug("Categories retrieved with pagination", {
            page,
            limit,
            total,
            totalPages,
            returnedCount: validatedCategories.length
        });

        return {
            categories: validatedCategories,
            total,
            page,
            limit,
            totalPages
        };
    }
}