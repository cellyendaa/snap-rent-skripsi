import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Grid3x3, Calendar, Info, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, getProductImageUrl } from '../utils/products';
import { getProductBySlugFromApi } from '../services/productService';
import type { PackageComponent } from '../types/product';
import type { Product } from '../types/product';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { addToCart } from '../store/slices/cartSlice';
import { useAuthModal } from '../context/AuthModalContext';
import { addToCartApi } from '../services/cartService';

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { requireLogin } = useAuthModal();
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(!!slug);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      setProductLoading(false);
      return;
    }
    setProductLoading(true);
    getProductBySlugFromApi(slug)
      .then((p) => setProduct(p ?? null))
      .finally(() => setProductLoading(false));
  }, [slug]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAvailabilityInfo, setShowAvailabilityInfo] = useState(false);
  const [showPriceChart, setShowPriceChart] = useState(false);
  const [showPricingInfo, setShowPricingInfo] = useState(false);
  const [selectedPackageComponent, setSelectedPackageComponent] = useState<PackageComponent | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const availabilityModalRef = useRef<HTMLDivElement>(null);
  const priceChartModalRef = useRef<HTMLDivElement>(null);
  const packageModalRef = useRef<HTMLDivElement>(null);
  const addToProjectButtonRef = useRef<HTMLButtonElement>(null);
  const pricingInfoButtonRef = useRef<HTMLButtonElement>(null);
  const pricingInfoModalRef = useRef<HTMLDivElement>(null);

  const images = product?.images || [];
  const mainImage = images[selectedImageIndex] || images[0];
  const pricePerDay = product?.price || 0;

  // Calculate price based on rental days with discounts
  const calculateRentalPrice = useMemo(() => {
    return (days: number): { totalPrice: number; pricePerDay: number } => {
      let totalPrice = 0;
      let effectiveDays = days;

      // Rule 1: Sewa 2 hari gratis 1 hari (berlaku kelipatan)
      if (days >= 3) {
        const setsOfThree = Math.floor(days / 3);
        const remainder = days % 3;
        effectiveDays = setsOfThree * 2 + remainder;
      }

      // Calculate base price
      totalPrice = effectiveDays * pricePerDay;

      // Rule 2: Sewa 7-13 hari, diskon 10%
      if (days >= 7 && days <= 13) {
        totalPrice = totalPrice * 0.9;
      }
      // Rule 3: Sewa >=14 hari, diskon 20%
      else if (days >= 14) {
        totalPrice = totalPrice * 0.8;
      }

      // Calculate average price per day
      const avgPricePerDay = totalPrice / days;

      return {
        totalPrice: Math.round(totalPrice),
        pricePerDay: Math.round(avgPricePerDay),
      };
    };
  }, [pricePerDay]);

  // Generate price chart data
  const priceChartData = useMemo(() => {
    if (!product) return [];
    const days = [1, 3, 7, 10, 12, 15];
    return days.map((day) => {
      const { totalPrice, pricePerDay } = calculateRentalPrice(day);
      return { days: day, totalPrice, pricePerDay };
    });
  }, [calculateRentalPrice, product]);

  const price3Days = product ? calculateRentalPrice(3).totalPrice : 0;

  // Navigation functions for images
  const goToPreviousImage = () => {
    if (images.length > 0) {
      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }
  };

  const goToNextImage = () => {
    if (images.length > 0) {
      setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!product || images.length <= 1) return;
    const handleKeyPress = (event: KeyboardEvent) => {
      if (images.length <= 1) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const doAddToCart = async () => {
    if (!product) return;
    if (user) {
      const imageUrl = mainImage?.image ?? product.images?.[0]?.image ?? '';
      const res = await addToCartApi({
        phoneNumber: user.phoneNumber,
        product_id: product.id,
        product_image: imageUrl,
        product_name: product.title || product.name,
        price: product.price ?? 0,
        slug: product.slug || '',
      });
      if (!res.success) return; // optional: toast error
    }
    dispatch(addToCart(product));
  };

  // Handle Add to Project with animation
  const handleAddToProject = () => {
    if (!product) return;

    // Get button position
    const button = addToProjectButtonRef.current;
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;

    // Get cart icon position (assuming it's in navbar)
    const cartIcon = document.querySelector('[aria-label="Shopping cart"]') as HTMLElement;
    if (!cartIcon) {
      doAddToCart();
      return;
    }

    const cartRect = cartIcon.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    // Create animated element
    setIsAnimating(true);
    const animatedElement = document.createElement('div');
    animatedElement.style.cssText = `
      position: fixed;
      left: ${startX - 10}px;
      top: ${startY - 10}px;
      width: 20px;
      height: 20px;
      background: #d97706;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
      transform: translate(0, 0) scale(1);
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    document.body.appendChild(animatedElement);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        animatedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.3)`;
        animatedElement.style.opacity = '0.8';
      });
    });

    // Clean up and add to cart
    setTimeout(() => {
      if (document.body.contains(animatedElement)) {
        document.body.removeChild(animatedElement);
      }
      doAddToCart();
      setIsAnimating(false);
    }, 600);
  };

  // Close availability modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        availabilityModalRef.current &&
        !availabilityModalRef.current.contains(event.target as Node) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target as Node)
      ) {
        setShowAvailabilityInfo(false);
      }
      if (
        pricingInfoModalRef.current &&
        !pricingInfoModalRef.current.contains(event.target as Node) &&
        pricingInfoButtonRef.current &&
        !pricingInfoButtonRef.current.contains(event.target as Node)
      ) {
        setShowPricingInfo(false);
      }
    };

    if (showAvailabilityInfo || showPricingInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvailabilityInfo, showPricingInfo]);

  // Close price chart modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        priceChartModalRef.current &&
        !priceChartModalRef.current.contains(event.target as Node)
      ) {
        setShowPriceChart(false);
      }
    };

    if (showPriceChart) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showPriceChart]);

  // Close package modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        packageModalRef.current &&
        !packageModalRef.current.contains(event.target as Node)
      ) {
        setSelectedPackageComponent(null);
      }
    };

    if (selectedPackageComponent) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [selectedPackageComponent]);

  // Early return after all hooks
  if (productLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Memuat produk...</p>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-gray-500 dark:text-gray-400">Produk tidak ditemukan</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:opacity-90"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const isInactive = (product.status || '').toUpperCase() === 'INACTIVE';

  return (
    <div className="space-y-8">
      {isInactive && (
        <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Produk ini saat ini tidak tersedia untuk disewa.</p>
          <p className="text-sm mt-1">Status: Tidak aktif. Silakan pilih produk lain atau cek lagi nanti.</p>
        </div>
      )}
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative w-full h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group">
            {mainImage ? (
              <img
                src={getProductImageUrl(mainImage.image)}
                alt={product.title || product.name}
                className="w-full h-full object-contain transition-opacity duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Next Button */}
                <button
                  onClick={goToNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 dark:bg-gray-900/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                  <img
                    src={getProductImageUrl(img.image)}
                    alt={`${product.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Product Details */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {product.title || product.name}
            </h1>
            {/* Brand */}
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Brand <span className='text-amber-400'>{product.manufacturer?.name || ''}</span>
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-row justify-between">
            <div className='flex flex-row items-center space-x-10'>
              <div className='flex flex-col'>
                <div className="flex items-center gap-2 relative">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(pricePerDay)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">/ day</span>
                  <button
                    ref={pricingInfoButtonRef}
                    onClick={() => setShowPricingInfo(!showPricingInfo)}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Pricing information"
                  >
                    <Info size={16} className='text-amber-400'/>
                  </button>
                  
                  {/* Pricing Info Modal */}
                  {showPricingInfo && (
                    <div
                      ref={pricingInfoModalRef}
                      className="absolute left-36 right-0 top-8 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]"
                    >
                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        <p>1 day = 24 hours</p>
                        <p>Rent 2 days, free 1 day</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-yellow-400 dark:text-white">
                    {formatCurrency(price3Days)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400"> / 3 days</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPriceChart(true)}
              className="flex items-center gap-2 text-sm text-yellow-400 font-semibold hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Menu size={16} />
              <span>Price Chart</span>
            </button>
          </div>

          {/* Availability */}
          <div className="space-y-3 relative">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Availability</h3>
              <button
                ref={infoButtonRef}
                onClick={() => setShowAvailabilityInfo(!showAvailabilityInfo)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Availability information"
              >
                <Info size={18} className='text-amber-400'/>
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Jakarta</span>
              </div>
            </div>

            {/* Availability Info Modal */}
            {showAvailabilityInfo && (
              <div
                ref={availabilityModalRef}
                className="absolute top-0 left-32 mt-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[200px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Availability Info
                  </h4>
                  <button
                    onClick={() => setShowAvailabilityInfo(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                  </button>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span>Available by request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Unavailable</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              ref={addToProjectButtonRef}
              onClick={() => requireLogin(handleAddToProject, 'Login untuk menambahkan ke Project.')}
              disabled={isAnimating || isInactive}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              <Grid3x3 size={20} />
              <span>{isInactive ? 'Tidak tersedia' : 'Add to Project'}</span>
            </button>
            <button
              onClick={() => !isInactive && requireLogin(() => navigate('/book-now', { state: { product } }), 'Login untuk memesan rental.')}
              disabled={isInactive}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-amber-600 text-amber-600 dark:text-amber-500 dark:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-400 disabled:text-gray-500 font-semibold rounded-lg transition-colors"
            >
              <Calendar size={20} />
              <span>{isInactive ? 'Tidak dapat dipesan' : 'Book Now'}</span>
            </button>
          </div>

          {/* Info Text */}
          <div className='flex flex-row bg-gray-200 dark:bg-slate-600 p-5 rounded-lg space-x-2 items-start'>
            <Info size={18} className='text-black dark:text-gray-200'/>
          <p className="text-xs text-black dark:text-gray-200">
            Place the item in the project to view the estimated rental cost and confirm the booking
            to our Online Customer Service.
          </p>
          </div>
        </div>
      </div>

      {/* Package Contents */}
      {/* {packageComponents.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Package</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {packageComponents.map((component) => {
              const componentProduct = component.product;
              const componentImage = componentProduct?.image?.image || '';
              return (
                <button
                  key={component.id}
                  onClick={() => setSelectedPackageComponent(component)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all cursor-pointer text-left w-full"
                >
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {componentImage ? (
                      <img
                        src={getProductImageUrl(componentImage)}
                        alt={componentProduct?.name || 'Component'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23e5e7eb" width="80" height="80"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs text-center px-1">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {component.quantity > 1 && `${component.quantity} * `}
                      {componentProduct?.title || componentProduct?.name || 'Component'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )} */}

      {/* Price Chart Modal */}
      {showPriceChart && (
        <div className="fixed -inset-full z-50 flex items-center justify-center p-4">
          {/* Backdrop with fade animation */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowPriceChart(false)}
          />

          {/* Modal with slide and fade animation */}
          <div
            ref={priceChartModalRef}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 md:scale-100 opacity-100 scale-x-50 scale-y-75"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Price Chart</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {product.title || product.name}
                </p>
              </div>
              <button
                onClick={() => setShowPriceChart(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Days
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Rental Price
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Price per day
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceChartData.map((item, index) => (
                      <tr
                        key={item.days}
                        className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${index % 2 === 0
                            ? 'bg-gray-50 dark:bg-gray-900/50'
                            : 'bg-white dark:bg-gray-800'
                          }`}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                          {item.days} {item.days === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(item.pricePerDay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing Rules Info */}
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Pricing Rules:
                </h3>
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <li>• Sewa 2 hari gratis 1 hari (berlaku kelipatan)</li>
                  <li>• Sewa 7-13 hari, diskon 10%</li>
                  <li>• Sewa ≥14 hari, diskon 20%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Component Modal */}
      {selectedPackageComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with fade animation */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedPackageComponent(null)}
          />

          {/* Modal with slide and fade animation */}
          <div
            ref={packageModalRef}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Package Item Details</h2>
              <button
                onClick={() => setSelectedPackageComponent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Product Image */}
              <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {selectedPackageComponent.product?.image?.image ? (
                  <img
                    src={getProductImageUrl(selectedPackageComponent.product.image.image)}
                    alt={selectedPackageComponent.product.name || 'Product'}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="256" height="256"%3E%3Crect fill="%23e5e7eb" width="256" height="256"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">No Image</span>
                )}
              </div>

              {/* Product Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedPackageComponent.quantity > 1 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {selectedPackageComponent.quantity} ×{' '}
                      </span>
                    )}
                    {selectedPackageComponent.product?.title ||
                      selectedPackageComponent.product?.name ||
                      'Component'}
                  </h3>
                  {selectedPackageComponent.product?.name &&
                    selectedPackageComponent.product.name !==
                      selectedPackageComponent.product.title && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedPackageComponent.product.name}
                      </p>
                    )}
                </div>

                {/* Product Details */}
                <div className="space-y-3">
                  {selectedPackageComponent.product?.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedPackageComponent.product.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedPackageComponent.product?.model && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Model
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedPackageComponent.product.model}
                        </p>
                      </div>
                    )}

                    {selectedPackageComponent.product?.status && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedPackageComponent.product.status}
                        </p>
                      </div>
                    )}

                    {selectedPackageComponent.quantity && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Quantity
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedPackageComponent.quantity} unit
                          {selectedPackageComponent.quantity > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {selectedPackageComponent.type && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedPackageComponent.type}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedPackageComponent.product?.price !== undefined &&
                    selectedPackageComponent.product.price > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Price
                        </h4>
                        <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency(selectedPackageComponent.product.price)}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;

