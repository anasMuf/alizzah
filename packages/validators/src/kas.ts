import { z } from 'zod';

// ==================== ENUMS ====================
export const TipeKasSchema = z.enum(['KAS', 'BERANGKAS']);
export const TipeTransaksiKasSchema = z.enum(['MASUK', 'KELUAR', 'TRANSFER']);

// ==================== KAS (Cash Account) ====================
export const createKasSchema = z.object({
    tipe: TipeKasSchema,
    nama: z.string().min(1).max(50),
    saldoAwal: z.number().nonnegative().default(0),
});

export const updateKasSchema = z.object({
    nama: z.string().min(1).max(50).optional(),
    saldoAwal: z.number().nonnegative().optional(),
});

export type CreateKasInput = z.infer<typeof createKasSchema>;
export type UpdateKasInput = z.infer<typeof updateKasSchema>;

// ==================== POS PENGELUARAN (Expense Category) ====================
export const createPosPengeluaranSchema = z.object({
    kode: z.string().min(1).max(20),
    nama: z.string().min(1).max(100),
    prioritasSumberDanaId: z.string().uuid().optional().nullable(),
    keterangan: z.string().optional().nullable(),
    isAktif: z.boolean().default(true),
});

export const updatePosPengeluaranSchema = createPosPengeluaranSchema.partial();

export type CreatePosPengeluaranInput = z.infer<typeof createPosPengeluaranSchema>;
export type UpdatePosPengeluaranInput = z.infer<typeof updatePosPengeluaranSchema>;

// ==================== TRANSAKSI KAS (Cash Transactions) ====================

// Cash In - Uang Masuk (dari sumber eksternal, bukan dari pembayaran siswa)
export const kasirMasukSchema = z.object({
    kasId: z.string().uuid(),
    nominal: z.number().positive(),
    sumberDanaId: z.string().uuid().optional().nullable(),
    keterangan: z.string().min(1, 'Keterangan harus diisi'),
    bukti: z.string().optional().nullable(),
});

// Cash Out - Uang Keluar (pengeluaran)
export const kasirKeluarSchema = z.object({
    kasId: z.string().uuid(),
    nominal: z.number().positive(),
    posPengeluaranId: z.string().uuid(),
    sumberDanaId: z.string().uuid().optional().nullable(), // Sumber dana untuk pengeluaran
    keterangan: z.string().min(1, 'Keterangan harus diisi'),
    bukti: z.string().optional().nullable(),
});

// Transfer between Kas & Berangkas
export const transferKasSchema = z.object({
    dariKasId: z.string().uuid(),
    keKasId: z.string().uuid(),
    nominal: z.number().positive(),
    keterangan: z.string().optional().nullable(),
});

export type KasirMasukInput = z.infer<typeof kasirMasukSchema>;
export type KasirKeluarInput = z.infer<typeof kasirKeluarSchema>;
export type TransferKasInput = z.infer<typeof transferKasSchema>;

// ==================== DAILY RECONCILIATION ====================
export const rekonsiliasiFisikSchema = z.object({
    kasId: z.string().uuid(),
    tanggal: z.preprocess((arg) => {
        if (!arg || arg === '') return new Date();
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    saldoFisik: z.number().nonnegative(),
    catatan: z.string().optional().nullable(),
});

export type RekonsiliasiFisikInput = z.infer<typeof rekonsiliasiFisikSchema>;

// ==================== QUERY FILTERS ====================
export const transaksisKasQuerySchema = z.object({
    kasId: z.string().uuid().optional(),
    tipeTransaksi: TipeTransaksiKasSchema.optional(),
    tanggalMulai: z.preprocess((arg) => {
        if (!arg || arg === '') return undefined;
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date().optional()),
    tanggalSelesai: z.preprocess((arg) => {
        if (!arg || arg === '') return undefined;
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date().optional()),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export type TransaksisKasQuery = z.infer<typeof transaksisKasQuerySchema>;
