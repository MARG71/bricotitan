// src/app/(store)/[lang]/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// 📦 Obtiene categorías principales y productos nuevos
async function getHomeData() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
    include: { children: true },
  })

  const products = await prisma.product.findMany({
    take: 12,
    orderBy: { createdAt: 'desc' },
    include: {
      images: { take: 1, orderBy: { sort: 'asc' } },
    },
  })

  return { categories, products }
}

type HomePageProps = {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params
  const { categories, products } = await getHomeData()

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 🏠 Hero */}
      <section className="relative w-full h-[320px] overflow-hidden">
        <Image
          src="/images/banner-home.jpg" // 🔧 cambia por uno real si quieres
          alt="BRICOTITAN - Ferretería profesional"
          fill
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center">
          <Image
            src="/images/logo-bricotitan.png"
            alt="Bricotitan"
            width={280}
            height={60}
            className="mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold">
            Todo en Ferretería, Bricolaje y Profesionales
          </h1>
          <p className="text-gray-300 mt-2">
            Herramientas, electricidad, fontanería, jardinería y más.
          </p>
        </div>
      </section>

      {/* 🧭 Contenedor general */}
      <div className="flex flex-col md:flex-row container mx-auto mt-8 gap-8 px-4 md:px-8">
        {/* 📂 Panel de categorías principales */}
        <aside className="md:w-64 bg-[#1c1c1c] rounded-2xl shadow-lg border border-gray-700">
          <h2 className="px-4 py-3 font-semibold text-lg border-b border-gray-700">
            Categorías
          </h2>
          <nav className="divide-y divide-gray-700">
            {categories.map((cat) => (
              <div key={cat.id} className="group relative">
                <Link
                  href={`/${lang}/c/${cat.slug}`}
                  className="block px-4 py-3 hover:bg-[#f97316] hover:text-white transition"
                >
                  {cat.name}
                </Link>

                {/* Subcategorías flotantes (hover tipo menú lateral) */}
                {cat.children.length > 0 && (
                  <div className="absolute left-full top-0 hidden group-hover:block bg-[#1c1c1c] border border-gray-700 rounded-xl p-3 w-56 shadow-lg z-10">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/${lang}/c/${sub.slug}`}
                        className="block px-3 py-2 text-sm hover:bg-[#f97316] hover:text-white rounded-md transition"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* 🧰 Novedades */}
        <section className="flex-1">
          <h2 className="text-2xl font-semibold mb-4 text-[#f97316]">
            Novedades
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/${lang}/p/${p.slug}`}
                className="group rounded-2xl bg-[#1c1c1c] border border-gray-700 hover:border-[#f97316] hover:shadow-lg transition p-3"
              >
                {p.images?.[0] && (
                  <Image
                    src={p.images[0].url}
                    alt={p.name}
                    width={300}
                    height={300}
                    className="rounded-xl h-40 w-full object-contain bg-white"
                  />
                )}
                <div className="mt-3">
                  <h3 className="text-sm font-medium group-hover:text-[#f97316] line-clamp-2">
                    {p.name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {p.priceExVat?.toString()} €
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ⚙️ Pie */}
      <footer className="mt-12 py-6 bg-[#181818] border-t border-gray-700 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} BRICOTITAN — Ferretería profesional
      </footer>
    </main>
  )
}
