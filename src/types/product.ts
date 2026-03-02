export interface ProductImage {
  id: string;
  image: string;
  product_id: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface PackageComponentProduct {
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
  image?: ProductImage;
}

export interface PackageComponent {
  id: string;
  package_id: string;
  order: number;
  product_id: string;
  product_type: string;
  type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: PackageComponentProduct;
}

export interface DefaultPackage {
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
  components?: PackageComponent[];
}

export interface Product {
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
  category: Category | null;
  manufacturer: Manufacturer | null;
  images: ProductImage[];
  default_package?: DefaultPackage;
}

