import { turso } from "@/config/tursoClient.js";
import type { User } from "@/interfaces/user_interfaces.js";
import { logger } from "@/utils/logger.js";
import { registerUserSchema, loginSchema, publicUserSchema, editUserSchema, getAllUsersQuerySchema } from "@/schemas/user_schema.js";
import type { RegisterUserDTO, LoginDTO, PublicUserDTO, EditUserDTO, GetAllUsersQueryDTO } from "@/schemas/user_schema.js";
import { signToken } from "@/utils/jwt.js";
import { hashPassword, comparePassword } from "@/utils/bcrypt.js";
import { cache } from '@/utils/cache.js';
import { formatTimeDifference } from "@/utils/time_formatter.js";


const USER_BY_EMAIL_CACHE_KEY = (email: string) => `users:email:${email}`;
const USER_BY_ID_CACHE_KEY = (id: number) => `users:id:${id}`;
const ALL_USERS_CACHE_KEY = (page: number, limit: number, role?: string, is_active?: boolean) =>
    `users:all:${page}:${limit}:${role || 'all'}:${is_active ?? 'all'}`;

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
                is_active: Boolean(row.is_active ?? true),
                last_seen: row.last_seen ? String(row.last_seen) : null,
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

    async findById(id: number): Promise<User | null> {
        const cacheKey = USER_BY_ID_CACHE_KEY(id);
        const cached = cache.get<User>(cacheKey);
        if (cached) {
            logger.debug("Usuario obtenido desde cache por ID", { id });
            return cached;
        }

        try {
            const result = await turso.execute({
                sql: `SELECT * FROM users WHERE id = ?`,
                args: [id],
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
                is_active: Boolean(row.is_active ?? true),
                last_seen: row.last_seen ? String(row.last_seen) : null,
                created_at: String(row.created_at),
                updated_at: String(row.updated_at),
            };

            cache.set(cacheKey, user, 60);
            logger.debug("Usuario encontrado y cacheado por ID", { id });
            return user;
        } catch (err) {
            logger.error("Error buscando usuario por ID", { error: err, id });
            return null;
        }
    },

    async getAll(query: GetAllUsersQueryDTO): Promise<{ users: PublicUserDTO[], total: number, page: number, limit: number }> {
        const parsed = getAllUsersQuerySchema.safeParse(query);
        if (!parsed.success) {
            logger.warn("Datos de paginación inválidos", { error: parsed.error });
            throw new Error("Datos de paginación inválidos");
        }

        const { page, limit, role, is_active } = parsed.data;
        const offset = (page - 1) * limit;

        try {
            // Construir consulta dinámicamente
            let whereClause = "WHERE 1=1";
            const args: (string | number | boolean)[] = [];

            if (role) {
                whereClause += " AND role = ?";
                args.push(role);
            }

            if (is_active !== undefined) {
                whereClause += " AND is_active = ?";
                args.push(is_active ? 1 : 0);
            }

            // Obtener total
            const countResult = await turso.execute({
                sql: `SELECT COUNT(*) as total FROM users ${whereClause}`,
                args,
            });

            const total = Number(countResult.rows[0]?.total || 0);

            // Obtener usuarios paginados
            const result = await turso.execute({
                sql: `SELECT * FROM users ${whereClause} LIMIT ? OFFSET ?`,
                args: [...args, limit, offset],
            });

            const users = result.rows.map((row: any) => publicUserSchema.parse({
                id: Number(row.id),
                first_name: String(row.first_name),
                last_name: String(row.last_name),
                email: String(row.email),
                phone_number: row.phone_number ? String(row.phone_number) : null,
                role: row.role === 'admin' ? 'admin' : 'customer',
                is_active: Boolean(row.is_active ?? true),
                last_seen: row.last_seen ? String(row.last_seen) : null,
                created_at: String(row.created_at),
                updated_at: String(row.updated_at),
            }));

            logger.info("Usuarios obtenidos", { page, limit, total });
            return { users, total, page, limit };
        } catch (err) {
            logger.error("Error obteniendo usuarios", { error: err });
            throw new Error("Error al obtener usuarios");
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
            sql: `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, is_active, last_seen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [
                rest.first_name,
                rest.last_name,
                email,
                rest.phone_number ?? null,
                password_hash,
                rest.role,
                1, // is_active = true
                null, // last_seen = null
            ],
        });

        const user = result.rows[0];

        // ✅ Invalidar cache
        cache.del(USER_BY_EMAIL_CACHE_KEY(email));

        logger.info("Usuario registrado", { email });

        return publicUserSchema.parse({
            id: Number(user.id),
            first_name: String(user.first_name),
            last_name: String(user.last_name),
            email: String(user.email),
            phone_number: user.phone_number ? String(user.phone_number) : null,
            role: user.role === 'admin' ? 'admin' : 'customer',
            is_active: Boolean(user.is_active ?? true),
            last_seen: user.last_seen ? String(user.last_seen) : null,
            created_at: String(user.created_at),
            updated_at: String(user.updated_at),
        });
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

        if (!user.is_active) throw new Error("Usuario desactivado");

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

        // Actualizar last_seen
        await this.setLastSeen(user.id);

        return {
            user: publicUserSchema.parse({
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role,
                is_active: user.is_active,
                last_seen: user.last_seen,
                created_at: user.created_at,
                updated_at: user.updated_at,
            }),
            token,
        };
    },

    async updateUser(id: number, data: EditUserDTO): Promise<PublicUserDTO> {
        const parsed = editUserSchema.safeParse(data);
        if (!parsed.success) {
            logger.warn("Datos de actualización inválidos", { error: parsed.error });
            throw new Error("Datos de actualización inválidos");
        }

        const user = await this.findById(id);
        if (!user) throw new Error("Usuario no encontrado");

        const { email, password, ...rest } = parsed.data;

        // Verificar si el email ya existe (si se intenta cambiar)
        if (email && email !== user.email) {
            const existingUser = await this.findByEmail(email);
            if (existingUser) throw new Error("El correo ya está registrado");
        }

        const password_hash = password ? await hashPassword(password) : user.password_hash;

        const updateFields: string[] = [];
        const updateArgs: (string | number | boolean)[] = [];

        if (rest.first_name !== undefined) {
            updateFields.push("first_name = ?");
            updateArgs.push(rest.first_name);
        }
        if (rest.last_name !== undefined) {
            updateFields.push("last_name = ?");
            updateArgs.push(rest.last_name);
        }
        if (email !== undefined) {
            updateFields.push("email = ?");
            updateArgs.push(email);
        }
        if (rest.phone_number !== undefined) {
            updateFields.push("phone_number = ?");
            updateArgs.push(rest.phone_number ?? null);
        }
        if (password !== undefined) {
            updateFields.push("password_hash = ?");
            updateArgs.push(password_hash);
        }
        if (rest.role !== undefined) {
            updateFields.push("role = ?");
            updateArgs.push(rest.role);
        }
        if (rest.is_active !== undefined) {
            updateFields.push("is_active = ?");
            updateArgs.push(rest.is_active ? 1 : 0);
        }

        updateFields.push("updated_at = ?");
        updateArgs.push(new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0]);
        updateArgs.push(id);

        const result = await turso.execute({
            sql: `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? RETURNING *`,
            args: updateArgs,
        });

        const updatedUser = result.rows[0];

        // Invalidar cache
        cache.del(USER_BY_EMAIL_CACHE_KEY(user.email));
        cache.del(USER_BY_ID_CACHE_KEY(id));
        if (email) cache.del(USER_BY_EMAIL_CACHE_KEY(email));

        logger.info("Usuario actualizado", { id, email: updatedUser.email });

        return publicUserSchema.parse({
            id: Number(updatedUser.id),
            first_name: String(updatedUser.first_name),
            last_name: String(updatedUser.last_name),
            email: String(updatedUser.email),
            phone_number: updatedUser.phone_number ? String(updatedUser.phone_number) : null,
            role: updatedUser.role === 'admin' ? 'admin' : 'customer',
            is_active: Boolean(updatedUser.is_active ?? true),
            last_seen: updatedUser.last_seen ? String(updatedUser.last_seen) : null,
            created_at: String(updatedUser.created_at),
            updated_at: String(updatedUser.updated_at),
        });
    },

    async softDelete(id: number): Promise<void> {
        const user = await this.findById(id);
        if (!user) throw new Error("Usuario no encontrado");

        await turso.execute({
            sql: `UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`,
            args: [new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0], id],
        });

        // Invalidar cache
        cache.del(USER_BY_EMAIL_CACHE_KEY(user.email));
        cache.del(USER_BY_ID_CACHE_KEY(id));

        logger.info("Usuario desactivado (soft delete)", { id });
    },

    async setLastSeen(id: number): Promise<void> {
        const now = new Date().toISOString();

        try {
            await turso.execute({
                sql: `UPDATE users SET last_seen = ? WHERE id = ?`,
                args: [now, id],
            });

            // Invalidar cache para que se refleje el cambio
            const user = await this.findById(id);
            if (user) {
                cache.del(USER_BY_EMAIL_CACHE_KEY(user.email));
                cache.del(USER_BY_ID_CACHE_KEY(id));
            }

            logger.debug("Last seen actualizado", { id, timestamp: now });
        } catch (err) {
            logger.error("Error actualizando last_seen", { error: err, id });
        }
    },

    async getOnlineStatus(id: number): Promise<{ is_online: boolean; last_seen: string | null; duration: { value: number; unit: string; formatted: string } }> {
        const user = await this.findById(id);
        if (!user) throw new Error("Usuario no encontrado");

        const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutos
        const lastSeenTime = user.last_seen ? new Date(user.last_seen).getTime() : 0;
        const now = Date.now();
        const isOnline = (now - lastSeenTime) < ONLINE_THRESHOLD;

        let duration = { value: 0, unit: 'second', formatted: '0s' };

        if (user.last_seen) {
            duration = formatTimeDifference(user.last_seen, new Date());
        }

        logger.debug("Estado online obtenido", { id, is_online: isOnline, duration: duration.formatted });

        return {
            is_online: isOnline,
            last_seen: user.last_seen || null,
            duration
        };
    },
};