import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
const { verify } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

declare module 'hono' {
    interface ContextVariableMap {
        user: any;
    }
}

export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verify(token, JWT_SECRET);
        c.set('user', payload);
        await next();
    } catch (err) {
        return c.json({ error: 'Invalid token' }, 401);
    }
});
