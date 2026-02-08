import { Hono } from 'hono';
import { SearchService } from './search.service';
import { successResponse, errorResponse } from '../../../lib/response';
import { authMiddleware } from '../../../middleware/auth.middleware';

export const searchRoutes = new Hono();

searchRoutes.use('*', authMiddleware);

searchRoutes.get('/global', async (c) => {
    try {
        const query = c.req.query('q') || '';
        const results = await SearchService.globalSearch(query);
        return successResponse(c, results);
    } catch (error: any) {
        return errorResponse(c, error.message, 500);
    }
});
