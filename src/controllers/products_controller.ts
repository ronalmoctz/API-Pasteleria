import type { Request, Response, NextFunction } from "express";
import { getProductService } from "@/factories/service_factory.js";

const productService = getProductService();

/**
 * Crear un nuevo producto
 * @route POST /products
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {CreateProduct.model} request.body.required - Datos del producto
 * @returns 201 - Producto creado exitosamente
 * @returns 400 - Error de validación o creación
 */
export async function createProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const newProduct = await productService.create(req.body);
        res.status(201).json({
            success: true,
            data: newProduct,
            message: "Product created successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener todos los productos
 * @route GET /products
 * @group Productos - Operaciones sobre los productos disponibles
 * @returns 200 - Lista de productos
 * @returns 500 - Error al obtener productos
 */
export async function getAllProducts(_req: Request, res: Response, next: NextFunction) {
    try {
        const productList = await productService.findAll();
        res.status(200).json({
            success: true,
            data: productList,
            count: productList.length,
            message: "Products retrieved successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener un producto por ID
 * @route GET /products/:id
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {number} id.path.required - ID del producto
 * @returns 200 - Producto encontrado
 * @returns 404 - Producto no encontrado
 * @returns 400 - ID inválido
 * @returns 500 - Error al obtener producto
 */
export async function getProductById(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = parseInt(req.params.id);

        if (isNaN(productId)) {
            res.status(400).json({
                success: false,
                error: "Invalid ID, must be a number"
            });
            return;
        }

        const product = await productService.findById(productId);
        res.status(200).json({
            success: true,
            data: product,
            message: "Product retrieved successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Actualizar un producto
 * @route PUT /products/:id
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {number} id.path.required - ID del producto
 * @param {UpdateProduct.model} request.body.required - Datos del producto a actualizar
 * @returns 200 - Producto actualizado exitosamente
 * @returns 404 - Producto no encontrado
 * @returns 400 - ID inválido o datos inválidos
 * @returns 500 - Error al actualizar producto
 */
export async function updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = parseInt(req.params.id);

        if (isNaN(productId)) {
            res.status(400).json({
                success: false,
                error: "Invalid ID, must be a number"
            });
            return;
        }

        const updatedProduct = await productService.update(productId, req.body);
        res.status(200).json({
            success: true,
            data: updatedProduct,
            message: "Product updated successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Eliminar un producto
 * @route DELETE /products/:id
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {number} id.path.required - ID del producto
 * @returns 200 - Producto eliminado exitosamente
 * @returns 404 - Producto no encontrado
 * @returns 400 - ID inválido
 * @returns 500 - Error al eliminar producto
 */
export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = parseInt(req.params.id);

        if (isNaN(productId)) {
            res.status(400).json({
                success: false,
                error: "Invalid ID, must be a number"
            });
            return;
        }

        await productService.delete(productId);
        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Buscar productos por texto
 * @route GET /products/search
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {string} q.query.required - Texto a buscar
 * @returns 200 - Lista de productos encontrados
 * @returns 400 - Query de búsqueda requerida
 * @returns 500 - Error en la búsqueda
 */
export async function searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const { q: searchTerm } = req.query;

        if (!searchTerm || typeof searchTerm !== 'string') {
            res.status(400).json({
                success: false,
                error: "Search query is required"
            });
            return;
        }

        const searchResults = await productService.search(searchTerm as string);
        res.status(200).json({
            success: true,
            data: searchResults,
            count: searchResults.length,
            query: searchTerm,
            message: "Search completed successfully"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener productos por disponibilidad
 * @route GET /products/availability/:status
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {string} status.path.required - Estado de disponibilidad (available/unavailable)
 * @returns 200 - Lista de productos filtrados
 * @returns 400 - Status inválido
 * @returns 500 - Error al filtrar productos
 */
export async function getProductsByAvailability(req: Request, res: Response, next: NextFunction) {
    try {
        const { status } = req.params;

        if (!['available', 'unavailable'].includes(status)) {
            res.status(400).json({
                success: false,
                error: "Status must be 'available' or 'unavailable'"
            });
            return;
        }

        const isAvailable = status === 'available';
        const filteredProducts = await productService.findByAvailability(isAvailable);

        res.status(200).json({
            success: true,
            data: filteredProducts,
            count: filteredProducts.length,
            filter: { availability: isAvailable },
            message: `${status === 'available' ? 'Available' : 'Unavailable'} products retrieved successfully`
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Obtener productos por categoría
 * @route GET /products/category/:categoryId
 * @group Productos - Operaciones sobre los productos disponibles
 * @param {number} categoryId.path.required - ID de la categoría
 * @returns 200 - Lista de productos de la categoría
 * @returns 400 - ID de categoría inválido
 * @returns 500 - Error al obtener productos
 */
export async function getProductsByCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const categoryId = parseInt(req.params.categoryId);

        if (isNaN(categoryId)) {
            res.status(400).json({
                success: false,
                error: "Invalid category ID, must be a number"
            });
            return;
        }

        const categoryProducts = await productService.findByCategory(categoryId);
        res.status(200).json({
            success: true,
            data: categoryProducts,
            count: categoryProducts.length,
            filter: { categoryId },
            message: `Products from category ${categoryId} retrieved successfully`
        });
    } catch (err) {
        next(err);
    }
}