import express from 'express';
import timeout from 'connect-timeout'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from '@/config/env.js';
import { checkTursoConnection } from '@/config/tursoClient.js';
import { setupSwagger } from '@/config/swagger.js';
import { errorHandler } from '@/middlewares/error_handler.js';
import { logger } from '@/utils/logger.js';

//GraphQL import
import { setupGraphQl } from '@/graphql/index.js';

// Import routes
import userRoutes from '@/routes/user_routes.js';
import categoryRoutes from '@/routes/categories_routes.js'
import ingredientRoutes from '@/routes/ingredients_routes.js'
import productRoutes from '@/routes/products_routes.js'
import orderStatusRoutes from '@/routes/orders_status_routes.js'
import ordersRoutes from '@/routes/orders_routes.js'

const app = express();

app.use(timeout('5s', { respond: true }));

app.use(cors());
app.use(express.json());
app.use(cookieParser());
setupSwagger(app);

// Ruta raíz mejorada con información de la API y documentación
app.get('/', (_req, res) => {
    const baseUrl = _req.get('host') ? `https://${_req.get('host')}` : `http://localhost:${ENV.SERVER_PORT}`;

    res.json({
        success: true,
        message: '🧁 API de Pastelería - ¡Bienvenido!',
        description: 'API RESTful para gestión de pastelería con soporte GraphQL',
        version: '1.0.0',
        author: 'ronalmoctz',
        documentation: {
            'getting_started': 'https://deepwiki.com/ronalmoctz/API-Pasteleria/1.1-getting-started',
            'api_reference': `${baseUrl}/reference`,
            'graphql_playground': `${baseUrl}/graphql`,
            'swagger_docs': `${baseUrl}/docs`
        },
        endpoints: {
            rest_api: {
                base_url: `${baseUrl}/api/v1`,
                auth: '/',
                categories: '/api/v1/categories',
                ingredients: '/api/v1/ingredients',
                products: '/api/v1/products',
                order_status: '/api/v1/order-status',
                orders: '/api/v1/orders'
            },
            graphql: {
                endpoint: `${baseUrl}/graphql`,
                playground: `${baseUrl}/graphql`
            }
        },
        status: {
            server: '✅ Online',
            database: '✅ Connected',
            environment: process.env.NODE_ENV || 'development'
        },
        links: {
            repository: 'https://github.com/ronalmoctz/API-Pasteleria',
            documentation: 'https://deepwiki.com/ronalmoctz/API-Pasteleria',
            contact: 'https://github.com/ronalmoctz'
        }
    });
});

// Ruta específica para información de documentación
app.get('/docs-info', (_req, res) => {
    const baseUrl = _req.get('host') ? `https://${_req.get('host')}` : `http://localhost:${ENV.SERVER_PORT}`;

    res.json({
        success: true,
        message: '📚 Documentación de la API',
        documentation_links: {
            'getting_started': {
                url: 'https://deepwiki.com/ronalmoctz/API-Pasteleria/1.1-getting-started',
                description: 'Guía completa para comenzar a usar la API'
            },
            'api_reference': {
                url: `${baseUrl}/reference`,
                description: 'Referencia interactiva de todos los endpoints REST'
            },
            'graphql_docs': {
                url: `${baseUrl}/graphql`,
                description: 'Playground de GraphQL con esquemas y queries disponibles'
            },
            'swagger_ui': {
                url: `${baseUrl}/docs`,
                description: 'Documentación Swagger UI tradicional'
            }
        },
        quick_start: {
            authentication: 'POST /login con credenciales válidas',
            example_requests: {
                get_products: `GET ${baseUrl}/api/v1/products`,
                create_category: `POST ${baseUrl}/api/v1/categories`,
                graphql_query: `POST ${baseUrl}/graphql`
            }
        }
    });
});

// Ruta de salud del sistema
app.get('/health', async (_req, res) => {
    const isDbConnected = await checkTursoConnection();

    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: isDbConnected ? 'connected' : 'disconnected',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/', userRoutes);
app.use('/api/v1', categoryRoutes)
app.use('/api/v1', ingredientRoutes)
app.use('/api/v1/', productRoutes)
app.use('/api/v1/', orderStatusRoutes)
app.use('/api/v1/', ordersRoutes)

setupGraphQl(app)

// Middleware para manejar errores
app.use(errorHandler);

async function bootstrap() {
    const isConnected = await checkTursoConnection();
    if (!isConnected) {
        console.error('🚫 No se pudo conectar a la base de datos. Abortando.');
        process.exit(1);
    }

    app.listen(ENV.SERVER_PORT, () => {
        logger.info(`🚀 Bakery API is running on http://localhost:${ENV.SERVER_PORT}`);
        logger.info(`📘 Scalar Reference at http://localhost:${ENV.SERVER_PORT}/reference`)
        logger.info(`🧠 GraphQL running on http://localhost:${ENV.SERVER_PORT}/graphql`)
        logger.info(`📚 Getting Started Guide: https://deepwiki.com/ronalmoctz/API-Pasteleria/1.1-getting-started`)
        logger.info(`🏥 Health Check at http://localhost:${ENV.SERVER_PORT}/health`)
    });
}

bootstrap();