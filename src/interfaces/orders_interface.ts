export interface Order {
    id: number;
    user_id: number;
    status_id: number;
    order_date: string;
    total_amount: number;
    special_instructions?: string | null;
    completed_at?: string | null;
}