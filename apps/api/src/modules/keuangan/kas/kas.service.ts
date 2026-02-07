import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../lib/error';
import {
    CreateKasInput,
    UpdateKasInput,
    KasirMasukInput,
    KasirKeluarInput,
    TransferKasInput,
    RekonsiliasiFisikInput,
    TransaksisKasQuery,
} from '@alizzah/validators';
import { Prisma, TipeKas, TipeTransaksiKas, PrismaClient } from '@prisma/client';

const { Decimal } = Prisma;

// Type aliases
type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
type DecimalType = typeof Decimal.prototype;

export class KasService {
    // ==================== KAS ACCOUNT MANAGEMENT ====================

    /**
     * Create a new Kas (cash account)
     */
    static async createKas(input: CreateKasInput) {
        // Check if kas with same tipe already exists
        const existing = await prisma.kas.findFirst({
            where: { tipe: input.tipe as TipeKas }
        });

        if (existing) {
            throw new AppError(`Kas dengan tipe ${input.tipe} sudah ada`, 400);
        }

        return await prisma.kas.create({
            data: {
                tipe: input.tipe as TipeKas,
                nama: input.nama,
                saldo: input.saldoAwal || 0,
            }
        });
    }

    /**
     * Update Kas name (not saldo - that's managed by transactions)
     */
    static async updateKas(id: string, input: UpdateKasInput) {
        const kas = await prisma.kas.findUnique({ where: { id } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        return await prisma.kas.update({
            where: { id },
            data: { nama: input.nama }
        });
    }

    /**
     * Get all Kas accounts
     */
    static async findAllKas() {
        return await prisma.kas.findMany({
            orderBy: { tipe: 'asc' }
        });
    }

    /**
     * Get Kas by ID with recent transactions
     */
    static async getKasById(id: string) {
        const kas = await prisma.kas.findUnique({
            where: { id },
            include: {
                transaksis: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdByUser: { select: { namaLengkap: true } },
                        posPengeluaran: { select: { nama: true } },
                        sumberDana: { select: { nama: true } },
                        transferKeKas: { select: { nama: true, tipe: true } }
                    }
                }
            }
        });

        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        return kas;
    }

    /**
     * Get Kas summary (totals for both accounts)
     */
    static async getKasSummary() {
        const allKas = await prisma.kas.findMany({
            include: {
                _count: { select: { transaksis: true } }
            }
        });

        const kasUtama = allKas.find(k => k.tipe === 'KAS');
        const berangkas = allKas.find(k => k.tipe === 'BERANGKAS');

        // Get today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await prisma.transaksiKas.groupBy({
            by: ['kasId', 'tipeTransaksi'],
            where: {
                createdAt: { gte: today }
            },
            _sum: { nominal: true },
            _count: true
        });

        return {
            kasUtama: {
                id: kasUtama?.id,
                nama: kasUtama?.nama || 'Kas Utama',
                saldo: kasUtama?.saldo?.toNumber() || 0,
                jumlahTransaksi: kasUtama?._count.transaksis || 0
            },
            berangkas: {
                id: berangkas?.id,
                nama: berangkas?.nama || 'Berangkas',
                saldo: berangkas?.saldo?.toNumber() || 0,
                jumlahTransaksi: berangkas?._count.transaksis || 0
            },
            transaksiHariIni: todayTransactions.map(t => ({
                kasId: t.kasId,
                tipe: t.tipeTransaksi,
                total: t._sum.nominal?.toNumber() || 0,
                count: t._count
            }))
        };
    }

    // ==================== TRANSACTION OPERATIONS ====================

    /**
     * Cash In - Record incoming cash (not from student payments)
     */
    static async kasirMasuk(input: KasirMasukInput, createdBy: string) {
        const kas = await prisma.kas.findUnique({ where: { id: input.kasId } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        return await prisma.$transaction(async (tx) => {
            const nominal = new Decimal(input.nominal);

            // Create transaction record
            const transaksi = await tx.transaksiKas.create({
                data: {
                    kasId: input.kasId,
                    tipeTransaksi: 'MASUK',
                    nominal: nominal,
                    sumberDanaId: input.sumberDanaId,
                    keterangan: input.keterangan,
                    bukti: input.bukti,
                    createdBy
                },
                include: {
                    kas: true,
                    sumberDana: { select: { nama: true } },
                    createdByUser: { select: { namaLengkap: true } }
                }
            });

            // Update kas saldo
            await tx.kas.update({
                where: { id: input.kasId },
                data: {
                    saldo: kas.saldo.add(nominal)
                }
            });

            return transaksi;
        });
    }

    /**
     * Cash Out - Record outgoing cash (expenses)
     */
    static async kasirKeluar(input: KasirKeluarInput, createdBy: string) {
        const kas = await prisma.kas.findUnique({ where: { id: input.kasId } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        const nominal = new Decimal(input.nominal);

        // Check sufficient balance
        if (kas.saldo.lt(nominal)) {
            throw new AppError(
                `Saldo ${kas.nama} tidak mencukupi. Saldo saat ini: Rp ${kas.saldo.toNumber().toLocaleString('id-ID')}`,
                400
            );
        }

        // Verify pos pengeluaran exists
        const posPengeluaran = await prisma.posPengeluaran.findUnique({
            where: { id: input.posPengeluaranId }
        });
        if (!posPengeluaran) {
            throw new AppError('Pos pengeluaran tidak ditemukan', 404);
        }

        // Auto-map sumberDanaId from Pos Pengeluaran priority if not provided
        const finalSumberDanaId = input.sumberDanaId || posPengeluaran.prioritasSumberDanaId;

        return await prisma.$transaction(async (tx) => {
            // Create transaction record
            const transaksi = await tx.transaksiKas.create({
                data: {
                    kasId: input.kasId,
                    tipeTransaksi: 'KELUAR',
                    nominal: nominal,
                    posPengeluaranId: input.posPengeluaranId,
                    sumberDanaId: finalSumberDanaId,
                    keterangan: input.keterangan,
                    bukti: input.bukti,
                    createdBy
                },
                include: {
                    kas: true,
                    posPengeluaran: { select: { nama: true } },
                    sumberDana: { select: { nama: true } },
                    createdByUser: { select: { namaLengkap: true } }
                }
            });

            // Update kas saldo
            await tx.kas.update({
                where: { id: input.kasId },
                data: {
                    saldo: kas.saldo.sub(nominal)
                }
            });

            return transaksi;
        });
    }

    /**
     * Transfer between Kas and Berangkas (Double-Entry Bookkeeping)
     */
    static async transferKas(input: TransferKasInput, createdBy: string) {
        if (input.dariKasId === input.keKasId) {
            throw new AppError('Tidak dapat transfer ke kas yang sama', 400);
        }

        const [dariKas, keKas] = await Promise.all([
            prisma.kas.findUnique({ where: { id: input.dariKasId } }),
            prisma.kas.findUnique({ where: { id: input.keKasId } })
        ]);

        if (!dariKas) {
            throw new AppError('Kas asal tidak ditemukan', 404);
        }
        if (!keKas) {
            throw new AppError('Kas tujuan tidak ditemukan', 404);
        }

        const nominal = new Decimal(input.nominal);

        // Check sufficient balance
        if (dariKas.saldo.lt(nominal)) {
            throw new AppError(
                `Saldo ${dariKas.nama} tidak mencukupi. Saldo saat ini: Rp ${dariKas.saldo.toNumber().toLocaleString('id-ID')}`,
                400
            );
        }

        return await prisma.$transaction(async (tx) => {
            const keterangan = input.keterangan || `Transfer dari ${dariKas.nama} ke ${keKas.nama}`;

            // Create outgoing transaction from source
            const transaksiKeluar = await tx.transaksiKas.create({
                data: {
                    kasId: input.dariKasId,
                    tipeTransaksi: 'TRANSFER',
                    nominal: nominal,
                    transferKeKasId: input.keKasId,
                    keterangan: keterangan,
                    createdBy
                }
            });

            // Create incoming transaction to destination
            const transaksiMasuk = await tx.transaksiKas.create({
                data: {
                    kasId: input.keKasId,
                    tipeTransaksi: 'TRANSFER',
                    nominal: nominal,
                    referensiId: transaksiKeluar.id,
                    referensiTipe: 'TRANSFER_MASUK',
                    keterangan: keterangan,
                    createdBy
                }
            });

            // Update both kas saldo
            await tx.kas.update({
                where: { id: input.dariKasId },
                data: { saldo: dariKas.saldo.sub(nominal) }
            });

            await tx.kas.update({
                where: { id: input.keKasId },
                data: { saldo: keKas.saldo.add(nominal) }
            });

            return {
                transaksiKeluar,
                transaksiMasuk,
                dariKas: { id: dariKas.id, nama: dariKas.nama, saldoBaru: dariKas.saldo.sub(nominal).toNumber() },
                keKas: { id: keKas.id, nama: keKas.nama, saldoBaru: keKas.saldo.add(nominal).toNumber() }
            };
        });
    }

    /**
     * Record cash from payment - Called from Payment Service
     */
    static async recordPaymentCash(
        tx: TransactionClient,
        kasId: string,
        nominal: DecimalType,
        pembayaranId: string,
        keterangan: string,
        createdBy: string
    ) {
        const kas = await tx.kas.findUnique({ where: { id: kasId } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan untuk pembayaran', 404);
        }

        // Create transaction record linked to pembayaran
        await tx.transaksiKas.create({
            data: {
                kasId: kasId,
                tipeTransaksi: 'MASUK',
                nominal: nominal,
                referensiId: pembayaranId,
                referensiTipe: 'PEMBAYARAN',
                keterangan: keterangan,
                createdBy
            }
        });

        // Update kas saldo
        await tx.kas.update({
            where: { id: kasId },
            data: {
                saldo: kas.saldo.add(nominal)
            }
        });
    }

    // ==================== TRANSACTION LISTING ====================

    /**
     * List transactions with filters
     */
    static async findAllTransaksi(params: TransaksisKasQuery) {
        const { kasId, tipeTransaksi, tanggalMulai, tanggalSelesai, search, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const where = {
            kasId: kasId || undefined,
            tipeTransaksi: tipeTransaksi as TipeTransaksiKas || undefined,
            createdAt: {
                gte: tanggalMulai || undefined,
                lte: tanggalSelesai || undefined
            },
            keterangan: search ? { contains: search, mode: 'insensitive' as const } : undefined
        };

        const [data, total] = await Promise.all([
            prisma.transaksiKas.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    kas: { select: { nama: true, tipe: true } },
                    posPengeluaran: { select: { nama: true, kode: true } },
                    sumberDana: { select: { nama: true, kode: true } },
                    transferKeKas: { select: { nama: true, tipe: true } },
                    createdByUser: { select: { namaLengkap: true } }
                }
            }),
            prisma.transaksiKas.count({ where })
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    // ==================== DAILY RECONCILIATION ====================

    /**
     * Get daily reconciliation data
     */
    static async getDailyReconciliation(kasId: string, tanggal: Date) {
        const kas = await prisma.kas.findUnique({ where: { id: kasId } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        const startOfDay = new Date(tanggal);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(tanggal);
        endOfDay.setHours(23, 59, 59, 999);

        // Get all transactions for the day
        const transaksis = await prisma.transaksiKas.findMany({
            where: {
                kasId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            orderBy: { createdAt: 'asc' },
            include: {
                posPengeluaran: { select: { nama: true } },
                sumberDana: { select: { nama: true } },
                createdByUser: { select: { namaLengkap: true } }
            }
        });

        // Calculate totals
        let totalMasuk = new Decimal(0);
        let totalKeluar = new Decimal(0);
        let totalTransferMasuk = new Decimal(0);
        let totalTransferKeluar = new Decimal(0);

        for (const t of transaksis) {
            if (t.tipeTransaksi === 'MASUK') {
                totalMasuk = totalMasuk.add(t.nominal);
            } else if (t.tipeTransaksi === 'KELUAR') {
                totalKeluar = totalKeluar.add(t.nominal);
            } else if (t.tipeTransaksi === 'TRANSFER') {
                if (t.transferKeKasId) {
                    totalTransferKeluar = totalTransferKeluar.add(t.nominal);
                } else {
                    totalTransferMasuk = totalTransferMasuk.add(t.nominal);
                }
            }
        }

        return {
            kas: { id: kas.id, nama: kas.nama, tipe: kas.tipe },
            tanggal: tanggal.toISOString().split('T')[0],
            saldoSistem: kas.saldo.toNumber(),
            ringkasan: {
                totalMasuk: totalMasuk.toNumber(),
                totalKeluar: totalKeluar.toNumber(),
                totalTransferMasuk: totalTransferMasuk.toNumber(),
                totalTransferKeluar: totalTransferKeluar.toNumber(),
                netFlow: totalMasuk.sub(totalKeluar).add(totalTransferMasuk).sub(totalTransferKeluar).toNumber()
            },
            transaksis: transaksis.map(t => ({
                id: t.id,
                tipe: t.tipeTransaksi,
                nominal: t.nominal.toNumber(),
                keterangan: t.keterangan,
                posPengeluaran: t.posPengeluaran?.nama,
                sumberDana: t.sumberDana?.nama,
                createdBy: t.createdByUser.namaLengkap,
                createdAt: t.createdAt
            })),
            jumlahTransaksi: transaksis.length
        };
    }

    /**
     * Submit physical cash reconciliation (closing)
     */
    static async submitRekonsiliasi(input: RekonsiliasiFisikInput, createdBy: string) {
        const kas = await prisma.kas.findUnique({ where: { id: input.kasId } });
        if (!kas) {
            throw new AppError('Kas tidak ditemukan', 404);
        }

        const saldoSistem = kas.saldo.toNumber();
        const selisih = input.saldoFisik - saldoSistem;
        const isMatch = Math.abs(selisih) < 0.01; // Allow tiny floating point differences

        // If there's a difference, we could optionally create an adjustment transaction
        let adjustmentTransaksi = null;
        if (!isMatch && Math.abs(selisih) > 0) {
            adjustmentTransaksi = await prisma.$transaction(async (tx) => {
                const transaksi = await tx.transaksiKas.create({
                    data: {
                        kasId: input.kasId,
                        tipeTransaksi: selisih > 0 ? 'MASUK' : 'KELUAR',
                        nominal: Math.abs(selisih),
                        kategori: 'PENYESUAIAN',
                        keterangan: `Penyesuaian rekonsiliasi ${input.tanggal.toISOString().split('T')[0]}: ${input.catatan || 'Selisih saldo fisik vs sistem'}`,
                        createdBy
                    }
                });

                await tx.kas.update({
                    where: { id: input.kasId },
                    data: { saldo: input.saldoFisik }
                });

                return transaksi;
            });
        }

        return {
            kas: { id: kas.id, nama: kas.nama, tipe: kas.tipe },
            tanggal: input.tanggal,
            saldoSistem,
            saldoFisik: input.saldoFisik,
            selisih,
            isMatch,
            adjustmentTransaksi,
            catatan: input.catatan
        };
    }
}
