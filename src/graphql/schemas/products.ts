export const productsTypeDefs = /* GraphQL */ `
    scalar DateTime

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
        created_at: DateTime!
        updated_at: DateTime!
    }

    # Paginación mejorada
    type ProductsPage {
        items: [Product!]!
        totalCount: Int!
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
        currentPage: Int!
        totalPages: Int!
    }

    type Query {
        # Obtener productos con paginación y filtros
        getProducts(
            page: Int = 1
            limit: Int = 10
            filters: ProductFilters
        ): ProductsPage!
        
        # Obtener producto por ID
        getProduct(productId: Int!): Product
        
        # Búsqueda de productos
        searchProducts(
            searchQuery: String!
            page: Int = 1
            limit: Int = 10
        ): ProductsPage!
    }

    input ProductFilters {
        categoryId: Int
        isAvailable: Boolean
        minPrice: Float
        maxPrice: Float
        hasStock: Boolean
        nameContains: String
    }

    input CreateProductData {
        name: String!
        description: String
        sku: String
        price: Float!
        imageUrl: String
        isAvailable: Boolean = true
        costPrice: Float = 0.0
        stockQuantity: Float = 0.0
        categoryId: Int!
    }

    input UpdateProductData {
        name: String
        description: String
        sku: String
        price: Float
        imageUrl: String
        isAvailable: Boolean
        costPrice: Float
        stockQuantity: Float
        categoryId: Int
    }

    # Respuestas específicas para cada operación
    type CreateProductResult {
        success: Boolean!
        message: String!
        product: Product
        validationErrors: [String!]
    }

    type UpdateProductResult {
        success: Boolean!
        message: String!
        product: Product
        validationErrors: [String!]
    }

    type DeleteProductResult {
        success: Boolean!
        message: String!
        deletedProductId: Int
    }

    type Mutation {
        createProduct(productData: CreateProductData!): CreateProductResult!
        updateProduct(productId: Int!, productData: UpdateProductData!): UpdateProductResult!
        deleteProduct(productId: Int!): DeleteProductResult!
    }
`;