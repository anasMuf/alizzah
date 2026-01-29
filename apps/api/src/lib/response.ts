import { Context } from 'hono';

export const successResponse = <T>(c: Context, data: T, message = 'Success', statusCode = 200) => {
    return c.json(
        {
            success: true as const,
            message,
            data,
        },
        statusCode as any
    );
};

export const errorResponse = (c: Context, message: string, statusCode = 500, details?: any) => {
    return c.json(
        {
            success: false as const,
            error: {
                code: statusCode,
                message,
                details,
            },
        },
        statusCode as any
    );
};
