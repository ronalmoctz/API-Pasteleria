import { UserRepository } from "@/repositories/user_repository.js";
import { AppError } from "@/utils/app_error.js";
import { logger } from "@/utils/logger.js";
import type { RegisterUserDTO, LoginDTO, PublicUserDTO, EditUserDTO, GetAllUsersQueryDTO, UserStatusDTO } from "@/schemas/user_schema.js";

interface LoginResponse {
    user: PublicUserDTO;
    token: string;
}

interface AllUsersResponse {
    users: PublicUserDTO[];
    total: number;
    page: number;
    limit: number;
}

export class UserService {
    async register(data: RegisterUserDTO): Promise<PublicUserDTO> {
        logger.debug("Intentando registrar usuario", { email: data.email });

        try {
            const user = await UserRepository.register(data);
            logger.info("Usuario registrado con éxito", { id: user.id, email: user.email });
            return user;
        } catch (err) {
            logger.error("Error en el registro", { error: err });
            throw new AppError("Error al registrar el usuario", 400);
        }
    }

    async login(data: LoginDTO): Promise<LoginResponse> {
        logger.debug("Intentando login de usuario", { email: data.email });

        try {
            const response = await UserRepository.login(data);
            logger.info("Login exitoso", { email: response.user.email });
            return response;
        } catch (err) {
            logger.warn("Fallo login", { error: err });
            throw new AppError("Credenciales incorrectas", 401);
        }
    }

    async getUserByEmail(email: string): Promise<PublicUserDTO> {
        logger.debug("Buscando usuario por email", { email });

        const user = await UserRepository.findByEmail(email);
        if (!user) {
            throw new AppError("Usuario no encontrado", 404);
        }

        logger.info("Usuario encontrado", { email });
        return {
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
        };
    }

    async getUserById(id: number): Promise<PublicUserDTO> {
        logger.debug("Buscando usuario por ID", { id });

        const user = await UserRepository.findById(id);
        if (!user) {
            throw new AppError("Usuario no encontrado", 404);
        }

        logger.info("Usuario encontrado por ID", { id });
        return {
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
        };
    }

    async getAllUsers(query: GetAllUsersQueryDTO): Promise<AllUsersResponse> {
        logger.debug("Obteniendo todos los usuarios", { query });

        try {
            const result = await UserRepository.getAll(query);
            logger.info("Usuarios obtenidos exitosamente", { total: result.total, page: result.page });
            return result;
        } catch (err) {
            logger.error("Error obteniendo usuarios", { error: err });
            throw new AppError("Error al obtener usuarios", 500);
        }
    }

    async updateUser(id: number, data: EditUserDTO): Promise<PublicUserDTO> {
        logger.debug("Intentando actualizar usuario", { id });

        try {
            const updatedUser = await UserRepository.updateUser(id, data);
            logger.info("Usuario actualizado exitosamente", { id, email: updatedUser.email });
            return updatedUser;
        } catch (err) {
            logger.error("Error actualizando usuario", { error: err, id });
            if (err instanceof Error && err.message === "Usuario no encontrado") {
                throw new AppError("Usuario no encontrado", 404);
            }
            throw new AppError("Error al actualizar el usuario", 400);
        }
    }

    async softDeleteUser(id: number): Promise<void> {
        logger.debug("Intentando desactivar usuario", { id });

        try {
            await UserRepository.softDelete(id);
            logger.info("Usuario desactivado exitosamente", { id });
        } catch (err) {
            logger.error("Error desactivando usuario", { error: err, id });
            if (err instanceof Error && err.message === "Usuario no encontrado") {
                throw new AppError("Usuario no encontrado", 404);
            }
            throw new AppError("Error al desactivar el usuario", 400);
        }
    }

    async getOnlineStatus(id: number): Promise<UserStatusDTO> {
        logger.debug("Obteniendo estado online del usuario", { id });

        try {
            const user = await UserRepository.findById(id);
            if (!user) {
                throw new AppError("Usuario no encontrado", 404);
            }

            const status = await UserRepository.getOnlineStatus(id);
            logger.info("Estado online obtenido", { id, is_online: status.is_online });

            return {
                id: user.id,
                email: user.email,
                is_online: status.is_online,
                last_seen: status.last_seen,
                status: status.is_online ? "online" : "offline",
            };
        } catch (err) {
            logger.error("Error obteniendo estado online", { error: err, id });
            throw new AppError("Error al obtener estado del usuario", 500);
        }
    }

    async updateLastSeen(id: number): Promise<void> {
        logger.debug("Actualizando last_seen del usuario", { id });

        try {
            await UserRepository.setLastSeen(id);
            logger.debug("Last seen actualizado", { id });
        } catch (err) {
            logger.error("Error actualizando last_seen", { error: err, id });
        }
    }
}