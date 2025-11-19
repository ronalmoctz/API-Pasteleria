import { z } from 'zod';

export const registerUserSchema = z.object({
    first_name: z.string().min(1, 'El nombre es requerido'),
    last_name: z.string().min(1, 'El apellido es requerido'),
    email: z.string().email('El correo electrónico no es válido'),
    phone_number: z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: z.enum(['customer', 'admin']).default('customer')
});

export const updateUserSchema = z.object({
    first_name: z.string().min(1, 'El nombre es requerido').optional(),
    last_name: z.string().min(1, 'El apellido es requerido').optional(),
    email: z.string().email('El correo electrónico no es válido').optional(),
    phone_number: z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    role: z.enum(['customer', 'admin']).optional()
})


export const loginSchema = z.object({
    email: z.string().email('El correo electrónico no es válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});


export const publicUserSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone_number: z.string().nullable().optional(),
    role: z.enum(['customer', 'admin']),
    is_active: z.boolean().default(true),
    last_seen: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

export const editUserSchema = z.object({
    first_name: z.string().min(1, 'El nombre es requerido').optional(),
    last_name: z.string().min(1, 'El apellido es requerido').optional(),
    email: z.string().email('El correo electrónico no es válido').optional(),
    phone_number: z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    role: z.enum(['customer', 'admin']).optional(),
    is_active: z.boolean().optional()
});

export const getAllUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
    role: z.enum(['customer', 'admin']).optional(),
    is_active: z.coerce.boolean().optional()
});

export const userStatusSchema = z.object({
    id: z.number(),
    email: z.string(),
    is_online: z.boolean(),
    last_seen: z.string().nullable(),
    status: z.string(), // Formato: "online 5min", "offline 2d", "nunca conectado"
    duration: z.object({
        value: z.number(),
        unit: z.string(),
        formatted: z.string()
    })
});

export type RegisterUserDTO = z.infer<typeof registerUserSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type PublicUserDTO = z.infer<typeof publicUserSchema>;
export type EditUserDTO = z.infer<typeof editUserSchema>;
export type GetAllUsersQueryDTO = z.infer<typeof getAllUsersQuerySchema>;
export type UserStatusDTO = z.infer<typeof userStatusSchema>;
