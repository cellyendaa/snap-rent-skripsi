#!/usr/bin/env node
/**
 * Generate CSV files from src/data/products.json for import into Google Sheets.
 * Run: node scripts/generate-product-sheets.mjs
 * Output: docs/sheet-csv/*.csv (Categories, Manufacturers, Products, Images, Default_packages, Package_components)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const productsPath = path.join(root, 'src/data/products.json');
const outDir = path.join(root, 'docs/sheet-csv');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowToCsv(row) {
  return row.map(escapeCsv).join(',');
}

function writeCsv(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map((r) => rowToCsv(headers.map((h) => r[h] ?? '')))];
  const filePath = path.join(outDir, filename);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Written:', filePath);
}

const raw = fs.readFileSync(productsPath, 'utf8');
const products = JSON.parse(raw);

const categoriesById = new Map();
const manufacturersById = new Map();
const imagesList = [];
const defaultPackagesList = [];
const packageComponentsList = [];

for (const p of products) {
  if (p.category && p.category.id) {
    categoriesById.set(p.category.id, {
      id: p.category.id,
      name: p.category.name ?? '',
      type: p.category.type ?? '',
      parent_id: p.category.parent_id ?? '',
      created_at: p.category.created_at ?? '',
      updated_at: p.category.updated_at ?? '',
    });
  }
  if (p.manufacturer && p.manufacturer.id) {
    manufacturersById.set(p.manufacturer.id, {
      id: p.manufacturer.id,
      name: p.manufacturer.name ?? '',
      slug: p.manufacturer.slug ?? '',
      created_at: p.manufacturer.created_at ?? '',
      updated_at: p.manufacturer.updated_at ?? '',
    });
  }
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      imagesList.push({
        id: img.id ?? '',
        image: img.image ?? '',
        product_id: img.product_id ?? p.id ?? '',
        order: img.order ?? 0,
        created_at: img.created_at ?? '',
        updated_at: img.updated_at ?? '',
      });
    }
  }
  if (p.default_package && p.default_package.id) {
    const dp = p.default_package;
    defaultPackagesList.push({
      id: dp.id,
      name: dp.name ?? '',
      title: dp.title ?? '',
      model: dp.model ?? '',
      type: dp.type ?? '',
      status: dp.status ?? '',
      price: dp.price ?? 0,
      slug: dp.slug ?? '',
      description: dp.description ?? '',
      category_id: dp.category_id ?? '',
      manufacturer_id: dp.manufacturer_id ?? '',
      parent_id: dp.parent_id ?? p.id ?? '',
      created_at: dp.created_at ?? '',
      updated_at: dp.updated_at ?? '',
    });
    if (Array.isArray(dp.components)) {
      for (const c of dp.components) {
        packageComponentsList.push({
          id: c.id ?? '',
          package_id: c.package_id ?? dp.id ?? '',
          order: c.order ?? 0,
          product_id: c.product_id ?? '',
          product_type: c.product_type ?? 'RentProduct',
          type: c.type ?? '',
          quantity: c.quantity ?? 1,
          created_at: c.created_at ?? '',
          updated_at: c.updated_at ?? '',
        });
      }
    }
  }
}

const categories = Array.from(categoriesById.values());
const manufacturers = Array.from(manufacturersById.values());

const productRows = products.map((p) => ({
  id: p.id,
  name: p.name ?? '',
  title: p.title ?? '',
  model: p.model ?? '',
  type: p.type ?? '',
  status: p.status ?? '',
  price: p.price ?? 0,
  slug: p.slug ?? '',
  description: p.description ?? '',
  category_id: p.category_id ?? '',
  manufacturer_id: p.manufacturer_id ?? '',
  parent_id: p.parent_id ?? '',
  created_at: p.created_at ?? '',
  updated_at: p.updated_at ?? '',
}));

const categoryHeaders = ['id', 'name', 'type', 'parent_id', 'created_at', 'updated_at'];
const manufacturerHeaders = ['id', 'name', 'slug', 'created_at', 'updated_at'];
const productHeaders = [
  'id', 'name', 'title', 'model', 'type', 'status', 'price', 'slug', 'description',
  'category_id', 'manufacturer_id', 'parent_id', 'created_at', 'updated_at',
];
const imageHeaders = ['id', 'image', 'product_id', 'order', 'created_at', 'updated_at'];
const defaultPackageHeaders = [
  'id', 'name', 'title', 'model', 'type', 'status', 'price', 'slug', 'description',
  'category_id', 'manufacturer_id', 'parent_id', 'created_at', 'updated_at',
];
const packageComponentHeaders = [
  'id', 'package_id', 'order', 'product_id', 'product_type', 'type', 'quantity',
  'created_at', 'updated_at',
];

writeCsv('Categories.csv', categoryHeaders, categories);
writeCsv('Manufacturers.csv', manufacturerHeaders, manufacturers);
writeCsv('Products.csv', productHeaders, productRows);
writeCsv('Images.csv', imageHeaders, imagesList);
writeCsv('Default_packages.csv', defaultPackageHeaders, defaultPackagesList);
writeCsv('Package_components.csv', packageComponentHeaders, packageComponentsList);

console.log('Done. Import each CSV into the matching tab in Google Sheets.');
