
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
    createDiskonSchema,
    updateDiskonSchema,
    assignDiskonSchema
} from '@alizzah/validators';
import { DiskonService } from './diskon.service';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { successResponse, errorResponse } from '../../../../lib/response';

export const diskonRoutes = new Hono();

diskonRoutes.use('*', authMiddleware);

diskonRoutes.get('/', async (c) => {
    const result = await DiskonService.findAll();
    return successResponse(c, result);
});

diskonRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const result = await DiskonService.findById(id);
        return successResponse(c, result);
    } catch (error: any) {
        return errorResponse(c, error.message, 404);
    }
});

diskonRoutes.post('/', zValidator('json', createDiskonSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const result = await DiskonService.create(data);
        return successResponse(c, result, 'Diskon berhasil dibuat', 201);
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

diskonRoutes.put('/:id', zValidator('json', updateDiskonSchema), async (c) => {
    try {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await DiskonService.update(id, data);
        return successResponse(c, result, 'Diskon berhasil diperbarui');
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

diskonRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await DiskonService.delete(id);
        return successResponse(c, null, 'Diskon berhasil dihapus');
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

// Assignment Routes
diskonRoutes.post('/assign', zValidator('json', assignDiskonSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const user = c.get('user');

        const result = await DiskonService.assignToSiswa({
            ...data,
            createdBy: user.id
        });
        return successResponse(c, result, 'Diskon berhasil diberikan ke siswa', 201);
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

diskonRoutes.delete('/assign/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await DiskonService.removeAssignment(id);
        return successResponse(c, null, 'Pemberian diskon berhasil dihapus');
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});
