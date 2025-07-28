import { turso } from "@/config/tursoClient.js";
import type { User } from "@/interfaces/user_interfaces.js";
import { logger } from "@/utils/logger.js";
import { registerUserSchema, loginSchema, publicUserSchema } from "@/schemas/user_schema.js";
import type { RegisterUserDTO, LoginDTO, PublicUserDTO } from "@/schemas/user_schema.js";
import { signToken } from "@/utils/jwt.js";
import { hashPassword, comparePassword } from "@/utils/bcrypt.js";
import { cache } from '@/utils/chache.js';


const USER_BY_EMAIL_CACHE_KEY = (email: string) => `users:email:${email}`;

export const UserRepository = {
    async findByEmail(email: string): Promise<User | null> {
        const cacheKey = USER_BY_EMAIL_CACHE_KEY(email);
        const cached = cache.get<User>(cacheKey);
        if (cached) {
            logger.debug("Usuario obtenido desde cache", { email });
            return cached;
        }

        try {
            const result = await turso.execute({
                sql: `SELECT * FROM users WHERE email = ?`,
                args: [email],
            });

            if (!result.rows.length) return null;

            const row = result.rows[0];

            const user: User = {
                id: Number(row.id),
                first_name: String(row.first_name),
                last_name: String(row.last_name),
                email: String(row.email),
                phone_number: row.phone_number ? String(row.phone_number) : undefined,
                password_hash: String(row.password_hash),
                role: row.role === 'admin' ? 'admin' : 'customer',
                created_at: String(row.created_at),
                updated_at: String(row.updated_at),
            };

            // ✅ Guardamos en cache
            cache.set(cacheKey, user, 60);
            logger.debug("Usuario encontrado y cacheado", { email });
            return user;
        } catch (err) {
            logger.error("Error buscando usuario por email", { error: err, email });
            return null;
        }
    },

    async register(data: RegisterUserDTO): Promise<PublicUserDTO> {
        const parsed = registerUserSchema.safeParse(data);
        if (!parsed.success) {
            logger.warn("Datos de registro inválidos", { error: parsed.error });
            throw new Error("Datos de registro inválidos");
        }

        const { email, password, ...rest } = parsed.data;
        const exists = await this.findByEmail(email);
        if (exists) throw new Error("El correo ya está registrado");

        const password_hash = await hashPassword(password);

        const result = await turso.execute({
            sql: `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [
                rest.first_name,
                rest.last_name,
                email,
                rest.phone_number ?? null,
                password_hash,
                rest.role,
            ],
        });

        const user = result.rows[0];

        // ✅ Invalidar cache si hubiera alguna entrada "precargada"
        cache.del(USER_BY_EMAIL_CACHE_KEY(email));

        logger.info("Usuario registrado", { email });

        return publicUserSchema.parse(user);
    },

    async login(data: LoginDTO): Promise<{ user: PublicUserDTO; token: string }> {
        const parsed = loginSchema.safeParse(data);
        if (!parsed.success) {
            logger.warn("Datos de login inválidos", { error: parsed.error });
            throw new Error("Datos de login inválidos");
        }

        const { email, password } = parsed.data;
        const user = await this.findByEmail(email);
        if (!user) throw new Error("Usuario o contraseña incorrectos");

        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
            logger.debug("Contraseña inválida", { plain: data.password, hash: user.password_hash });
            throw new Error('Usuario o contraseña incorrectos');
        }

        const token = await signToken({
            sub: user.id,
            user_name: user.first_name,
            role: user.role,
        });

        return {
            user: publicUserSchema.parse(user),
            token,
        };
    },
};