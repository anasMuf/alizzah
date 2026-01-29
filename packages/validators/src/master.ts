import { z } from 'zod';

// Tahun Ajaran
export const createTahunAjaranSchema = z.object({
    nama: z.string().min(1),
    tanggalMulai: z.string().transform((str) => new Date(str)), // Input as string YYYY-MM-DD
    tanggalSelesai: z.string().transform((str) => new Date(str)),
    isAktif: z.boolean().default(false),
});

export const updateTahunAjaranSchema = createTahunAjaranSchema.partial();

export type CreateTahunAjaranInput = z.infer<typeof createTahunAjaranSchema>;
export type UpdateTahunAjaranInput = z.infer<typeof updateTahunAjaranSchema>;

// Jenjang
export const createJenjangSchema = z.object({
    kode: z.string().min(1).max(10),
    nama: z.string().min(1).max(50),
    kelompok: z.string().min(1),
    urutan: z.number().int().positive(),
});

export const updateJenjangSchema = createJenjangSchema.partial();

export type CreateJenjangInput = z.infer<typeof createJenjangSchema>;
export type UpdateJenjangInput = z.infer<typeof updateJenjangSchema>;
