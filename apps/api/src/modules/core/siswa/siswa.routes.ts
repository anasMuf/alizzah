
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSiswaSchema, updateSiswaSchema, promoteSiswaSchema } from '@alizzah/validators';
import { SiswaService } from './siswa.service';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { successResponse } from '../../../lib/response';

export const siswaRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const page = Number(c.req.query('page')) || 1;
        const limit = Number(c.req.query('limit')) || 10;
        const search = c.req.query('search');
        const rombelId = c.req.query('rombelId');
        const status = c.req.query('status') as any;

        const result = await SiswaService.findAll({ page, limit, search, rombelId, status });

        return c.json({
            success: true,
            message: 'Data siswa berhasil diambil',
            data: result.data,
            meta: result.meta
        });
    })
    .get('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        const siswa = await SiswaService.findById(id);
        return successResponse(c, siswa);
    })
    .post('/', authMiddleware, zValidator('json', createSiswaSchema), async (c) => {
        const data = c.req.valid('json');

        try {
            const siswa = await SiswaService.create(data);
            return successResponse(c, siswa, 'Siswa berhasil ditambahkan', 201);
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    })
    .post('/promote/batch', authMiddleware, zValidator('json', promoteSiswaSchema), async (c) => {
        const data = c.req.valid('json');

        try {
            const result = await SiswaService.promote(data);
            return successResponse(c, result, `${result.count} siswa berhasil dipindahkan`);
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    })
    .put('/:id', authMiddleware, zValidator('json', updateSiswaSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');

        try {
            const siswa = await SiswaService.update(id, data);
            return successResponse(c, siswa, 'Data siswa berhasil diperbarui');
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');

        try {
            await SiswaService.delete(id);
            return successResponse(c, null, 'Siswa berhasil dihapus');
        } catch (error: any) {
            return c.json({ success: false, error: { message: error.message } }, 400);
        }
    });
