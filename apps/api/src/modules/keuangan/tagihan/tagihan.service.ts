
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
            OR: search ? [
                { kode: { contains: search, mode: 'insensitive' } },
                { siswa: { namaLengkap: { contains: search, mode: 'insensitive' } } },
                { siswa: { nis: { contains: search, mode: 'insensitive' } } },
            ] : undefined,
            rombelSnapshot: rombelId ? { contains: rombelId } : undefined, // Actually rombelId in query might need to match rombelId of student
            periode: periode || undefined,
            status: status || undefined,
        };

        // If rombelId is provided, we might want to filter by the current rombel of the student too
        if (rombelId) {
            where.siswa = { rombelId };
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
                orderBy: { tanggalTagihan: 'desc' },
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

    /**
     * Get a summary of all billing runs (grouped by period)
     */
    static async getSummary() {
        const result = await prisma.tagihan.groupBy({
            by: ['periode'],
            _count: {
                _all: true,
                status: true
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

        // Get status breakdown per period
        const periods = result.map(p => p.periode);
        const unpaidCounts = await prisma.tagihan.groupBy({
            by: ['periode'],
            where: { status: 'UNPAID', periode: { in: periods } },
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

    /**
     * Core Billing Engine
     * Generates invoices for a specific period (Month/Year) for selected students.
     */
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

        // 1. Fetch Candidates (Jenis Pembayaran)
        const targetJPs = await prisma.jenisPembayaran.findMany({
            where: {
                isAktif: true,
                OR: [
                    { id: { in: jenisPembayaranIds } },
                    {
                        AND: [
                            { sifat: 'WAJIB' as any }, // 'WAJIB'
                            { tipe: { in: ['BULANAN', 'HARIAN'] } }
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

        // Helper: Find Tariff
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
            const existing = await prisma.tagihan.findUnique({
                where: { siswaId_periode: { siswaId: siswa.id, periode } }
            });

            if (existing) return { status: 'skipped', siswa: siswa.namaLengkap };

            const items: any[] = [];
            let totalTagihan = 0;
            let totalDiskon = 0;

            // --- PROCESS SELECTED / MANDATORY PAYMENT TYPES ---
            for (const jp of targetJPs) {
                // Check Jenjang Restriction
                if (jp.jenjangIds.length > 0 && !jp.jenjangIds.includes(siswa.rombel.jenjangId)) {
                    continue;
                }

                let nominalAwal = 0;
                let namaItem = jp.nama;

                // Calculation Logic by Type
                if (jp.tipe === 'BULANAN') {
                    nominalAwal = getTarif(jp, siswa.rombel, siswa.jenisKelamin);

                    // Special proportional handling for TAB-WJB if it's set as BULANAN
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
                    // TAHUNAN / SEKALI / etc (not usually in mass generator, but we take default)
                    nominalAwal = getTarif(jp, siswa.rombel, siswa.jenisKelamin);
                }

                if (nominalAwal <= 0) continue;

                // Handle Discounts (Generic for any JP if Diskon exists)
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

            // --- EXTRA: PASTA (Still handled as extra because it's student-specific participation) ---
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
