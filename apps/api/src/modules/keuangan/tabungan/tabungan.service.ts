import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../lib/error';
import { SetorTabunganInput, TarikTabunganInput, TABUNGAN_ADMIN_FEE_PERCENT } from '@alizzah/validators';
import { Prisma, JenisTabungan, PrismaClient } from '@prisma/client';

const { Decimal } = Prisma;

// Type aliases
type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
type DecimalType = typeof Decimal.prototype;

export class TabunganService {
    /**
     * Get or Create Tabungan for a student
     */
    static async getOrCreateTabungan(
        tx: TransactionClient,
        siswaId: string,
        jenis: JenisTabungan
    ) {
        let tabungan = await tx.tabungan.findUnique({
            where: { siswaId_jenis: { siswaId, jenis } }
        });

        if (!tabungan) {
            tabungan = await tx.tabungan.create({
                data: {
                    siswaId,
                    jenis,
                    saldo: 0
                }
            });
        }

        return tabungan;
    }

    /**
     * Setor Tabungan - Deposit to savings
     */
    static async setor(input: SetorTabunganInput, createdBy: string) {
        return await prisma.$transaction(async (tx) => {
            // Get or create tabungan
            const tabungan = await this.getOrCreateTabungan(tx, input.siswaId, input.jenis as JenisTabungan);

            const nominal = new Decimal(input.nominal);

            // Create transaction record
            await tx.transaksiTabungan.create({
                data: {
                    tabunganId: tabungan.id,
                    tipe: 'SETOR',
                    nominal: nominal,
                    potonganAdmin: 0,
                    nominalBersih: nominal,
                    keterangan: input.keterangan || 'Setoran manual',
                    createdBy
                }
            });

            // Update saldo
            const updated = await tx.tabungan.update({
                where: { id: tabungan.id },
                data: {
                    saldo: tabungan.saldo.add(nominal)
                },
                include: {
                    siswa: {
                        select: { namaLengkap: true, nis: true }
                    }
                }
            });

            return updated;
        });
    }

    /**
     * Setor from Overpayment - Called from Payment Service
     * This uses the existing transaction context
     */
    static async setorFromOverpayment(
        tx: TransactionClient,
        siswaId: string,
        nominal: DecimalType,
        createdBy: string,
        keterangan?: string
    ) {
        return this.setorFromPayment(tx, siswaId, 'UMUM', nominal, createdBy, keterangan || 'Kelebihan pembayaran');
    }

    /**
     * Setor from Payment - Called from Payment Service for any savings type
     * This uses the existing transaction context
     */
    static async setorFromPayment(
        tx: TransactionClient,
        siswaId: string,
        jenis: JenisTabungan,
        nominal: DecimalType,
        createdBy: string,
        keterangan?: string
    ) {
        const tabungan = await this.getOrCreateTabungan(tx, siswaId, jenis);

        // Create transaction record
        await tx.transaksiTabungan.create({
            data: {
                tabunganId: tabungan.id,
                tipe: 'SETOR',
                nominal: nominal,
                potonganAdmin: 0,
                nominalBersih: nominal,
                keterangan: keterangan || `Setoran ${jenis === 'UMUM' ? 'Tabungan Umum' : 'Tabungan Wajib Berlian'}`,
                createdBy
            }
        });

        // Update saldo
        await tx.tabungan.update({
            where: { id: tabungan.id },
            data: {
                saldo: tabungan.saldo.add(nominal)
            }
        });

        return tabungan;
    }

    /**
     * Tarik Tabungan - Withdraw from savings (only UMUM with 2.5% fee)
     */
    static async tarik(input: TarikTabunganInput, createdBy: string) {
        return await prisma.$transaction(async (tx) => {
            // Only UMUM can be withdrawn
            const tabungan = await tx.tabungan.findUnique({
                where: { siswaId_jenis: { siswaId: input.siswaId, jenis: 'UMUM' } },
                include: { siswa: { select: { namaLengkap: true, nis: true } } }
            });

            if (!tabungan) {
                throw new AppError('Tabungan Umum tidak ditemukan untuk siswa ini', 404);
            }

            const nominal = new Decimal(input.nominal);
            const potonganAdmin = nominal.mul(TABUNGAN_ADMIN_FEE_PERCENT).div(100);
            const nominalBersih = nominal.sub(potonganAdmin);

            // Check sufficient balance
            if (tabungan.saldo.lt(nominal)) {
                throw new AppError(`Saldo tidak mencukupi. Saldo saat ini: Rp ${tabungan.saldo.toNumber().toLocaleString('id-ID')}`, 400);
            }

            // Create transaction record
            await tx.transaksiTabungan.create({
                data: {
                    tabunganId: tabungan.id,
                    tipe: 'TARIK',
                    nominal: nominal,
                    potonganAdmin: potonganAdmin,
                    nominalBersih: nominalBersih,
                    keterangan: input.keterangan || `Penarikan (Potongan Admin ${TABUNGAN_ADMIN_FEE_PERCENT}%)`,
                    createdBy
                }
            });

            // Update saldo (reduce by total nominal, not net)
            const updated = await tx.tabungan.update({
                where: { id: tabungan.id },
                data: {
                    saldo: tabungan.saldo.sub(nominal)
                },
                include: {
                    siswa: {
                        select: { namaLengkap: true, nis: true }
                    }
                }
            });

            return {
                ...updated,
                penarikan: {
                    nominal: nominal.toNumber(),
                    potonganAdmin: potonganAdmin.toNumber(),
                    diterima: nominalBersih.toNumber()
                }
            };
        });
    }

    /**
     * Get Tabungan by Siswa
     */
    static async getBySiswa(siswaId: string) {
        const tabungans = await prisma.tabungan.findMany({
            where: { siswaId },
            include: {
                siswa: {
                    select: { namaLengkap: true, nis: true }
                },
                transaksis: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        createdByUser: { select: { namaLengkap: true } }
                    }
                }
            }
        });

        return tabungans;
    }

    /**
     * Get Tabungan Detail with all transactions
     */
    static async getById(id: string) {
        const tabungan = await prisma.tabungan.findUnique({
            where: { id },
            include: {
                siswa: {
                    select: { namaLengkap: true, nis: true }
                },
                transaksis: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdByUser: { select: { namaLengkap: true } }
                    }
                }
            }
        });

        if (!tabungan) {
            throw new AppError('Tabungan tidak ditemukan', 404);
        }

        return tabungan;
    }

    /**
     * Get Transaksi Tabungan with pagination
     */
    static async getTransaksi(tabunganId: string, params: { page?: number; limit?: number }) {
        const { page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            prisma.transaksiTabungan.findMany({
                where: { tabunganId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    createdByUser: { select: { namaLengkap: true } }
                }
            }),
            prisma.transaksiTabungan.count({ where: { tabunganId } })
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * List all Tabungan with filters
     */
    static async findAll(params: {
        page?: number;
        limit?: number;
        jenis?: JenisTabungan;
        search?: string;
    }) {
        const { page = 1, limit = 20, jenis, search } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            jenis: jenis || undefined,
            siswa: search ? {
                OR: [
                    { namaLengkap: { contains: search, mode: 'insensitive' } },
                    { nis: { contains: search, mode: 'insensitive' } }
                ]
            } : undefined
        };

        const [data, total] = await Promise.all([
            prisma.tabungan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    siswa: {
                        select: {
                            namaLengkap: true,
                            nis: true,
                            rombel: {
                                select: { nama: true, jenjang: { select: { kode: true } } }
                            }
                        }
                    }
                }
            }),
            prisma.tabungan.count({ where })
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get summary statistics for tabungan
     */
    static async getSummary() {
        const [umum, wajib] = await Promise.all([
            prisma.tabungan.aggregate({
                where: { jenis: 'UMUM' },
                _sum: { saldo: true },
                _count: true
            }),
            prisma.tabungan.aggregate({
                where: { jenis: 'WAJIB_BERLIAN' },
                _sum: { saldo: true },
                _count: true
            })
        ]);

        return {
            tabunganUmum: {
                totalSaldo: umum._sum.saldo?.toNumber() || 0,
                jumlahAkun: umum._count
            },
            tabunganWajib: {
                totalSaldo: wajib._sum.saldo?.toNumber() || 0,
                jumlahAkun: wajib._count
            }
        };
    }
}
