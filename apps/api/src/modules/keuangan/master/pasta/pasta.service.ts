
import { prisma } from '../../../../lib/prisma';

export class PastaService {
    static async findAll() {
        return prisma.pasta.findMany({
            where: { isAktif: true },
            orderBy: { nama: 'asc' },
            include: {
                siswaPastas: false // Don't include huge relation list by default
            }
        });
    }

    static async findById(id: string) {
        return prisma.pasta.findUniqueOrThrow({
            where: { id }
        });
    }

    static async create(data: any) {
        return prisma.pasta.create({ data });
    }

    static async update(id: string, data: any) {
        return prisma.pasta.update({
            where: { id },
            data
        });
    }

    static async delete(id: string) {
        return prisma.pasta.update({
            where: { id },
            data: { isAktif: false } // Soft delete
        });
    }
}
