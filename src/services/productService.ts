import axios from 'axios';
import type { Product, ProductImage, Category, Manufacturer, DefaultPackage, PackageComponent, PackageComponentProduct } from '../types/product';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Response types (match backend API)
interface ApiProductImage {
  id: string;
  image: string;
  product_id: string;
  order: number;
  created_at: string;
  updated_at: string;
}

interface ApiCategory {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiManufacturer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface ApiPackageComponentProduct {
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
  image?: ApiProductImage;
}

interface ApiPackageComponent {
  id: string;
  package_id: string;
  order: number;
  product_id: string;
  product_type: string;
  type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: ApiPackageComponentProduct;
}

interface ApiDefaultPackage {
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
  components?: ApiPackageComponent[];
}

interface ApiProduct {
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
  category: ApiCategory | null;
  manufacturer: ApiManufacturer | null;
  images: ApiProductImage[];
  default_package?: ApiDefaultPackage;
}

export interface ProductServiceError {
  success: false;
  message: string;
}

function mapApiImage(img: ApiProductImage): ProductImage {
  return {
    id: img.id,
    image: img.image,
    product_id: img.product_id,
    order: img.order,
    created_at: img.created_at,
    updated_at: img.updated_at,
  };
}

function mapApiCategory(c: ApiCategory | null): Category | null {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    parent_id: c.parent_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function mapApiManufacturer(m: ApiManufacturer | null): Manufacturer | null {
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    slug: m.slug,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

function mapApiPackageComponentProduct(p: ApiPackageComponentProduct | undefined): PackageComponentProduct | undefined {
  if (!p) return undefined;
  return {
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
    image: p.image ? mapApiImage(p.image) : undefined,
  };
}

function mapApiPackageComponent(c: ApiPackageComponent): PackageComponent {
  return {
    id: c.id,
    package_id: c.package_id,
    order: c.order,
    product_id: c.product_id,
    product_type: c.product_type,
    type: c.type,
    quantity: c.quantity,
    created_at: c.created_at,
    updated_at: c.updated_at,
    product: mapApiPackageComponentProduct(c.product),
  };
}

function mapApiDefaultPackage(pkg: ApiDefaultPackage | undefined): DefaultPackage | undefined {
  if (!pkg) return undefined;
  return {
    id: pkg.id,
    name: pkg.name,
    title: pkg.title,
    model: pkg.model,
    type: pkg.type,
    status: pkg.status,
    price: pkg.price,
    slug: pkg.slug,
    description: pkg.description,
    category_id: pkg.category_id,
    manufacturer_id: pkg.manufacturer_id,
    parent_id: pkg.parent_id,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
    components: pkg.components?.map(mapApiPackageComponent),
  };
}

function mapApiProductToProduct(p: ApiProduct): Product {
  return {
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
    category: mapApiCategory(p.category),
    manufacturer: mapApiManufacturer(p.manufacturer),
    images: (p.images ?? []).map(mapApiImage),
    default_package: mapApiDefaultPackage(p.default_package),
  };
}

/** Ambil daftar produk dari endpoint (backend baca dari Google Sheet). Untuk CRUD, edit langsung di spreadsheet. */
export async function getProductsFromApi(): Promise<Product[] | null> {
  try {
    const { data } = await api.get<{ success: true; products: ApiProduct[] } | ProductServiceError>('/products');
    if (data && typeof data === 'object' && 'success' in data && data.success && 'products' in data) {
      return (data as { success: true; products: ApiProduct[] }).products.map(mapApiProductToProduct);
    }
    const msg = data && typeof data === 'object' && 'message' in data ? (data as ProductServiceError).message : null;
    if (msg) console.warn('Get products:', msg);
    return null;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      console.warn('Get products error:', (err.response.data as { message?: string }).message);
    }
    return null;
  }
}

export async function getProductBySlugFromApi(slug: string): Promise<Product | null> {
  try {
    const { data } = await api.get<{ success: true; product: ApiProduct } | ProductServiceError>(
      `/products/by-slug/${encodeURIComponent(slug)}`
    );
    if (data.success && 'product' in data) {
      return mapApiProductToProduct(data.product);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getProductByIdFromApi(id: string): Promise<Product | null> {
  const products = await getProductsFromApi();
  if (!products) return null;
  return products.find((p) => p.id === id) ?? null;
}
