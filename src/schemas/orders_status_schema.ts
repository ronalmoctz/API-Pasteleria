import { z } from 'zod'

export const orderStatusSchema = z.object({
    id: z.number(),
    status_name: z.string().min(1)
})

export const createOrderStatusSchema = orderStatusSchema.omit({ id: true })
export const updateOrderStatusSchema = orderStatusSchema.partial()

export type OrderStatus = z.infer<typeof orderStatusSchema>
export type CreateOrderStatus = z.infer<typeof createOrderStatusSchema>
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>
