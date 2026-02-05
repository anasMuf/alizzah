import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPosPengeluaranSchema, updatePosPengeluaranSchema } from '@alizzah/validators';
import { PosPengeluaranService } from './pos-pengeluaran.service';
import { APIResponse } from '@alizzah/shared';
import { authMiddleware } from '../../../../middleware/auth.middleware';

const app = new Hono();

app.use('*', authMiddleware);

// Get Spending Summary
app.get('/summary', async (c) => {
    const tanggalMulai = c.req.query('tanggalMulai');
    const tanggalSelesai = c.req.query('tanggalSelesai');

    const result = await PosPengeluaranService.getSpendingSummary({
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : undefined
    });
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// List all Pos Pengeluaran
app.get('/', async (c) => {
    const search = c.req.query('search');
    const isAktif = c.req.query('isAktif');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await PosPengeluaranService.findAll({
        search,
        isAktif: isAktif === 'true' ? true : isAktif === 'false' ? false : undefined,
        page,
        limit
    });
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Get by ID
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await PosPengeluaranService.getById(id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Create
app.post('/', zValidator('json', createPosPengeluaranSchema), async (c) => {
    const input = c.req.valid('json');
    const result = await PosPengeluaranService.create(input);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

// Update
app.patch('/:id', zValidator('json', updatePosPengeluaranSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const result = await PosPengeluaranService.update(id, input);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Delete
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await PosPengeluaranService.delete(id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

export const posPengeluaranRoutes = app;
