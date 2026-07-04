import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types/product';

export interface OrderItem {
  id: string;
  product: Product;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: 'jakarta';
  returnDate: string;
  returnTime: string;
  returnLocation: 'jakarta';
  rentalDays: number;
  totalPrice: number;
  status: 'belum_diambil' | 'rental_berjalan' | 'selesai' | 'dibatalkan';
  createdAt: string;
}

interface OrderState {
  orders: OrderItem[];
}

const initialState: OrderState = {
  orders: [],
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    addOrder: (state, action: PayloadAction<Omit<OrderItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>) => {
      const payload = action.payload;
      const newOrder: OrderItem = {
        ...payload,
        id: payload.id ?? `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };
      state.orders.push(newOrder);
    },
    updateOrderStatus: (
      state,
      action: PayloadAction<{ orderId: string; status: OrderItem['status'] }>
    ) => {
      const order = state.orders.find((o) => o.id === action.payload.orderId);
      if (order) {
        order.status = action.payload.status;
      }
    },
    removeOrder: (state, action: PayloadAction<string>) => {
      state.orders = state.orders.filter((order) => order.id !== action.payload);
    },
    setOrders: (state, action: PayloadAction<OrderItem[]>) => {
      state.orders = action.payload;
    },
  },
});

export const { addOrder, updateOrderStatus, removeOrder, setOrders } = orderSlice.actions;
export default orderSlice.reducer;

