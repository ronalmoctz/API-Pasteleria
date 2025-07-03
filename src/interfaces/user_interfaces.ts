export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    password_hash: string;
    role: 'customer' | 'admin';
    created_at?: string;
    updated_at?: string;
}