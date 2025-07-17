import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;

export async function hashPassword(plaintPassword: string): Promise<string> {
    return bcrypt.hash(plaintPassword, SALT_ROUNDS);
}

export async function comparePassword(plaintPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plaintPassword, hashedPassword);
}

