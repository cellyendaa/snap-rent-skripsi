/**
 * Seeder: upload products from products.json to the Google Sheet "Products" tab.
 * Run from repo root: npm run seed --prefix backend
 * Or from backend: npm run seed (expects ../src/data/products.json)
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { addProductRowsToSheet, type ProductRowData } from '../src/services/sheetService.js';

interface ProductImageItem {
  image?: string;
}

interface ProductJson {
  id: string;
  name: string;
  title: string | null;
  model?: string;
  type?: string;
  status?: string;
  price: number;
  slug: string;
  description: string | null;
  category_id?: string;
  manufacturer_id?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  images?: ProductImageItem[];
}

function getProductsPath(): string {
  const fromRoot = resolve(process.cwd(), 'src', 'data', 'products.json');
  const fromBackend = resolve(process.cwd(), '..', 'src', 'data', 'products.json');
  if (existsSync(fromRoot)) return fromRoot;
  if (existsSync(fromBackend)) return fromBackend;
  throw new Error(
    `products.json not found. Tried:\n  ${fromRoot}\n  ${fromBackend}\nRun from repo root or backend folder.`
  );
}

function mapProductToRow(p: ProductJson): ProductRowData {
  const images = p.images ?? [];
  const imageNames = images.map((i) => i.image).filter(Boolean) as string[];
  const firstImage = imageNames[0] ?? '';

  return {
    id: String(p.id ?? '').trim(),
    name: String(p.name ?? '').trim(),
    title: String(p.title ?? p.name ?? '').trim(),
    slug: String(p.slug ?? '').trim(),
    price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
    image: firstImage,
    images: imageNames,
    description: String(p.description ?? '').trim(),
    category_id: String(p.category_id ?? '').trim(),
    manufacturer_id: String(p.manufacturer_id ?? '').trim(),
    parent_id: String(p.parent_id ?? '').trim(),
    status: String(p.status ?? 'ACTIVE').trim(),
    model: String(p.model ?? '').trim(),
    type: String(p.type ?? '').trim(),
    created_at: String(p.created_at ?? '').trim(),
    updated_at: String(p.updated_at ?? '').trim(),
  };
}

async function main() {
  const path = getProductsPath();
  console.log('Reading', path);
  const raw = readFileSync(path, 'utf-8');
  const json = JSON.parse(raw) as ProductJson[];
  if (!Array.isArray(json)) {
    throw new Error('products.json must be an array of product objects');
  }

  const rows = json.map(mapProductToRow).filter((r) => r.id);
  console.log(`Seeding ${rows.length} products to Google Sheet "Products" tab...`);
  await addProductRowsToSheet(rows);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
