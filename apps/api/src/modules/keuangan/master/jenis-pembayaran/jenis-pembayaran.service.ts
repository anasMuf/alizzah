import { prisma } from '../../../../lib/prisma';
import { CreateJenisPembayaranInput, UpdateJenisPembayaranInput } from '@alizzah/validators';

export class JenisPembayaranService {
    static async findAll() {
        return prisma.jenisPembayaran.findMany({
            include: {
                tarifs: {
                    include: {
                        jenjang: true,
                    }
                }
            },
            orderBy: { kode: 'asc' },
        });
    }

    static async findById(id: string) {
        return prisma.jenisPembayaran.findUnique({
            where: { id },
            include: {
                tarifs: {
                    include: {
                        jenjang: true,
                    }
                }
            },
        });
    }

    static async create(data: CreateJenisPembayaranInput) {
        return prisma.jenisPembayaran.create({
            data: {
                ...data,
                nominalDefault: data.nominalDefault.toString(),
            },
        });
    }

    static async update(id: string, data: UpdateJenisPembayaranInput) {
        const updateData: any = { ...data };
        if (data.nominalDefault !== undefined) {
            updateData.nominalDefault = data.nominalDefault.toString();
        }

        return prisma.jenisPembayaran.update({
            where: { id },
            data: updateData,
        });
    }

    static async delete(id: string) {
        return prisma.jenisPembayaran.delete({
            where: { id },
        });
    }
}
