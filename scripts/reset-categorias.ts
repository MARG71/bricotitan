import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const del = await prisma.category.deleteMany({});
  console.log("Borradas categorías:", del.count);
  await prisma.$disconnect();
})();
