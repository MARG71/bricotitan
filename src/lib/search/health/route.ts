import { NextResponse } from 'next/server';
import { meili } from '@/lib/meili';

export async function GET() {
  try {
    const h = await meili.health();
    return NextResponse.json(h);
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
