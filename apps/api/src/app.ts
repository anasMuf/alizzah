import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { authRoutes } from './modules/core/auth/auth.routes';
import { masterRoutes } from './modules/core/master';
import { AppError } from './lib/error';
import { errorResponse } from './lib/response';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.onError((err, c) => {
    if (err instanceof AppError) {
        return errorResponse(c, err.message, err.statusCode);
    }
    if (err instanceof ZodError) {
        return errorResponse(c, 'Validasi gagal', 400, err.errors);
    }
    console.error('🔥 SYSTEM ERROR:', err);
    return errorResponse(c, 'Terjadi kesalahan internal server', 500);
});

// Define API v1 routes separately to have a clean AppType
const v1 = new Hono()
    .route('/auth', authRoutes)
    .route('/master', masterRoutes);

// Mount v1
app.route('/api/v1', v1);

export default app;
export type AppType = typeof v1;
