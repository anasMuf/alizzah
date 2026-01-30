import { z } from 'zod';

// Jenis Kelamin enum (duplicated from prisma logic for zod)
export const JenisKelaminSchema = z.enum(['L', 'P']);

export const KategoriPembayaranSchema = z.enum([
    'INFAQ_RUTIN',
    'REGISTRASI',
    'PERLENGKAPAN',
    'DAYCARE',
]);

export const TipePembayaranSchema = z.enum([
    'BULANAN',
    'TAHUNAN',
    'SEKALI',
    'HARIAN',
    'INSIDENTIL',
]);

export const SifatPembayaranSchema = z.enum(['WAJIB', 'OPSIONAL']);

// Jenis Pembayaran
export const createJenisPembayaranSchema = z.object({
    kode: z.string().min(1).max(20),
    nama: z.string().min(1).max(100),
    kategori: KategoriPembayaranSchema,
    tipe: TipePembayaranSchema,
    nominalDefault: z.number().positive(),
    jenjangIds: z.array(z.string()),
    sifat: SifatPembayaranSchema,
    jatuhTempoHari: z.number().int().min(1).max(31).default(1),
    keterangan: z.string().optional(),
    isAktif: z.boolean(),
});

export const updateJenisPembayaranSchema = createJenisPembayaranSchema.partial();

export type CreateJenisPembayaranInput = z.infer<typeof createJenisPembayaranSchema>;
export type UpdateJenisPembayaranInput = z.infer<typeof updateJenisPembayaranSchema>;

// Tarif Jenis Pembayaran
export const createTarifSchema = z.object({
    jenisPembayaranId: z.string().uuid(),
    tahunAjaranId: z.string().uuid(),
    jenjangId: z.string().uuid().optional().nullable(),
    jenisKelamin: JenisKelaminSchema.optional().nullable(),
    nominal: z.number().positive(),
});

export const updateTarifSchema = createTarifSchema.partial();

export type CreateTarifInput = z.infer<typeof createTarifSchema>;
export type UpdateTarifInput = z.infer<typeof updateTarifSchema>;
