import { CategoryRepository } from "@/repositories/categories_repository";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import { HTTP_STATUS } from "@/constants/http_status";
import type { CreateCategoryDTO, UpdateCategoryDTO } from "@/schemas/categories_schema";
import type { Categories } from "@/interfaces/categories_interface";


const ERROR_MESSAGES = {
    CATEGORY_NOT_FOUND: "Categoría no encontrada",
    CATEGORY_CREATION_FAILED: "Error al crear la categoría",
    CATEGORY_UPDATE_FAILED: "Error al actualizar la categoría",
    CATEGORY_DELETE_FAILED: "Error al eliminar la categoría",
    CATEGORY_RETRIEVAL_FAILED: "Error al obtener categorías",
    CATEGORY_ALREADY_EXISTS: "Ya existe una categoría con este nombre",
    CATEGORY_IN_USE: "No se puede eliminar la categoría porque está siendo utilizada",
    INVALID_CATEGORY_NAME: "El nombre de la categoría no es válido",
} as const;

export class CategoryService {
    private categoryRepository = new CategoryRepository();

    /**
     * Creates a new category with validation
     */
    async createCategory(categoryData: CreateCategoryDTO): Promise<Categories> {
        const operationContext = "category creation";

        logger.debug("Starting category creation", {
            categoryName: categoryData.name,
            operation: operationContext
        });

        try {
            // Validate category name
            if (!categoryData.name || categoryData.name.trim().length === 0) {
                logger.warn("Attempt to create category with empty name", {
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.INVALID_CATEGORY_NAME, HTTP_STATUS.BAD_REQUEST);
            }

            // Check if category with same name already exists (if repository supports it)
            // const existingCategory = await this.categoryRepository.findByExactName(
            //     categoryData.name.trim()
            // );
            // if (existingCategory) {
            //     logger.warn("Attempt to create duplicate category", {
            //         categoryName: categoryData.name,
            //         existingCategoryId: existingCategory.id
            //     });
            //     throw new AppError(ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
            // }

            const createdCategory = await this.categoryRepository.create(categoryData);

            logger.info("Category created successfully", {
                categoryId: createdCategory.id,
                categoryName: createdCategory.name
            });

            return createdCategory;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to create category", {
                error,
                categoryData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CATEGORY_CREATION_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Retrieves all categories
     */
    async getAllCategories(): Promise<Categories[]> {
        const operationContext = "fetch all categories";

        logger.debug("Retrieving all categories", { operation: operationContext });

        try {
            const categories = await this.categoryRepository.findAll();

            logger.debug("Successfully retrieved categories", {
                categoryCount: categories.length,
                operation: operationContext
            });

            return categories;
        } catch (error) {
            logger.error("Failed to retrieve categories", {
                error,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CATEGORY_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Finds category by ID with existence validation
     */
    async getCategoryById(categoryId: string): Promise<Categories> {
        const operationContext = "find category by ID";

        logger.debug("Searching for category by ID", {
            categoryId,
            operation: operationContext
        });

        try {
            const foundCategory = await this.categoryRepository.findById(categoryId);

            if (!foundCategory) {
                logger.warn("Category not found", {
                    categoryId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }

            logger.debug("Category found successfully", {
                categoryId,
                categoryName: foundCategory.name,
                operation: operationContext
            });

            return foundCategory;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Error while finding category", {
                error,
                categoryId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CATEGORY_RETRIEVAL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Updates an existing category
     */
    async updateCategory(categoryId: string, updateData: UpdateCategoryDTO): Promise<Categories> {
        const operationContext = "category update";

        logger.debug("Starting category update", {
            categoryId,
            updateData,
            operation: operationContext
        });

        try {
            // Check if category exists first
            await this.getCategoryById(categoryId);

            // If updating name, validate and check for duplicates
            if (updateData.name) {
                const trimmedName = updateData.name.trim();

                if (trimmedName.length === 0) {
                    logger.warn("Attempt to update category with empty name", {
                        categoryId,
                        operation: operationContext
                    });
                    throw new AppError(ERROR_MESSAGES.INVALID_CATEGORY_NAME, HTTP_STATUS.BAD_REQUEST);
                }

                // Check for duplicates (if repository supports it)
                // const existingCategory = await this.categoryRepository.findByExactName(trimmedName);
                // if (existingCategory && existingCategory.id !== categoryId) {
                //     logger.warn("Attempt to update category with duplicate name", {
                //         categoryId,
                //         newName: trimmedName,
                //         conflictingCategoryId: existingCategory.id
                //     });
                //     throw new AppError(ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
                // }

                updateData.name = trimmedName;
            }

            const updatedCategory = await this.categoryRepository.update(categoryId, updateData);

            if (!updatedCategory) {
                logger.error("Category update returned null unexpectedly", {
                    categoryId,
                    updateData,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.CATEGORY_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Category updated successfully", {
                categoryId,
                updatedFields: Object.keys(updateData),
                operation: operationContext
            });

            return updatedCategory;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to update category", {
                error,
                categoryId,
                updateData,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CATEGORY_UPDATE_FAILED, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Deletes a category by ID
     */
    async deleteCategory(categoryId: string): Promise<void> {
        const operationContext = "category deletion";

        logger.debug("Starting category deletion", {
            categoryId,
            operation: operationContext
        });

        try {
            // Check if category exists first
            const existingCategory = await this.getCategoryById(categoryId);

            // TODO: Add check for category usage in products/orders
            // const isCategoryInUse = await this.checkCategoryUsage(categoryId);
            // if (isCategoryInUse) {
            //     throw new AppError(ERROR_MESSAGES.CATEGORY_IN_USE, HTTP_STATUS.CONFLICT);
            // }

            const wasDeleted = await this.categoryRepository.delete(categoryId);

            if (!wasDeleted) {
                logger.error("Category deletion returned false unexpectedly", {
                    categoryId,
                    operation: operationContext
                });
                throw new AppError(ERROR_MESSAGES.CATEGORY_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }

            logger.info("Category deleted successfully", {
                categoryId,
                deletedCategoryName: existingCategory.name,
                operation: operationContext
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error("Failed to delete category", {
                error,
                categoryId,
                operation: operationContext
            });
            throw new AppError(ERROR_MESSAGES.CATEGORY_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}