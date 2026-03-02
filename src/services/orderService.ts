import axios from 'axios';
import type { OrderItem } from '../store/slices/orderSlice';
import type { Product } from '../types/product';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

function loc(v: string): 'jakarta' | 'surabaya' {
  return String(v).toLowerCase().includes('surabaya') ? 'surabaya' : 'jakarta';
}

export function mapApiOrderToOrderItem(o: OrderFromApi): OrderItem {
  const prod = o.product;
  const imageList = prod?.images?.length ? prod.images : (prod?.image ? [prod.image] : []);
  const product: Product = {
    id: o.product_id,
    name: prod?.name ?? o.product_name,
    title: prod?.title ?? o.product_name,
    model: '',
    type: '',
    status: '',
    price: prod?.price ?? o.total_price / Math.max(1, o.rental_days),
    slug: prod?.slug ?? '',
    description: null,
    category_id: '',
    manufacturer_id: '',
    parent_id: null,
    created_at: '',
    updated_at: '',
    category: null,
    manufacturer: null,
    images: imageList.map((image, order) => ({
      id: '',
      image,
      product_id: o.product_id,
      order,
      created_at: '',
      updated_at: '',
    })),
  };
  return {
    id: o.order_id,
    product,
    pickupDate: o.pickup_date,
    pickupTime: o.pickup_time,
    pickupLocation: loc(o.pickup_location),
    returnDate: o.return_date,
    returnTime: o.return_time,
    returnLocation: loc(o.return_location),
    rentalDays: o.rental_days,
    totalPrice: o.total_price,
    status: o.status,
    createdAt: o.created_at,
  };
}

export type OrderStatus = 'belum_diambil' | 'rental_berjalan' | 'selesai' | 'dibatalkan';

export interface CreateOrderPayload {
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

export interface CreateOrderSuccess {
  success: true;
  message: string;
  orderId: string;
  createdAt: string;
  /** Daftar order user (dari data yang sudah di-hit + order baru) untuk halaman /orders */
  orders?: OrderFromApi[];
}

export interface OrderError {
  success: false;
  message: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderSuccess | OrderError> {
  try {
    const { data } = await api.post<CreateOrderSuccess | OrderError>('/orders', payload);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return { success: false, message: (err.response.data as OrderError).message };
    }
    return { success: false, message: err instanceof Error ? err.message : 'Gagal membuat order' };
  }
}

export interface OrderFromApi {
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
}

export interface GetOrdersSuccess {
  success: true;
  orders: OrderFromApi[];
}

export async function getOrders(phoneNumber: string): Promise<GetOrdersSuccess | OrderError> {
  try {
    const { data } = await api.get<GetOrdersSuccess | OrderError>('/orders', {
      params: { phoneNumber: phoneNumber.trim() },
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return { success: false, message: (err.response.data as OrderError).message };
    }
    return { success: false, message: err instanceof Error ? err.message : 'Gagal mengambil daftar order' };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: true } | OrderError> {
  try {
    await api.patch(`/orders/${orderId}`, { status });
    return { success: true };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return { success: false, message: (err.response.data as OrderError).message };
    }
    return { success: false, message: err instanceof Error ? err.message : 'Gagal mengubah status' };
  }
}
