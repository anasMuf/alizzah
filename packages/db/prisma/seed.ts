import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { PrismaClient } from '../generated/prisma';
import { hashSync } from 'bcryptjs';

// Ensure DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

console.error('Using DATABASE_URL:', process.env.DATABASE_URL?.split('@')[1]);

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Seed Academic Year (Tahun Ajaran)
    const currentYear = await prisma.tahunAjaran.upsert({
        where: { nama: '2025/2026' },
        update: {},
        create: {
            nama: '2025/2026',
            tanggalMulai: new Date('2025-07-01'),
            tanggalSelesai: new Date('2026-06-30'),
            isAktif: true,
        },
    });
    console.log('✅ Academic Year seeded:', currentYear.nama);

    // 2. Seed Levels (Jenjang)
    const levels = [
        { kode: 'KB', nama: 'Kelompok Bermain', kelompok: 'Mutiara', urutan: 1 },
        { kode: 'TK-A', nama: 'Taman Kanak-Kanak A', kelompok: 'Intan', urutan: 2 },
        { kode: 'TK-B', nama: 'Taman Kanak-Kanak B', kelompok: 'Berlian', urutan: 3 },
    ];

    for (const level of levels) {
        await prisma.jenjang.upsert({
            where: { kode: level.kode },
            update: {},
            create: level,
        });
    }
    console.log('✅ Levels seeded:', levels.length);

    // 3. Seed Admin User
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: hashSync('password123', 10),
        },
        create: {
            username: 'admin',
            email: 'admin@alizzah.sch.id',
            password: hashSync('password123', 10),
            namaLengkap: 'Administrator',
            role: 'ADMIN',
            isAktif: true,
        },
    });
    console.log('✅ Admin user seeded:', admin.username);

    console.log('🚀 Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
