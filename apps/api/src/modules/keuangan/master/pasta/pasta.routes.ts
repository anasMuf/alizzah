
import { Hono } from 'hono';
import { PastaService } from './pasta.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse } from '../../../../lib/response';
import { zValidator } from '@hono/zod-validator';
import { createPastaSchema, updatePastaSchema } from '@alizzah/validators';

export const pastaRoutes = new Hono()
    .get('/', authMiddleware, async (c) => {
        const pastas = await PastaService.findAll();
        return successResponse(c, pastas);
    })
    .get('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        const pasta = await PastaService.findById(id);
        return successResponse(c, pasta);
    })
    .post('/', authMiddleware, zValidator('json', createPastaSchema), async (c) => {
        const data = c.req.valid('json');
        const result = await PastaService.create(data);
        return successResponse(c, result, 'Program PASTA berhasil dibuat', 201);
    })
    .put('/:id', authMiddleware, zValidator('json', updatePastaSchema), async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await PastaService.update(id, data);
        return successResponse(c, result, 'Program PASTA berhasil diperbarui');
    })
    .delete('/:id', authMiddleware, async (c) => {
        const id = c.req.param('id');
        await PastaService.delete(id);
        return successResponse(c, null, 'Program PASTA berhasil dihapus');
    });
