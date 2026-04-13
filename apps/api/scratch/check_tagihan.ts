import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tagihanCount = await prisma.tagihan.count();
  const daycareTagihanCount = await prisma.tagihan.count({
    where: { pesertaDaycareId: { not: null } }
  });
  const externalDaycareTagihanCount = await prisma.tagihan.count({
    where: { pesertaDaycareId: { not: null }, siswaId: null }
  });
  
  const latestTagihans = await prisma.tagihan.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      siswa: { select: { namaLengkap: true } },
      pesertaDaycare: { select: { namaLengkap: true } }
    }
  });

  console.log('Total Tagihan:', tagihanCount);
  console.log('Daycare Tagihan:', daycareTagihanCount);
  console.log('External Daycare Tagihan:', externalDaycareTagihanCount);
  console.log('Latest 5 Tagihans:', JSON.stringify(latestTagihans, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
