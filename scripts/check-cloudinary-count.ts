import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.productImage.count();
  const conPid = await prisma.productImage.count({ where: { NOT: { cloudinaryPublicId: null } } });
  console.log({ total, subidasACloudinary: conPid, pendientes: total - conPid });
}
main().finally(()=>prisma.$disconnect());
