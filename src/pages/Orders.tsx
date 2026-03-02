import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import BelumDiambil from '../components/orders/BelumDiambil';
import RentalBerjalan from '../components/orders/RentalBerjalan';
import Selesai from '../components/orders/Selesai';
import Dibatalkan from '../components/orders/Dibatalkan';
import { setOrders } from '../store/slices/orderSlice';
import { getOrders, mapApiOrderToOrderItem } from '../services/orderService';

type TabType = 'belum_diambil' | 'rental_berjalan' | 'selesai' | 'dibatalkan';

const Orders = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const orders = useAppSelector((state) => state.order.orders);
  const [activeTab, setActiveTab] = useState<TabType>('belum_diambil');
  const [loading, setLoading] = useState(!!user);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.phoneNumber) {
      setLoading(false);
      return;
    }
    // Jangan timpa state yang baru di-set dari BookNow (POST): pakai data dari response POST
    const fromBookNow = (location.state as { fromBookNow?: boolean })?.fromBookNow === true;
    if (fromBookNow && orders.length > 0) {
      setLoading(false);
      return;
    }
    setFetchError(null);
    setLoading(true);
    getOrders(user.phoneNumber)
      .then((res) => {
        if (res.success) {
          dispatch(setOrders(res.orders.map(mapApiOrderToOrderItem)));
        } else {
          setFetchError(res.message);
        }
      })
      .catch(() => setFetchError('Gagal memuat daftar order'))
      .finally(() => setLoading(false));
  }, [user?.phoneNumber, dispatch]);

  const tabs = [
    { id: 'belum_diambil' as TabType, label: 'Belum Diambil', count: orders.filter((o) => o.status === 'belum_diambil').length },
    { id: 'rental_berjalan' as TabType, label: 'Rental Berjalan', count: orders.filter((o) => o.status === 'rental_berjalan').length },
    { id: 'selesai' as TabType, label: 'Selesai', count: orders.filter((o) => o.status === 'selesai').length },
    { id: 'dibatalkan' as TabType, label: 'Dibatalkan', count: orders.filter((o) => o.status === 'dibatalkan').length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'belum_diambil':
        return <BelumDiambil />;
      case 'rental_berjalan':
        return <RentalBerjalan />;
      case 'selesai':
        return <Selesai />;
      case 'dibatalkan':
        return <Dibatalkan />;
      default:
        return <BelumDiambil />;
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Memuat daftar order...</p>
        </div>
      )}
      {fetchError && !loading && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{fetchError}</p>
        </div>
      )}

      {!loading && (
        <>
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white border-b-2 border-amber-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border-b-2 border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderContent()}</div>
        </>
      )}
    </div>
  );
};

export default Orders;

