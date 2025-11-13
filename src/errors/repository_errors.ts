/**
 * Custom error for data validation failures
 * Used when data doesn't match expected schema or business rules
 */
export class ValidationError extends Error {
    constructor(message: string, public details?: unknown) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Custom error for database operation failures
 * Used when database queries or connections fail
 */
export class DatabaseError extends Error {
    constructor(message: string, public details?: unknown) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Custom error for resource not found scenarios
 * Used when a requested entity doesn't exist
 */
export class NotFoundError extends Error {
    constructor(entity: string, identifier: unknown) {
        super(`${entity} with identifier ${identifier} not found`);
        this.name = 'NotFoundError';
    }
}
