import { z } from 'zod';

// Jenis Tabungan enum
export const JenisTabunganSchema = z.enum(['WAJIB_BERLIAN', 'UMUM']);
export type JenisTabungan = z.infer<typeof JenisTabunganSchema>;

// Tipe Transaksi Tabungan
export const TipeTransaksiTabunganSchema = z.enum(['SETOR', 'TARIK']);
export type TipeTransaksiTabungan = z.infer<typeof TipeTransaksiTabunganSchema>;

// Create Tabungan (usually auto-created, but can be manual)
export const createTabunganSchema = z.object({
    siswaId: z.string().uuid(),
    jenis: JenisTabunganSchema,
    saldoAwal: z.number().nonnegative().default(0),
});

export type CreateTabunganInput = z.infer<typeof createTabunganSchema>;

// Setor Tabungan
export const setorTabunganSchema = z.object({
    siswaId: z.string().uuid(),
    jenis: JenisTabunganSchema.default('UMUM'),
    nominal: z.number().positive('Nominal setoran harus lebih dari 0'),
    keterangan: z.string().optional(),
});

export type SetorTabunganInput = z.infer<typeof setorTabunganSchema>;

// Tarik Tabungan (hanya UMUM, dengan potongan 2.5%)
export const tarikTabunganSchema = z.object({
    siswaId: z.string().uuid(),
    nominal: z.number().positive('Nominal penarikan harus lebih dari 0'),
    keterangan: z.string().optional(),
});

export type TarikTabunganInput = z.infer<typeof tarikTabunganSchema>;

// Constants
export const TABUNGAN_ADMIN_FEE_PERCENT = 2.5; // 2.5% fee on withdrawal
