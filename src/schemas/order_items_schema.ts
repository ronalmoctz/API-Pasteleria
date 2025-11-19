import { z } from 'zod';

export const orderItemSchema = z.object({
    id: z.number(),
    order_id: z.number(),
    product_id: z.number(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().min(0),
});

export const createOrderItemSchema = orderItemSchema.omit({ id: true });

// Internal schema for creating order items with fetched price
export const createOrderItemInternalSchema = z.object({
    order_id: z.number(),
    product_id: z.number(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().min(0),
});

export const updateOrderItemSchema = orderItemSchema.partial();

export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderItem = z.infer<typeof createOrderItemSchema>;
export type CreateOrderItemInternal = z.infer<typeof createOrderItemInternalSchema>;
export type UpdateOrderItem = z.infer<typeof updateOrderItemSchema>;
