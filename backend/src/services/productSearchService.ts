import { getProductsFromSheet } from './sheetService.js';
import { getProductAdvantages, USE_CASE_TAGS } from '../data/productAdvantages.js';

export interface ProductSearchResult {
  id: string;
  name: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  description: string;
  status: string;
  /** Keunggulan produk (dari Sheet Camera_advantages) untuk tampilan chat. */
  keunggulan?: string[];
  /** Cocok untuk use-case (dari Sheet Camera_advantages) untuk tampilan chat. */
  cocokUntuk?: string[];
}

export interface SearchProductsParams {
  name?: string;
  category?: string;
  price_min?: number;
  price_max?: number;
  /** Maksimal jumlah hasil (mis. 2 untuk rekomendasi). */
  limit?: number;
  /** Use-case: vlog, travel, wedding, pemula, murah, dll. Filter pakai product advantages tags. */
  use_case?: string;
}

/**
 * Search products from Google Sheet. Used by Gemini search_products tool.
 * - name: substring match (case-insensitive) on name and title
 * - category: substring match on name/title; jika cocok dengan use-case (vlog, travel, dll.) juga filter by advantages
 * - use_case: filter by product advantages tags (travel, vlog, wedding, pemula, murah, dll.)
 * - price_min / price_max: filter by price (IDR per day)
 */
export async function searchProducts(params: SearchProductsParams): Promise<ProductSearchResult[]> {
  const rows = await getProductsFromSheet();
  let list = rows.filter((p) => (p.status || '').toUpperCase() === 'ACTIVE');

  // ── Filter by name ────────────────────────────────────────────────────────
  const nameQ = (params.name || '').trim().toLowerCase();
  if (nameQ) {
    list = list.filter(
      (p) =>
        (p.name  && p.name.toLowerCase().includes(nameQ)) ||
        (p.title && p.title.toLowerCase().includes(nameQ))
    );
  }

  // ── Filter by category (substring atau use-case) ──────────────────────────
  const categoryQ = (params.category || '').trim().toLowerCase();
  if (categoryQ) {
    const useCaseTags = USE_CASE_TAGS[categoryQ];
    if (useCaseTags) {
      // category cocok ke use-case → filter pakai advantages tags (async)
      const filtered: typeof list = [];
      for (const p of list) {
        const adv = await getProductAdvantages(p.name || p.title || '');
        if (!adv) continue;
        const match = useCaseTags.some(
          (tag) =>
            adv.tags.some((t) => t.toLowerCase().includes(tag)) ||
            adv.cocokUntuk.some((c) => c.toLowerCase().includes(tag))
        );
        if (match) filtered.push(p);
      }
      list = filtered;
    } else {
      // category biasa → substring match
      list = list.filter(
        (p) =>
          (p.name        && p.name.toLowerCase().includes(categoryQ)) ||
          (p.title       && p.title.toLowerCase().includes(categoryQ)) ||
          (p.description && p.description.toLowerCase().includes(categoryQ))
      );
    }
  }

  // ── Filter by use_case ────────────────────────────────────────────────────
  const useCaseQ = (params.use_case || '').trim().toLowerCase();
  if (useCaseQ && USE_CASE_TAGS[useCaseQ]) {
    const useCaseTags = USE_CASE_TAGS[useCaseQ];
    const filtered: typeof list = [];
    for (const p of list) {
      const adv = await getProductAdvantages(p.name || p.title || '');
      if (!adv) continue;
      const match = useCaseTags.some(
        (tag) =>
          adv.tags.some((t) => t.toLowerCase().includes(tag)) ||
          adv.cocokUntuk.some((c) => c.toLowerCase().includes(tag))
      );
      if (match) filtered.push(p);
    }
    list = filtered;
  }

  // ── Filter by price ───────────────────────────────────────────────────────
  if (params.price_min != null && params.price_min > 0) {
    list = list.filter((p) => p.price >= params.price_min!);
  }
  if (params.price_max != null && params.price_max > 0) {
    list = list.filter((p) => p.price <= params.price_max!);
  }

  // ── Limit ─────────────────────────────────────────────────────────────────
  const limit = params.limit != null && params.limit > 0 ? Math.min(params.limit, 50) : undefined;
  const finalList = limit != null ? list.slice(0, limit) : list;

  // ── Map hasil + inject advantages ─────────────────────────────────────────
  const results: ProductSearchResult[] = [];
  for (const p of finalList) {
    const adv = await getProductAdvantages(p.name || p.title || '');
    results.push({
      id:          p.id,
      name:        p.name,
      title:       p.title,
      slug:        p.slug,
      price:       p.price,
      image:       p.image || '',
      description: p.description || '',
      status:      p.status,
      ...(adv && { keunggulan: adv.keunggulan, cocokUntuk: adv.cocokUntuk }),
    });
  }

  return results;
}

/**
 * Get products (alias for searchProducts). Used by AI get_products tool.
 */
export async function getProducts(params: SearchProductsParams): Promise<ProductSearchResult[]> {
  return searchProducts(params);
}

/**
 * Check stock/availability for a product by id or name. Used by AI check_stock tool.
 * Returns product info and available (true if status === 'ACTIVE').
 */
export async function checkStock(
  productId?: string,
  productName?: string
): Promise<{ product: ProductSearchResult | null; available: boolean }> {
  const rows = await getProductsFromSheet();
  let match = null;

  const idQ   = (productId   || '').trim();
  const nameQ = (productName || '').trim().toLowerCase();

  if (idQ) {
    match = rows.find((p) => p.id === idQ || p.slug === idQ);
  }
  if (!match && nameQ) {
    match = rows.find(
      (p) =>
        (p.name  && p.name.toLowerCase().includes(nameQ)) ||
        (p.title && p.title.toLowerCase().includes(nameQ))
    );
  }
  if (!match) return { product: null, available: false };

  const adv = await getProductAdvantages(match.name || match.title || '');

  const product: ProductSearchResult = {
    id:          match.id,
    name:        match.name,
    title:       match.title,
    slug:        match.slug,
    price:       match.price,
    image:       match.image || '',
    description: match.description || '',
    status:      match.status,
    ...(adv && { keunggulan: adv.keunggulan, cocokUntuk: adv.cocokUntuk }),
  };

  return { product, available: (match.status || '').toUpperCase() === 'ACTIVE' };
}