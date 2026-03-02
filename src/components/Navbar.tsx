import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, ShoppingCart, X, Package, LogIn, LogOut } from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { toggleTheme } from '../store/slices/uiSlice';
import { removeFromCart } from '../store/slices/cartSlice';
import { logout } from '../store/slices/authSlice';
import { formatCurrency, getProductImageUrl } from '../utils/products';
import { useAuthModal } from '../context/AuthModalContext';
import { removeFromCartApi } from '../services/cartService';

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { requireLogin } = useAuthModal();
  const theme = useAppSelector((state) => state.ui.theme);
  const user = useAppSelector((state) => state.auth.user);
  const cartItems = useAppSelector((state) => state.cart.items);
  const orders = useAppSelector((state) => state.order.orders);
  const [showCartModal, setShowCartModal] = useState(false);
  
  // Count orders that are not completed or cancelled
  const activeOrdersCount = orders.filter(
    (order) => order.status !== 'selesai' && order.status !== 'dibatalkan'
  ).length;
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const cartModalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cartModalRef.current &&
        !cartModalRef.current.contains(event.target as Node) &&
        cartButtonRef.current &&
        !cartButtonRef.current.contains(event.target as Node)
      ) {
        setShowCartModal(false);
      }
    };

    if (showCartModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCartModal]);

  const handleBookNow = (product: { id: string }) => {
    requireLogin(() => {
      navigate('/book-now', { state: { product } });
      setShowCartModal(false);
    }, 'Login untuk memesan dari keranjang.');
  };

  const handleRemoveFromCart = async (productId: string) => {
    if (user) {
      const res = await removeFromCartApi({ phoneNumber: user.phoneNumber, product_id: productId });
      if (!res.success) return;
    }
    dispatch(removeFromCart(productId));
  };

  const cartCount = cartItems.length;

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
            SnapRent
          </Link>
          <div className="flex items-center gap-3">
            {/* Auth: Login link or user + Logout */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                  Hi, {user.name}
                </span>
                <button
                  onClick={() => {
                    dispatch(logout());
                    window.location.href = '/';
                  }}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Log out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                aria-label="Log in"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            {/* Orders Button */}
            <button
              onClick={() => navigate('/orders')}
              className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Orders"
            >
              <Package size={20} />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              ref={cartButtonRef}
              onClick={() => setShowCartModal(!showCartModal)}
              className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowCartModal(false)}
          />

          {/* Modal - positioned relative to cart button */}
          <div
            ref={cartModalRef}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden transform transition-all duration-300"
            style={{
              top: '4.5rem',
              right: '1rem',
              maxWidth: 'min(calc(100vw - 2rem), 28rem)',
            }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Project ({cartCount})
              </h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <ShoppingCart size={48} className="text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {cartItems.map((item) => {
                    const mainImage = item.product.images?.[0];
                    const detailUrl = `/product/${item.product.slug || item.product.id}`;
                    return (
                      <div
                        key={item.product.id}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <Link
                          to={detailUrl}
                          onClick={() => setShowCartModal(false)}
                          className="flex flex-1 min-w-0 gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {mainImage && (
                            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              <img
                                src={getProductImageUrl(mainImage.image)}
                                alt={item.product.title || item.product.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-amber-600 dark:hover:text-amber-400">
                              {item.product.title || item.product.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {formatCurrency(item.product.price ?? 0)} / day
                            </p>
                          </div>
                        </Link>
                        <div className="flex flex-col gap-2 justify-center">
                          <button
                            onClick={() => handleBookNow(item.product)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            Book
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;

