import { UserRepository } from "@/repositories/user_repository";
import { AppError } from "@/utils/app_error";
import { logger } from "@/utils/logger";
import type { RegisterUserDTO, LoginDTO, PublicUserDTO } from "@/schemas/user_schema";

interface LoginResponse {
    user: PublicUserDTO;
    token: string;
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

    async getUserByEmail(email: string) {
        logger.debug("Buscando usuario por email", { email });

        const user = await UserRepository.findByEmail(email);
        if (!user) {
            throw new AppError("Usuario no encontrado", 404);
        }

        logger.info("Usuario encontrado", { email });
        return user;
    }
}