import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ArrowLeft, Info, Menu, X, Wallet } from 'lucide-react';
import { formatCurrency, getProductImageUrl } from '../utils/products';
import type { Product } from '../types/product';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { addOrder, setOrders } from '../store/slices/orderSlice';
import { removeFromCart } from '../store/slices/cartSlice';
import { createOrder, mapApiOrderToOrderItem } from '../services/orderService';

// Helpers for react-datepicker <-> string state (YYYY-MM-DD, HH:mm)
const toDateString = (d: Date | null) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const toTimeString = (d: Date | null) => {
  if (!d) return '00:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
/** Waktu saja (tanggal tetap 1970-01-01 agar tidak bentrok dengan hari terpilih) */
const timeAt = (hours: number, minutes: number) =>
  new Date(1970, 0, 1, hours, minutes, 0, 0);

/** Parse date+time string jadi Date; kembalikan null jika invalid */
const parseSafeDate = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr?.trim() || !timeStr?.trim()) return null;
  const d = new Date(`${dateStr.trim()}T${timeStr.trim()}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const PICKUP_LOCATION = 'jakarta';
const RETURN_LOCATION = 'jakarta';
const PICKUP_TIME_MIN = '09:00';
const PICKUP_TIME_MAX = '18:00';

const BookNow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const product = (location.state as { product?: Product })?.product;
  const user = useAppSelector((state) => state.auth.user);
  const cartItems = useAppSelector((state) => state.cart.items);
  const [orderSubmitError, setOrderSubmitError] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  const currentDateTime = getCurrentDateTime();

  // Waktu pengambilan min 09:00, max 18:00 — clamp default ke rentang itu
  const initialPickupTime =
    currentDateTime.time < PICKUP_TIME_MIN
      ? PICKUP_TIME_MIN
      : currentDateTime.time > PICKUP_TIME_MAX
        ? PICKUP_TIME_MAX
        : currentDateTime.time;

  // Calculate default return date (1 day after pickup)
  const getDefaultReturnDate = (pickup: string, time: string = '09:00') => {
    if (!pickup) return '';
    const pickupDate = new Date(`${pickup}T${time}`);
    pickupDate.setDate(pickupDate.getDate() + 1);
    const year = pickupDate.getFullYear();
    const month = String(pickupDate.getMonth() + 1).padStart(2, '0');
    const day = String(pickupDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State
  const [pickupDate, setPickupDate] = useState(currentDateTime.date);
  const [pickupTime, setPickupTime] = useState(initialPickupTime);
  const [returnDate, setReturnDate] = useState(getDefaultReturnDate(currentDateTime.date, initialPickupTime));
  const [returnTime, setReturnTime] = useState('09:00');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  // const [showBankList, setShowBankList] = useState(false);
  const [showPriceChart, setShowPriceChart] = useState(false);
  const [showAvailabilityInfo, setShowAvailabilityInfo] = useState(false);
  const [showPricingInfo, setShowPricingInfo] = useState(false);
  const priceChartModalRef = useRef<HTMLDivElement>(null);
  const availabilityModalRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const pricingInfoButtonRef = useRef<HTMLButtonElement>(null);
  const pricingInfoModalRef = useRef<HTMLDivElement>(null);

  // Bank list for Transfer Bank
  // const banks = [
  //   { id: 'bca', name: 'BCA' },
  //   { id: 'bri', name: 'BRI' },
  //   { id: 'bni', name: 'BNI' },
  //   { id: 'mandiri', name: 'Mandiri' },
  // ];

  // Calculate days (minimum 1 day)
  const rentalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 1;
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const returnDt = new Date(`${returnDate}T${returnTime}`);
    const diffTime = returnDt.getTime() - pickup.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1; // Minimum 1 day
  }, [pickupDate, pickupTime, returnDate, returnTime]);

  // Update return date when pickup date changes (always 1 day after)
  useEffect(() => {
    if (pickupDate) {
      const defaultReturn = getDefaultReturnDate(pickupDate, pickupTime);
      // Always set return date to at least 1 day after pickup
      setReturnDate((prevReturn) => {
        if (!prevReturn) return defaultReturn;
        const currentReturn = new Date(`${prevReturn}T${returnTime}`);
        const minReturn = new Date(`${defaultReturn}T${returnTime}`);
        // If return date is before minimum (1 day after pickup), update it
        return currentReturn < minReturn ? defaultReturn : prevReturn;
      });
    }
  }, [pickupDate, pickupTime, returnTime]);

  // Calculate price breakdown
  const priceBreakdown = useMemo(() => {
    if (!product || rentalDays < 1) {
      return {
        rentDays: 1,
        freeDays: 0,
        subtotal: product?.price || 0,
        discount: 0,
        discountPercent: 0,
        total: product?.price || 0,
      };
    }

    const pricePerDay = product.price || 0;
    let effectiveDays = rentalDays;

    // Calculate free days (Sewa 2 hari gratis 1 hari)
    let freeDays = 0;
    if (rentalDays >= 3) {
      const setsOfThree = Math.floor(rentalDays / 3);
      freeDays = setsOfThree;
      effectiveDays = setsOfThree * 2 + (rentalDays % 3);
    }

    // Calculate subtotal
    const subtotal = effectiveDays * pricePerDay;

    // Calculate discount
    let discountPercent = 0;
    if (rentalDays >= 7 && rentalDays <= 13) {
      discountPercent = 10;
    } else if (rentalDays >= 14) {
      discountPercent = 20;
    }

    const discount = subtotal * (discountPercent / 100);
    const total = subtotal - discount;

    return {
      rentDays: rentalDays,
      freeDays,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      discountPercent,
      total: Math.round(total),
    };
  }, [product, rentalDays]);

  // Calculate rental price based on days
  const calculateRentalPrice = useMemo(() => {
    return (days: number): { totalPrice: number; pricePerDay: number } => {
      if (!product) return { totalPrice: 0, pricePerDay: 0 };

      const pricePerDay = product.price || 0;
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
  }, [product]);

  // Calculate price for 3 days
  const price3Days = useMemo(() => {
    if (!product) return 0;
    return calculateRentalPrice(3).totalPrice;
  }, [product, calculateRentalPrice]);

  // Price chart data
  const priceChartData = useMemo(() => {
    if (!product) return [];
    const days = [1, 3, 7, 10, 12, 15];
    return days.map((day) => {
      const { totalPrice, pricePerDay } = calculateRentalPrice(day);
      return { days: day, totalPrice, pricePerDay };
    });
  }, [product, calculateRentalPrice]);

  // Redirect if no product
  useEffect(() => {
    if (!product) {
      navigate('/');
    }
  }, [product, navigate]);

  const isInactive = product ? (product.status || '').toUpperCase() === 'INACTIVE' : false;

  // Redirect if product is INACTIVE (tidak dapat dipesan)
  useEffect(() => {
    if (product && isInactive) {
      navigate(`/product/${product.slug}`, { replace: true });
    }
  }, [product, isInactive, navigate]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        priceChartModalRef.current &&
        !priceChartModalRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-price-chart-button]')
      ) {
        setShowPriceChart(false);
      }
      if (
        availabilityModalRef.current &&
        !availabilityModalRef.current.contains(event.target as Node) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target as Node)
      ) {
        setShowAvailabilityInfo(false);
      }
    };

    if (showPriceChart || showAvailabilityInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPriceChart, showAvailabilityInfo]);

  if (!product) {
    return null;
  }

  const mainImage = product.images?.[0];

  if (isInactive) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Rental Period & Location Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Rental Period & Location
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Pickup */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pengambilan <span className="text-red-500">*</span>
            </label>
            <div className="relative flex flex-wrap sm:flex-nowrap items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-visible">
              <DatePicker
                selected={parseSafeDate(pickupDate, pickupTime)}
                onChange={(d: Date | null) => {
                  if (d) {
                    setPickupDate(toDateString(d));
                    setPickupTime(toTimeString(d));
                  }
                }}
                minDate={startOfDay(new Date())}
                minTime={
                  pickupDate === currentDateTime.date
                    ? (() => {
                        const now = new Date();
                        const nine = timeAt(9, 0);
                        return now > nine ? nine : nine;
                      })()
                    : timeAt(9, 0)
                }
                maxTime={timeAt(18, 0)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Pilih tanggal & jam"
                className="flex-1 w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none text-sm sm:text-base cursor-pointer"
                calendarClassName="react-datepicker--dark-aware"
                wrapperClassName="flex-1 min-w-[200px]"
                withPortal
                popperClassName="react-datepicker-popper-z"
              />
              <span className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap">
                WIB
              </span>
            </div>
          </div>

          {/* Return */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pengembalian <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-visible">
              <DatePicker
                selected={parseSafeDate(returnDate, returnTime)}
                onChange={(d: Date | null) => {
                  if (d) {
                    setReturnDate(toDateString(d));
                    setReturnTime(toTimeString(d));
                  }
                }}
                minDate={(() => {
                  const min = parseSafeDate(pickupDate, pickupTime);
                  if (!min) return undefined;
                  const next = new Date(min);
                  next.setDate(next.getDate() + 1);
                  const start = startOfDay(next);
                  return Number.isNaN(start.getTime()) ? undefined : start;
                })()}
                minTime={timeAt(9, 0)}
                maxTime={timeAt(21, 0)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Pilih tanggal & jam"
                className="flex-1 w-full min-w-0 px-4 py-3 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none text-sm cursor-pointer"
                calendarClassName="react-datepicker--dark-aware"
                wrapperClassName="flex-1 min-w-[200px]"
                withPortal
                popperClassName="react-datepicker-popper-z"
              />
              <span className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap">
                WIB
              </span>
            </div>
          </div>

          {/* Day Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Day Count <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden">
              <input
                type="number"
                value={rentalDays}
                readOnly
                className="flex-1 px-4 py-3 border-0 bg-transparent text-gray-900 dark:text-white text-center font-medium cursor-not-allowed"
              />
              <div className="flex flex-col border-l border-gray-300 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    if (returnDate) {
                      const newReturn = new Date(`${returnDate}T${returnTime}`);
                      newReturn.setDate(newReturn.getDate() + 1);
                      const year = newReturn.getFullYear();
                      const month = String(newReturn.getMonth() + 1).padStart(2, '0');
                      const day = String(newReturn.getDate()).padStart(2, '0');
                      setReturnDate(`${year}-${month}-${day}`);
                    }
                  }}
                  className="px-3 py-1.5 border-0 border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs transition-colors"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (returnDate && rentalDays > 1) {
                      const newReturn = new Date(`${returnDate}T${returnTime}`);
                      newReturn.setDate(newReturn.getDate() - 1);
                      const year = newReturn.getFullYear();
                      const month = String(newReturn.getMonth() + 1).padStart(2, '0');
                      const day = String(newReturn.getDate()).padStart(2, '0');
                      const newReturnDate = `${year}-${month}-${day}`;
                      // Ensure minimum 1 day
                      const pickup = new Date(`${pickupDate}T${pickupTime}`);
                      const newReturnDt = new Date(`${newReturnDate}T${returnTime}`);
                      if (newReturnDt > pickup) {
                        setReturnDate(newReturnDate);
                      }
                    }
                  }}
                  disabled={rentalDays <= 1}
                  className="px-3 py-1.5 border-0 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side - Product Info & Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <div className="space-y-4">
            <div className="md:flex md:flex-row sm:flex sm:flex-col sm:justify-center gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {mainImage && (
                <div className="lg:w-32 lg:h-32 md:w-36 md:h-36 w-full h-full flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={getProductImageUrl(mainImage.image)}
                    alt={product.title || product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {product.title || product.name}
                </h1>

                {/* Pricing Section */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-row justify-between items-start mb-4">
                  <div className='flex flex-col'>
                    <div className="flex flex-row items-start space-x-10">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 relative">
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(product.price || 0)}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">/ day</span>
                          <button
                            ref={pricingInfoButtonRef}
                            onClick={() => setShowPricingInfo(!showPricingInfo)}
                            className="ml-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                            aria-label="Pricing information"
                          >
                            <Info size={16} className='text-amber-400' />
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
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency(price3Days)}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400"> / 3 days</span>
                        </div>
                      </div>

                    </div>
                    {/* Availability Section */}
                    <div className="flex items-center gap-2 relative pt-5">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Available</span>
                      <button
                        ref={infoButtonRef}
                        onClick={() => setShowAvailabilityInfo(!showAvailabilityInfo)}
                        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Availability information"
                      >
                        <Info size={18} className='text-amber-400'/>
                      </button>

                      {/* Availability Info Modal */}
                      {showAvailabilityInfo && (
                        <div
                          ref={availabilityModalRef}
                          className="absolute left-32 top-8 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Available by request</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Unavailable</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    data-price-chart-button
                    onClick={() => setShowPriceChart(true)}
                    className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-semibold hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  >
                    <Menu size={16} />
                    <span>Price Chart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Package Contents */}
          {/* {product.default_package?.components && product.default_package.components.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Package</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {product.default_package.components.map((component) => {
                  const componentProduct = component.product;
                  const componentImage = componentProduct?.image?.image || '';
                  return (
                    <div
                      key={component.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {componentImage && (
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden">
                          <img
                            src={getProductImageUrl(componentImage)}
                            alt={componentProduct?.name || 'Component'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {component.quantity > 1 && `${component.quantity} * `}
                          {componentProduct?.title || componentProduct?.name || 'Component'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )} */}
        </div>

        {/* Right Side - Price Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            {/* Payment Method */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Metode Pembayaran.<span className="text-red-500">*</span>
              </h2>
              <div className="space-y-3">
                {/* Bayar Di Tempat */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    paymentMethod === 'bayar_di_tempat'
                      ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bayar_di_tempat"
                    checked={paymentMethod === 'bayar_di_tempat'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 focus:ring-2"
                  />
                  <Wallet size={20} className="text-gray-700 dark:text-gray-300" />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                    Bayar Di Tempat
                  </span>
                </label>

                {/* Transfer Bank */}
                {/* <div>
                  <div
                    onClick={() => setShowBankList(!showBankList)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === 'transfer_bank'
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer_bank"
                      checked={paymentMethod === 'transfer_bank'}
                      onChange={() => {}}
                      disabled
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 focus:ring-2 cursor-not-allowed pointer-events-none"
                    />
                    <Building2 size={20} className="text-gray-500 dark:text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-500">
                      Transfer Bank
                    </span>
                    <div className="p-1 text-gray-400">
                      {showBankList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {showBankList && (
                    <div className="mt-2 ml-7 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {banks.map((bank) => (
                        <div
                          key={bank.id}
                          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500"
                        >
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          <span>{bank.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}

                {/* Kartu Kredit / Debit */}
                {/* <label
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-not-allowed transition-colors ${
                    paymentMethod === 'kartu_kredit'
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="kartu_kredit"
                    checked={paymentMethod === 'kartu_kredit'}
                    onChange={() => {}}
                    disabled
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 focus:ring-2 cursor-not-allowed"
                  />
                  <CreditCard size={20} className="text-gray-500 dark:text-gray-500" />
                  <span className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-500">
                    Kartu Kredit / Debit
                  </span>
                </label> */}
              </div>
            </div>

            {/* Rental Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rental Summary
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Rent: {priceBreakdown.rentDays} days
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatCurrency(priceBreakdown.rentDays * (product.price || 0))}
                  </span>
                </div>

                {priceBreakdown.freeDays > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Free: {priceBreakdown.freeDays} days
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(priceBreakdown.freeDays * (product.price || 0))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatCurrency(priceBreakdown.subtotal)}
                  </span>
                </div>

                {priceBreakdown.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Discount: {priceBreakdown.discountPercent}%
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(priceBreakdown.discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(priceBreakdown.total)}
                  </span>
                </div>
              </div>

              {orderSubmitError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">{orderSubmitError}</p>
                </div>
              )}

              {/* Book Now Button */}
              <button
              onClick={async () => {
                if (!product || rentalDays < 1 || !returnDate || paymentMethod !== 'bayar_di_tempat') return;
                setOrderSubmitError(null);
                setOrderSubmitting(true);

                if (user) {
                  const productImages = product.images?.map((img) => img.image).filter(Boolean) ?? [];
                  const packageImages =
                    product.default_package?.components?.flatMap((c) =>
                      c.product?.image?.image ? [c.product.image.image] : []
                    ) ?? [];
                  const result = await createOrder({
                    user: { name: user.name, phoneNumber: user.phoneNumber },
                    product: { id: product.id, name: product.name, title: product.title },
                    product_images: productImages,
                    package_images: packageImages,
                    pickupDate,
                    pickupTime,
                    pickupLocation: PICKUP_LOCATION,
                    returnDate,
                    returnTime,
                    returnLocation: RETURN_LOCATION,
                    rentalDays,
                    totalPrice: priceBreakdown.total,
                  });
                  setOrderSubmitting(false);

                  if (result.success) {
                    if (result.orders?.length) {
                      dispatch(setOrders(result.orders.map(mapApiOrderToOrderItem)));
                    } else {
                      dispatch(
                        addOrder({
                          product,
                          pickupDate,
                          pickupTime,
                          pickupLocation: PICKUP_LOCATION as 'jakarta',
                          returnDate,
                          returnTime,
                          returnLocation: RETURN_LOCATION as 'jakarta',
                          rentalDays,
                          totalPrice: priceBreakdown.total,
                          status: 'belum_diambil',
                          id: result.orderId,
                          createdAt: result.createdAt,
                        })
                      );
                    }
                    const cartItem = cartItems.find((item) => item.product.id === product.id);
                    if (cartItem) dispatch(removeFromCart(product.id));
                    navigate('/orders', { state: { fromBookNow: true } });
                  } else {
                    setOrderSubmitError(result.message);
                  }
                } else {
                  dispatch(
                    addOrder({
                      product,
                      pickupDate,
                      pickupTime,
                      pickupLocation: PICKUP_LOCATION as 'jakarta',
                      returnDate,
                      returnTime,
                      returnLocation: RETURN_LOCATION as 'jakarta',
                      rentalDays,
                      totalPrice: priceBreakdown.total,
                      status: 'belum_diambil',
                    })
                  );
                  setOrderSubmitting(false);
                  const cartItem = cartItems.find((item) => item.product.id === product.id);
                  if (cartItem) dispatch(removeFromCart(product.id));
                  navigate('/orders');
                }
              }}
              disabled={rentalDays < 1 || !returnDate || !product || isInactive || paymentMethod !== 'bayar_di_tempat' || orderSubmitting}
              className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {orderSubmitting ? 'Memproses...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default BookNow;

