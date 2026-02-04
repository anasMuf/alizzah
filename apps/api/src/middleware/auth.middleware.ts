import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
const { verify } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Type for authenticated user payload
export interface AuthUser {
    id: string;
    email: string;
    namaLengkap: string;
    role: string;
    iat?: number;
    exp?: number;
}

declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser;
    }
}

export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verify(token, JWT_SECRET) as AuthUser;
        c.set('user', payload);
        await next();
    } catch (err) {
        return c.json({ error: 'Invalid token' }, 401);
    }
});
