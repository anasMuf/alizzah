import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setorTabunganSchema, tarikTabunganSchema } from '@alizzah/validators';
import { TabunganService } from './tabungan.service';
import { APIResponse } from '@alizzah/shared';
import { authMiddleware, AuthUser } from '../../../middleware/auth.middleware';

const app = new Hono();

app.use('*', authMiddleware);

/**
 * Routes menggunakan Centralized Error Handling pattern:
 * - Service layer throw AppError dengan statusCode
 * - Global onError middleware di app.ts akan menangkap dan format response
 * - Tidak perlu try-catch di setiap handler
 */

// Get Summary Statistics
app.get('/summary', async (c) => {
    const result = await TabunganService.getSummary();
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// List all Tabungan
app.get('/', async (c) => {
    const search = c.req.query('search');
    const jenis = c.req.query('jenis') as 'WAJIB_BERLIAN' | 'UMUM' | undefined;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await TabunganService.findAll({ search, jenis, page, limit });
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Get Tabungan by Siswa
app.get('/siswa/:siswaId', async (c) => {
    const siswaId = c.req.param('siswaId');
    const result = await TabunganService.getBySiswa(siswaId);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Get Tabungan Detail
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await TabunganService.getById(id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Get Transaksi for Tabungan
app.get('/:id/transaksi', async (c) => {
    const id = c.req.param('id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await TabunganService.getTransaksi(id, { page, limit });
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Setor Tabungan
app.post('/setor', zValidator('json', setorTabunganSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await TabunganService.setor(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Tarik Tabungan
app.post('/tarik', zValidator('json', tarikTabunganSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await TabunganService.tarik(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

export const tabunganRoutes = app;
