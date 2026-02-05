
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

export const TipePotonganSchema = z.enum(['PERSENTASE', 'NOMINAL']);

export const PemicuTagihanSchema = z.enum([
    'MANUAL',
    'OTOMATIS_SISWA_BARU',
    'OTOMATIS_AWAL_TAHUN',
]);

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
    pemicu: PemicuTagihanSchema.default('MANUAL'),
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

// Diskon / Dispensasi
export const createDiskonSchema = z.object({
    kode: z.string().min(1).max(20),
    nama: z.string().min(1).max(100),
    jenisPembayaranId: z.string().uuid(),
    tipePotongan: TipePotonganSchema,
    nilaiPotongan: z.number().nonnegative(),
    keterangan: z.string().optional(),
    isAktif: z.boolean().default(true),
});

export const updateDiskonSchema = createDiskonSchema.partial();

export type CreateDiskonInput = z.infer<typeof createDiskonSchema>;
export type UpdateDiskonInput = z.infer<typeof updateDiskonSchema>;

// Assign Diskon to Siswa
export const assignDiskonSchema = z.object({
    siswaId: z.string().uuid(),
    diskonId: z.string().uuid(),
    tanggalMulai: z.preprocess((arg) => {
        if (!arg || arg === '') return undefined;
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    tanggalBerakhir: z.preprocess((arg) => {
        if (!arg || arg === '') return null;
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date().nullable()).optional().nullable(),
    catatan: z.string().optional(),
});

export type AssignDiskonInput = z.infer<typeof assignDiskonSchema>;

// Billing Generation
export const generateTagihanSchema = z.object({
    bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2020),
    // For calculation variables
    jumlahHariEfektif: z.number().int().nonnegative().default(20),
    jumlahSenin: z.number().int().nonnegative().default(4),
    // Target scope
    jenjangId: z.string().uuid().optional(),
    rombelId: z.string().uuid().optional(),
    siswaIds: z.array(z.string().uuid()).optional(),
    // Dynamic selection
    jenisPembayaranIds: z.array(z.string().uuid()).optional(),
});


export type GenerateTagihanInput = z.infer<typeof generateTagihanSchema>;

// Payments
export const MetodePembayaranSchema = z.enum(['TUNAI', 'TRANSFER']);

export const createPembayaranSchema = z.object({
    siswaId: z.string().uuid(),
    tanggal: z.preprocess((arg) => (arg ? new Date(arg as any) : new Date()), z.date()),
    totalBayar: z.number().positive(),
    metode: MetodePembayaranSchema,
    bankId: z.string().uuid().optional().nullable(),
    buktiTransfer: z.string().optional().nullable(),
    catatan: z.string().optional().nullable(),
    kasId: z.string().uuid().optional(), // Target cash account
    additionalItems: z.array(z.object({
        jenisPembayaranId: z.string().uuid(),
        nominal: z.number().positive(),
        catatan: z.string().optional().nullable(),
    })).optional(),
});

export type CreatePembayaranInput = z.infer<typeof createPembayaranSchema>;
