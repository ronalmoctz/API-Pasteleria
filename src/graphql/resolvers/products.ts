import { ProductRepository } from '@/repositories/products_repository.js'
import {
    createProductSchema,
    updateProductSchema,
    type CreateProduct,
    type UpdateProduct
} from '@/schemas/products_schema.js'

const repo = new ProductRepository()

export const productsResolvers = {
    Query: {
        products: async () => {
            return await repo.findAll()
        },
        product: async (_: unknown, { id }: { id: number }) => {
            return await repo.findById(id)
        }
    },
    Mutation: {
        createProduct: async (_: unknown, { input }: { input: CreateProduct }) => {
            const parsed = createProductSchema.safeParse(input)
            if (!parsed.success) {
                console.error('❌ Error en Zod al crear producto:', parsed.error.format());
                throw new Error('Datos inválidos para crear producto')
            }
            return await repo.create(parsed.data)
        },
        updateProduct: async (_: unknown, { id, input }: { id: number; input: UpdateProduct }) => {
            const parsed = updateProductSchema.safeParse(input)
            if (!parsed.success) {
                throw new Error('Datos inválidos para actualizar producto')
            }
            return await repo.update(id, parsed.data)
        },
        deleteProduct: async (_: unknown, { id }: { id: number }) => {
            return await repo.delete(id)
        }
    }
}
