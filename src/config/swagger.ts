import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { apiReference } from '@scalar/express-api-reference';
import type { Application } from 'express';


const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Bakery API',
            version: '1.0.0',
            description: `
                # Bakery Management API
                
                Una API REST completa para la gestión de una panadería que incluye:
                - Gestión de productos y categorías
                - Sistema de pedidos y facturación
                - Manejo de inventario
                - Autenticación y autorización
                - Reportes y estadísticas
                
                ## Autenticación
                La API utiliza JWT (JSON Web Tokens) para la autenticación. 
                Incluye el token en el header: \`Authorization: Bearer <token>\`
                
                ## Códigos de Estado
                - 200: Éxito
                - 201: Creado exitosamente
                - 400: Solicitud incorrecta
                - 401: No autorizado
                - 403: Prohibido
                - 404: No encontrado
                - 500: Error interno del servidor
            `,
            termsOfService: 'https://bakery-api.com/terms',
            contact: {
                name: 'API Support',
                url: 'https://bakery-api.com/support',
                email: 'support@bakery-api.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.bakery.com',
                description: 'Production server'
            },
            {
                url: 'https://staging-api.bakery.com',
                description: 'Staging server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token para autenticación'
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API Key para acceso de terceros'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Mensaje de error'
                        },
                        code: {
                            type: 'integer',
                            description: 'Código de error'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Timestamp del error'
                        }
                    },
                    required: ['error', 'code', 'timestamp']
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            description: 'Página actual'
                        },
                        limit: {
                            type: 'integer',
                            description: 'Elementos por página'
                        },
                        total: {
                            type: 'integer',
                            description: 'Total de elementos'
                        },
                        totalPages: {
                            type: 'integer',
                            description: 'Total de páginas'
                        }
                    }
                }
            },
            responses: {
                NotFound: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                Unauthorized: {
                    description: 'Token de autenticación requerido',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                BadRequest: {
                    description: 'Solicitud incorrecta',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Error interno del servidor',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                }
            },
            parameters: {
                PageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Número de página (default: 1)',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    }
                },
                LimitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Elementos por página (default: 10, max: 100)',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    }
                },
                SortParam: {
                    name: 'sort',
                    in: 'query',
                    description: 'Campo por el cual ordenar (ej: name:asc, createdAt:desc)',
                    required: false,
                    schema: {
                        type: 'string',
                        example: 'name:asc'
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'Endpoints para autenticación y autorización'
            },
            {
                name: 'Products',
                description: 'Gestión de productos de la panadería'
            },
            {
                name: 'Categories',
                description: 'Gestión de categorías de productos'
            },
            {
                name: 'Orders',
                description: 'Gestión de pedidos y órdenes'
            },
            {
                name: 'Users',
                description: 'Gestión de usuarios del sistema'
            },
            {
                name: 'Reports',
                description: 'Reportes y estadísticas'
            }
        ],
        externalDocs: {
            description: 'Documentación completa',
            url: 'https://docs.bakery-api.com'
        }
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
}

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Application) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.use('/reference',
        apiReference({
            theme: 'purple',
            url: "/openapi.json",
        })
    )
    app.get('/openapi.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.send(swaggerSpec)
    })

}