import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface CartItemFromApi {
  product_id: string;
  product_image: string;
  product_name: string;
  price: number;
  slug: string;
  added_at: string;
}

export interface GetCartSuccess {
  success: true;
  items: CartItemFromApi[];
}

export interface CartApiError {
  success: false;
  message: string;
}

export async function getCart(phoneNumber: string): Promise<GetCartSuccess | CartApiError> {
  try {
    const { data } = await api.get<GetCartSuccess | CartApiError>('/cart', {
      params: { phoneNumber },
    });
    return data;
  } catch (e) {
    const msg = axios.isAxiosError(e) && e.response?.data?.message ? e.response.data.message : 'Gagal mengambil keranjang';
    return { success: false, message: msg };
  }
}

export interface AddToCartPayload {
  phoneNumber: string;
  product_id: string;
  product_image: string;
  product_name?: string;
  price?: number;
  slug?: string;
}

export interface PostCartSuccess {
  success: true;
  message: string;
}

export async function addToCartApi(payload: AddToCartPayload): Promise<PostCartSuccess | CartApiError> {
  try {
    const { data } = await api.post<PostCartSuccess | CartApiError>('/cart', payload);
    return data;
  } catch (e) {
    const msg = axios.isAxiosError(e) && e.response?.data?.message ? e.response.data.message : 'Gagal menambah ke keranjang';
    return { success: false, message: msg };
  }
}

export interface RemoveFromCartPayload {
  phoneNumber: string;
  product_id: string;
}

export async function removeFromCartApi(payload: RemoveFromCartPayload): Promise<{ success: true; message: string } | CartApiError> {
  try {
    const { data } = await api.delete<{ success: true; message: string } | CartApiError>('/cart', {
      data: payload,
    });
    return data;
  } catch (e) {
    const msg = axios.isAxiosError(e) && e.response?.data?.message ? e.response.data.message : 'Gagal menghapus dari keranjang';
    return { success: false, message: msg };
  }
}
