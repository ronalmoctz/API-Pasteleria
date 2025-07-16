import { z } from 'zod'

export const orderSchema = z.object({
    id: z.number(),
    user_id: z.number(),
    status_id: z.number(),
    order_date: z.string(),
    total_amount: z.number().min(0),
    special_instructions: z.string(),
    completed_at: z.string()
})

export const createOrderSchema = orderSchema.omit({ id: true, order_date: true, completed_at: true })
export const updateOrderSchema = orderSchema.partial()

export type Order = z.infer<typeof orderSchema>
export type CreateOrder = z.infer<typeof createOrderSchema>
export type UpdateOrder = z.infer<typeof updateOrderSchema>