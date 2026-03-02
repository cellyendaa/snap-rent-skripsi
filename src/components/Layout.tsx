import { useEffect } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import Navbar from './Navbar';
import FloatingChat from './FloatingChat';
import { AuthModalProvider } from '../context/AuthModalContext';
import { getCart } from '../services/cartService';
import { setCartItems, clearCart, cartApiItemToCartItem } from '../store/slices/cartSlice';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const theme = useAppSelector((state) => state.ui.theme);
  const user = useAppSelector((state) => state.auth.user);
  const loadedForUser = useAppSelector((state) => state.cart.loadedForUser);
  const dispatch = useAppDispatch();

  // Saat user login: ambil keranjang dari API sekali (tidak di-hit berkali-kali)
  useEffect(() => {
    if (!user) {
      dispatch(clearCart());
      return;
    }
    if (loadedForUser === user.phoneNumber) return; // sudah di-load untuk user ini
    getCart(user.phoneNumber).then((res) => {
      if (res.success) {
        const items = res.items.map(cartApiItemToCartItem);
        dispatch(setCartItems({ items, phoneNumber: user.phoneNumber }));
      }
    });
  }, [user?.phoneNumber, loadedForUser, dispatch]);

  useEffect(() => {
    // Apply theme on mount and when theme changes
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  return (
    <AuthModalProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <Navbar />
        <main className="container mx-auto px-4 py-8">{children}</main>
        <FloatingChat />
      </div>
    </AuthModalProvider>
  );
};

export default Layout;

