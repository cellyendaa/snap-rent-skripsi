import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const AUTH_STORAGE_KEY = 'snap_rent_user';

export interface AuthUser {
  name: string;
  phoneNumber: string;
}

function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.name && parsed?.phoneNumber) return parsed;
  } catch {
    // ignore
  }
  return null;
}

interface AuthState {
  user: AuthUser | null;
}

const initialState: AuthState = {
  user: loadUserFromStorage(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(action.payload));
      } catch {
        // ignore
      }
    },
    logout: (state) => {
      state.user = null;
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
