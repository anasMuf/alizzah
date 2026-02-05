
import { prisma } from '../../../lib/prisma';
import { GenerateTagihanInput } from '@alizzah/validators';
import { DiskonService } from '../master/diskon/diskon.service';

export class TagihanService {

    static async findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        rombelId?: string;
        periode?: string;
        status?: string;
    }) {
        const { page = 1, limit = 10, search, rombelId, periode, status } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            periode: periode || undefined,
        };

        if (status) {
            if (status === 'UNPAID') {
                where.status = { in: ['UNPAID', 'DUE', 'OVERDUE'] };
            } else {
                where.status = status;
            }
        }

        const orConditions: any[] = [];
        if (search) {
            orConditions.push(
                { kode: { contains: search, mode: 'insensitive' } },
                { siswa: { namaLengkap: { contains: search, mode: 'insensitive' } } },
                { siswa: { nis: { contains: search, mode: 'insensitive' } } },
            );
        }

        if (orConditions.length > 0) {
            where.OR = orConditions;
        }

        if (rombelId) {
            where.siswa = {
                ...(where.siswa || {}),
                rombelId
            };
        }

        const [data, total] = await Promise.all([
            prisma.tagihan.findMany({
                where,
                include: {
                    siswa: {
                        select: { id: true, namaLengkap: true, nis: true, rombel: true }
                    },
                    tagihanItems: true
                },
                orderBy: [
                    { tanggalTagihan: 'desc' },
                    { id: 'asc' }
                ],
                skip,
                take: limit
            }),
            prisma.tagihan.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getSummary(params: { search?: string, tahunAjaranId?: string }) {
        const { search, tahunAjaranId } = params;

        let periodeIn: string[] | undefined = undefined;

        if (tahunAjaranId) {
            const ta = await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } });
            if (ta) {
                const start = new Date(ta.tanggalMulai);
                const end = new Date(ta.tanggalSelesai);
                periodeIn = [];
                let curr = new Date(start.getFullYear(), start.getMonth(), 1);
                while (curr <= end) {
                    periodeIn.push(`${curr.getFullYear()}-${(curr.getMonth() + 1).toString().padStart(2, '0')}`);
                    curr.setMonth(curr.getMonth() + 1);
                }
            }
        }

        const where: any = {
            periode: periodeIn ? { in: periodeIn } : undefined,
            OR: search ? [
                { periode: { contains: search } },
                { kode: { contains: search, mode: 'insensitive' } }
            ] : undefined
        };

        const result = await prisma.tagihan.groupBy({
            by: ['periode'],
            where,
            _count: {
                _all: true,
            },
            _sum: {
                totalTagihan: true,
                totalBayar: true,
                sisaTagihan: true
            },
            orderBy: {
                periode: 'desc'
            }
        });

        const periods = result.map(p => p.periode);
        const unpaidCounts = await prisma.tagihan.groupBy({
            by: ['periode'],
            where: {
                status: { not: 'PAID' },
                sisaTagihan: { gt: 0 },
                periode: { in: periods }
            },
            _count: true
        });

        return result.map(p => {
            const unpaid = unpaidCounts.find(u => u.periode === p.periode)?._count || 0;
            return {
                periode: p.periode,
                totalStudents: p._count._all,
                totalBilled: Number(p._sum.totalTagihan || 0),
                totalPaid: Number(p._sum.totalBayar || 0),
                totalOutstanding: Number(p._sum.sisaTagihan || 0),
                unpaidCount: unpaid,
                isCompleted: unpaid === 0
            };
        });
    }

    static async generate(data: GenerateTagihanInput) {
        const {
            bulan, tahun,
            jumlahHariEfektif, jumlahSenin,
            jenjangId, rombelId, siswaIds,
            jenisPembayaranIds
        } = data;

        const periode = `${tahun}-${bulan.toString().padStart(2, '0')}`;
        const tanggalTagihan = new Date(tahun, bulan - 1, 1);
        const jatuhTempo = new Date(tahun, bulan - 1, 10);

        // Fetch academic year for this period
        const currentTA = await prisma.tahunAjaran.findFirst({
            where: {
                tanggalMulai: { lte: tanggalTagihan },
                tanggalSelesai: { gte: tanggalTagihan }
            }
        });

        if (!currentTA) throw new Error('Tahun Ajaran tidak ditemukan untuk periode ini.');

        // Start of academic year check
        const isStartOfAcademicYear = currentTA.tanggalMulai.getMonth() === (bulan - 1) &&
            currentTA.tanggalMulai.getFullYear() === tahun;

        // 1. Fetch Candidates (Jenis Pembayaran)
        const targetJPs = await prisma.jenisPembayaran.findMany({
            where: {
                isAktif: true,
                OR: [
                    { id: { in: jenisPembayaranIds } },
                    {
                        AND: [
                            { sifat: 'WAJIB' as any },
                            {
                                OR: [
                                    { tipe: { in: ['BULANAN', 'HARIAN'] } },
                                    { pemicu: { in: ['OTOMATIS_SISWA_BARU', 'OTOMATIS_AWAL_TAHUN'] } }
                                ]
                            }
                        ]
                    }
                ]
            },
            include: { tarifs: true }
        });

        // 2. Fetch Active Students
        const students = await prisma.siswa.findMany({
            where: {
                status: 'AKTIF',
                rombelId: rombelId || undefined,
                rombel: {
                    jenjangId: jenjangId || undefined
                },
                id: siswaIds ? { in: siswaIds } : undefined
            },
            include: {
                rombel: { include: { jenjang: true } },
                siswaPastas: { include: { pasta: true } }
            }
        });

        if (students.length === 0) throw new Error('Tidak ada siswa aktif yang ditemukan.');

        const getTarif = (jp: any, rombel: any, gender: any) => {
            const t1 = jp.tarifs.find((t: any) =>
                t.jenjangId === rombel.jenjangId &&
                t.jenisKelamin === gender &&
                t.tahunAjaranId === rombel.tahunAjaranId
            );
            if (t1) return Number(t1.nominal);

            const t2 = jp.tarifs.find((t: any) =>
                t.jenjangId === rombel.jenjangId &&
                t.jenisKelamin === null &&
                t.tahunAjaranId === rombel.tahunAjaranId
            );
            if (t2) return Number(t2.nominal);

            return Number(jp.nominalDefault);
        };

        const results = await Promise.allSettled(students.map(async (siswa: any) => {
            const existingTagihan = await prisma.tagihan.findUnique({
                where: { siswaId_periode: { siswaId: siswa.id, periode } }
            });

            if (existingTagihan) return { status: 'skipped', siswa: siswa.namaLengkap };

            const items: any[] = [];
            let totalTagihan = 0;
            let totalDiskon = 0;

            for (const jp of targetJPs) {
                // Check Jenjang Restriction
                if (jp.jenjangIds.length > 0 && !jp.jenjangIds.includes(siswa.rombel.jenjangId)) {
                    continue;
                }

                // --- ATTRIBUTE-DRIVEN LOGIC ---

                // A. Initial Education / New Student Logic (BAP etc)
                if (jp.pemicu === 'OTOMATIS_SISWA_BARU') {
                    const isEligibleForInitialFee =
                        siswa.rombel.jenjang.isLevelAwal ||
                        siswa.rombel.isMutasi ||
                        siswa.isMutasi ||
                        (new Date(siswa.tanggalMasuk) >= currentTA.tanggalMulai);

                    if (isEligibleForInitialFee) {
                        const alreadyBilledOnce = await prisma.tagihanItem.findFirst({
                            where: { tagihan: { siswaId: siswa.id }, jenisPembayaranId: jp.id }
                        });
                        if (alreadyBilledOnce) continue;
                    } else {
                        continue;
                    }
                }

                // B. Yearly Registration Logic (REG-TAHUNAN etc)
                if (jp.pemicu === 'OTOMATIS_AWAL_TAHUN') {
                    const alreadyBilledThisYear = await prisma.tagihanItem.findFirst({
                        where: {
                            tagihan: {
                                siswaId: siswa.id,
                                periode: {
                                    gte: currentTA.tanggalMulai.toISOString().substring(0, 7),
                                    lte: currentTA.tanggalSelesai.toISOString().substring(0, 7)
                                }
                            },
                            jenisPembayaranId: jp.id
                        }
                    });

                    if (alreadyBilledThisYear) continue;

                    const isEligibleForYearlyNow =
                        isStartOfAcademicYear ||
                        siswa.isMutasi ||
                        siswa.rombel.isMutasi ||
                        (new Date(siswa.tanggalMasuk) >= new Date(tahun, bulan - 1, 1));

                    if (!isEligibleForYearlyNow) continue;
                }

                let nominalAwal = 0;
                let namaItem = jp.nama;

                if (jp.tipe === 'BULANAN') {
                    nominalAwal = getTarif(jp, siswa.rombel, siswa.jenisKelamin);
                    if (jp.kode === 'TAB-WJB' && jumlahSenin > 0) {
                        nominalAwal *= jumlahSenin;
                        namaItem = `${jp.nama} (${jumlahSenin} Senin)`;
                    } else {
                        namaItem = `${jp.nama} Bulan ${bulan}/${tahun}`;
                    }
                } else if (jp.tipe === 'HARIAN') {
                    const tarif = getTarif(jp, siswa.rombel, siswa.jenisKelamin);
                    nominalAwal = tarif * (jumlahHariEfektif || 0);
                    namaItem = `${jp.nama} (${jumlahHariEfektif} Hari)`;
                } else {
                    nominalAwal = getTarif(jp, siswa.rombel, siswa.jenisKelamin);
                }

                if (nominalAwal <= 0) continue;

                const activeDiscounts = await DiskonService.getActiveDiscounts(siswa.id, jp.id, tanggalTagihan);
                let discountAmount = 0;
                let nominalSetelahDiskon = nominalAwal;

                for (const ad of activeDiscounts) {
                    let pot = 0;
                    if (ad.diskon.tipePotongan === 'PERSENTASE') {
                        pot = nominalSetelahDiskon * (Number(ad.diskon.nilaiPotongan) / 100);
                    } else {
                        pot = Number(ad.diskon.nilaiPotongan);
                    }
                    discountAmount += pot;
                    nominalSetelahDiskon -= pot;
                    if (nominalSetelahDiskon < 0) nominalSetelahDiskon = 0;
                }

                items.push({
                    jenisPembayaranId: jp.id,
                    namaItem,
                    nominalAwal,
                    nominalDiskon: discountAmount,
                    nominalAkhir: nominalSetelahDiskon
                });

                totalTagihan += nominalAwal;
                totalDiskon += discountAmount;
            }

            if (siswa.siswaPastas.length > 0) {
                const pastaJp = await prisma.jenisPembayaran.findFirst({
                    where: { kode: 'PASTA', isAktif: true }
                });

                if (pastaJp) {
                    for (const sp of siswa.siswaPastas) {
                        const biaya = Number(sp.pasta.biaya);
                        items.push({
                            jenisPembayaranId: pastaJp.id,
                            namaItem: `PASTA: ${sp.pasta.nama}`,
                            nominalAwal: biaya,
                            nominalDiskon: 0,
                            nominalAkhir: biaya
                        });
                        totalTagihan += biaya;
                    }
                }
            }

            const sisaTagihan = totalTagihan - totalDiskon;
            const kode = `INV/${periode.replace('-', '')}/${siswa.nis}`;

            if (items.length === 0) return { status: 'skipped', siswa: siswa.namaLengkap, reason: 'No items to bill' };

            await prisma.tagihan.create({
                data: {
                    kode,
                    siswaId: siswa.id,
                    periode,
                    rombelSnapshot: siswa.rombel.nama,
                    jenjangSnapshot: siswa.rombel.jenjang.nama,
                    tanggalTagihan,
                    jatuhTempo,
                    totalTagihan,
                    totalDiskon,
                    sisaTagihan,
                    totalBayar: 0,
                    status: 'UNPAID',
                    tagihanItems: { create: items }
                }
            });

            return { status: 'created', siswa: siswa.namaLengkap };
        }));

        return results;
    }
}
