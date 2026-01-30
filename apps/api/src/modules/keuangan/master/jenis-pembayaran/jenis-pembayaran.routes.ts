import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createJenisPembayaranSchema, updateJenisPembayaranSchema } from '@alizzah/validators';
import { JenisPembayaranService } from './jenis-pembayaran.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse } from '../../../../lib/response';

export const jenisPembayaranRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const result = await JenisPembayaranService.findAll();
        return successResponse(c, result);
    })
    .get('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        const result = await JenisPembayaranService.findById(id);
        return successResponse(c, result);
    })
    .post('/', authMiddleware, zValidator('json', createJenisPembayaranSchema), async (c) => {
        const data = c.req.valid('json');
        const result = await JenisPembayaranService.create(data);
        return successResponse(c, result, 'Jenis pembayaran berhasil dibuat', 201);
    })
    .put('/:id', authMiddleware, zValidator('json', updateJenisPembayaranSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await JenisPembayaranService.update(id, data);
        return successResponse(c, result, 'Jenis pembayaran berhasil diperbarui');
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        await JenisPembayaranService.delete(id);
        return successResponse(c, null, 'Jenis pembayaran berhasil dihapus');
    });
