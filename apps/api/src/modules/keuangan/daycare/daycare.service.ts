import { prisma } from '../../../lib/prisma';
import { 
  createPesertaDaycareSchema, 
  updatePesertaDaycareSchema, 
  listPesertaDaycareQuerySchema,
  createTagihanHarianSchema,
  batchTagihanHarianSchema
} from '@alizzah/validators';
import { z } from 'zod';
import ExcelJS from 'exceljs';

export class DaycareService {
  static async findAll(params: z.infer<typeof listPesertaDaycareQuerySchema>) {
    const { page = 1, limit = 10, search, mode, status, jenjangSetaraId } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      modeDaycare: mode || undefined,
      status: status || undefined,
      jenjangSetaraId: jenjangSetaraId || undefined,
    };

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: 'insensitive' } },
        { namaOrtu: { contains: search, mode: 'insensitive' } },
        { siswa: { namaLengkap: { contains: search, mode: 'insensitive' } } },
        { siswa: { nis: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pesertaDaycare.findMany({
        where,
        include: {
          siswa: {
            select: {
              id: true,
              namaLengkap: true,
              nis: true,
              rombel: {
                include: { jenjang: true }
              }
            }
          },
          jenjangSetara: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pesertaDaycare.count({ where }),
    ]);

    // Format data to normalize internal vs external
    const normalizedData = data.map((item: any) => {
      if (item.siswa) {
        return {
          ...item,
          namaLengkap: item.siswa.namaLengkap,
          namaOrtu: item.namaOrtu || 'Dari Data Siswa', // Fallback
          noHpOrtu: item.noHpOrtu || 'Dari Data Siswa',
          tipePeserta: 'INTERNAL',
        };
      }
      return {
        ...item,
        tipePeserta: 'EKSTERNAL',
      };
    });

    return {
      data: normalizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(id: string) {
    const item = await prisma.pesertaDaycare.findUnique({
      where: { id },
      include: {
        siswa: {
          include: {
            rombel: { include: { jenjang: true } }
          }
        },
        jenjangSetara: true,
      },
    });

    if (!item) throw new Error('Peserta Daycare tidak ditemukan');

    if (item.siswa) {
      return {
        ...item,
        namaLengkap: item.siswa.namaLengkap,
        tipePeserta: 'INTERNAL',
      };
    }

    return {
      ...item,
      tipePeserta: 'EKSTERNAL',
    };
  }

  static async create(data: z.infer<typeof createPesertaDaycareSchema>) {
    return await prisma.$transaction(async (tx) => {
      let finalData: any = {
        modeDaycare: data.modeDaycare,
        tanggalMulai: data.tanggalMulai,
        defaultIkutKonsumsi: data.defaultIkutKonsumsi,
        catatan: data.catatan,
        status: 'AKTIF',
      };

      if (data.tipePeserta === 'INTERNAL') {
        // Validate if already active
        const existing = await tx.pesertaDaycare.findFirst({
          where: { siswaId: data.siswaId, status: 'AKTIF' },
        });
        if (existing) throw new Error('Siswa sudah terdaftar sebagai peserta daycare aktif');

        const siswa = await tx.siswa.findUnique({
          where: { id: data.siswaId },
          include: { rombel: { include: { jenjang: true } } },
        });
        if (!siswa) throw new Error('Siswa tidak ditemukan');

        finalData.siswaId = data.siswaId;
        finalData.jenjangSetaraId = siswa.rombel.jenjangId;
      } else {
        finalData = {
          ...finalData,
          namaLengkap: data.namaLengkap,
          tanggalLahir: data.tanggalLahir,
          jenisKelamin: data.jenisKelamin,
          namaOrtu: data.namaOrtu,
          noHpOrtu: data.noHpOrtu,
          jenjangSetaraId: data.jenjangSetaraId,
        };
      }

      const peserta = await tx.pesertaDaycare.create({
        data: finalData,
        include: { 
          jenjangSetara: true, 
          siswa: {
            include: { rombel: true }
          } 
        },
      });

      // Automatically generate Tagihan Biaya Awal
      await this.generateBiayaAwal(peserta, tx);

      return peserta;
    });
  }

  private static async generateBiayaAwal(peserta: any, tx: any) {
    const pendaftaran = await tx.jenisPembayaran.findUnique({ where: { kode: 'DC-DAFTAR' } });
    const akomodasi = await tx.jenisPembayaran.findUnique({ where: { kode: 'DC-AKOM' } });

    if (!pendaftaran || !akomodasi) return;

    const nominalDaftar = Number(pendaftaran.nominalDefault);
    const nominalAkom = Number(akomodasi.nominalDefault);
    const total = nominalDaftar + nominalAkom;

    const tanggal = new Date();
    const periode = `${tanggal.getFullYear()}-${(tanggal.getMonth() + 1).toString().padStart(2, '0')}`;
    const kode = `INV/DC-AWAL/${periode.replace('-', '')}/${peserta.id.slice(-6).toUpperCase()}`;

    await tx.tagihan.create({
      data: {
        kode,
        siswaId: peserta.siswaId || null,
        pesertaDaycareId: peserta.id,
        periode,
        rombelSnapshot: peserta.siswa?.rombel?.nama || 'DAYCARE-EXT',
        jenjangSnapshot: peserta.jenjangSetara.nama,
        tanggalTagihan: tanggal,
        jatuhTempo: new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() + 7),
        totalTagihan: total,
        totalDiskon: 0,
        totalBayar: 0,
        sisaTagihan: total,
        status: 'UNPAID',
        tagihanItems: {
          create: [
            {
              jenisPembayaranId: pendaftaran.id,
              namaItem: 'Pendaftaran Daycare',
              nominalAwal: nominalDaftar,
              nominalDiskon: 0,
              nominalAkhir: nominalDaftar,
            },
            {
              jenisPembayaranId: akomodasi.id,
              namaItem: 'Akomodasi Daycare',
              nominalAwal: nominalAkom,
              nominalDiskon: 0,
              nominalAkhir: nominalAkom,
            }
          ]
        }
      }
    });
  }

  static async update(id: string, data: z.infer<typeof updatePesertaDaycareSchema>) {
    const item = await prisma.pesertaDaycare.findUnique({ where: { id } });
    if (!item) throw new Error('Peserta Daycare tidak ditemukan');

    // Only allow some fields for external or specific fields for both
    return await prisma.pesertaDaycare.update({
      where: { id },
      data: {
        modeDaycare: data.modeDaycare,
        status: data.status,
        jenjangSetaraId: data.jenjangSetaraId,
        tanggalBerakhir: data.tanggalBerakhir,
        defaultIkutKonsumsi: data.defaultIkutKonsumsi,
        catatan: data.catatan,
        namaLengkap: item.siswaId ? undefined : data.namaLengkap,
        namaOrtu: item.siswaId ? undefined : data.namaOrtu,
        noHpOrtu: item.siswaId ? undefined : data.noHpOrtu,
      },
    });
  }

  static async deactivate(id: string) {
    return await prisma.pesertaDaycare.update({
      where: { id },
      data: {
        status: 'NONAKTIF',
        tanggalBerakhir: new Date(),
      },
    });
  }

  static async createTagihanHarian(data: z.infer<typeof createTagihanHarianSchema>) {
    return await prisma.$transaction(async (tx) => {
      const peserta = await tx.pesertaDaycare.findUnique({
        where: { id: data.pesertaDaycareId },
        include: { 
          jenjangSetara: true, 
          siswa: {
            include: { rombel: true }
          } 
        }
      });

      if (!peserta) throw new Error('Peserta Daycare tidak ditemukan');

      const spdHar = await tx.jenisPembayaran.findUnique({ where: { kode: 'SPD-HR' } });
      const kons = await tx.jenisPembayaran.findUnique({ where: { kode: 'DC-KONS' } });

      if (!spdHar) throw new Error('Jenis pembayaran SPD-HR tidak ditemukan');

      const items = [
        {
          jenisPembayaranId: spdHar.id,
          namaItem: `SPD Harian (${data.tanggal.toLocaleDateString()})`,
          nominalAwal: Number(spdHar.nominalDefault),
          nominalDiskon: 0,
          nominalAkhir: Number(spdHar.nominalDefault),
        }
      ];

      let total = Number(spdHar.nominalDefault);

      if (data.ikutKonsumsi && kons) {
        items.push({
          jenisPembayaranId: kons.id,
          namaItem: 'Konsumsi Daycare',
          nominalAwal: Number(kons.nominalDefault),
          nominalDiskon: 0,
          nominalAkhir: Number(kons.nominalDefault),
        });
        total += Number(kons.nominalDefault);
      }

      const periode = `${data.tanggal.getFullYear()}-${(data.tanggal.getMonth() + 1).toString().padStart(2, '0')}`;
      const kode = `INV/DC-HAR/${data.tanggal.toISOString().split('T')[0].replace(/-/g, '')}/${peserta.id.slice(-6).toUpperCase()}`;

      return await tx.tagihan.create({
        data: {
          kode,
          siswaId: peserta.siswaId || null,
          pesertaDaycareId: peserta.id,
          periode,
          rombelSnapshot: peserta.siswa?.rombel?.nama || 'DAYCARE-EXT',
          jenjangSnapshot: peserta.jenjangSetara.nama,
          tanggalTagihan: data.tanggal,
          jatuhTempo: data.tanggal,
          totalTagihan: total,
          totalDiskon: 0,
          totalBayar: 0,
          sisaTagihan: total,
          status: 'UNPAID',
          tagihanItems: { create: items }
        }
      });
    });
  }

  static async batchCreateTagihanHarian(data: z.infer<typeof batchTagihanHarianSchema>) {
    const results = [];
    for (const item of data.items) {
      try {
        const res = await this.createTagihanHarian({
          pesertaDaycareId: item.pesertaDaycareId,
          tanggal: data.tanggal,
          ikutKonsumsi: item.ikutKonsumsi
        });
        results.push({ status: 'success', id: res.id });
      } catch (err: any) {
        results.push({ status: 'error', message: err.message, pesertaId: item.pesertaDaycareId });
      }
    }
    return results;
  }

  static async exportExcel() {
    const data = await prisma.pesertaDaycare.findMany({
      include: {
        siswa: { include: { rombel: { include: { jenjang: true } } } },
        jenjangSetara: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Peserta Daycare');

    sheet.columns = [
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Tipe', key: 'tipe', width: 15 },
      { header: 'Jenjang Setara', key: 'jenjang', width: 15 },
      { header: 'Mode', key: 'mode', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Tanggal Mulai', key: 'mulai', width: 15 },
      { header: 'Nama Ortu', key: 'ortu', width: 25 },
    ];

    sheet.getRow(1).font = { bold: true };

    data.forEach((item: any) => {
      sheet.addRow({
        nama: item.siswa?.namaLengkap || item.namaLengkap,
        tipe: item.siswaId ? 'INTERNAL' : 'EKSTERNAL',
        jenjang: item.jenjangSetara.nama,
        mode: item.modeDaycare,
        status: item.status,
        mulai: item.tanggalMulai.toISOString().split('T')[0],
        ortu: item.siswa?.namaOrtu || item.namaOrtu,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
