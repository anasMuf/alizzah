
import { prisma } from '../../../../lib/prisma';
import { CreateDiskonInput, UpdateDiskonInput, AssignDiskonInput } from '@alizzah/validators';

export class DiskonService {
    static async findAll() {
        return prisma.diskon.findMany({
            include: {
                jenisPembayaran: true,
                _count: {
                    select: { siswaDiskons: true }
                }
            },
            orderBy: { kode: 'asc' }
        });
    }

    static async findById(id: string) {
        return prisma.diskon.findUniqueOrThrow({
            where: { id },
            include: {
                jenisPembayaran: true,
                siswaDiskons: {
                    include: {
                        siswa: {
                            select: { id: true, namaLengkap: true, nis: true, rombel: true }
                        }
                    }
                }
            }
        });
    }

    static async create(data: CreateDiskonInput) {
        // Validation: Unique Code
        const existing = await prisma.diskon.findUnique({ where: { kode: data.kode } });
        if (existing) throw new Error(`Kode diskon '${data.kode}' sudah digunakan.`);

        return prisma.diskon.create({
            data
        });
    }

    static async update(id: string, data: UpdateDiskonInput) {
        return prisma.diskon.update({
            where: { id },
            data
        });
    }

    static async delete(id: string) {
        return prisma.diskon.delete({
            where: { id }
        });
    }

    // --- Assignment ---

    static async assignToSiswa(data: AssignDiskonInput & { createdBy: string }) {
        // Check overlap? Maybe unnecessary for discounts, stacking is allowed.
        // But we should check if same discount is assigned twice with overlapping dates? 
        // For simplicity now, we assume admin knows what they are doing, or we check exact duplication.

        return prisma.siswaDiskon.create({
            data: {
                siswaId: data.siswaId,
                diskonId: data.diskonId,
                tanggalMulai: data.tanggalMulai,
                tanggalBerakhir: data.tanggalBerakhir,
                catatan: data.catatan,
                createdBy: data.createdBy
            }
        });
    }

    static async removeAssignment(id: string) {
        return prisma.siswaDiskon.delete({
            where: { id }
        });
    }

    // Determine active discounts for a student and a specific payment type at a given date
    static async getActiveDiscounts(siswaId: string, jenisPembayaranId: string, date: Date = new Date()) {
        return prisma.siswaDiskon.findMany({
            where: {
                siswaId,
                diskon: {
                    jenisPembayaranId,
                    isAktif: true
                },
                tanggalMulai: { lte: date },
                OR: [
                    { tanggalBerakhir: null },
                    { tanggalBerakhir: { gte: date } }
                ]
            },
            include: {
                diskon: true
            }
        });
    }
}
