import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createRombelSchema, updateRombelSchema } from '@alizzah/validators';
import { RombelService } from './rombel.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse } from '../../../../lib/response';

export const rombelRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const tahunAjaranId = c.req.query('tahunAjaranId');
        const jenjangId = c.req.query('jenjangId');
        const rombels = await RombelService.findAll(tahunAjaranId ? { tahunAjaranId, jenjangId } : undefined);
        return successResponse(c, rombels);
    })
    .get('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        const rombel = await RombelService.findById(id);
        return successResponse(c, rombel);
    })
    .post('/', authMiddleware, zValidator('json', createRombelSchema), async (c) => {
        const data = c.req.valid('json');

        try {
            const rombel = await RombelService.create(data);
            return successResponse(c, rombel, 'Rombel berhasil dibuat', 201);
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    })
    .put('/:id', authMiddleware, zValidator('json', updateRombelSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');

        try {
            const rombel = await RombelService.update(id, data);
            return successResponse(c, rombel, 'Rombel berhasil diperbarui');
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');

        try {
            await RombelService.delete(id);
            return successResponse(c, null, 'Rombel berhasil dihapus');
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    });
