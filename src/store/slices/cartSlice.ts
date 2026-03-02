import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types/product';
import type { CartItemFromApi } from '../../services/cartService';

export interface CartItem {
  product: Product;
  addedAt: string;
}

/** Build minimal Product from cart API item (untuk tampilan di keranjang & link ke detail) */
export function cartApiItemToCartItem(api: CartItemFromApi): CartItem {
  const product: Product = {
    id: api.product_id,
    name: api.product_name,
    title: api.product_name,
    model: '',
    type: '',
    status: '',
    price: api.price ?? 0,
    slug: api.slug || api.product_id,
    description: null,
    category_id: '',
    manufacturer_id: '',
    parent_id: null,
    created_at: '',
    updated_at: '',
    category: null,
    manufacturer: null,
    images: api.product_image ? [{ id: '', image: api.product_image, product_id: api.product_id, order: 0, created_at: '', updated_at: '' }] : [],
  };
  return { product, addedAt: api.added_at };
}

interface CartState {
  items: CartItem[];
  /** Setelah login, cart di-load dari API sekali; tidak di-hit berkali-kali kecuali ada perubahan */
  loadedForUser: string | null;
}

const initialState: CartState = {
  items: [],
  loadedForUser: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** Isi keranjang dari API (dipanggil setelah login); hanya sekali per user */
    setCartItems: (state, action: PayloadAction<{ items: CartItem[]; phoneNumber: string }>) => {
      state.items = action.payload.items;
      state.loadedForUser = action.payload.phoneNumber;
    },
    addToCart: (state, action: PayloadAction<Product>) => {
      const product = action.payload;
      const existingItem = state.items.find((item) => item.product.id === product.id);
      if (!existingItem) {
        state.items.push({
          product,
          addedAt: new Date().toISOString(),
        });
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.product.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.loadedForUser = null;
    },
  },
});

export const { setCartItems, addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

