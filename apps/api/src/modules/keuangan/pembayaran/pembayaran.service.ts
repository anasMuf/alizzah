import { prisma } from '../../../lib/prisma';
import { CreatePembayaranInput } from '@alizzah/validators';
import { Prisma } from '@alizzah/db';

const { Decimal } = Prisma;

export class PembayaranService {
    static async create(input: CreatePembayaranInput, kasirId: string) {
        return await prisma.$transaction(async (tx) => {
            // 1. Generate Payment Code
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const count = await tx.pembayaran.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    }
                }
            });
            const kode = `PAY-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

            // 2. Create Payment Record
            const pembayaran = await tx.pembayaran.create({
                data: {
                    kode,
                    siswaId: input.siswaId,
                    tanggal: input.tanggal,
                    totalBayar: input.totalBayar,
                    metode: input.metode,
                    bankId: input.bankId,
                    buktiTransfer: input.buktiTransfer,
                    catatan: input.catatan,
                    kasirId: kasirId,
                }
            });

            // 2.5 Handle Additional Items (Optional/Incidental)
            if (input.additionalItems && input.additionalItems.length > 0) {
                const now = new Date();
                const periode = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

                // Get student's current Rombel info
                const siswa = await tx.siswa.findUnique({
                    where: { id: input.siswaId },
                    include: { rombel: { include: { jenjang: true } } }
                });

                if (!siswa) throw new Error('Siswa tidak ditemukan');
                if (!siswa.rombel) throw new Error('Siswa belum memiliki Rombel aktif');

                let tagihan = await tx.tagihan.findUnique({
                    where: { siswaId_periode: { siswaId: input.siswaId, periode } }
                });

                if (!tagihan) {
                    const tagihanCount = await tx.tagihan.count({
                        where: {
                            createdAt: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                                lt: new Date(new Date().setHours(23, 59, 59, 999)),
                            }
                        }
                    });
                    const tagihanKode = `INV-${dateStr}-${(tagihanCount + 1).toString().padStart(4, '0')}`;

                    tagihan = await tx.tagihan.create({
                        data: {
                            kode: tagihanKode,
                            siswaId: input.siswaId,
                            periode,
                            rombelSnapshot: siswa.rombel.nama,
                            jenjangSnapshot: siswa.rombel.jenjang.kode,
                            tanggalTagihan: now,
                            jatuhTempo: new Date(now.getFullYear(), now.getMonth(), 10),
                            totalTagihan: 0,
                            totalBayar: 0,
                            sisaTagihan: 0,
                            status: 'UNPAID'
                        }
                    });
                }

                for (const item of input.additionalItems) {
                    const jp = await tx.jenisPembayaran.findUnique({ where: { id: item.jenisPembayaranId } });
                    if (!jp) throw new Error(`Jenis Pembayaran tidak ditemukan`);

                    const nominal = new Decimal(item.nominal);

                    await tx.tagihanItem.create({
                        data: {
                            tagihanId: tagihan.id,
                            jenisPembayaranId: jp.id,
                            namaItem: jp.nama,
                            nominalAwal: nominal,
                            nominalAkhir: nominal,
                            nominalDiskon: 0,
                            catatan: item.catatan
                        }
                    });

                    // Update Tagihan Totals and ensure status is open
                    await tx.tagihan.update({
                        where: { id: tagihan.id },
                        data: {
                            totalTagihan: { increment: nominal },
                            sisaTagihan: { increment: nominal },
                            status: 'PARTIAL'
                        }
                    });
                }
            }

            // 3. FIFO Allocation Logic
            let remainingAmount = new Decimal(input.totalBayar);

            // Get all unpaid/partial tagihan for this student ordered by date (oldest first)
            const unpaidTagihan = await tx.tagihan.findMany({
                where: {
                    siswaId: input.siswaId,
                    status: { in: ['UNPAID', 'PARTIAL', 'DUE', 'OVERDUE'] },
                    sisaTagihan: { gt: 0 }
                },
                orderBy: { tanggalTagihan: 'asc' }
            });

            for (const tagihan of unpaidTagihan) {
                if (remainingAmount.lte(0)) break;

                const allocateAmount = Decimal.min(remainingAmount, tagihan.sisaTagihan);

                // Update Tagihan
                const newTotalBayar = tagihan.totalBayar.add(allocateAmount);
                const newSisaTagihan = tagihan.sisaTagihan.sub(allocateAmount);
                const newStatus = newSisaTagihan.lte(0) ? 'PAID' : 'PARTIAL';

                await tx.tagihan.update({
                    where: { id: tagihan.id },
                    data: {
                        totalBayar: newTotalBayar,
                        sisaTagihan: newSisaTagihan,
                        status: newStatus as any
                    }
                });

                // Create Allocation record
                await tx.pembayaranAlokasi.create({
                    data: {
                        pembayaranId: pembayaran.id,
                        tagihanId: tagihan.id,
                        nominalAlokasi: allocateAmount
                    }
                });

                remainingAmount = remainingAmount.sub(allocateAmount);
            }

            // 4. Update Cash Balance
            // Find or create default Kas (Bank or Cash)
            let targetKas = await tx.kas.findFirst({
                where: input.kasId ? { id: input.kasId } : { tipe: input.metode === 'TUNAI' ? 'KAS' : 'BERANGKAS' }
            });

            if (!targetKas) {
                targetKas = await tx.kas.create({
                    data: {
                        nama: input.metode === 'TUNAI' ? 'Kas Utama' : 'Bank Utama',
                        tipe: input.metode === 'TUNAI' ? 'KAS' : 'BERANGKAS',
                        saldo: 0
                    }
                });
            }

            await tx.kas.update({
                where: { id: targetKas.id },
                data: { saldo: targetKas.saldo.add(input.totalBayar) }
            });

            // 5. Create Transaksi Kas
            await tx.transaksiKas.create({
                data: {
                    kasId: targetKas.id,
                    tipeTransaksi: 'MASUK',
                    nominal: input.totalBayar,
                    keterangan: `Pembayaran Tagihan Siswa: ${pembayaran.kode}`,
                    referensiId: pembayaran.id,
                    referensiTipe: 'PEMBAYARAN',
                    createdBy: kasirId
                }
            });

            // 6. Handle Surplus (Optional / Future: Credit to Student Balance)
            // For now, if there's still remainingAmount, we might just log it or throw error?
            // Actually, usually it's better to allow it and put it in student's deposit.
            // But let's keep it simple for now as per Roadmap.

            // 7. Return Full Record with Inclusions for Receipt
            // Include tagihanItems to show details on receipt
            return await tx.pembayaran.findUnique({
                where: { id: pembayaran.id },
                include: {
                    siswa: {
                        include: {
                            rombel: true
                        }
                    },
                    kasir: { select: { namaLengkap: true } },
                    pembayaranAlokasis: {
                        include: {
                            tagihan: {
                                include: {
                                    tagihanItems: true
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    static async getStudentSummary(siswaId: string) {
        const [siswa, unpaidTagihan] = await Promise.all([
            prisma.siswa.findUnique({
                where: { id: siswaId },
                include: {
                    rombel: {
                        include: {
                            jenjang: true,
                            tahunAjaran: true
                        }
                    }
                }
            }),
            prisma.tagihan.findMany({
                where: {
                    siswaId,
                    status: { in: ['UNPAID', 'PARTIAL', 'DUE', 'OVERDUE'] },
                    sisaTagihan: { gt: 0 }
                },
                orderBy: { tanggalTagihan: 'asc' },
                include: {
                    tagihanItems: true
                }
            })
        ]);

        if (!siswa) throw new Error('Siswa tidak ditemukan');

        const totalDebt = unpaidTagihan.reduce((acc, curr) => acc.add(curr.sisaTagihan), new Decimal(0));

        return {
            siswa,
            totalDebt,
            unpaidTagihan
        };
    }

    static async findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        siswaId?: string;
    }) {
        const { page = 1, limit = 10, search, siswaId } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            siswaId: siswaId || undefined,
            OR: search ? [
                { kode: { contains: search, mode: 'insensitive' } },
                { siswa: { namaLengkap: { contains: search, mode: 'insensitive' } } }
            ] : undefined
        };

        const [data, total] = await Promise.all([
            prisma.pembayaran.findMany({
                where,
                include: {
                    siswa: { select: { namaLengkap: true, nis: true } },
                    kasir: { select: { namaLengkap: true } },
                    pembayaranAlokasis: {
                        include: {
                            tagihan: true
                        }
                    }
                },
                orderBy: { tanggal: 'desc' },
                skip,
                take: limit
            }),
            prisma.pembayaran.count({ where })
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }
}
