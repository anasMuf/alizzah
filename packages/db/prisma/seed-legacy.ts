
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient, JenisKelamin, StatusSiswa } from '../generated/prisma';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const SQL_FILE_PATH = path.resolve(process.cwd(), 'docs/implementation/src/siswa_cycle.sql');

// Helper to convert Title Case (MUTIARA 1 -> Mutiara-1)
function normalizeRombelName(name: string): string {
    // Legacy: "MUTIARA 1", "INTAN 10"
    // Target: "Mutiara-1", "Intan-10"
    const parts = name.split(' ');
    if (parts.length >= 2) {
        const group = parts[0].toLowerCase();
        const number = parts[1];
        const titleCaseGroup = group.charAt(0).toUpperCase() + group.slice(1);
        return `${titleCaseGroup}-${number}`;
    }
    return name;
}

async function main() {
    console.log('🚀 Starting legacy migration...');

    if (!fs.existsSync(SQL_FILE_PATH)) {
        console.error(`❌ File not found: ${SQL_FILE_PATH}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');

    // 1. EXTRACT KELAS (ID -> Name)
    // INSERT INTO `kelas` VALUES (1,'MUTIARA 1',...
    const kelasMap = new Map<number, string>();
    const kelasRegex = /INSERT INTO `kelas` VALUES \((.*?)\);/gs;
    const kelasMatch = kelasRegex.exec(sqlContent);
    if (kelasMatch) {
        // The content inside VALUES (...) might be multiple rows: (1,...),(2,...)
        // We need to match individual tuples
        const rows = kelasMatch[1].split('),(');
        rows.forEach((row, index) => {
            // clean start/end parens if it's the first/last
            let cleanRow = row;
            if (index === 0 && cleanRow.startsWith('(')) cleanRow = cleanRow.slice(1); // Should not happen with regex group 1 capturing values content? 
            // actually the group 1 captures "1,'MUTIARA 1',...),(2,..."

            // Let's refine the regex approach or just parsing logic.
            // Simplest is to strict match (id, 'name')
            // Value: 1,'MUTIARA 1',1,1,'2025...
            const parts = cleanRow.match(/^(\d+),'([^']+)'/);
            if (parts) {
                kelasMap.set(parseInt(parts[1]), parts[2]);
            }
        });
    }
    console.log(`✅ Found ${kelasMap.size} legacy classes.`);

    // 2. EXTRACT SISWA_KELAS (SiswaID -> Latest KelasID)
    // INSERT INTO `siswa_kelas` VALUES (1,2,1,1,... -> (id, ta_id, siswa_id, kelas_id, ...)
    const siswaKelasMap = new Map<number, number>(); // SiswaID -> KelasID
    const skRegex = /INSERT INTO `siswa_kelas` VALUES \((.*?)\);/gs;
    const skMatch = skRegex.exec(sqlContent);
    if (skMatch) {
        // The regex captures the whole block of values.
        // We need to parse each tuple.
        // Since SQL values are separated by `),(`, we split by that.
        // But we must be careful if strings contain `),(`, though unlikely for valid dump here.
        const rawValues = skMatch[1];
        const rows = rawValues.split(/\),\(/);

        rows.forEach(row => {
            // Remove leading/trailing parens if present (likely only on ends of the huge string)
            // But split might leave them on intermediate items? No, split separator is consumed.
            // row 1: "1,2,1,1,NULL,..."
            // row 2: "2,2,2,1,NULL,..."
            const cols = row.split(',');
            if (cols.length >= 4) {
                const siswaId = parseInt(cols[2]);
                const kelasId = parseInt(cols[3]);
                const status = cols[5]?.replace(/'/g, ''); // 'aktif'

                // Only considering 'aktif' records? Or just take the latest?
                // The dump seems to have only one active record per student (ta_id 2).
                if (status === 'aktif') {
                    siswaKelasMap.set(siswaId, kelasId);
                }
            }
        });
    }
    console.log(`✅ Found ${siswaKelasMap.size} student-class relationships.`);

    // 3. CACHE EXISTING ROMBELS
    const rombels = await prisma.rombel.findMany();
    const rombelNameMap = new Map<string, string>(); // Name -> UUID
    rombels.forEach(r => rombelNameMap.set(r.nama, r.id));

    // 4. PARSE & SEED SISWA
    // INSERT INTO `siswa` VALUES (1,'FATHIR...',NULL...
    const siswaRegex = /INSERT INTO `siswa` VALUES \((.*?)\);/gs;
    const siswaMatch = siswaRegex.exec(sqlContent);

    let successCount = 0;
    let failCount = 0;

    if (siswaMatch) {
        const rawValues = siswaMatch[1];
        // Splitting by `),(` is risky if text contains it, but for this dump it seems safe.
        // Standard mysqldump format.
        const rows = rawValues.split(/\),\(/);

        for (const row of rows) {
            try {
                // Determine Columns
                // We need a proper CSV-like parser because names can contain commas.
                // Quick hack: strings are '...'.
                // We can parse with regex: match numbers or 'quoted strings' or NULL.
                const values: string[] = [];
                const valueRegex = /'([^']*)'|([^,]+)/g;
                let m;
                while ((m = valueRegex.exec(row)) !== null) {
                    if (m[1] !== undefined) values.push(m[1]); // Quoted string
                    else values.push(m[2]); // Number or NULL
                }

                // Mapped index based on CREATE TABLE `siswa` (line 25-67 in dump):
                // 0: id
                // 1: nama_lengkap
                // 2: nama_panggilan
                // 3: nik
                // 4: jenis_kelamin
                // ...
                // 29: created_at

                // Parsing logic with simple split is flawed due to commas.
                // Let's rely on the specific structure of THIS dump for stability.
                // ID is first. Name is second (quoted).

                // Let's use a specialized splitting that respects quotes.
                const splitRow = (str: string) => {
                    const result = [];
                    let current = '';
                    let inQuote = false;
                    for (let i = 0; i < str.length; i++) {
                        const char = str[i];
                        if (char === "'" && (i === 0 || str[i - 1] !== '\\')) {
                            inQuote = !inQuote;
                        } else if (char === ',' && !inQuote) {
                            result.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current);
                    return result.map(s => s.replace(/^'|'$/g, '').trim()); // Clean quotes
                };

                const cols = splitRow(row);

                const legacyId = parseInt(cols[0]);
                const namaLengkap = cols[1];
                const jenisKelaminStr = cols[4]; // 'Laki-laki'
                const createdAtStr = cols[29] === 'NULL' ? new Date() : new Date(cols[29]);

                // Map Gender
                const jenisKelamin = jenisKelaminStr === 'Perempuan' ? JenisKelamin.P : JenisKelamin.L;

                // Determine Rombel
                const legacyKelasId = siswaKelasMap.get(legacyId);
                let rombelId = '';

                if (legacyKelasId) {
                    const legacyClassName = kelasMap.get(legacyKelasId);
                    if (legacyClassName) {
                        const newName = normalizeRombelName(legacyClassName);
                        if (rombelNameMap.has(newName)) {
                            rombelId = rombelNameMap.get(newName)!;
                        } else {
                            console.warn(`⚠️ Rombel not found for: ${legacyClassName} -> ${newName}`);
                        }
                    }
                }

                if (!rombelId) {
                    // Fallback to first available rombel or skip?
                    // Skipping will fail constraint. Let's filter students without classes?
                    // Or assign to a "Holding" class. 
                    // For now, let's grab the first rombel available.
                    rombelId = rombels[0]?.id || '';
                }

                // Generate NIS
                // Use 2025 + 4 digit sequential
                const nis = `2025${String(legacyId).padStart(4, '0')}`; // Use Legacy ID to keep consistent

                // Create
                await prisma.siswa.upsert({
                    where: { nis }, // Assuming NIS is unique key
                    update: {},
                    create: {
                        nis,
                        namaLengkap,
                        jenisKelamin,
                        namaOrtu: `Orang Tua ${namaLengkap}`, // Dummy
                        noHpOrtu: '081234567890', // Dummy
                        tanggalMasuk: createdAtStr,
                        rombelId,
                        status: StatusSiswa.AKTIF,
                        createdAt: createdAtStr,
                    } // as any // Avoid type issues if partial
                });

                process.stdout.write('.');
                successCount++;
            } catch (e) {
                console.error(`\n❌ Error processing row starting with: ${row.substring(0, 20)}...`, e);
                failCount++;
            }
        }
    }

    console.log(`\n\n✨ Migration finished.`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
