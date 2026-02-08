import { Hono } from 'hono';
import { DashboardService } from './dashboard.service';
import { successResponse, errorResponse } from '../../../lib/response';
import { authMiddleware } from '../../../middleware/auth.middleware';

export const dashboardRoutes = new Hono();

dashboardRoutes.use('*', authMiddleware);

dashboardRoutes.get('/stats', async (c) => {
    try {
        const stats = await DashboardService.getStats();
        return successResponse(c, stats);
    } catch (error: any) {
        return errorResponse(c, error.message, 500);
    }
});

dashboardRoutes.get('/recent-activities', async (c) => {
    try {
        const activities = await DashboardService.getRecentActivities();
        return successResponse(c, activities);
    } catch (error: any) {
        return errorResponse(c, error.message, 500);
    }
});
