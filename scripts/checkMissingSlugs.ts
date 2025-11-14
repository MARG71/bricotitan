import 'dotenv/config'
import { prisma } from '@/lib/db'

async function main() {
  const missing = await prisma.product.count({
    where: { OR: [{ slug: null }, { slug: '' }] },
  })
  console.log(`Productos SIN slug: ${missing}`)
  if (missing > 0) {
    const sample = await prisma.product.findMany({
      where: { OR: [{ slug: null }, { slug: '' }] },
      take: 10,
      select: { id: true, name: true, ref: true, i18n: { select: { lang: true, name: true } } },
    })
    console.log('Ejemplos:', sample)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
