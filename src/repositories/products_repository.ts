import { turso } from '@/config/tursoClient.js';
import { logger } from '@/utils/logger.js';
import { productSchema } from '@/schemas/products_schema.js';
import type { Product, CreateProduct, UpdateProduct } from '@/schemas/products_schema.js';
import { BaseRepository, type Query } from '@/base/base_repository.js';
import type { ICacheStrategy } from '@/interfaces/cache_strategy_interface.js';

const CACHE_KEYS = {
    ALL: 'all',
    BY_ID: (id: number) => `id:${id}`,
} as const;

const CACHE_TTL = {
    LIST: 180,
    SINGLE: 300,
} as const;

export class ProductRepository extends BaseRepository<Product, CreateProduct, UpdateProduct> {
    protected readonly tableName = 'products';
    protected readonly cachePrefix = 'products';
    protected readonly schema = productSchema;

    constructor(cacheStrategy: ICacheStrategy) {
        super(turso, cacheStrategy);
    }

    private buildFiltersSQL(filters?: {
        categoryId?: number;
        isAvailable?: boolean;
        minPrice?: number;
        maxPrice?: number;
        hasStock?: boolean;
        nameContains?: string;
    }): { whereClause: string; params: any[] } {
        if (!filters) return { whereClause: '', params: [] };

        const conditions: string[] = [];
        const params: any[] = [];

        if (typeof filters.categoryId === 'number') {
            conditions.push('category_id = ?');
            params.push(filters.categoryId);
        }
        if (typeof filters.isAvailable === 'boolean') {
            conditions.push('is_available = ?');
            params.push(filters.isAvailable ? 1 : 0);
        }
        if (typeof filters.minPrice === 'number') {
            conditions.push('price >= ?');
            params.push(filters.minPrice);
        }
        if (typeof filters.maxPrice === 'number') {
            conditions.push('price <= ?');
            params.push(filters.maxPrice);
        }
        if (typeof filters.hasStock === 'boolean') {
            conditions.push(filters.hasStock ? 'stock_quantity > 0' : 'stock_quantity <= 0');
        }
        if (filters.nameContains && filters.nameContains.trim() !== '') {
            conditions.push('LOWER(name) LIKE ?');
            params.push(`%${filters.nameContains.toLowerCase()}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { whereClause, params };
    }

    async create(productData: CreateProduct): Promise<Product> {
        const insertQuery: Query = {
            sql: `INSERT INTO products (name, description, sku, price, image_url, is_available, cost_price, stock_quantity, category_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [
                productData.name,
                productData.description ?? null,
                productData.sku ?? null,
                productData.price,
                productData.image_url ?? null,
                productData.is_available ?? true,
                productData.cost_price ?? 0,
                productData.stock_quantity ?? 0,
                productData.category_id
            ]
        };

        const result = await this.executeDatabaseQuery(insertQuery, 'create product');
        const createdRow = result.rows[0];
        if (!createdRow) {
            logger.error('Failed to create product - no data returned', { productName: productData.name });
            throw new Error('Failed to create product');
        }

        const newProduct = this.validateData(createdRow, 'product creation');

        await this.invalidateAllCache();
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ALL));

        logger.info('Product created successfully', { productId: newProduct.id, name: newProduct.name });
        return newProduct;
    }

    async findAll(queryOptions?: {
        limit?: number; offset?: number; filters?: {
            categoryId?: number;
            isAvailable?: boolean;
            minPrice?: number;
            maxPrice?: number;
            hasStock?: boolean;
            nameContains?: string;
        }
    }): Promise<Product[]> {
        if (!queryOptions || (!queryOptions.limit && !queryOptions.offset && !queryOptions.filters)) {
            const cacheKey = this.getCacheKey(CACHE_KEYS.ALL);
            const query: Query = { sql: `SELECT * FROM products ORDER BY id DESC` };
            return await this.getListFromCacheOrDB(cacheKey, query, CACHE_TTL.LIST, 'fetch all products');
        }

        const { whereClause, params } = this.buildFiltersSQL(queryOptions.filters);
        let sql = `SELECT * FROM products ${whereClause} ORDER BY id DESC`;
        const queryArgs: any[] = [...params];
        if (typeof queryOptions.limit === 'number') { sql += ' LIMIT ?'; queryArgs.push(queryOptions.limit); }
        if (typeof queryOptions.offset === 'number') { sql += ' OFFSET ?'; queryArgs.push(queryOptions.offset); }

        const result = await this.executeDatabaseQuery({ sql, args: queryArgs }, 'find products with filters');
        const productList = this.validateRows(result.rows, 'products list with filters');
        return productList;
    }

    async findById(id: number): Promise<Product | null> {
        const cacheKey = this.getCacheKey(CACHE_KEYS.BY_ID(id));
        const query: Query = { sql: `SELECT * FROM products WHERE id = ?`, args: [id] };
        return await this.getFromCacheOrDB(cacheKey, query, CACHE_TTL.SINGLE, `find product by ID: ${id}`);
    }

    async update(productId: number, updateData: UpdateProduct): Promise<Product | null> {
        const existingProduct = await this.findById(productId);
        if (!existingProduct) return null;

        const updateQuery: Query = {
            sql: `UPDATE products SET name = ?, description = ?, sku = ?, price = ?, image_url = ?, is_available = ?, cost_price = ?, stock_quantity = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
            args: [
                updateData.name ?? existingProduct.name,
                updateData.description ?? existingProduct.description,
                updateData.sku ?? existingProduct.sku,
                updateData.price ?? existingProduct.price,
                updateData.image_url ?? existingProduct.image_url,
                updateData.is_available ?? existingProduct.is_available,
                updateData.cost_price ?? existingProduct.cost_price,
                updateData.stock_quantity ?? existingProduct.stock_quantity,
                updateData.category_id ?? existingProduct.category_id,
                productId
            ]
        };

        const result = await this.executeDatabaseQuery(updateQuery, 'update product');
        const updatedRow = result.rows[0];
        if (!updatedRow) return null;

        const updatedProduct = this.validateData(updatedRow, `product update for ID: ${productId}`);

        await this.invalidateAllCache();
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ALL));
        await this.invalidateCache(this.getCacheKey(CACHE_KEYS.BY_ID(productId)));

        logger.info('Product updated successfully', { productId, name: updatedProduct.name });
        return updatedProduct;
    }

    async delete(productId: number): Promise<boolean> {
        const deleteQuery: Query = { sql: `DELETE FROM products WHERE id = ?`, args: [productId] };
        const result = await this.executeDatabaseQuery(deleteQuery, 'delete product');
        const wasDeleted = result.rowsAffected > 0;

        if (wasDeleted) {
            await this.invalidateAllCache();
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.ALL));
            await this.invalidateCache(this.getCacheKey(CACHE_KEYS.BY_ID(productId)));
            logger.info('Product deleted successfully', { productId });
        } else {
            logger.warn('Product not found for deletion', { productId });
        }

        return wasDeleted;
    }

    async count(filterParams?: {
        categoryId?: number;
        isAvailable?: boolean;
        minPrice?: number;
        maxPrice?: number;
        hasStock?: boolean;
        nameContains?: string;
        searchQuery?: string;
    }): Promise<number> {
        if (filterParams && typeof filterParams.searchQuery === 'string') {
            const searchPattern = `%${filterParams.searchQuery.toLowerCase()}%`;
            const query: Query = {
                sql: `SELECT COUNT(1) as total FROM products 
                      WHERE LOWER(name) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?`,
                args: [searchPattern, searchPattern]
            };
            const result = await this.executeDatabaseQuery(query, 'count products by search');
            const totalCount = parseInt(String(result.rows[0]?.total ?? '0')) || 0;
            return totalCount;
        }

        const { whereClause, params: whereParams } = this.buildFiltersSQL(filterParams);
        const query: Query = { sql: `SELECT COUNT(1) as total FROM products ${whereClause}`, args: whereParams };
        const result = await this.executeDatabaseQuery(query, 'count products by filters');
        const totalCount = parseInt(String(result.rows[0]?.total ?? '0')) || 0;
        return totalCount;
    }

    async search(searchTerm: string, paginationOptions?: { limit?: number; offset?: number; }): Promise<Product[]> {
        const searchPattern = `%${searchTerm.toLowerCase()}%`;
        let sql = `SELECT * FROM products WHERE LOWER(name) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ? ORDER BY id DESC`;
        const queryArgs: any[] = [searchPattern, searchPattern];
        if (paginationOptions && typeof paginationOptions.limit === 'number') { sql += ' LIMIT ?'; queryArgs.push(paginationOptions.limit); }
        if (paginationOptions && typeof paginationOptions.offset === 'number') { sql += ' OFFSET ?'; queryArgs.push(paginationOptions.offset); }

        const result = await this.executeDatabaseQuery({ sql, args: queryArgs }, 'search products');
        const searchResults = this.validateRows(result.rows, 'search products');
        return searchResults;
    }
}