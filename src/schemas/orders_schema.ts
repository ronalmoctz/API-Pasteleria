import { z } from 'zod'

export const orderItemInputSchema = z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
})

export const orderSchema = z.object({
    id: z.number(),
    user_id: z.number(),
    status_id: z.number(),
    order_date: z.string(),
    total_amount: z.number().min(0),
    special_instructions: z.string().nullish(),
    completed_at: z.string().nullish()
})

export const createOrderSchema = z.object({
    user_id: z.number().int().positive(),
    status_id: z.number().int().positive(),
    items: z.array(orderItemInputSchema).min(1, "Order must have at least one item"),
    special_instructions: z.string().optional(),
})

export const updateOrderSchema = orderSchema.partial()

export type OrderItemInput = z.infer<typeof orderItemInputSchema>
export type Order = z.infer<typeof orderSchema>
export type CreateOrder = z.infer<typeof createOrderSchema>
export type UpdateOrder = z.infer<typeof updateOrderSchema>





