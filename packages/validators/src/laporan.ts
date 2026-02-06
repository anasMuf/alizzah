import { z } from 'zod';

export const queryTunggakanSchema = z.object({
    rombelId: z.string().optional()
});

export const queryRekapHarianSchema = z.object({
    tanggal: z.string().optional() // ISO string, will be parsed later
});

export const queryBukuBesarSchema = z.object({
    posId: z.string(),
    startDate: z.string(),
    endDate: z.string()
});
