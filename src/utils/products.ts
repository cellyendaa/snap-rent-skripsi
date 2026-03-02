import productsData from '../data/products.json';
import type { Product } from '../types/product';

export const getProducts = (): Product[] => {
  return productsData as Product[];
};

export const getProductBySlug = (slug: string): Product | undefined => {
  const products = getProducts();
  return products.find((product) => product.slug === slug);
};

export const getProductById = (id: string): Product | undefined => {
  const products = getProducts();
  return products.find((product) => product.id === id);
};

/** Extract Google Drive file ID from view URL, or null if not a Drive link */
function getDriveFileId(url: string): string | null {
  const trimmed = String(url || '').trim();
  const m =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * URL gambar produk. Sumber: tab Images, kolom "image".
 * - Link Google Drive: diload lewat proxy backend (/api/proxy-image?id=...) agar gambar pasti tampil.
 * - Link http/https lain: dipakai apa adanya.
 * - Jika nama file saja: path lokal /products/xxx.
 */
export const getProductImageUrl = (imageValue: string): string => {
  const v = imageValue && String(imageValue).trim();
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const driveId = getDriveFileId(v);
    if (driveId) return `/api/proxy-image?id=${encodeURIComponent(driveId)}`;
    return v;
  }
  const base = import.meta.env.VITE_PRODUCT_IMAGE_BASE ?? '';
  const path = `${base.replace(/\/$/, '')}/products/${v}`;
  
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Untuk card produk di chat: pakai image dari API (Sheet), kalau kosong ambil dari products.json by id/slug.
 */
export function getProductImageForChat(p: {
  image?: string;
  id?: string;
  slug?: string;
}): string {
  const fromApi = p.image && String(p.image).trim();
  if (fromApi) return getProductImageUrl(fromApi);
  const bySlug = p.slug ? getProductBySlug(p.slug) : undefined;
  const byId = p.id ? getProductById(p.id) : undefined;
  const product = bySlug ?? byId;
  const firstImage = product && typeof product === 'object' && 'images' in product ? product.images?.[0]?.image : undefined;
  if (firstImage) return getProductImageUrl(firstImage);
  return '';
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
