
import { PrismaClient } from '../packages/db/src/index.ts';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.rombel.count();
    console.log(`Total Rombels: ${count}`);

    const rombels = await prisma.rombel.findMany({
        select: { nama: true }
    });
    console.log('Rombel Names sample:', rombels.slice(0, 5).map(r => r.nama));

    // Check for "10"
    const ten = rombels.filter(r => r.nama.endsWith('-9'));
    console.log(`Rombels ending in -9: ${ten.length}`);
    if (ten.length > 0) console.log(ten.map(r => r.nama));
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
