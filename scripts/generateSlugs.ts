// scripts/generateSlugs.ts
import 'dotenv/config'
import { prisma } from '@/lib/db'
import { makeUniqueSlug } from '@/lib/slug'

// Título de fallback: i18n('es') > i18n(cualquiera) > name > ref > "producto-{id}"
function pickTitle(p: any): string {
  const es = p.i18n?.find((t: any) => t.lang === 'es')?.name
  const any = p.i18n?.[0]?.name
  return es || any || p.name || p.ref || `producto-${p.id}`
}

async function main() {
  let updated = 0
  const batchSize = 500

  for (;;) {
    const chunk = await prisma.product.findMany({
      where: { OR: [{ slug: null }, { slug: '' }] },
      take: batchSize,
      select: {
        id: true,
        slug: true,
        name: true,
        ref: true,
        i18n: { select: { lang: true, name: true } },
      },
      orderBy: { id: 'asc' },
    })

    if (chunk.length === 0) break

    for (const p of chunk) {
      const title = pickTitle(p)
      // 👇 Unicidad fuerte: usa ref si existe (es @unique en BD), si no el id
      const slug = makeUniqueSlug(title, { ref: p.ref, id: p.id })

      // Intento directo (no debería chocar nunca con esta estrategia)
      try {
        await prisma.product.update({
          where: { id: p.id },
          data: { slug },
        })
        updated++
      } catch (e: any) {
        // Por si acaso hay un slug igual ya existente (muy raro),
        // reintenta con el id puro para garantizar unicidad
        if (e?.code === 'P2002') {
          const fallback = makeUniqueSlug(title, { ref: null, id: p.id })
          await prisma.product.update({
            where: { id: p.id },
            data: { slug: fallback },
          })
          updated++
        } else {
          throw e
        }
      }

      if (updated % 500 === 0) {
        console.log(`Actualizados ${updated} slugs...`)
      }
    }
  }

  console.log(`✅ Slugs creados/actualizados: ${updated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
