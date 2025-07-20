import type { Request, Response, NextFunction } from "express";
import { ProductService } from "@/services/products_service";

const productService = new ProductService();

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
        const product = await productService.create(req.body);
        res.status(201).json({
            success: true,
            data: product,
            message: "Producto creado exitosamente"
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
        const products = await productService.findAll();
        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            message: "Lista de productos obtenida exitosamente"
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
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: "ID inválido, debe ser un número"
            });
        }

        const product = await productService.findById(id);
        res.status(200).json({
            success: true,
            data: product,
            message: "Producto obtenido exitosamente"
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
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: "ID inválido, debe ser un número"
            });
        }

        const product = await productService.update(id, req.body);
        res.status(200).json({
            success: true,
            data: product,
            message: "Producto actualizado exitosamente"
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
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: "ID inválido, debe ser un número"
            });
        }

        await productService.delete(id);
        res.status(200).json({
            success: true,
            message: "Producto eliminado exitosamente"
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
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: "Query de búsqueda requerida"
            });
            return;
        }

        const products = await productService.search(q as string);
        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            query: q,
            message: "Búsqueda completada exitosamente"
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
                error: "Status debe ser 'available' o 'unavailable'"
            });
        }

        const isAvailable = status === 'available';
        const products = await productService.findByAvailability(isAvailable);

        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            filter: { availability: isAvailable },
            message: `Productos ${status === 'available' ? 'disponibles' : 'no disponibles'} obtenidos exitosamente`
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
                error: "ID de categoría inválido, debe ser un número"
            });
        }

        const products = await productService.findByCategory(categoryId);
        res.status(200).json({
            success: true,
            data: products,
            count: products.length,
            filter: { category_id: categoryId },
            message: "Productos por categoría obtenidos exitosamente"
        });
    } catch (err) {
        next(err);
    }
}