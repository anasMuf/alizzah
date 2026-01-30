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

    const academicYearId = currentYear.id;
    const jenjangs = await prisma.jenjang.findMany();
    const jenjangMap = jenjangs.reduce((acc, j) => ({ ...acc, [j.kode]: j.id }), {} as Record<string, string>);

    // 4. Seed Rombel (Classes) - 10 per Jenjang
    console.log('🌱 Seeding Rombels...');
    let rombelCount = 0;
    for (const jenjang of jenjangs) {
        for (let i = 1; i <= 9; i++) {
            const namaRombel = `${jenjang.kelompok}-${i}`; // e.g., Mutiara-1, Intan-2

            await prisma.rombel.upsert({
                where: {
                    jenjangId_tahunAjaranId_nama: {
                        jenjangId: jenjang.id,
                        tahunAjaranId: academicYearId,
                        nama: namaRombel
                    }
                },
                update: {},
                create: {
                    nama: namaRombel,
                    jenjangId: jenjang.id,
                    tahunAjaranId: academicYearId,
                    kapasitas: 25,
                    waliKelas: `Wali Kelas ${jenjang.kelompok} ${i}`
                }
            });
            rombelCount++;
        }
    }
    console.log(`✅ Rombels seeded: ${rombelCount}`);

    // 5. Seed Pos Pengeluaran
    const posPengeluaranData = [
        { kode: 'POS-SARPRAS', nama: 'Infaq Sarpras' },
        { kode: 'POS-APE', nama: 'Infaq APE' },
        { kode: 'POS-PSIKOTEST', nama: 'Biaya Psikotest IQ' },
        { kode: 'POS-KOPERASI', nama: 'Koperasi' },
        { kode: 'POS-MPLS', nama: 'Biaya MPLS' },
        { kode: 'POS-PK-KARAKTER', nama: 'Buku PK Karakter' },
        { kode: 'POS-ALAT-BELAJAR', nama: 'Alat Belajar' },
        { kode: 'POS-IURAN-KEG', nama: 'Iuran Kegiatan Kec/Kab' },
        { kode: 'POS-ADMIN-LPP', nama: 'Administrasi LPP' },
        { kode: 'POS-KALENDER', nama: 'Kalender' },
        { kode: 'POS-GAJI-GURU', nama: 'Gaji Guru' },
    ];

    for (const pos of posPengeluaranData) {
        await prisma.posPengeluaran.upsert({
            where: { kode: pos.kode },
            update: {},
            create: pos,
        });
    }
    console.log('✅ Pos Pengeluaran seeded:', posPengeluaranData.length);

    // 5. Seed Jenis Pembayaran
    const jenisPembayaranData = [
        {
            kode: 'INF-SPP',
            nama: 'Infaq Pendidikan (SPP)',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'BULANAN' as const,
            nominalDefault: 150000,
            sifat: 'WAJIB' as const,
            jatuhTempoHari: 10,
        },
        {
            kode: 'INF-HR',
            nama: 'Infaq Harian',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'HARIAN' as const,
            nominalDefault: 7000,
            sifat: 'WAJIB' as const,
        },
        {
            kode: 'REG-TAHUNAN',
            nama: 'Registrasi Tahunan',
            kategori: 'REGISTRASI' as const,
            tipe: 'TAHUNAN' as const,
            nominalDefault: 0,
            sifat: 'WAJIB' as const,
        },
        {
            kode: 'INF-ASLIN',
            nama: 'Ekskul Aslin (Khusus TK-B)',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'BULANAN' as const,
            nominalDefault: 25000,
            sifat: 'WAJIB' as const,
        },
        {
            kode: 'TAB-WJB',
            nama: 'Tabungan Wajib Berlian (Kelulusan)',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'BULANAN' as const,
            nominalDefault: 10000,
            sifat: 'WAJIB' as const,
        },
        {
            kode: 'INF-CALISAN',
            nama: 'Ekskul Calisan',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'BULANAN' as const,
            nominalDefault: 50000,
            sifat: 'OPSIONAL' as const,
        },
        {
            kode: 'TAB-UMUM',
            nama: 'Tabungan Umum',
            kategori: 'INFAQ_RUTIN' as const,
            tipe: 'INSIDENTIL' as const,
            nominalDefault: 0,
            sifat: 'OPSIONAL' as const,
        }
    ];

    for (const jp of jenisPembayaranData) {
        const createdJp = await prisma.jenisPembayaran.upsert({
            where: { kode: jp.kode },
            update: {
                nominalDefault: jp.nominalDefault,
                tipe: jp.tipe,
            },
            create: {
                ...jp,
                nominalDefault: jp.nominalDefault,
                jenjangIds: jp.kode === 'REG-TAHUNAN' ? ['KB', 'TK-A', 'TK-B'] :
                    jp.kode === 'INF-ASLIN' || jp.kode === 'TAB-WJB' ? ['TK-B'] : [],
            },
        });

        // Seed Tariffs for Registrasi Tahunan
        if (jp.kode === 'REG-TAHUNAN') {
            const tariffs = [
                // TK-A (Intan)
                { jenjang: 'TK-A', gender: 'L' as const, nominal: 825000 },
                { jenjang: 'TK-A', gender: 'P' as const, nominal: 860000 },
                // TK-B (Berlian)
                { jenjang: 'TK-B', gender: 'L' as const, nominal: 750000 },
                { jenjang: 'TK-B', gender: 'P' as const, nominal: 785000 },
                // KB (Mutiara)
                { jenjang: 'KB', gender: 'L' as const, nominal: 725000 },
                { jenjang: 'KB', gender: 'P' as const, nominal: 760000 },
            ];

            for (const t of tariffs) {
                const jId = jenjangMap[t.jenjang];
                if (jId) {
                    await prisma.jenisPembayaranTarif.upsert({
                        where: {
                            jenisPembayaranId_tahunAjaranId_jenjangId_jenisKelamin: {
                                jenisPembayaranId: createdJp.id,
                                tahunAjaranId: academicYearId,
                                jenjangId: jId,
                                jenisKelamin: t.gender,
                            }
                        },
                        update: { nominal: t.nominal },
                        create: {
                            jenisPembayaranId: createdJp.id,
                            tahunAjaranId: academicYearId,
                            jenjangId: jId,
                            jenisKelamin: t.gender,
                            nominal: t.nominal,
                        }
                    });
                }
            }
        }
    }
    console.log('✅ Jenis Pembayaran & Tariffs seeded');

    // 6. Seed PASTA (Program Asah Talenta)
    const pastaData = [
        { nama: 'Robotika', hari: 'JUMAT' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 100000 },
        { nama: 'Sempoa Kids', hari: 'JUMAT' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 100000 },
        { nama: 'Tilawah', hari: 'JUMAT' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 50000 },
        { nama: 'Laptop Kid\'s', hari: 'JUMAT' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 100000 },
        { nama: 'Taekwondo', hari: 'SABTU' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 50000 },
        { nama: 'Tari (Menari)', hari: 'SABTU' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 50000 },
        { nama: 'Melukis', hari: 'SABTU' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 50000 },
        { nama: 'Menyanyi', hari: 'SABTU' as const, jamMulai: '09:00', jamSelesai: '10:00', biaya: 50000 },
    ];

    for (const pasta of pastaData) {
        // We use a pseudo-date for Time type in Prisma/Postgres or handle as String if needed.
        // Prisma @db.Time expects local time or DateTime.
        await prisma.pasta.upsert({
            where: { id: `fixed-id-${pasta.nama.toLowerCase().replace(/ /g, '-')}` }, // Pseudo upsert check by name or ID
            update: { biaya: pasta.biaya },
            create: {
                id: `fixed-id-${pasta.nama.toLowerCase().replace(/ /g, '-')}`,
                nama: pasta.nama,
                hari: pasta.hari,
                jamMulai: new Date(`1970-01-01T${pasta.jamMulai}:00Z`),
                jamSelesai: new Date(`1970-01-01T${pasta.jamSelesai}:00Z`),
                biaya: pasta.biaya,
                jenjangIds: ['TK-A', 'TK-B'],
                isAktif: true,
            },
        });
    }
    console.log('✅ PASTA Programs seeded:', pastaData.length);

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
