import { prisma } from '../../../../lib/prisma';
import { CreateJenjangInput, UpdateJenjangInput } from '@alizzah/validators';
import { Jenjang } from '@alizzah/db';
import { AppError } from '../../../../lib/error';

export class JenjangService {
    static async findAll(): Promise<Jenjang[]> {
        return prisma.jenjang.findMany({
            orderBy: { urutan: 'asc' },
        });
    }

    static async create(data: CreateJenjangInput): Promise<Jenjang> {
        return prisma.jenjang.create({ data });
    }

    static async update(id: string, data: UpdateJenjangInput): Promise<Jenjang> {
        const exists = await prisma.jenjang.findUnique({ where: { id } });
        if (!exists) {
            throw new AppError('Jenjang tidak ditemukan', 404);
        }
        return prisma.jenjang.update({ where: { id }, data });
    }

    static async delete(id: string): Promise<Jenjang> {
        const exists = await prisma.jenjang.findUnique({ where: { id } });
        if (!exists) {
            throw new AppError('Jenjang tidak ditemukan', 404);
        }
        return prisma.jenjang.delete({ where: { id } });
    }
}
