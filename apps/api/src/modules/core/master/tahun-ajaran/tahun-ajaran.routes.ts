import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTahunAjaranSchema, updateTahunAjaranSchema } from '@alizzah/validators';
import { TahunAjaranService } from './tahun-ajaran.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse } from '../../../../lib/response';

export const tahunAjaranRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const result = await TahunAjaranService.findAll();
        return successResponse(c, result);
    })
    .get('/active', authMiddleware, async (c) => {
        const result = await TahunAjaranService.findActive();
        return successResponse(c, result);
    })
    .post('/', authMiddleware, zValidator('json', createTahunAjaranSchema), async (c) => {
        const data = c.req.valid('json');
        const result = await TahunAjaranService.create(data);
        return successResponse(c, result, 'Tahun ajaran berhasil dibuat', 201);
    })
    .put('/:id', authMiddleware, zValidator('json', updateTahunAjaranSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await TahunAjaranService.update(id, data);
        return successResponse(c, result, 'Tahun ajaran berhasil diperbarui');
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        await TahunAjaranService.delete(id);
        return successResponse(c, null, 'Tahun ajaran berhasil dihapus');
    });
