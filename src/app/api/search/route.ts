import { NextRequest, NextResponse } from 'next/server';
import { getProductsIndex } from '@/lib/meili';

type SearchBody = {
  q?: string;
  page?: number;        // 1-based
  pageSize?: number;    // 1..60
  sort?: 'priceAsc' | 'priceDesc' | 'newest' | 'ratingDesc';
  filters?: {
    category?: string | null;
    subcategory?: string | null;
    brand?: string[] | null;
    inStock?: boolean | null;
    priceMin?: number | null;
    priceMax?: number | null;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchBody;
    const page = Math.max(1, body.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, body.pageSize ?? 24));

    const sortBy =
      body.sort === 'priceAsc' ? ['price:asc'] :
      body.sort === 'priceDesc' ? ['price:desc'] :
      body.sort === 'ratingDesc' ? ['rating:desc'] :
      ['createdAt:desc']; // newest

    const filters: string[] = [];
    if (body.filters?.category) filters.push(`category = "${body.filters.category}"`);
    if (body.filters?.subcategory) filters.push(`subcategory = "${body.filters.subcategory}"`);
    if (body.filters?.brand?.length) {
      const brands = body.filters.brand.map(b => `"${b}"`).join(', ');
      filters.push(`brand IN [${brands}]`);
    }
    if (body.filters?.inStock === true) filters.push(`inStock = true`);
    if (body.filters?.priceMin != null) filters.push(`price >= ${body.filters.priceMin}`);
    if (body.filters?.priceMax != null) filters.push(`price <= ${body.filters.priceMax}`);
    const meiliFilter = filters.length ? filters.join(' AND ') : undefined;

    const index = await getProductsIndex();
    const res = await index.search(body.q ?? '', {
      page, // Meili usa 1-based
      hitsPerPage: pageSize,
      sort: sortBy,
      filter: meiliFilter,
      attributesToHighlight: ['title', 'brand'],
      attributesToCrop: ['description'],
      cropLength: 20,
      showMatchesPosition: true,
      facets: ['category','subcategory','brand','inStock'],
    });

    return NextResponse.json({
      query: body.q ?? '',
      page: res.page,
      pageSize,
      totalPages: res.totalPages,
      totalHits: res.totalHits,
      hits: res.hits,
      facetDistribution: res.facetDistribution,
    });
  } catch (err: any) {
    console.error('SEARCH_API_ERROR', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
