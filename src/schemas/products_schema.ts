// src/schemas/products_schema.ts
import { z } from 'zod';

export const productSchema = z.object({
    id: z.number(),
    name: z.string().min(1),
    description: z.string().nullable(),
    sku: z.string().nullable(),
    price: z.number().min(0),
    image_url: z.string().url().nullable(),
    is_available: z.boolean().default(true),
    cost_price: z.number().default(0),
    category_id: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

export const createProductSchema = productSchema.omit({ id: true, created_at: true, updated_at: true });
export const updateProductSchema = createProductSchema.partial();

export type Product = z.infer<typeof productSchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
