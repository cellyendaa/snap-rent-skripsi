import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import type { SheetUserRow } from '../types.js';
import type { OrderStatus } from '../types.js';

const ORDER_SHEET_TITLE = process.env.ORDER_SHEET_TITLE || 'Orders';
const PRODUCTS_SHEET_TITLE = process.env.PRODUCTS_SHEET_TITLE || 'Products';
const USERS_SHEET_TITLE = process.env.USERS_SHEET_TITLE || 'Users';
const CATEGORIES_SHEET_TITLE = process.env.CATEGORIES_SHEET_TITLE || 'Categories';
const MANUFACTURERS_SHEET_TITLE = process.env.MANUFACTURERS_SHEET_TITLE || 'Manufacturers';
const IMAGES_SHEET_TITLE = process.env.IMAGES_SHEET_TITLE || 'Images';
const DEFAULT_PACKAGES_SHEET_TITLE = process.env.DEFAULT_PACKAGES_SHEET_TITLE || 'Default_packages';
const PACKAGE_COMPONENTS_SHEET_TITLE = process.env.PACKAGE_COMPONENTS_SHEET_TITLE || 'Package_components';
const CART_SHEET_TITLE = process.env.CART_SHEET_TITLE || 'Cart';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  throw new Error(
    'Missing env: SPREADSHEET_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY are required.'
  );
}

const spreadsheetId = SPREADSHEET_ID;
const clientEmail = GOOGLE_CLIENT_EMAIL;
const privateKey = GOOGLE_PRIVATE_KEY;

let doc: GoogleSpreadsheet | null = null;

async function getDoc(): Promise<GoogleSpreadsheet> {
  if (doc) return doc;
  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const spreadsheet = new GoogleSpreadsheet(spreadsheetId, auth);
  await spreadsheet.loadInfo();
  doc = spreadsheet;
  return doc;
}

async function getSheetByTitle(title: string) {
  const spreadsheet = await getDoc();
  await spreadsheet.loadInfo();
  const sheet = spreadsheet.sheetsByTitle[title];
  if (!sheet) {
    throw new Error(`Sheet "${title}" not found. Add a tab "${title}" or set the corresponding env.`);
  }
  return sheet;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

async function getUsersSheet() {
  const spreadsheet = await getDoc();
  await spreadsheet.loadInfo();
  const sheet = spreadsheet.sheetsByTitle[USERS_SHEET_TITLE];
  if (!sheet) {
    throw new Error(`Sheet "${USERS_SHEET_TITLE}" not found. Add a tab "${USERS_SHEET_TITLE}" with columns: phone_number, password, name`);
  }
  return sheet;
}

const USERS_CACHE_TTL_MS = 1 * 60 * 1000; // 1 menit
let usersCache: { data: SheetUserRow[]; at: number } | null = null;

/**
 * Fetch all user rows from the Users sheet.
 * Expected columns: phone_number, password, name. Header row index 0.
 */
export async function getUsersFromSheet(): Promise<SheetUserRow[]> {
  const now = Date.now();
  if (usersCache && now - usersCache.at < USERS_CACHE_TTL_MS) return usersCache.data;
  const sheet = await getUsersSheet();
  const rows = await sheet.getRows();
  const data = rows.map((row) => ({
    phone_number: String(row.get('phone_number') ?? '').trim(),
    password: String(row.get('password') ?? '').trim(),
    name: String(row.get('name') ?? '').trim(),
  }));
  usersCache = { data, at: Date.now() };
  return data;
}

export async function findUserByCredentials(
  phoneNumber: string,
  password: string
): Promise<SheetUserRow | null> {
  const users = await getUsersFromSheet();
  const normalizedInput = normalizePhone(phoneNumber);
  return (
    users.find(
      (u) => normalizePhone(u.phone_number) === normalizedInput && u.password === password
    ) ?? null
  );
}

export async function isPhoneRegistered(phoneNumber: string): Promise<boolean> {
  const users = await getUsersFromSheet();
  const normalized = normalizePhone(phoneNumber);
  return users.some((u) => normalizePhone(u.phone_number) === normalized);
}

/**
 * Append a new user row to the first sheet. Headers: phone_number, password, name.
 */
export async function addUserToSheet(
  phoneNumber: string,
  password: string,
  name: string
): Promise<void> {
  const sheet = await getUsersSheet();
  await sheet.addRow({
    phone_number: phoneNumber.trim(),
    password: password.trim(),
    name: name.trim(),
  });
  usersCache = null;
}

// ----- Orders -----
async function getOrderSheet() {
  return getSheetByTitle(ORDER_SHEET_TITLE);
}

export interface OrderRowData {
  order_id: string;
  user_phone: string;
  user_name: string;
  product_name: string;
  product_id: string;
  product_images: string;
  package_images: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  return_date: string;
  return_time: string;
  return_location: string;
  rental_days: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export async function addOrderToSheet(data: OrderRowData): Promise<void> {
  ordersCache = null;
  const sheet = await getOrderSheet();
  await sheet.addRow(
    {
      order_id: data.order_id,
      user_phone: data.user_phone,
      user_name: data.user_name,
      product_name: data.product_name,
      product_id: data.product_id,
      product_images: data.product_images,
      package_images: data.package_images,
      pickup_date: data.pickup_date,
      pickup_time: data.pickup_time,
      pickup_location: data.pickup_location,
      return_date: data.return_date,
      return_time: data.return_time,
      return_location: data.return_location,
      rental_days: data.rental_days,
      total_price: data.total_price,
      status: data.status,
      created_at: data.created_at,
    },
    { insert: true }
  );
}

export async function updateOrderStatusInSheet(orderId: string, status: OrderStatus): Promise<boolean> {
  ordersCache = null;
  const sheet = await getOrderSheet();
  const rows = await sheet.getRows();
  const row = rows.find((r) => String(r.get('order_id') ?? '').trim() === orderId);
  if (!row) return false;
  row.set('status', status);
  await row.save();
  return true;
}

// Orders cache: pakai env ORDERS_CACHE_TTL_MINUTES (default 1). Set 0 untuk selalu real-time (tanpa cache).
const ORDERS_CACHE_TTL_MS =
  (typeof process.env.ORDERS_CACHE_TTL_MINUTES !== 'undefined'
    ? Math.max(0, Number(process.env.ORDERS_CACHE_TTL_MINUTES) ?? 1)
    : 1) *
  60 *
  1000;
let ordersCache: { data: OrderRowData[]; at: number } | null = null;

/** Ambil seluruh data dari tab Orders via range unbounded (A2:Z) agar semua baris terbaca meski rowCount sheet belum ter-update setelah append */
export async function getAllOrdersFromSheet(): Promise<OrderRowData[]> {
  const now = Date.now();
  if (ORDERS_CACHE_TTL_MS > 0 && ordersCache && now - ordersCache.at < ORDERS_CACHE_TTL_MS) return ordersCache.data;
  const sheet = await getOrderSheet();

  // Range eksplisit A2:Z1000 agar semua baris terbaca (tidak bergantung ke metadata "last row" sheet yang bisa telat setelah append)
  const headerRow = await sheet.getCellsInRange('A1:Z1');
  const headers: string[] = (headerRow && headerRow[0] ? headerRow[0] : []).map((c: unknown) => String(c ?? '').trim());
  const rawRows = await sheet.getCellsInRange('A2:Z1000');
  const result: OrderRowData[] = [];

  if (!rawRows || !headers.length) {
    ordersCache = { data: [], at: Date.now() };
    return [];
  }

  const get = (row: (string | number)[], key: string): string => {
    const i = headers.indexOf(key);
    return i >= 0 ? String(row[i] ?? '').trim() : '';
  };
  const getNum = (row: (string | number)[], key: string): number => {
    const v = get(row, key);
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const row of rawRows) {
    const r = row as (string | number)[];
    const orderId = get(r, 'order_id');
    if (!orderId) continue; // skip baris kosong
    result.push({
      order_id: orderId,
      user_phone: get(r, 'user_phone'),
      user_name: get(r, 'user_name'),
      product_name: get(r, 'product_name'),
      product_id: get(r, 'product_id'),
      product_images: get(r, 'product_images'),
      package_images: get(r, 'package_images'),
      pickup_date: get(r, 'pickup_date'),
      pickup_time: get(r, 'pickup_time'),
      pickup_location: get(r, 'pickup_location') || 'jakarta',
      return_date: get(r, 'return_date'),
      return_time: get(r, 'return_time'),
      return_location: get(r, 'return_location') || 'jakarta',
      rental_days: getNum(r, 'rental_days') || 0,
      total_price: getNum(r, 'total_price') || 0,
      status: (get(r, 'status') || 'belum_diambil') as OrderStatus,
      created_at: get(r, 'created_at') || new Date().toISOString(),
    });
  }

  const sorted = result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  ordersCache = { data: sorted, at: Date.now() };
  return sorted;
}

export async function getOrdersFromSheetByPhone(phoneNumber: string): Promise<OrderRowData[]> {
  const normalizedInput = normalizePhone(phoneNumber);
  const all = await getAllOrdersFromSheet();
  return all.filter((o) => normalizePhone(o.user_phone) === normalizedInput);
}

// ----- Cart -----
export interface CartRowData {
  user_phone: string;
  product_id: string;
  product_image: string;
  product_name: string;
  price: number;
  slug: string;
  added_at: string;
}

const CART_CACHE_TTL_MS = 1 * 60 * 1000; // 1 menit
const cartCacheByPhone = new Map<string, { data: CartRowData[]; at: number }>();

async function getCartSheet() {
  return getSheetByTitle(CART_SHEET_TITLE);
}

function invalidateCartCacheForUser(phoneNumber: string): void {
  cartCacheByPhone.delete(normalizePhone(phoneNumber));
}

export async function getCartByUser(phoneNumber: string): Promise<CartRowData[]> {
  const key = normalizePhone(phoneNumber);
  const now = Date.now();
  const cached = cartCacheByPhone.get(key);
  if (cached && now - cached.at < CART_CACHE_TTL_MS) return cached.data;

  const sheet = await getCartSheet();
  const rows = await sheet.getRows();
  const data: CartRowData[] = [];
  for (const row of rows) {
    const rowPhone = String(row.get('user_phone') ?? '').trim();
    if (normalizePhone(rowPhone) !== key) continue;
    data.push({
      user_phone: rowPhone,
      product_id: String(row.get('product_id') ?? '').trim(),
      product_image: String(row.get('product_image') ?? '').trim(),
      product_name: String(row.get('product_name') ?? '').trim(),
      price: Number(row.get('price')) || 0,
      slug: String(row.get('slug') ?? '').trim(),
      added_at: String(row.get('added_at') ?? '').trim() || new Date().toISOString(),
    });
  }
  cartCacheByPhone.set(key, { data, at: Date.now() });
  return data;
}

export async function addCartItem(
  phoneNumber: string,
  productId: string,
  productImage: string,
  productName: string,
  price: number,
  slug: string
): Promise<void> {
  invalidateCartCacheForUser(phoneNumber);
  const sheet = await getCartSheet();
  await sheet.addRow({
    user_phone: phoneNumber.trim(),
    product_id: String(productId).trim(),
    product_image: String(productImage || '').trim(),
    product_name: String(productName || '').trim(),
    price: Number(price) || 0,
    slug: String(slug || '').trim(),
    added_at: new Date().toISOString(),
  });
}

export async function removeCartItem(phoneNumber: string, productId: string): Promise<boolean> {
  const key = normalizePhone(phoneNumber);
  invalidateCartCacheForUser(phoneNumber);
  const sheet = await getCartSheet();
  const rows = await sheet.getRows();
  const productIdTrim = String(productId).trim();
  const row = rows.find(
    (r) =>
      normalizePhone(String(r.get('user_phone') ?? '').trim()) === key &&
      String(r.get('product_id') ?? '').trim() === productIdTrim
  );
  if (!row) return false;
  await (row as { delete: () => Promise<void> }).delete();
  return true;
}

// ----- Categories -----
export interface CategoryRow {
  id: string;
  name: string;
  type: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
}

async function getCategoriesFromSheet(): Promise<CategoryRow[]> {
  const sheet = await getSheetByTitle(CATEGORIES_SHEET_TITLE);
  const rows = await sheet.getRows();
  return rows
    .map((row) => ({
      id: String(row.get('id') ?? '').trim(),
      name: String(row.get('name') ?? '').trim(),
      type: String(row.get('type') ?? '').trim(),
      parent_id: String(row.get('parent_id') ?? '').trim(),
      created_at: String(row.get('created_at') ?? '').trim(),
      updated_at: String(row.get('updated_at') ?? '').trim(),
    }))
    .filter((r) => r.id);
}

// ----- Manufacturers -----
export interface ManufacturerRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

async function getManufacturersFromSheet(): Promise<ManufacturerRow[]> {
  const sheet = await getSheetByTitle(MANUFACTURERS_SHEET_TITLE);
  const rows = await sheet.getRows();
  return rows
    .map((row) => ({
      id: String(row.get('id') ?? '').trim(),
      name: String(row.get('name') ?? '').trim(),
      slug: String(row.get('slug') ?? '').trim(),
      created_at: String(row.get('created_at') ?? '').trim(),
      updated_at: String(row.get('updated_at') ?? '').trim(),
    }))
    .filter((r) => r.id);
}

// ----- Products (flat only) -----
export interface ProductRowData {
  id: string;
  name: string;
  title: string;
  slug: string;
  price: number;
  description: string;
  category_id: string;
  manufacturer_id: string;
  parent_id: string;
  status: string;
  model: string;
  type: string;
  created_at: string;
  updated_at: string;
  /** Nama file gambar (untuk seeder & getProductsFromSheet). */
  image?: string;
  images?: string[];
}

function parseProductRow(row: { get: (key: string) => unknown }): ProductRowData {
  const priceVal = row.get('price');
  const price = typeof priceVal === 'number' ? priceVal : Number(priceVal) || 0;
  return {
    id: String(row.get('id') ?? '').trim(),
    name: String(row.get('name') ?? '').trim(),
    title: String(row.get('title') ?? row.get('name') ?? '').trim(),
    slug: String(row.get('slug') ?? '').trim(),
    price,
    description: String(row.get('description') ?? '').trim(),
    category_id: String(row.get('category_id') ?? '').trim(),
    manufacturer_id: String(row.get('manufacturer_id') ?? '').trim(),
    parent_id: String(row.get('parent_id') ?? '').trim(),
    status: String(row.get('status') ?? '').trim(),
    model: String(row.get('model') ?? '').trim(),
    type: String(row.get('type') ?? '').trim(),
    created_at: String(row.get('created_at') ?? '').trim(),
    updated_at: String(row.get('updated_at') ?? '').trim(),
  };
}

async function getProductsSheet(): Promise<Awaited<ReturnType<typeof getSheetByTitle>>> {
  return getSheetByTitle(PRODUCTS_SHEET_TITLE);
}

async function getProductsSheetRows(): Promise<ProductRowData[]> {
  const sheet = await getProductsSheet();
  const rows = await sheet.getRows();
  return rows.map(parseProductRow).filter((p) => p.id);
}

/** Produk + image (untuk productSearchService, AI chat). Merge dari Products + Images sheet. */
export interface ProductRowWithImage extends ProductRowData {
  image: string;
}

let productsWithImageCache: { data: ProductRowWithImage[]; at: number } | null = null;
const PRODUCTS_CACHE_TTL_MS =
  (typeof process.env.SHEETS_CACHE_TTL_MINUTES !== 'undefined'
    ? Math.max(1, Number(process.env.SHEETS_CACHE_TTL_MINUTES) || 5)
    : 5) *
  60 *
  1000;

export async function getProductsFromSheet(): Promise<ProductRowWithImage[]> {
  if (productsWithImageCache && Date.now() - productsWithImageCache.at < PRODUCTS_CACHE_TTL_MS) {
    return productsWithImageCache.data;
  }
  const [products, imageRows] = await Promise.all([
    getProductsSheetRows(),
    getImagesFromSheet().catch(() => [] as ImageRow[]),
  ]);
  const firstImageByProduct = new Map<string, string>();
  const sorted = [...imageRows].sort((a, b) => a.order - b.order);
  for (const img of sorted) {
    if (img.image && !firstImageByProduct.has(img.product_id)) {
      firstImageByProduct.set(img.product_id, img.image);
    }
  }
  const result: ProductRowWithImage[] = products.map((p) => ({
    ...p,
    image: firstImageByProduct.get(p.id) ?? '',
  }));
  productsWithImageCache = { data: result, at: Date.now() };
  return result;
}

// ----- Images -----
export interface ImageRow {
  id: string;
  image: string;
  product_id: string;
  order: number;
  created_at: string;
  updated_at: string;
}

async function getImagesFromSheet(): Promise<ImageRow[]> {
  const sheet = await getSheetByTitle(IMAGES_SHEET_TITLE);
  const rows = await sheet.getRows();
  return rows
    .map((row) => {
      const orderVal = row.get('order');
      const imageVal = row.get('image') ?? row.get('Image') ?? '';
      return {
        id: String(row.get('id') ?? '').trim(),
        image: String(imageVal).trim(),
        product_id: String(row.get('product_id') ?? '').trim(),
        order: typeof orderVal === 'number' ? orderVal : Number(orderVal) || 0,
        created_at: String(row.get('created_at') ?? '').trim(),
        updated_at: String(row.get('updated_at') ?? '').trim(),
      };
    })
    .filter((r) => r.id && r.product_id);
}

// ----- Default_packages -----
export interface DefaultPackageRow {
  id: string;
  name: string;
  title: string;
  model: string;
  type: string;
  status: string;
  price: number;
  slug: string;
  description: string;
  category_id: string;
  manufacturer_id: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
}

function getCell(row: { get: (key: string) => unknown }, ...keys: string[]): string {
  for (const k of keys) {
    const v = row.get(k);
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

async function getDefaultPackagesFromSheet(): Promise<DefaultPackageRow[]> {
  const sheet = await getSheetByTitle(DEFAULT_PACKAGES_SHEET_TITLE);
  const rows = await sheet.getRows();
  return rows
    .map((row) => {
      const priceVal = row.get('price');
      const parentId = getCell(row, 'parent_id', 'Parent_id', 'Parent ID', 'parent id');
      return {
        id: getCell(row, 'id', 'ID'),
        name: getCell(row, 'name', 'Name'),
        title: getCell(row, 'title', 'Title') || '',
        model: getCell(row, 'model', 'Model') || '',
        type: getCell(row, 'type', 'Type') || '',
        status: getCell(row, 'status', 'Status') || '',
        price: typeof priceVal === 'number' ? priceVal : Number(priceVal) || 0,
        slug: getCell(row, 'slug', 'Slug') || '',
        description: getCell(row, 'description', 'Description') || '',
        category_id: getCell(row, 'category_id', 'Category_id', 'category id') || '',
        manufacturer_id: getCell(row, 'manufacturer_id', 'Manufacturer_id', 'manufacturer id') || '',
        parent_id: parentId,
        created_at: getCell(row, 'created_at', 'Created_at', 'created at') || '',
        updated_at: getCell(row, 'updated_at', 'Updated_at', 'updated at') || '',
      };
    })
    .filter((r) => r.id && r.parent_id);
}

// ----- Package_components -----
export interface PackageComponentRow {
  id: string;
  package_id: string;
  order: number;
  product_id: string;
  product_type: string;
  type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

async function getPackageComponentsFromSheet(): Promise<PackageComponentRow[]> {
  const sheet = await getSheetByTitle(PACKAGE_COMPONENTS_SHEET_TITLE);
  const rows = await sheet.getRows();
  return rows
    .map((row) => {
      const orderVal = row.get('order');
      const qtyVal = row.get('quantity');
      const packageId = getCell(row, 'package_id', 'Package_id', 'Package ID', 'package id');
      return {
        id: getCell(row, 'id', 'ID'),
        package_id: packageId,
        order: typeof orderVal === 'number' ? orderVal : Number(orderVal) || 0,
        product_id: getCell(row, 'product_id', 'Product_id', 'Product ID', 'product id'),
        product_type: getCell(row, 'product_type', 'Product_type', 'product type') || 'RentProduct',
        type: getCell(row, 'type', 'Type') || '',
        quantity: typeof qtyVal === 'number' ? qtyVal : Number(qtyVal) || 1,
        created_at: getCell(row, 'created_at', 'Created_at', 'created at') || '',
        updated_at: getCell(row, 'updated_at', 'Updated_at', 'updated at') || '',
      };
    })
    .filter((r) => r.id && r.package_id);
}

// ----- Product with relations (for API) -----
export interface ProductImageDto {
  id: string;
  image: string;
  product_id: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManufacturerDto {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface PackageComponentProductDto {
  id: string;
  name: string;
  title: string;
  model: string;
  type: string;
  status: string;
  price: number;
  slug: string;
  description: string | null;
  category_id: string;
  manufacturer_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  image?: ProductImageDto;
}

export interface PackageComponentDto {
  id: string;
  package_id: string;
  order: number;
  product_id: string;
  product_type: string;
  type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: PackageComponentProductDto;
}

export interface DefaultPackageDto {
  id: string;
  name: string;
  title: string | null;
  model: string;
  type: string;
  status: string;
  price: number;
  slug: string;
  description: string | null;
  category_id: string | null;
  manufacturer_id: string | null;
  parent_id: string;
  created_at: string;
  updated_at: string;
  components?: PackageComponentDto[];
}

export interface ProductWithRelationsDto {
  id: string;
  name: string;
  title: string;
  model: string;
  type: string;
  status: string;
  price: number;
  slug: string;
  description: string | null;
  category_id: string;
  manufacturer_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  category: CategoryDto | null;
  manufacturer: ManufacturerDto | null;
  images: ProductImageDto[];
  default_package?: DefaultPackageDto;
}

function resolveProduct(
  productId: string,
  productById: Map<string, ProductRowData>,
  productBySlug: Map<string, ProductRowData>
): ProductRowData | undefined {
  const idTrim = productId.trim();
  return (
    productById.get(idTrim) ??
    productBySlug.get(idTrim) ??
    (idTrim !== productId ? productById.get(productId) ?? productBySlug.get(productId) : undefined)
  );
}

function buildProductWithRelations(
  product: ProductRowData,
  categories: CategoryRow[],
  manufacturers: ManufacturerRow[],
  imagesByProduct: Map<string, ImageRow[]>,
  defaultPackagesByProduct: Map<string, DefaultPackageRow[]>,
  defaultPackagesByParentSlug: Map<string, DefaultPackageRow[]>,
  componentsByPackage: Map<string, PackageComponentRow[]>,
  productById: Map<string, ProductRowData>,
  productBySlug: Map<string, ProductRowData>,
  imagesByProductId: Map<string, ImageRow[]>,
  includeDefaultPackage: boolean
): ProductWithRelationsDto {
  const category = product.category_id
    ? categories.find((c) => c.id === product.category_id) ?? null
    : null;
  const manufacturer = product.manufacturer_id
    ? manufacturers.find((m) => m.id === product.manufacturer_id) ?? null
    : null;
  const productIdTrim = String(product.id ?? '').trim();
  const imageRows = imagesByProduct.get(productIdTrim) ?? imagesByProduct.get(product.slug?.trim() ?? '') ?? [];
  const images: ProductImageDto[] = imageRows
    .sort((a, b) => a.order - b.order)
    .map((img) => ({
      id: img.id,
      image: img.image,
      product_id: img.product_id,
      order: img.order,
      created_at: img.created_at,
      updated_at: img.updated_at,
    }));

  let default_package: DefaultPackageDto | undefined;
  if (includeDefaultPackage) {
    const pkgRows =
      defaultPackagesByProduct.get(productIdTrim) ??
      defaultPackagesByParentSlug.get(product.slug?.trim() ?? '') ??
      [];
    const pkg = pkgRows[0];
    if (pkg) {
      const compRows = componentsByPackage.get(pkg.id) ?? [];
      const components: PackageComponentDto[] = compRows
        .sort((a, b) => a.order - b.order)
        .map((comp) => {
          const compProduct = resolveProduct(comp.product_id, productById, productBySlug);
          const resolvedId = compProduct?.id ?? comp.product_id;
          const idTrim = String(resolvedId ?? '').trim();
          const compIdTrim = String(comp.product_id ?? '').trim();

          let compImages: ImageRow[] =
            imagesByProductId.get(idTrim) ??
            imagesByProductId.get(compIdTrim) ??
            [];
          if (compImages.length === 0 && compProduct?.slug) {
            compImages = imagesByProductId.get(compProduct.slug.trim()) ?? [];
          }
          if (compImages.length === 0 && compProduct?.id === product.id) {
            compImages = imageRows;
          }

          const sorted = [...compImages].sort((a, b) => a.order - b.order);
          const firstImage = sorted[0];
          const imageDto =
            firstImage ?
              {
                id: firstImage.id,
                image: firstImage.image,
                product_id: firstImage.product_id,
                order: firstImage.order,
                created_at: firstImage.created_at,
                updated_at: firstImage.updated_at,
              }
            : undefined;

          const productDto: PackageComponentProductDto = compProduct
            ? {
                id: compProduct.id,
                name: compProduct.name,
                title: compProduct.title,
                model: compProduct.model,
                type: compProduct.type,
                status: compProduct.status,
                price: compProduct.price,
                slug: compProduct.slug,
                description: compProduct.description || null,
                category_id: compProduct.category_id,
                manufacturer_id: compProduct.manufacturer_id,
                parent_id: compProduct.parent_id || null,
                created_at: compProduct.created_at,
                updated_at: compProduct.updated_at,
                image: imageDto,
              }
            : {
                id: comp.product_id,
                name: '',
                title: '',
                model: '',
                type: '',
                status: '',
                price: 0,
                slug: '',
                description: null,
                category_id: '',
                manufacturer_id: '',
                parent_id: null,
                created_at: '',
                updated_at: '',
                image: imageDto,
              };

          return {
            id: comp.id,
            package_id: comp.package_id,
            order: comp.order,
            product_id: comp.product_id,
            product_type: comp.product_type,
            type: comp.type,
            quantity: comp.quantity,
            created_at: comp.created_at,
            updated_at: comp.updated_at,
            product: productDto,
          };
        });
      default_package = {
        id: pkg.id,
        name: pkg.name,
        title: pkg.title || null,
        model: pkg.model,
        type: pkg.type,
        status: pkg.status,
        price: pkg.price,
        slug: pkg.slug,
        description: pkg.description || null,
        category_id: pkg.category_id || null,
        manufacturer_id: pkg.manufacturer_id || null,
        parent_id: pkg.parent_id,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at,
        components,
      };
    }
  }

  return {
    id: product.id,
    name: product.name,
    title: product.title,
    model: product.model,
    type: product.type,
    status: product.status,
    price: product.price,
    slug: product.slug,
    description: product.description || null,
    category_id: product.category_id,
    manufacturer_id: product.manufacturer_id,
    parent_id: product.parent_id || null,
    created_at: product.created_at,
    updated_at: product.updated_at,
    category: category
      ? {
          id: category.id,
          name: category.name,
          type: category.type,
          parent_id: category.parent_id || null,
          created_at: category.created_at,
          updated_at: category.updated_at,
        }
      : null,
    manufacturer: manufacturer
      ? {
          id: manufacturer.id,
          name: manufacturer.name,
          slug: manufacturer.slug,
          created_at: manufacturer.created_at,
          updated_at: manufacturer.updated_at,
        }
      : null,
    images,
    ...(default_package && { default_package }),
  };
}

let productsWithRelationsCache: { full: ProductWithRelationsDto[]; at: number } | null = null;
let inFlightRelationsPromise: Promise<ProductWithRelationsDto[]> | null = null;
const RELATIONS_CACHE_TTL_MS =
  (typeof process.env.SHEETS_CACHE_TTL_MINUTES !== 'undefined'
    ? Math.max(1, Number(process.env.SHEETS_CACHE_TTL_MINUTES) || 5)
    : 5) *
  60 *
  1000;

export async function getProductsWithRelations(includeDefaultPackage = false): Promise<ProductWithRelationsDto[]> {
  const now = Date.now();
  if (productsWithRelationsCache && now - productsWithRelationsCache.at < RELATIONS_CACHE_TTL_MS) {
    return productsWithRelationsCache.full;
  }
  if (inFlightRelationsPromise) {
    await inFlightRelationsPromise;
    if (productsWithRelationsCache) return productsWithRelationsCache.full;
  }

  const doFetch = async (): Promise<ProductWithRelationsDto[]> => {
    const [products, categories, manufacturers, images, defaultPackages, packageComponents] =
      await Promise.all([
        getProductsSheetRows(),
        getCategoriesFromSheet(),
        getManufacturersFromSheet(),
        getImagesFromSheet(),
        getDefaultPackagesFromSheet(),
        getPackageComponentsFromSheet(),
      ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const productBySlug = new Map(products.map((p) => [p.slug, p]));
    const imagesByProduct = new Map<string, ImageRow[]>();
    for (const img of images) {
      const key = String(img.product_id ?? '').trim();
      if (!key) continue;
      const list = imagesByProduct.get(key) ?? [];
      list.push(img);
      imagesByProduct.set(key, list);
    }
    const imagesByProductId = new Map<string, ImageRow[]>();
    for (const [key, list] of imagesByProduct) {
      imagesByProductId.set(key, list);
    }
    for (const p of products) {
      const list = imagesByProductId.get(p.id) ?? imagesByProduct.get(p.id) ?? [];
      if (list.length > 0) {
        imagesByProductId.set(p.id, list);
        if (p.slug) imagesByProductId.set(p.slug.trim(), list);
      }
    }
    const defaultPackagesByProduct = new Map<string, DefaultPackageRow[]>();
    for (const pkg of defaultPackages) {
      const pid = String(pkg.parent_id ?? '').trim();
      if (!pid) continue;
      const list = defaultPackagesByProduct.get(pid) ?? [];
      list.push(pkg);
      defaultPackagesByProduct.set(pid, list);
    }
    const defaultPackagesByParentSlug = new Map<string, DefaultPackageRow[]>();
    for (const p of products) {
      const list = defaultPackagesByProduct.get(p.id) ?? [];
      if (list.length > 0 && p.slug) {
        defaultPackagesByParentSlug.set(p.slug.trim(), list);
      }
    }
    const componentsByPackage = new Map<string, PackageComponentRow[]>();
    for (const c of packageComponents) {
      const pid = String(c.package_id ?? '').trim();
      if (!pid) continue;
      const list = componentsByPackage.get(pid) ?? [];
      list.push(c);
      componentsByPackage.set(pid, list);
    }

    return products.map((p) =>
      buildProductWithRelations(
        p,
        categories,
        manufacturers,
        imagesByProduct,
        defaultPackagesByProduct,
        defaultPackagesByParentSlug,
        componentsByPackage,
        productById,
        productBySlug,
        imagesByProductId,
        true
      )
    );
  };

  inFlightRelationsPromise = doFetch();
  try {
    const result = await inFlightRelationsPromise;
    productsWithRelationsCache = { full: result, at: Date.now() };
    return result;
  } finally {
    inFlightRelationsPromise = null;
  }
}

export async function getProductBySlugWithRelations(slug: string): Promise<ProductWithRelationsDto | null> {
  const products = await getProductsWithRelations(true);
  const slugTrim = String(slug).trim();
  return products.find((p) => p.slug === slugTrim) ?? null;
}

export async function getProductByIdFromSheet(id: string): Promise<ProductRowData | null> {
  const products = await getProductsSheetRows();
  const idTrim = String(id).trim();
  return products.find((p) => p.id === idTrim || p.slug === idTrim) ?? null;
}

/**
 * Append product rows to the Products sheet (e.g. for seeder).
 * Headers must exist: id, name, title, model, type, status, price, slug, description,
 * category_id, manufacturer_id, parent_id, created_at, updated_at, image, images.
 */
export async function addProductRowsToSheet(rows: ProductRowData[]): Promise<void> {
  const sheet = await getProductsSheet();
  for (const p of rows) {
    await sheet.addRow({
      id: p.id,
      name: p.name,
      title: p.title,
      model: p.model,
      type: p.type,
      status: p.status,
      price: p.price,
      slug: p.slug,
      description: p.description,
      category_id: p.category_id,
      manufacturer_id: p.manufacturer_id,
      parent_id: p.parent_id,
      created_at: p.created_at,
      updated_at: p.updated_at,
      image: p.image ?? '',
      images: Array.isArray(p.images) ? p.images.join(',') : '',
    });
  }
}
