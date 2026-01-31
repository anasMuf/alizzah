
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
    isMutasi: z.boolean().default(false),
    asalSekolah: z.string().max(100).optional().nullable(),
    foto: z.string().optional().nullable(),
    pastaIds: z.array(z.string()).optional(),
});

export const updateSiswaSchema = createSiswaSchema.partial();

export type CreateSiswaInput = z.infer<typeof createSiswaSchema>;
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>;

// Promotion/Transfer Schema
// Promotion/Transfer Schema
export const promoteSiswaSchema = z.object({
    siswaIds: z.array(z.string().uuid()).min(1),
    action: z.enum(['PROMOTE', 'GRADUATE']),
    targetRombelId: z.string().uuid().optional(),
}).refine((data) => {
    if (data.action === 'PROMOTE' && !data.targetRombelId) {
        return false;
    }
    return true;
}, {
    message: "Rombel tujuan wajib dipilih untuk kenaikan kelas",
    path: ["targetRombelId"]
});

export type PromoteSiswaInput = z.infer<typeof promoteSiswaSchema>;
