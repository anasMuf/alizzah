import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { loginSchema } from '@alizzah/validators';
import { AuthService } from './auth.service';
import { successResponse } from '../../../lib/response';

export const authRoutes = new Hono()
    .post('/login', zValidator('json', loginSchema), async (c) => {
        const data = c.req.valid('json');
        const result = await AuthService.login(data);
        return successResponse(c, result);
    })
    .post('/logout', (c) => {
        // Stateless JWT, client just discards token.
        return successResponse(c, null, 'Logged out successfully');
    });
