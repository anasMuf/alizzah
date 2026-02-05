import { prisma } from '../../../../lib/prisma';
import { AppError } from '../../../../lib/error';
import { CreatePosPengeluaranInput, UpdatePosPengeluaranInput } from '@alizzah/validators';

export class PosPengeluaranService {
    /**
     * Create a new Pos Pengeluaran (Expense Category)
     */
    static async create(input: CreatePosPengeluaranInput) {
        // Check if code already exists
        const existing = await prisma.posPengeluaran.findUnique({
            where: { kode: input.kode }
        });

        if (existing) {
            throw new AppError(`Pos pengeluaran dengan kode ${input.kode} sudah ada`, 400);
        }

        return await prisma.posPengeluaran.create({
            data: {
                kode: input.kode,
                nama: input.nama,
                prioritasSumberDanaId: input.prioritasSumberDanaId || null,
                keterangan: input.keterangan || null,
                isAktif: input.isAktif ?? true
            },
            include: {
                prioritasSumberDana: { select: { nama: true, kode: true } }
            }
        });
    }

    /**
     * Update Pos Pengeluaran
     */
    static async update(id: string, input: UpdatePosPengeluaranInput) {
        const existing = await prisma.posPengeluaran.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError('Pos pengeluaran tidak ditemukan', 404);
        }

        // Check code uniqueness if changing
        if (input.kode && input.kode !== existing.kode) {
            const codeExists = await prisma.posPengeluaran.findUnique({
                where: { kode: input.kode }
            });
            if (codeExists) {
                throw new AppError(`Pos pengeluaran dengan kode ${input.kode} sudah ada`, 400);
            }
        }

        return await prisma.posPengeluaran.update({
            where: { id },
            data: {
                kode: input.kode,
                nama: input.nama,
                prioritasSumberDanaId: input.prioritasSumberDanaId,
                keterangan: input.keterangan,
                isAktif: input.isAktif
            },
            include: {
                prioritasSumberDana: { select: { nama: true, kode: true } }
            }
        });
    }

    /**
     * Get by ID
     */
    static async getById(id: string) {
        const posPengeluaran = await prisma.posPengeluaran.findUnique({
            where: { id },
            include: {
                prioritasSumberDana: { select: { nama: true, kode: true } },
                _count: { select: { transaksis: true } }
            }
        });

        if (!posPengeluaran) {
            throw new AppError('Pos pengeluaran tidak ditemukan', 404);
        }

        return posPengeluaran;
    }

    /**
     * List all with filters
     */
    static async findAll(params: {
        search?: string;
        isAktif?: boolean;
        page?: number;
        limit?: number;
    }) {
        const { search, isAktif, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const where = {
            isAktif: isAktif !== undefined ? isAktif : undefined,
            OR: search ? [
                { kode: { contains: search, mode: 'insensitive' as const } },
                { nama: { contains: search, mode: 'insensitive' as const } }
            ] : undefined
        };

        const [data, total] = await Promise.all([
            prisma.posPengeluaran.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ isAktif: 'desc' }, { nama: 'asc' }],
                include: {
                    prioritasSumberDana: { select: { nama: true, kode: true } },
                    _count: { select: { transaksis: true } }
                }
            }),
            prisma.posPengeluaran.count({ where })
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Delete (soft delete by setting isAktif to false)
     */
    static async delete(id: string) {
        const existing = await prisma.posPengeluaran.findUnique({
            where: { id },
            include: { _count: { select: { transaksis: true } } }
        });

        if (!existing) {
            throw new AppError('Pos pengeluaran tidak ditemukan', 404);
        }

        // If has transactions, only soft delete
        if (existing._count.transaksis > 0) {
            return await prisma.posPengeluaran.update({
                where: { id },
                data: { isAktif: false }
            });
        }

        // If no transactions, can hard delete
        return await prisma.posPengeluaran.delete({ where: { id } });
    }

    /**
     * Get spending summary by pos pengeluaran
     */
    static async getSpendingSummary(params: {
        tanggalMulai?: Date;
        tanggalSelesai?: Date;
    }) {
        const { tanggalMulai, tanggalSelesai } = params;

        const whereDate = {
            tipeTransaksi: 'KELUAR' as const,
            createdAt: {
                gte: tanggalMulai || undefined,
                lte: tanggalSelesai || undefined
            }
        };

        const summary = await prisma.transaksiKas.groupBy({
            by: ['posPengeluaranId'],
            where: whereDate,
            _sum: { nominal: true },
            _count: true
        });

        // Get pos details
        const posIds = summary.map(s => s.posPengeluaranId).filter(Boolean) as string[];
        const posDetails = await prisma.posPengeluaran.findMany({
            where: { id: { in: posIds } },
            select: { id: true, kode: true, nama: true }
        });

        const posMap = new Map(posDetails.map(p => [p.id, p]));

        return summary.map(s => ({
            posPengeluaran: s.posPengeluaranId ? posMap.get(s.posPengeluaranId) : { kode: 'LAINNYA', nama: 'Lainnya' },
            totalPengeluaran: s._sum.nominal?.toNumber() || 0,
            jumlahTransaksi: s._count
        })).sort((a, b) => b.totalPengeluaran - a.totalPengeluaran);
    }
}
