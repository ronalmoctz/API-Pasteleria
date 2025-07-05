import express from 'express';
import timeout from 'connect-timeout'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from '@/config/env';
import { checkTursoConnection } from '@/config/tursoClient';
import { setupSwagger } from '@/config/swagger';
import { errorHandler } from '@/middlewares/error_handler';
import rateLimit from 'express-rate-limit';
import { logger } from '@/utils/logger';


// Import routes
import userRoutes from '@/routes/user_routes';


const app = express();

app.use(timeout('5s', { respond: true }));

app.use(cors());
app.use(express.json());
app.use(cookieParser());
setupSwagger(app);
app.use(rateLimit())
// Middleware para manejar errores
app.use(errorHandler);


app.get('/', (_req, res) => {
    res.send({
        success: true,
        message: '🧁 API de pastelería lista',
        timestamp: new Date().toISOString()
    });
});

app.use('/', userRoutes);

async function bootstrap() {
    const isConnected = await checkTursoConnection();
    if (!isConnected) {
        console.error('🚫 No se pudo conectar a la base de datos. Abortando.');
        process.exit(1);
    }

    app.listen(ENV.SERVER_PORT, () => {
        logger.info(`🚀 Bakery API is running on http://localhost:${ENV.SERVER_PORT}`);
        logger.info(`📘 Scalar Reference at http://localhost:${ENV.SERVER_PORT}/reference`)
    });
}

bootstrap();