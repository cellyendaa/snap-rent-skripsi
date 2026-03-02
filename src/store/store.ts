import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import cartReducer from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    cart: cartReducer,
    order: orderReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

