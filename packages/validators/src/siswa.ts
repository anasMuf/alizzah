
import { z } from 'zod';
import { JenisKelaminSchema } from './keuangan';

// Status Siswa Enum (Needs to match Prisma Enum if possible, or string literal)
export const StatusSiswaSchema = z.enum([
    'CALON_SISWA',
    'AKTIF',
    'LULUS',
    'KELUAR',
    'CUTI'
]);

// Siswa Validation Schemas
export const createSiswaSchema = z.object({
    nis: z.string().max(20).optional(), // Optional because it might be auto-generated
    namaLengkap: z.string().min(1).max(100),
    jenisKelamin: JenisKelaminSchema,
    tempatLahir: z.string().max(50).optional().nullable(),
    tanggalLahir: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()).optional().nullable(),
    alamat: z.string().optional().nullable(),

    // Parent Data
    namaOrtu: z.string().min(1).max(100),
    noHpOrtu: z.string().max(20),
    emailOrtu: z.string().email().optional().nullable(),

    // Academic Data
    rombelId: z.string().uuid(),
    status: StatusSiswaSchema.default('AKTIF'),
    tanggalMasuk: z.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),

    // Additional
    ikutDaycare: z.boolean().default(false),
    foto: z.string().optional().nullable(),
    pastaIds: z.array(z.string()).optional(),
});

export const updateSiswaSchema = createSiswaSchema.partial();

export type CreateSiswaInput = z.infer<typeof createSiswaSchema>;
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>;
