import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { formatCurrency, getProductImageUrl } from '../../utils/products';
import { getProductByIdFromApi } from '../../services/productService';
import { Phone, Navigation, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { updateOrderStatus } from '../../store/slices/orderSlice';
import { updateOrderStatus as updateOrderStatusApi } from '../../services/orderService';
import type { OrderItem } from '../../store/slices/orderSlice';

/**
 * Parse date string (YYYY-MM-DD, DD-MM-YYYY, atau DD/MM/YYYY) + time lalu format untuk tampilan.
 * Menghindari "Invalid Date" bila format dari sheet tidak standar.
 */
function formatOrderDateTime(dateStr: string, timeStr: string): string {
  const d = (dateStr || '').trim();
  const t = (timeStr || '').trim();
  if (!d) return t ? `${t} WIB` : '-';

  let isoDate = d;
  const dashMatch = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const slashMatch = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (slashMatch) {
    const [, day, month, year] = slashMatch;
    isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return t ? `${d} ${t} WIB` : d;
  }

  const date = t ? new Date(`${isoDate}T${t}`) : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return t ? `${d} ${t} WIB` : d;

  const formatted = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return t ? `${formatted} ${t} WIB` : formatted;
}

export type OrderVariant = 'belum_diambil' | 'rental_berjalan' | 'selesai' | 'dibatalkan';

const locationData = {
  jakarta: {
    name: 'SnapRent Jakarta',
    address: 'Jl. Sisingamangaraja, RT.2/RW.1, Selong, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12110',
    phone: '085559532093',
    hours: 'Jam Buka: 24 hours',
    whatsapp: '6285813247562',
    mapsUrl: 'https://www.google.com/maps/place/Universitas+Al+Azhar+Indonesia/@-6.2347822,106.7990055,17z/data=!4m14!1m7!3m6!1s0x2e69f141731e7063:0x5c76e93c1857863b!2sUniversitas+Al+Azhar+Indonesia!8m2!3d-6.2347822!4d106.7990055!16s%2Fg%2F121v7l7q!3m5!1s0x2e69f141731e7063:0x5c76e93c1857863b!8m2!3d-6.2347822!4d106.7990055!16s%2Fg%2F121v7l7q?entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D',
  },
};

const emptyStateConfig: Record<
  OrderVariant,
  { message: string; showMulaiPesan?: boolean }
> = {
  belum_diambil: {
    message: 'Belum ada pesanan yang belum diambil',
    showMulaiPesan: true,
  },
  rental_berjalan: {
    message: 'Belum ada rental yang sedang berjalan',
  },
  selesai: {
    message: 'Belum ada pesanan yang selesai',
  },
  dibatalkan: {
    message: 'Belum ada pesanan yang dibatalkan',
  },
};

interface OrderListByStatusProps {
  variant: OrderVariant;
}

const OrderListByStatus = ({ variant }: OrderListByStatusProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) =>
    state.order.orders.filter((o) => o.status === variant)
  );
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const config = emptyStateConfig[variant];

  const handleCancelOrder = (orderId: string) => {
    setCancelOrderId(orderId);
  };

  const confirmCancel = async () => {
    if (!cancelOrderId) return;
    await updateOrderStatusApi(cancelOrderId, 'dibatalkan');
    dispatch(updateOrderStatus({ orderId: cancelOrderId, status: 'dibatalkan' }));
    setCancelOrderId(null);
  };

  const handlePesanKembali = async (order: OrderItem) => {
    const slug = order.product.slug;
    if (slug) {
      navigate(`/product/${slug}`);
      return;
    }
    const product = await getProductByIdFromApi(order.product.id);
    if (product?.slug) {
      navigate(`/product/${product.slug}`);
    } else {
      navigate('/');
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-gray-500 dark:text-gray-400 text-lg">{config.message}</p>
        {config.showMulaiPesan && (
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
          >
            Mulai Pesan
          </button>
        )}
      </div>
    );
  }

  const showDetailLayout =
    variant === 'rental_berjalan' || variant === 'selesai' || variant === 'dibatalkan';
  const showPesanKembali = variant === 'selesai' || variant === 'dibatalkan';

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        const mainImage = order.product.images?.[0];
        const location = locationData[order.pickupLocation];
        const pickupFormatted = formatOrderDateTime(order.pickupDate, order.pickupTime);
        const returnFormatted = formatOrderDateTime(order.returnDate, order.returnTime);

        if (variant === 'belum_diambil') {
          return (
            <div
              key={order.id}
              className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <button
                onClick={() => handleCancelOrder(order.id)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Cancel order"
              >
                <X size={20} />
              </button>

              <div className="flex gap-6 pr-12">
                {mainImage && (
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={getProductImageUrl(mainImage.image)}
                      alt={order.product.title || order.product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
                    {order.product.title || order.product.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {formatCurrency(order.product.price || 0)} / day
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Pengambilan:</span>{' '}
                      {pickupFormatted}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Pengembalian:</span>{' '}
                      {returnFormatted}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Durasi:</span> {order.rentalDays} hari
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {formatCurrency(order.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      {location.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{location.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://wa.me/${location.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                      onMouseEnter={() => setHoveredIcon(`phone-${order.id}`)}
                      onMouseLeave={() => setHoveredIcon(null)}
                    >
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors cursor-pointer">
                        <Phone size={20} className="text-green-600 dark:text-green-400" />
                      </div>
                      {hoveredIcon === `phone-${order.id}` && (
                        <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-xl">
                          {location.phone}
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                        </div>
                      )}
                    </a>
                    <a
                      href={location.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                      onMouseEnter={() => setHoveredIcon(`map-${order.id}`)}
                      onMouseLeave={() => setHoveredIcon(null)}
                    >
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors cursor-pointer">
                        <Navigation size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      {hoveredIcon === `map-${order.id}` && (
                        <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-xl">
                          Lihat petunjuk arah
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                        </div>
                      )}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (showDetailLayout) {
          return (
            <div
              key={order.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Foto produk */}
                {mainImage && (
                  <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={getProductImageUrl(mainImage.image)}
                      alt={order.product.title || order.product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                </div>
                )}
                <div className="flex-1 min-w-0 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {order.product.title || order.product.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(order.product.price || 0)} / hari
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="font-medium">Pengambilan:</span>{' '}
                      {pickupFormatted}
                      {location?.name ? ` · ${location.name}` : ''}
                    </div>
                    <div>
                      <span className="font-medium">Pengembalian:</span>{' '}
                      {returnFormatted}
                      {locationData[order.returnLocation]?.name ? ` · ${locationData[order.returnLocation].name}` : ''}
                    </div>
                    <div>
                      <span className="font-medium">Durasi:</span> {order.rentalDays} hari
                    </div>
                    <div className="pt-1">
                      <span className="font-medium">Total:</span>{' '}
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {formatCurrency(order.totalPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {location.address}
                  </div>

                  {showPesanKembali && (
                    <button
                      onClick={() => handlePesanKembali(order)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <RotateCcw size={18} />
                      Pesan Kembali
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}

      {variant === 'belum_diambil' && cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCancelOrderId(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Batalkan Rental?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Apakah anda yakin untuk membatalkan rental?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelOrderId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderListByStatus;
