import { ProductRepository } from "@/repositories/products_repository.js";
import { AppError } from "@/utils/app_error.js";
import { logger } from "@/utils/logger.js";
import type { CreateProduct, UpdateProduct, Product } from "@/schemas/products_schema.js";
import type { ICacheStrategy } from "@/interfaces/cache_strategy_interface.js";

export class ProductService {

    private repository: ProductRepository;

    constructor(cacheStrategy: ICacheStrategy) {
        this.repository = new ProductRepository(cacheStrategy);
    }

    async create(productData: CreateProduct): Promise<Product> {
        try {
            logger.debug("Creating product", {
                name: productData.name,
                sku: productData.sku,
                price: productData.price,
                categoryId: productData.category_id
            })

            const newProduct = await this.repository.create(productData)

            logger.info("Product created successfully", {
                productId: newProduct.id,
                name: newProduct.name,
                sku: newProduct.sku
            });
            return newProduct
        } catch (err) {
            logger.error("Failed to create product", {
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined,
                productName: productData.name,
                categoryId: productData.category_id
            });

            if (err instanceof Error && err.message.includes('Failed to create product')) {
                throw new AppError("Invalid product data", 400);
            }

            throw new AppError("Failed to create product", 400);
        }
    }

    async findAll(): Promise<Product[]> {
        logger.debug("Fetching all products");
        try {
            const productList = await this.repository.findAll();

            logger.info("Products retrieved successfully", {
                count: productList.length
            });

            return productList;
        } catch (err) {
            logger.error("Failed to fetch products", {
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });
            throw new AppError("Failed to fetch products", 500);
        }
    }

    async findById(productId: number): Promise<Product> {
        logger.debug("Finding product by ID", { productId });

        try {
            const product = await this.repository.findById(productId);

            if (!product) {
                logger.warn("Product not found", { productId });
                throw new AppError("Product not found", 404);
            }

            logger.debug("Product found", {
                productId: product.id,
                name: product.name,
                isAvailable: product.is_available
            });

            return product;
        } catch (err) {
            if (err instanceof AppError) {
                throw err; // Re-lanzar AppError sin modificar
            }

            logger.error("Failed to find product by ID", {
                productId,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Failed to find product", 500);
        }
    }

    async update(productId: number, updateData: UpdateProduct): Promise<Product> {
        logger.debug("Updating product", {
            productId
        });

        try {
            const updatedProduct = await this.repository.update(productId, updateData);

            if (!updatedProduct) {
                logger.warn("Product not found for update", { productId });
                throw new AppError("Product not found", 404);
            }

            logger.info("Product updated successfully", {
                productId: updatedProduct.id,
                name: updatedProduct.name,
            });

            return updatedProduct;
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }

            logger.error("Failed to update product", {
                productId,
                updateData,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Failed to update product", 500);
        }
    }

    async delete(productId: number): Promise<void> {
        logger.debug("Deleting product", { productId });

        try {
            const wasDeleted = await this.repository.delete(productId);

            if (!wasDeleted) {
                logger.warn("Product not found for deletion", { productId });
                throw new AppError("Product not found", 404);
            }

            logger.info("Product deleted successfully", { productId });
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }

            logger.error("Failed to delete product", {
                productId,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Failed to delete product", 500);
        }
    }

    // Método adicional para búsqueda (útil para APIs REST)
    async search(searchTerm: string): Promise<Product[]> {
        logger.debug("Searching products", { searchTerm });

        try {
            const allProducts = await this.repository.findAll();

            const searchResults = allProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            logger.info("Product search completed", {
                searchTerm,
                totalProducts: allProducts.length,
                resultsCount: searchResults.length
            });

            return searchResults;
        } catch (err) {
            logger.error("Failed to search products", {
                searchTerm,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Failed to search products", 500);
        }
    }

    // Método para obtener productos por disponibilidad
    async findByAvailability(isAvailable: boolean): Promise<Product[]> {
        logger.debug("Filtering products by availability", { isAvailable });

        try {
            const allProducts = await this.repository.findAll();
            const availableProducts = allProducts.filter(product => product.is_available === isAvailable);

            logger.info("Products filtered by availability", {
                isAvailable,
                count: availableProducts.length
            });

            return availableProducts;
        } catch (err) {
            logger.error("Failed to filter products by availability", {
                isAvailable,
                error: err instanceof Error ? err.message : err
            });

            throw new AppError("Failed to filter products", 500);
        }
    }

    // Método para obtener productos por categoría
    async findByCategory(categoryId: number): Promise<Product[]> {
        logger.debug("Filtering products by category", { categoryId });

        try {
            const allProducts = await this.repository.findAll();
            const categoryProducts = allProducts.filter(product => product.category_id === categoryId);

            logger.info("Products filtered by category", {
                categoryId,
                count: categoryProducts.length
            });

            return categoryProducts;
        } catch (err) {
            logger.error("Failed to filter products by category", {
                categoryId,
                error: err instanceof Error ? err.message : err
            });

            throw new AppError("Failed to filter products by category", 500);
        }
    }

}