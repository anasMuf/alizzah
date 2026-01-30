export * from './utils/format';

export const APP_NAME = 'Alizzah Keuangan'

export interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: {
        code: number;
        message: string;
        details?: any;
    };
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
    meta: PaginationMeta;
}
