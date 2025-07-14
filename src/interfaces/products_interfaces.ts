export interface Product {
    id: number,
    name: string,
    description?: string,
    sku?: string,
    price: number,
    is_available: boolean;
    cost_price: number;
    category_id: number;
    created_at: string;
    updated_at: string;
}
