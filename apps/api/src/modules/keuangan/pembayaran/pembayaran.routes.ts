
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPembayaranSchema } from '@alizzah/validators';
import { PembayaranService } from './pembayaran.service';
import { APIResponse } from '@alizzah/shared';
import { authMiddleware } from '../../../middleware/auth.middleware';

const app = new Hono();

app.use('*', authMiddleware);

// Get Student Summary
app.get('/siswa/:id/summary', async (c) => {
    const id = c.req.param('id');
    try {
        const result = await PembayaranService.getStudentSummary(id);
        return c.json<APIResponse<any>>({
            success: true,
            data: result
        });
    } catch (error: any) {
        return c.json<APIResponse<null>>({
            success: false,
            error: { code: 404, message: error.message }
        }, 404);
    }
});

// Create Payment
app.post('/', zValidator('json', createPembayaranSchema), async (c) => {
    const user = c.get('user' as any);
    const input = c.req.valid('json');

    try {
        const result = await PembayaranService.create(input, user.id);
        return c.json<APIResponse<any>>({
            success: true,
            data: result
        });
    } catch (error: any) {
        return c.json<APIResponse<null>>({
            success: false,
            error: { code: 400, message: error.message }
        }, 400);
    }
});

// List Payments
app.get('/', async (c) => {
    const search = c.req.query('search');
    const siswaId = c.req.query('siswaId');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');

    try {
        const result = await PembayaranService.findAll({ search, siswaId, page, limit });
        return c.json<APIResponse<any>>({
            success: true,
            data: result
        });
    } catch (error: any) {
        return c.json<APIResponse<null>>({
            success: false,
            error: { code: 500, message: error.message }
        }, 500);
    }
});

export const pembayaranRoutes = app;
