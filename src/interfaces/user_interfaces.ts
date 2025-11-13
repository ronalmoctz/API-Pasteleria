export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    password_hash: string;
    role: 'customer' | 'admin';
    is_active: boolean;
    last_seen?: string | null;
    created_at?: string;
    updated_at?: string;
}