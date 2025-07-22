import type { Request, Response, NextFunction } from "express";
import { UserService } from "@/services/user_service.js";

const userService = new UserService();

/**
 * Register new user
 * @router POST /auth/register
 * @group Users - Operations about users
 * @param {RegisterUserDTO} request.body.required - User registration data
 * @returns 201 - User registered successfully
 * @returns 400 - Bad request if validation fails or email already exists
 */

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await userService.register(req.body)
        res.status(201).json({
            success: true,
            data: user,
            message: "User registered successfully",
        })
    } catch (err) {
        next(err);
    }
}

/**
 * Login user
 * @router POST /auth/login
 * @param {LoginDTO} request.body.required - User login credentials
 * @returns 200 - User logged in successfully
 * @returns 401 - Unauthorized if credentials are invalid
 */
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { user, token } = await userService.login(req.body);
        res.status(200).json({
            success: true,
            data: { user, token },
            message: "User logged in successfully",
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get user by email
 * @router GET /users/email/{email}
 * @param {string} email.path.required - User email
 * @returns 200 - User found
 * @returns 404 - User not found
 * @returns 400 - Bad request if email is invalid
 */

export async function getUserByEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await userService.getUserByEmail(req.params.email)
        res.status(200).json({
            success: true,
            data: user,
            message: "User found successfully",
        })
    } catch (err) {
        next(err);
    }
}