import { z } from 'zod';

export const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'unit'] as const;
export const UnitsEnum = z.enum(ALLOWED_UNITS);

export const ingredientSchema = z.object({
    id: z.number(),
    name: z.string().min(1, 'Debes ingresar un ingrediente'),
    stock_quantity: z.number().min(0, 'Es necesario ingresar una cantidad válida'),
    unit: UnitsEnum,
});

export const createIngredientSchema = ingredientSchema.omit({ id: true });

export const updateIngredientSchema = z.object({
    name: z.string().min(1, 'Debes ingresar un ingrediente').optional(),
    stock_quantity: z.number().min(0, 'Cantidad no válida').optional(),
    unit: UnitsEnum.optional(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type CreateIngredient = z.infer<typeof createIngredientSchema>;
export type UpdateIngredient = z.infer<typeof updateIngredientSchema>;
