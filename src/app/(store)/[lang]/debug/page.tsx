
// src/app/(store)/[lang]/page.tsx
// src/app/(store)/[lang]/debug/page.tsx
// src/app/(store)/[lang]/debug/page.tsx
import CategoryCard from '@/components/store/CategoryCard'
import ProductCard from '@/components/store/ProductCard'
import { getHomeData } from '@/lib/catalog'

type HomePageProps = {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params
  const data = await getHomeData(lang)

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Bienvenido a BRICOTITAN</h1>
        <p className="text-zinc-700 max-w-2xl">
          Descubre nuestro catálogo. Categorías principales y los últimos productos añadidos.
        </p>
      </header>

      {/* Categorías destacadas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Categorías</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.topCategories.map((c, i) => (
            <CategoryCard
              key={c.id}
              href={`/${lang}/c/${c.slug}`}
              title={c.name}
              subtitle="Explorar"
              accent={i % 2 === 0 ? 'brand-primary' : 'brand-accent'}
            />
          ))}
        </div>
      </section>

      {/* Novedades / Destacados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Novedades</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {data.latest.map((p) => (
            // @ts-ignore – ruta de debug, aceptamos product aunque no esté en Props
            <ProductCard key={p.id} lang={lang} product={p} />
          ))}
        </div>
      </section>
    </section>
  )
}
