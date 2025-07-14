import { ProductRepository } from "@/repositories/products_repository";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import type { CreateProduct, UpdateProduct, Product } from "@/schemas/products_schema";

export class ProductService {

    private repository = new ProductRepository()

    async create(data: CreateProduct): Promise<Product> {
        try {
            logger.debug("Creando Producto", {
                name: data.name,
                sku: data.sku,
                price: data.price,
                category_id: data.category_id
            })

            const product = await this.repository.create(data)

            logger.info("Producto creado con éxito", {
                id: product.id,
                name: product.name,
                sku: product.sku
            });
            return product
        } catch (err) {
            logger.error("Error al crear el producto", {
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined,
                input_data: {
                    name: data.name,
                    sku: data.sku,
                    category_id: data.category_id
                }
            });

            if (err instanceof Error && err.message.includes('Producto creado no válido')) {
                throw new AppError("Datos del producto no válidos", 400);
            }

            throw new AppError("Error al crear el producto", 400);
        }
    }

    async findAll(): Promise<Product[]> {
        logger.debug("Obteniendo todos los productos");
        try {
            const products = await this.repository.findAll();

            logger.info("Productos obtenidos exitosamente", {
                count: products.length,
                from_cache: products.length > 0 ? "posible" : "bd"
            });

            return products;
        } catch (err) {
            logger.error("Error al obtener productos", {
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });
            throw new AppError("Error al obtener productos", 500);
        }
    }

    async findById(id: number): Promise<Product> {
        logger.debug("Buscando producto por ID", { id });

        try {
            const product = await this.repository.findById(id);

            if (!product) {
                logger.warn("Producto no encontrado", { id });
                throw new AppError("Producto no encontrado", 404);
            }

            logger.debug("Producto encontrado", {
                id: product.id,
                name: product.name,
                available: product.is_available
            });

            return product;
        } catch (err) {
            if (err instanceof AppError) {
                throw err; // Re-lanzar AppError sin modificar
            }

            logger.error("Error al buscar producto por ID", {
                id,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Error al buscar producto", 500);
        }
    }

    async update(id: number, data: UpdateProduct): Promise<Product> {
        logger.debug("Actualizando producto", {
            id
        });

        try {
            const updated = await this.repository.update(id, data);

            if (!updated) {
                logger.warn("No se pudo actualizar el producto", { id });
                throw new AppError("No se pudo actualizar el producto", 404);
            }

            logger.info("Producto actualizado exitosamente", {
                id: updated.id,
                name: updated.name,
            });

            return updated;
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }

            logger.error("Error al actualizar producto", {
                id,
                update_data: data,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Error al actualizar producto", 500);
        }
    }

    async delete(id: number): Promise<void> {
        logger.debug("Eliminando producto", { id });

        try {
            const deleted = await this.repository.delete(id);

            if (!deleted) {
                logger.warn("No se pudo eliminar el producto", { id });
                throw new AppError("No se pudo eliminar el producto", 404);
            }

            logger.info("Producto eliminado exitosamente", { id });
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }

            logger.error("Error al eliminar producto", {
                id,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Error al eliminar producto", 500);
        }
    }

    // Método adicional para búsqueda (útil para APIs REST)
    async search(query: string): Promise<Product[]> {
        logger.debug("Buscando productos", { query });

        try {
            const products = await this.repository.findAll();

            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.sku?.toLowerCase().includes(query.toLowerCase()) ||
                product.description?.toLowerCase().includes(query.toLowerCase())
            );

            logger.info("Búsqueda de productos completada", {
                query,
                total_products: products.length,
                filtered_count: filtered.length
            });

            return filtered;
        } catch (err) {
            logger.error("Error en búsqueda de productos", {
                query,
                error: err instanceof Error ? err.message : err,
                stack: err instanceof Error ? err.stack : undefined
            });

            throw new AppError("Error en búsqueda de productos", 500);
        }
    }

    // Método para obtener productos por disponibilidad
    async findByAvailability(isAvailable: boolean): Promise<Product[]> {
        logger.debug("Buscando productos por disponibilidad", { isAvailable });

        try {
            const products = await this.repository.findAll();
            const filtered = products.filter(product => product.is_available === isAvailable);

            logger.info("Productos filtrados por disponibilidad", {
                isAvailable,
                count: filtered.length
            });

            return filtered;
        } catch (err) {
            logger.error("Error al filtrar productos por disponibilidad", {
                isAvailable,
                error: err instanceof Error ? err.message : err
            });

            throw new AppError("Error al filtrar productos", 500);
        }
    }

    // Método para obtener productos por categoría
    async findByCategory(categoryId: number): Promise<Product[]> {
        logger.debug("Buscando productos por categoría", { categoryId });

        try {
            const products = await this.repository.findAll();
            const filtered = products.filter(product => product.category_id === categoryId);

            logger.info("Productos filtrados por categoría", {
                categoryId,
                count: filtered.length
            });

            return filtered;
        } catch (err) {
            logger.error("Error al filtrar productos por categoría", {
                categoryId,
                error: err instanceof Error ? err.message : err
            });

            throw new AppError("Error al filtrar productos por categoría", 500);
        }
    }

}