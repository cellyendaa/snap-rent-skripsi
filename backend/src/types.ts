export interface SheetUserRow {
  phone_number: string;
  password: string;
  name: string;
}

export interface LoginRequestBody {
  phoneNumber: string;
  password: string;
}

export interface LoginSuccessResponse {
  success: true;
  message: string;
  user: {
    name: string;
    phoneNumber: string;
  };
}

export interface LoginErrorResponse {
  success: false;
  message: string;
}

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

export interface RegisterRequestBody {
  phoneNumber: string;
  password: string;
  name: string;
}

export interface RegisterSuccessResponse {
  success: true;
  message: string;
  user: { name: string; phoneNumber: string };
}

export interface RegisterErrorResponse {
  success: false;
  message: string;
}

export type RegisterResponse = RegisterSuccessResponse | RegisterErrorResponse;

/** Status values must match app: Belum Diambil, Rental Berjalan, Selesai, Dibatalkan */
export type OrderStatus = 'belum_diambil' | 'rental_berjalan' | 'selesai' | 'dibatalkan';

export interface CreateOrderRequestBody {
  user: { name: string; phoneNumber: string };
  product: { id: string; name?: string; title?: string };
  product_images?: string[];
  package_images?: string[];
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  returnDate: string;
  returnTime: string;
  returnLocation: string;
  rentalDays: number;
  totalPrice: number;
}

export interface CreateOrderSuccessResponse {
  success: true;
  message: string;
  orderId: string;
  createdAt: string;
  /** Daftar order user (data yang sudah di-hit + order baru) untuk dipakai di /orders tanpa refetch */
  orders?: GetOrdersSuccessResponse['orders'];
}

export interface OrderErrorResponse {
  success: false;
  message: string;
}

export interface UpdateOrderStatusRequestBody {
  status: OrderStatus;
}

export interface GetOrdersSuccessResponse {
  success: true;
  orders: Array<{
    order_id: string;
    user_phone: string;
    user_name: string;
    product_name: string;
    product_id: string;
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
    product?: {
      id: string;
      name: string;
      title: string;
      slug: string;
      price: number;
      image: string;
      images: string[];
      package_images: string[];
    };
  }>;
}

export interface ApiCategory {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiManufacturer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ApiProductImage {
  id: string;
  image: string;
  product_id: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ApiPackageComponentProduct {
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

export interface ApiPackageComponent {
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

export interface ApiDefaultPackage {
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

export interface ApiProduct {
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

export interface GetProductsSuccessResponse {
  success: true;
  products: ApiProduct[];
}

export interface GetProductBySlugSuccessResponse {
  success: true;
  product: ApiProduct;
}

// ----- Cart -----
export interface GetCartQuery {
  phoneNumber: string;
}

export interface GetCartSuccessResponse {
  success: true;
  items: Array<{
    product_id: string;
    product_image: string;
    product_name: string;
    price: number;
    slug: string;
    added_at: string;
  }>;
}

export interface PostCartRequestBody {
  phoneNumber: string;
  product_id: string;
  product_image: string;
  product_name?: string;
  price?: number;
  slug?: string;
}

export interface PostCartSuccessResponse {
  success: true;
  message: string;
}

export interface DeleteCartRequestBody {
  phoneNumber: string;
  product_id: string;
}

export interface CartErrorResponse {
  success: false;
  message: string;
}
