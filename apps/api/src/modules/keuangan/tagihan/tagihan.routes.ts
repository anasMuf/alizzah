
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { generateTagihanSchema } from '@alizzah/validators';
import { TagihanService } from './tagihan.service';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { successResponse, errorResponse } from '../../../lib/response';

export const tagihanRoutes = new Hono();

tagihanRoutes.use('*', authMiddleware);

tagihanRoutes.post('/generate', zValidator('json', generateTagihanSchema), async (c) => {
    const data = c.req.valid('json');
    try {
        const result = await TagihanService.generate(data);
        const created = result.filter((r: any) => r.status === 'fulfilled' && (r.value as any).status === 'created').length;
        const skipped = result.filter((r: any) => r.status === 'fulfilled' && (r.value as any).status === 'skipped').length;
        const failed = result.filter((r: any) => r.status === 'rejected').length;

        return successResponse(c, {
            summary: { created, skipped, failed },
            details: result
        }, 'Proses generate tagihan selesai');
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

tagihanRoutes.get('/', async (c) => {
    try {
        const query = c.req.query();
        const params = {
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 10,
            search: query.search,
            rombelId: query.rombelId,
            periode: query.periode,
            status: query.status
        };

        const result = await TagihanService.findAll(params);
        return successResponse(c, result);
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});

tagihanRoutes.get('/summary', async (c) => {
    try {
        const query = c.req.query();
        const result = await TagihanService.getSummary({
            search: query.search,
            tahunAjaranId: query.tahunAjaranId
        });
        return successResponse(c, result);
    } catch (error: any) {
        return errorResponse(c, error.message, 400);
    }
});
