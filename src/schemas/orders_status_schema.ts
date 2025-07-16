import { z } from 'zod'

export const orderStatusSchema = z.object({
    id: z.number(),
    status_name: z.string().min(1)
})

export const createOrderStatusSchema = orderStatusSchema.omit({ id: true })
export const updateOrderStatusScehma = orderStatusSchema.partial()

export type Orderstatus = z.infer<typeof orderStatusSchema>
export type CreateOrderStatus = z.infer<typeof createOrderStatusSchema>
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusScehma>
