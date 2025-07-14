// src/repositories/products_repository.ts
import { cache } from '@/utils/chache';
import { turso } from '@/config/tursoClient';
import { logger } from '@/utils/logger';
import { productSchema } from '@/schemas/products_schema';
import type { Product, CreateProduct, UpdateProduct } from '@/schemas/products_schema';

const PRODUCTS_CACHE_KEY = 'products:all';

export class ProductRepository {
    async create(data: CreateProduct): Promise<Product> {
        const result = await turso.execute({
            sql: `INSERT INTO products (name, description, sku, price, image_url, is_available, cost_price, stock_quantity, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [
                data.name,
                data.description ?? null,
                data.sku ?? null,
                data.price,
                data.image_url ?? null,
                data.is_available ?? true,
                data.cost_price ?? 0,
                data.stock_quantity ?? 0,
                data.category_id
            ]
        });

        const row = result.rows[0];
        if (!row) {
            logger.error('Error al crear el producto', { data });
            throw new Error('Error al crear el producto');
        }

        const parsed = productSchema.safeParse(row);
        if (!parsed.success) {
            logger.error('Producto no cumple con el esquema', { error: parsed.error });
            throw new Error('Producto creado no válido');
        }

        cache.del(PRODUCTS_CACHE_KEY);
        return parsed.data;
    }

    async findAll(): Promise<Product[]> {
        const cached = cache.get<Product[]>(PRODUCTS_CACHE_KEY);
        if (cached) {
            logger.info('Productos obtenidos desde caché');
            return cached;
        }

        const result = await turso.execute(`SELECT * FROM products`);
        const products: Product[] = [];

        for (const row of result.rows) {
            console.log('🧪 Producto desde BD:', row); // 👈 aquí
            const parsed = productSchema.safeParse(row);
            if (!parsed.success) {
                console.error('❌ Producto inválido:', parsed.error.format()); // 👈 muestra qué campo falla
                throw new Error('Producto inválido desde BD');
            }
            products.push(parsed.data);
        }

        cache.set(PRODUCTS_CACHE_KEY, products);
        return products;
    }

    async findById(id: number): Promise<Product | null> {
        const result = await turso.execute({
            sql: `SELECT * FROM products WHERE id = ?`,
            args: [id]
        });

        const row = result.rows[0];
        if (!row) return null;

        const parsed = productSchema.safeParse(row);
        if (!parsed.success) {
            logger.error('Producto no válido al buscar por ID', { error: parsed.error });
            throw new Error('Producto inválido por ID');
        }

        return parsed.data;
    }

    async update(id: number, data: UpdateProduct): Promise<Product | null> {
        const existing = await this.findById(id);
        if (!existing) return null;

        const result = await turso.execute({
            sql: `UPDATE products SET name = ?, description = ?, sku = ?, price = ?, image_url = ?, is_available = ?, cost_price = ?, stock_quantity = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
            args: [
                data.name ?? existing.name,
                data.description ?? existing.description,
                data.sku ?? existing.sku,
                data.price ?? existing.price,
                data.image_url ?? existing.image_url,
                data.is_available ?? existing.is_available,
                data.cost_price ?? existing.cost_price,
                data.stock_quantity ?? existing.stock_quantity,
                data.category_id ?? existing.category_id,
                id
            ]
        });

        const row = result.rows[0];
        if (!row) return null;

        const parsed = productSchema.safeParse(row);
        if (!parsed.success) {
            logger.error('Producto actualizado inválido', { error: parsed.error });
            throw new Error('Producto actualizado no válido');
        }

        cache.del(PRODUCTS_CACHE_KEY);
        return parsed.data;
    }

    async delete(id: number): Promise<boolean> {
        const result = await turso.execute({
            sql: `DELETE FROM products WHERE id = ?`,
            args: [id]
        });

        if (result.rowsAffected > 0) {
            cache.del(PRODUCTS_CACHE_KEY);
            logger.info('Producto eliminado', { id });
            return true;
        }

        logger.warn('Producto no encontrado para eliminar', { id });
        return false;
    }
}