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
import { searchRoutes } from './modules/keuangan/search/search.routes';
import { siswaRoutes } from './modules/core/siswa/siswa.routes';
import { AppError } from './lib/error';
import { errorResponse, successResponse } from './lib/response';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Health Check
app.get('/health', (c) => c.text('OK'));

// Define API v1 routes using method chaining for RPC type inference
const v1 = new Hono()
    .get('/ping', (c) => successResponse(c, { status: 'OK', version: '2.0.2' }))
    .route('/auth', authRoutes)
    .route('/master', masterRoutes)
    .route('/siswa', siswaRoutes)
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
    .route('/keuangan/search', searchRoutes);

// Mount v1
app.route('/api/v1', v1);

// Error handlers
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
    return errorResponse(c, `Resource not found: ${c.req.path}`, 404);
});

export default app;
export type AppType = typeof v1;
