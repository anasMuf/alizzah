
import { prisma } from '../../../lib/prisma';
import { CreateSiswaInput, UpdateSiswaInput, PromoteSiswaInput } from '@alizzah/validators';

export class SiswaService {
    static async findAll(params?: {
        page?: number;
        limit?: number;
        search?: string;
        rombelId?: string;
        status?: 'AKTIF' | 'LULUS' | 'KELUAR' | 'CUTI' | 'CALON_SISWA';
    }) {
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (params?.search) {
            where.OR = [
                { namaLengkap: { contains: params.search, mode: 'insensitive' } },
                { nis: { contains: params.search } },
                { namaOrtu: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params?.rombelId) where.rombelId = params.rombelId;
        if (params?.status) where.status = params.status;

        const [data, total] = await Promise.all([
            prisma.siswa.findMany({
                where,
                skip,
                take: limit,
                orderBy: { namaLengkap: 'asc' },
                include: {
                    rombel: {
                        include: {
                            jenjang: true,
                            tahunAjaran: true
                        }
                    }
                }
            }),
            prisma.siswa.count({ where })
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async findById(id: string) {
        return prisma.siswa.findUniqueOrThrow({
            where: { id },
            include: {
                rombel: {
                    include: {
                        jenjang: true,
                        tahunAjaran: true
                    }
                },
                siswaPastas: {
                    include: {
                        pasta: true
                    }
                },
                tagihans: {
                    where: { status: 'PAID' }, // Example inclusion
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }

    static async create(data: CreateSiswaInput) {
        const { pastaIds, ...siswaData } = data;

        // Auto-generate NIS if not provided
        let nis = siswaData.nis;
        if (!nis) {
            const year = new Date().getFullYear().toString().slice(-2);
            // Simple logic: Year + Order (e.g., 250001)
            // Ideally should check last NIS in DB
            const lastSiswa = await prisma.siswa.findFirst({
                where: { nis: { startsWith: year } },
                orderBy: { nis: 'desc' }
            });

            let sequence = 1;
            if (lastSiswa) {
                const lastSeq = parseInt(lastSiswa.nis.slice(2));
                if (!isNaN(lastSeq)) sequence = lastSeq + 1;
            }

            nis = `${year}${sequence.toString().padStart(4, '0')}`;
        }

        // Check Duplication
        const existing = await prisma.siswa.findUnique({ where: { nis } });
        if (existing) {
            throw new Error(`NIS ${nis} sudah terdaftar. Silakan gunakan NIS lain.`);
        }

        return prisma.siswa.create({
            data: {
                ...siswaData,
                nis,
                siswaPastas: pastaIds && pastaIds.length > 0 ? {
                    create: pastaIds.map(pastaId => ({ pastaId }))
                } : undefined
            } as any
        });
    }

    static async update(id: string, data: UpdateSiswaInput) {
        const { pastaIds, ...siswaData } = data;

        return prisma.siswa.update({
            where: { id },
            data: {
                ...(siswaData as any),
                ...(pastaIds ? {
                    siswaPastas: {
                        deleteMany: {}, // Reset existing
                        create: pastaIds.map(pastaId => ({ pastaId }))
                    }
                } : {})
            }
        });
    }

    static async delete(id: string) {
        // Check dependencies (Payments, Billing)
        const hasTagihan = await prisma.tagihan.count({ where: { siswaId: id } });
        if (hasTagihan > 0) {
            throw new Error('Siswa tidak dapat dihapus karena memiliki data tagihan.');
        }

        return prisma.siswa.delete({
            where: { id }
        });
    }

    static async promote(data: PromoteSiswaInput) {
        const { targetRombelId, siswaIds, action } = data;

        if (siswaIds.length === 0) {
            throw new Error('Minimal satu siswa harus dipilih.');
        }

        // Logic for Promotion (Move Class)
        if (action === 'PROMOTE') {
            if (!targetRombelId) throw new Error('Rombel tujuan harus dipilih.');

            // Check if target Rombel exists
            const rombel = await prisma.rombel.findUnique({
                where: { id: targetRombelId }
            });

            if (!rombel) {
                throw new Error('Rombel tujuan tidak ditemukan.');
            }

            // Execute in transaction
            return await prisma.$transaction(async (tx) => {
                const result = await tx.siswa.updateMany({
                    where: {
                        id: { in: siswaIds }
                    },
                    data: {
                        rombelId: targetRombelId
                    }
                });

                return result;
            });
        }

        // Logic for Graduation (Graduate Student)
        if (action === 'GRADUATE') {
            return await prisma.$transaction(async (tx) => {
                const result = await tx.siswa.updateMany({
                    where: {
                        id: { in: siswaIds }
                    },
                    data: {
                        status: 'LULUS'
                        // We keep the rombelId as history reference, or we can set it to null if schema allows.
                        // Since schema says rombelId String (required), we keep it.
                        // Rombel capacity check already filters for status='AKTIF', so this is safe.
                    }
                });
                return result;
            });
        }

        throw new Error('Aksi tidak valid.');
    }
}
