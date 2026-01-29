import { prisma } from '../../../../lib/prisma';
import { CreateTahunAjaranInput, UpdateTahunAjaranInput } from '@alizzah/validators';
import { TahunAjaran } from '@alizzah/db';
import { AppError } from '../../../../lib/error';

export class TahunAjaranService {
    static async findAll(): Promise<TahunAjaran[]> {
        return prisma.tahunAjaran.findMany({
            orderBy: { nama: 'desc' },
        });
    }

    static async findActive(): Promise<TahunAjaran | null> {
        return prisma.tahunAjaran.findFirst({
            where: { isAktif: true },
        });
    }

    static async create(data: CreateTahunAjaranInput): Promise<TahunAjaran> {
        if (data.isAktif) {
            await prisma.tahunAjaran.updateMany({ data: { isAktif: false } });
        }
        return prisma.tahunAjaran.create({ data });
    }

    static async update(id: string, data: UpdateTahunAjaranInput): Promise<TahunAjaran> {
        const exists = await prisma.tahunAjaran.findUnique({ where: { id } });
        if (!exists) {
            throw new AppError('Tahun ajaran tidak ditemukan', 404);
        }

        if (data.isAktif) {
            await prisma.tahunAjaran.updateMany({
                where: { id: { not: id } },
                data: { isAktif: false },
            });
        }
        return prisma.tahunAjaran.update({ where: { id }, data });
    }

    static async delete(id: string): Promise<TahunAjaran> {
        const exists = await prisma.tahunAjaran.findUnique({ where: { id } });
        if (!exists) {
            throw new AppError('Tahun ajaran tidak ditemukan', 404);
        }
        return prisma.tahunAjaran.delete({ where: { id } });
    }
}
