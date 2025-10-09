import { createSchema, createYoga } from "graphql-yoga";
import { apiLimiter } from "@/middlewares/rate_limit.js";
import type { Express } from "express";
import { productsResolvers } from './resolvers/products.js'
import { productsTypeDefs } from "./schemas/products.js";

// Configuración del endpoint GraphQL
const GRAPHQL_ENDPOINT = '/graphql';
const GRAPHQL_PLAYGROUND_ENDPOINT = '/graphql-playground';

export const setupGraphQl = (app: Express) => {
    // Aplicar rate limiting al endpoint GraphQL
    app.use(GRAPHQL_ENDPOINT, apiLimiter);

    // Crear instancia de Yoga con configuración mejorada
    const yoga = createYoga({
        schema: createSchema({
            typeDefs: [productsTypeDefs],
            resolvers: [productsResolvers]
        }),
        graphqlEndpoint: GRAPHQL_ENDPOINT,
        graphiql: {
            title: 'API Pastelería - GraphQL Playground',
            defaultQuery: `
                # Ejemplo de consulta para obtener productos
                query GetProducts {
                    getProducts(page: 1, limit: 10) {
                        items {
                            id
                            name
                            price
                            is_available
                        }
                        totalCount
                        currentPage
                        totalPages
                    }
                }
            `
        },
        logging: true,
        context: ({ request }) => {
            // Contexto mejorado para futuras implementaciones de autenticación
            const userAgent = request.headers.get('user-agent') || 'Unknown';
            const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'Unknown';

            return {
                user: null, // TODO: Implementar autenticación
                requestInfo: {
                    userAgent,
                    ip,
                    timestamp: new Date().toISOString()
                }
            }
        },
        // Configuración de CORS para desarrollo
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? ['https://yourdomain.com']
                : ['http://localhost:3000', 'http://localhost:5173'],
            credentials: true
        }
    });

    // Montar el endpoint GraphQL
    app.use(GRAPHQL_ENDPOINT, yoga);

    // Endpoint adicional para documentación (opcional)
    app.get('/graphql-docs', (req, res) => {
        res.json({
            endpoint: GRAPHQL_ENDPOINT,
            playground: GRAPHQL_PLAYGROUND_ENDPOINT,
            documentation: 'Visita el playground para explorar la API',
            queries: {
                getProducts: 'Obtener lista de productos con paginación',
                getProduct: 'Obtener un producto específico por ID',
                searchProducts: 'Buscar productos por texto'
            },
            mutations: {
                createProduct: 'Crear un nuevo producto',
                updateProduct: 'Actualizar un producto existente',
                deleteProduct: 'Eliminar un producto'
            }
        });
    });
}

