import { z } from 'zod';

export const modeDaycareEnum = z.enum(['RUTIN', 'HARIAN']);
export const statusPesertaDaycareEnum = z.enum(['AKTIF', 'NONAKTIF']);

export const createPesertaDaycareSchema = z.discriminatedUnion('tipePeserta', [
  // Siswa internal Alizzah
  z.object({
    tipePeserta: z.literal('INTERNAL'),
    siswaId: z.string().uuid(),
    modeDaycare: modeDaycareEnum,
    tanggalMulai: z.string().transform((val) => new Date(val)),
    defaultIkutKonsumsi: z.boolean().default(false),
    catatan: z.string().optional(),
  }),
  // Anak luar
  z.object({
    tipePeserta: z.literal('EKSTERNAL'),
    namaLengkap: z.string().min(2),
    tanggalLahir: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
    jenisKelamin: z.enum(['L', 'P']),
    namaOrtu: z.string().min(2),
    noHpOrtu: z.string().min(10),
    jenjangSetaraId: z.string().uuid(),
    modeDaycare: modeDaycareEnum,
    tanggalMulai: z.string().transform((val) => new Date(val)),
    defaultIkutKonsumsi: z.boolean().default(false),
    catatan: z.string().optional(),
  }),
]);

export const updatePesertaDaycareSchema = z.object({
  modeDaycare: modeDaycareEnum.optional(),
  status: statusPesertaDaycareEnum.optional(),
  jenjangSetaraId: z.string().uuid().optional(),
  tanggalBerakhir: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  defaultIkutKonsumsi: z.boolean().optional(),
  catatan: z.string().optional(),
  // For external students, these might be updatable
  namaLengkap: z.string().min(2).optional(),
  namaOrtu: z.string().min(2).optional(),
  noHpOrtu: z.string().min(10).optional(),
});

export const listPesertaDaycareQuerySchema = z.object({
  mode: modeDaycareEnum.optional(),
  status: statusPesertaDaycareEnum.optional(),
  jenjangSetaraId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export const createTagihanHarianSchema = z.object({
  pesertaDaycareId: z.string().uuid(),
  tanggal: z.string().transform((val) => new Date(val)),
  ikutKonsumsi: z.boolean().default(false),
});

export const batchTagihanHarianSchema = z.object({
  tanggal: z.string().transform((val) => new Date(val)),
  items: z.array(z.object({
    pesertaDaycareId: z.string().uuid(),
    ikutKonsumsi: z.boolean().default(false),
  })),
});
