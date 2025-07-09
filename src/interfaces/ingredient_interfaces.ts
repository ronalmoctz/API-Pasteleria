export type AllowedUnit = 'g' | 'kg' | 'ml' | 'l' | 'unit';

export interface Ingredient {
    id: number,
    name: string,
    stock_quantity: number,
    unit: AllowedUnit;
}