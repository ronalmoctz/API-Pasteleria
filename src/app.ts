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



// app.get('/', (_req, res) => {
//     res.json({
//         success: true,
//         message: '🧁 API de pastelería lista',
//     });
// });

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
    });
}

bootstrap();