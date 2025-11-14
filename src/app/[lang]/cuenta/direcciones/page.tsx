import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AddressesClient from './ui'

export default async function AddressesPage() {
  const session = await requireAuth()
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tus direcciones</h1>
      <AddressesClient initial={addresses} />
    </main>
  )
}
