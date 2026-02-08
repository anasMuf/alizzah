import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { authRoutes } from './modules/core/auth/auth.routes';
import { masterRoutes } from './modules/core/master';
import { jenisPembayaranRoutes } from './modules/keuangan/master/jenis-pembayaran/jenis-pembayaran.routes';
import { diskonRoutes } from './modules/keuangan/master/diskon/diskon.routes';
import { tagihanRoutes } from './modules/keuangan/tagihan/tagihan.routes';
import { pembayaranRoutes } from './modules/keuangan/pembayaran/pembayaran.routes';
import { pastaRoutes } from './modules/keuangan/master/pasta/pasta.routes';
import { tabunganRoutes } from './modules/keuangan/tabungan/tabungan.routes';
import { kasRoutes } from './modules/keuangan/kas/kas.routes';
import { posPengeluaranRoutes } from './modules/keuangan/master/pos-pengeluaran/pos-pengeluaran.routes';
import { laporanRoutes } from './modules/keuangan/laporan/laporan.routes';
import { dashboardRoutes } from './modules/keuangan/dashboard/dashboard.routes';
import { siswaRoutes } from './modules/core/siswa/siswa.routes';
import { SearchService } from './modules/keuangan/search/search.service';
import { authMiddleware } from './middleware/auth.middleware';
import { AppError } from './lib/error';
import { errorResponse, successResponse } from './lib/response';

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use('*', cors());

// 1. Root Level Routes
app.get('/health', (c) => c.text('OK'));

// 2. API v1 Router
const v1 = new Hono()
    // Diagnostic
    .get('/ping', (c) => successResponse(c, { status: 'OK', version: '2.0.3' }))

    // Auth & Core
    .route('/auth', authRoutes)
    .route('/master', masterRoutes)
    .route('/siswa', siswaRoutes)

    // Keuangan
    .route('/keuangan/master/pasta', pastaRoutes)
    .route('/keuangan/master/jenis-pembayaran', jenisPembayaranRoutes)
    .route('/keuangan/master/diskon', diskonRoutes)
    .route('/keuangan/master/pos-pengeluaran', posPengeluaranRoutes)
    .route('/keuangan/tagihan', tagihanRoutes)
    .route('/keuangan/pembayaran', pembayaranRoutes)
    .route('/keuangan/tabungan', tabunganRoutes)
    .route('/keuangan/kas', kasRoutes)
    .route('/keuangan/laporan', laporanRoutes)
    .route('/keuangan/dashboard', dashboardRoutes)

    // Search (Direct registration to bypass potential module issues)
    .get('/keuangan/search/global', authMiddleware, async (c) => {
        try {
            const query = c.req.query('q') || '';
            const results = await SearchService.globalSearch(query);
            return successResponse(c, results);
        } catch (error: any) {
            return errorResponse(c, error.message, 500);
        }
    });

// 3. Mount v1 to /api/v1
app.route('/api/v1', v1);

// 4. Global Error Catch-all (MUST be at the very bottom)
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

app.notFound((c) => {
    return errorResponse(c, `Opps! Resource not found: ${c.req.path}`, 404);
});

export default app;
export type AppType = typeof v1;
