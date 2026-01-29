import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createJenjangSchema, updateJenjangSchema } from '@alizzah/validators';
import { JenjangService } from './jenjang.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse } from '../../../../lib/response';

export const jenjangRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const result = await JenjangService.findAll();
        return successResponse(c, result);
    })
    .post('/', authMiddleware, zValidator('json', createJenjangSchema), async (c) => {
        const data = c.req.valid('json');
        const result = await JenjangService.create(data);
        return successResponse(c, result, 'Jenjang berhasil dibuat', 201);
    })
    .put('/:id', authMiddleware, zValidator('json', updateJenjangSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await JenjangService.update(id, data);
        return successResponse(c, result, 'Jenjang berhasil diperbarui');
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        await JenjangService.delete(id);
        return successResponse(c, null, 'Jenjang berhasil dihapus');
    });
