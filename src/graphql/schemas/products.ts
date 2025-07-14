export const productsTypeDefs = /* GraphQL */ `
    type Product {
        id: Int!
        name: String!
        description: String
        sku: String
        price: Float!
        image_url: String
        is_available: Boolean!
        cost_price: Float!
        stock_quantity: Float!
        category_id: Int!
        created_at: String!
        updated_at: String!
    }

    type Query {
        products: [Product!]!
        product(id: Int!): Product
    }

    input ProductInput {
        name: String!
        description: String
        sku: String
        price: Float!
        image_url: String
        is_available: Boolean = true
        cost_price: Float = 0.0
        stock_quantity: Float = 0.0
        category_id: Int!
    }

    input ProductUpdateInput {
        name: String
        description: String
        sku: String
        price: Float
        image_url: String
        is_available: Boolean
        cost_price: Float
        stock_quantity: Float
        category_id: Int
    }

    type Mutation {
        createProduct(input: ProductInput!): Product!
        updateProduct(id: Int!, input: ProductUpdateInput!): Product!
        deleteProduct(id: Int!): Boolean!
    }
`;
