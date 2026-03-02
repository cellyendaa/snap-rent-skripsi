import { Router, Request, Response } from 'express';
import { addOrderToSheet, updateOrderStatusInSheet, getOrdersFromSheetByPhone, getAllOrdersFromSheet } from '../services/sheetService.js';
import type {
  CreateOrderRequestBody,
  CreateOrderSuccessResponse,
  OrderErrorResponse,
  UpdateOrderStatusRequestBody,
  OrderStatus,
  GetOrdersSuccessResponse,
} from '../types.js';

const router = Router();

router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const phoneNumber = req.query.phoneNumber;
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'phoneNumber query wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const orders = await getOrdersFromSheetByPhone(phoneNumber.trim());
    const ordersWithProduct: GetOrdersSuccessResponse['orders'] = orders.map((o) => {
      const productImages = o.product_images
        ? o.product_images.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const packageImages = o.package_images
        ? o.package_images.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const orderPayload: GetOrdersSuccessResponse['orders'][0] = {
        order_id: o.order_id,
        user_phone: o.user_phone,
        user_name: o.user_name,
        product_name: o.product_name,
        product_id: o.product_id,
        pickup_date: o.pickup_date,
        pickup_time: o.pickup_time,
        pickup_location: o.pickup_location,
        return_date: o.return_date,
        return_time: o.return_time,
        return_location: o.return_location,
        rental_days: o.rental_days,
        total_price: o.total_price,
        status: o.status,
        created_at: o.created_at,
      };
      orderPayload.product = {
        id: o.product_id,
        name: o.product_name,
        title: o.product_name,
        slug: '',
        price: o.rental_days > 0 ? o.total_price / o.rental_days : 0,
        image: productImages[0] ?? '',
        images: productImages,
        package_images: packageImages,
      };
      return orderPayload;
    });
    res.status(200).json({ success: true, orders: ordersWithProduct });
  } catch (err) {
    console.error('Get orders error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil order',
    };
    res.status(500).json(errBody);
  }
});

function generateOrderId(): string {
  return `order-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

function orderRowToApiOrder(o: {
  order_id: string;
  user_phone: string;
  user_name: string;
  product_name: string;
  product_id: string;
  product_images: string;
  package_images: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  return_date: string;
  return_time: string;
  return_location: string;
  rental_days: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}): GetOrdersSuccessResponse['orders'][0] {
  const productImages = o.product_images ? o.product_images.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const packageImages = o.package_images ? o.package_images.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return {
    order_id: o.order_id,
    user_phone: o.user_phone,
    user_name: o.user_name,
    product_name: o.product_name,
    product_id: o.product_id,
    pickup_date: o.pickup_date,
    pickup_time: o.pickup_time,
    pickup_location: o.pickup_location,
    return_date: o.return_date,
    return_time: o.return_time,
    return_location: o.return_location,
    rental_days: o.rental_days,
    total_price: o.total_price,
    status: o.status,
    created_at: o.created_at,
    product: {
      id: o.product_id,
      name: o.product_name,
      title: o.product_name,
      slug: '',
      price: o.rental_days > 0 ? o.total_price / o.rental_days : 0,
      image: productImages[0] ?? '',
      images: productImages,
      package_images: packageImages,
    },
  };
}

router.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<CreateOrderRequestBody>;
    const { user, product, product_images, package_images, pickupDate, pickupTime, pickupLocation, returnDate, returnTime, returnLocation, rentalDays, totalPrice } = body;

    if (!user?.name || !user?.phoneNumber) {
      const err: OrderErrorResponse = { success: false, message: 'user.name dan user.phoneNumber wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!product?.id) {
      const err: OrderErrorResponse = { success: false, message: 'product.id wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!pickupDate || !pickupTime || !returnDate || !returnTime || typeof rentalDays !== 'number' || typeof totalPrice !== 'number') {
      const err: OrderErrorResponse = { success: false, message: 'pickupDate, pickupTime, returnDate, returnTime, rentalDays, totalPrice wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const userPhoneNorm = normalizePhone(String(user.phoneNumber).trim());

    // 1. Ambil seluruh data Orders dulu agar data lama tetap ada
    const existingOrders = await getAllOrdersFromSheet();

    const orderId = generateOrderId();
    const createdAt = new Date().toISOString();
    const productName = product.title || product.name || product.id;
    const productImagesStr = Array.isArray(product_images) ? product_images.filter(Boolean).join(',') : '';
    const packageImagesStr = Array.isArray(package_images) ? package_images.filter(Boolean).join(',') : '';

    const newOrderRow = {
      order_id: orderId,
      user_phone: String(user.phoneNumber).trim(),
      user_name: String(user.name).trim(),
      product_name: productName,
      product_id: product.id,
      product_images: productImagesStr,
      package_images: packageImagesStr,
      pickup_date: String(pickupDate).trim(),
      pickup_time: String(pickupTime).trim(),
      pickup_location: String(pickupLocation || 'jakarta').trim(),
      return_date: String(returnDate).trim(),
      return_time: String(returnTime).trim(),
      return_location: String(returnLocation || 'jakarta').trim(),
      rental_days: rentalDays,
      total_price: totalPrice,
      status: 'belum_diambil' as OrderStatus,
      created_at: createdAt,
    };

    // 2. Tambah baris baru di bawah data yang sudah ada
    await addOrderToSheet(newOrderRow);

    // 3. Gabungkan data yang tadi di-hit dengan order baru, filter by user, urutkan terbaru dulu
    const mergedForUser = [
      ...existingOrders.filter((o) => normalizePhone(o.user_phone) === userPhoneNorm),
      newOrderRow,
    ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const ordersPayload: GetOrdersSuccessResponse['orders'] = mergedForUser.map(orderRowToApiOrder);

    const successBody: CreateOrderSuccessResponse = {
      success: true,
      message: 'Order berhasil didaftarkan',
      orderId,
      createdAt,
      orders: ordersPayload,
    };
    res.status(201).json(successBody);
  } catch (err) {
    console.error('Create order error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat order',
    };
    res.status(500).json(errBody);
  }
});

router.patch('/orders/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body as Partial<UpdateOrderStatusRequestBody>;

    const validStatuses: OrderStatus[] = ['belum_diambil', 'rental_berjalan', 'selesai', 'dibatalkan'];
    if (!status || !validStatuses.includes(status)) {
      const err: OrderErrorResponse = { success: false, message: 'status harus salah satu: belum_diambil, rental_berjalan, selesai, dibatalkan' };
      res.status(400).json(err);
      return;
    }

    const updated = await updateOrderStatusInSheet(orderId, status);
    if (!updated) {
      const err: OrderErrorResponse = { success: false, message: 'Order tidak ditemukan' };
      res.status(404).json(err);
      return;
    }

    res.status(200).json({ success: true, message: 'Status order berhasil diubah', status });
  } catch (err) {
    console.error('Update order status error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengubah status',
    };
    res.status(500).json(errBody);
  }
});

export default router;
