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
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone_number: z.string().nullable().optional(),
    role: z.enum(['customer', 'admin']),
    created_at: z.string(),
    updated_at: z.string()
});

export type RegisterUserDTO = z.infer<typeof registerUserSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type PublicUserDTO = z.infer<typeof publicUserSchema>;
