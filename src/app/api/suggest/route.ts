import { NextRequest, NextResponse } from 'next/server';
import { getProductsIndex } from '@/lib/meili';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const limit = Number(searchParams.get('limit') ?? '8');

    const index = await getProductsIndex();
    const res = await index.search(q, {
      page: 1,
      hitsPerPage: limit,
      attributesToRetrieve: ['id','slug','title','brand','imageUrl','price'],
    });

    // Opcional: sugerencias de categorías y marcas
    const cats = new Set<string>();
    const brands = new Set<string>();
    for (const h of res.hits as any[]) {
      if (h.category) cats.add(h.category);
      if (h.brand) brands.add(h.brand);
    }

    return NextResponse.json({
      q,
      suggestions: res.hits,
      categories: Array.from(cats).slice(0, 5),
      brands: Array.from(brands).slice(0, 5),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Suggest failed' }, { status: 500 });
  }
}
