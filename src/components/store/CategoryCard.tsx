import Link from 'next/link'

export default function CategoryCard({
  href,
  title,
  subtitle,
  accent = 'brand-primary',
}: {
  href: string
  title: string
  subtitle?: string
  accent?: 'brand-primary' | 'brand-accent'
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-6 hover:shadow-soft transition block border-${accent}`}
    >
      <h3 className={`font-semibold text-${accent}`}>{title}</h3>
      {subtitle ? <p className="text-sm text-zinc-600">{subtitle}</p> : null}
    </Link>
  )
}
