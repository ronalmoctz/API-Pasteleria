import { ProductRepository } from '@/repositories/products_repository.js'
import {
    createProductSchema,
    updateProductSchema,
    type CreateProduct,
    type UpdateProduct
} from '@/schemas/products_schema.js'
import { RedisCacheStrategy } from '@/strategies/redis_cache_strategy.js'

const productRepository = new ProductRepository(new RedisCacheStrategy())

// Tipos para los parámetros de entrada
interface ProductFilters {
    categoryId?: number
    isAvailable?: boolean
    minPrice?: number
    maxPrice?: number
    hasStock?: boolean
    nameContains?: string
}

interface PaginationParams {
    page: number
    limit: number
}

// Función helper para calcular paginación
const calculatePagination = (page: number, limit: number, totalCount: number) => {
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return {
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPreviousPage
    }
}

// Función helper para manejo de errores
const handleError = (error: unknown, operation: string) => {
    console.error(`❌ Error en ${operation}:`, error)
    throw new Error(`Error interno del servidor durante ${operation}`)
}

export const productsResolvers = {
    Query: {
        getProducts: async (
            _: unknown,
            { page = 1, limit = 10, filters }: {
                page?: number
                limit?: number
                filters?: ProductFilters
            }
        ) => {
            try {
                const offset = (page - 1) * limit
                const [products, totalCount] = await Promise.all([
                    productRepository.findAll({ limit, offset, filters }),
                    productRepository.count(filters)
                ])

                const pagination = calculatePagination(page, limit, totalCount)

                return {
                    items: products,
                    totalCount,
                    ...pagination
                }
            } catch (error) {
                handleError(error, 'obtener productos')
            }
        },

        getProduct: async (
            _: unknown,
            { productId }: { productId: number }
        ) => {
            try {
                if (!productId || productId <= 0) {
                    throw new Error('ID de producto inválido')
                }

                const product = await productRepository.findById(productId)
                if (!product) {
                    throw new Error('Producto no encontrado')
                }

                return product
            } catch (error) {
                handleError(error, 'obtener producto')
            }
        },

        searchProducts: async (
            _: unknown,
            { searchQuery, page = 1, limit = 10 }: {
                searchQuery: string
                page?: number
                limit?: number
            }
        ) => {
            try {
                if (!searchQuery.trim()) {
                    throw new Error('Query de búsqueda no puede estar vacío')
                }

                const offset = (page - 1) * limit
                const [products, totalCount] = await Promise.all([
                    productRepository.search(searchQuery, { limit, offset }),
                    productRepository.count({ searchQuery })
                ])

                const pagination = calculatePagination(page, limit, totalCount)

                return {
                    items: products,
                    totalCount,
                    ...pagination
                }
            } catch (error) {
                handleError(error, 'buscar productos')
            }
        }
    },

    Mutation: {
        createProduct: async (
            _: unknown,
            { productData }: { productData: CreateProduct }
        ) => {
            try {
                const validationResult = createProductSchema.safeParse(productData)

                if (!validationResult.success) {
                    const errors = validationResult.error.errors.map(err =>
                        `${err.path.join('.')}: ${err.message}`
                    )

                    return {
                        success: false,
                        message: 'Datos de producto inválidos',
                        product: null,
                        validationErrors: errors
                    }
                }

                const newProduct = await productRepository.create(validationResult.data)

                return {
                    success: true,
                    message: 'Producto creado exitosamente',
                    product: newProduct,
                    validationErrors: []
                }
            } catch (error) {
                console.error('❌ Error al crear producto:', error)
                return {
                    success: false,
                    message: 'Error interno al crear producto',
                    product: null,
                    validationErrors: ['Error interno del servidor']
                }
            }
        },

        updateProduct: async (
            _: unknown,
            { productId, productData }: {
                productId: number
                productData: UpdateProduct
            }
        ) => {
            try {
                if (!productId || productId <= 0) {
                    return {
                        success: false,
                        message: 'ID de producto inválido',
                        product: null,
                        validationErrors: ['ID de producto debe ser un número positivo']
                    }
                }

                const validationResult = updateProductSchema.safeParse(productData)

                if (!validationResult.success) {
                    const errors = validationResult.error.errors.map(err =>
                        `${err.path.join('.')}: ${err.message}`
                    )

                    return {
                        success: false,
                        message: 'Datos de actualización inválidos',
                        product: null,
                        validationErrors: errors
                    }
                }

                const updatedProduct = await productRepository.update(productId, validationResult.data)

                if (!updatedProduct) {
                    return {
                        success: false,
                        message: 'Producto no encontrado',
                        product: null,
                        validationErrors: ['El producto especificado no existe']
                    }
                }

                return {
                    success: true,
                    message: 'Producto actualizado exitosamente',
                    product: updatedProduct,
                    validationErrors: []
                }
            } catch (error) {
                console.error('❌ Error al actualizar producto:', error)
                return {
                    success: false,
                    message: 'Error interno al actualizar producto',
                    product: null,
                    validationErrors: ['Error interno del servidor']
                }
            }
        },

        deleteProduct: async (
            _: unknown,
            { productId }: { productId: number }
        ) => {
            try {
                if (!productId || productId <= 0) {
                    return {
                        success: false,
                        message: 'ID de producto inválido',
                        deletedProductId: null
                    }
                }

                const deletedProduct = await productRepository.delete(productId)

                if (!deletedProduct) {
                    return {
                        success: false,
                        message: 'Producto no encontrado',
                        deletedProductId: null
                    }
                }

                return {
                    success: true,
                    message: 'Producto eliminado exitosamente',
                    deletedProductId: productId
                }
            } catch (error) {
                console.error('❌ Error al eliminar producto:', error)
                return {
                    success: false,
                    message: 'Error interno al eliminar producto',
                    deletedProductId: null
                }
            }
        }
    }
}
