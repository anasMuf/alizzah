import { z } from 'zod';

// Tahun Ajaran
export const createTahunAjaranSchema = z.object({
    nama: z.string().min(1),
    // Use preprocess to handle string inputs from form, but schema results in Date
    tanggalMulai: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    tanggalSelesai: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
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

// Rombel (Rombongan Belajar)
export const createRombelSchema = z.object({
    nama: z.string().min(1).max(30),
    kapasitas: z.number().int().positive().default(25),
    jenjangId: z.string().uuid(),
    tahunAjaranId: z.string().uuid(),
    waliKelas: z.string().max(100).optional().nullable(),
});

export const updateRombelSchema = createRombelSchema.partial();

export type CreateRombelInput = z.infer<typeof createRombelSchema>;
export type UpdateRombelInput = z.infer<typeof updateRombelSchema>;

// PASTA (Program Asah Talenta)
export const createPastaSchema = z.object({
    nama: z.string().min(1).max(100),
    biaya: z.number().positive(),
    hari: z.string().min(1),
    jamMulai: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    jamSelesai: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    isAktif: z.boolean().default(true),
});

export const updatePastaSchema = createPastaSchema.partial();

export type CreatePastaInput = z.infer<typeof createPastaSchema>;
export type UpdatePastaInput = z.infer<typeof updatePastaSchema>;
