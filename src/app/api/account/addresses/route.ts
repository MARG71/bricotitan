import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await requireAuth()
  const list = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const session = await requireAuth()
  const ct = req.headers.get('content-type') || ''
  let payload: any = {}
  if (ct.includes('application/json')) payload = await req.json()
  else {
    const form = await req.formData()
    form.forEach((v, k) => (payload[k] = v))
  }

  const created = await prisma.address.create({
    data: {
      userId: session.user.id,
      name: payload.name || null,
      fullName: String(payload.fullName),
      phone: payload.phone ? String(payload.phone) : null,
      line1: String(payload.line1),
      line2: payload.line2 ? String(payload.line2) : null,
      city: String(payload.city),
      region: payload.region ? String(payload.region) : null,
      postal: String(payload.postal),
      country: payload.country ? String(payload.country) : 'ES',
    },
  })

  return NextResponse.json(created, { status: 201 })
}
