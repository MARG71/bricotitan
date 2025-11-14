// src/app/api/reindex/route.ts
import { NextResponse } from 'next/server';
import { runReindex } from '../../../server/reindexProducts'; // <-- NUEVA RUTA

const TOKEN = process.env.REINDEX_TOKEN;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!TOKEN || token !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runReindex();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('API /reindex error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Error' }, { status: 500 });
  }
}
