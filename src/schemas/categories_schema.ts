import { z } from 'zod';

export const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
});

export const createCategorySchema = z.object({
    name: z.string().min(1, 'El nombre de la categoría es requerido'),
    description: z.string().optional(),
})

export const updateCategorySchema = z.object({
    name: z.string().min(1, 'El nombre de la categoría es requerido').optional(),
    description: z.string().optional(),
})

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;