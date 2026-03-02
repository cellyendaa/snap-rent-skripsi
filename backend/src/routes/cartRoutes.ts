import { Router, Request, Response } from 'express';
import { getCartByUser, addCartItem, removeCartItem } from '../services/sheetService.js';
import type {
  GetCartQuery,
  GetCartSuccessResponse,
  PostCartRequestBody,
  PostCartSuccessResponse,
  DeleteCartRequestBody,
  CartErrorResponse,
} from '../types.js';

const router = Router();

router.get('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.query as unknown as GetCartQuery;
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: CartErrorResponse = { success: false, message: 'phoneNumber query wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const rows = await getCartByUser(phoneNumber.trim());
    const body: GetCartSuccessResponse = {
      success: true,
      items: rows.map((r) => ({
        product_id: r.product_id,
        product_image: r.product_image,
        product_name: r.product_name,
        price: r.price,
        slug: r.slug,
        added_at: r.added_at,
      })),
    };
    res.status(200).json(body);
  } catch (err) {
    console.error('GET /cart error:', err);
    const body: CartErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal mengambil keranjang',
    };
    res.status(500).json(body);
  }
});

router.post('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, product_id, product_image, product_name, price, slug } = req.body as Partial<PostCartRequestBody>;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: CartErrorResponse = { success: false, message: 'phoneNumber wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!product_id || typeof product_id !== 'string' || !product_id.trim()) {
      const err: CartErrorResponse = { success: false, message: 'product_id wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const image = typeof product_image === 'string' ? product_image : '';
    const name = typeof product_name === 'string' && product_name.trim() ? product_name.trim() : product_id;
    const priceNum = typeof price === 'number' ? price : Number(price) || 0;
    const slugStr = typeof slug === 'string' ? slug.trim() : '';

    const rows = await getCartByUser(phoneNumber.trim());
    if (rows.some((r) => r.product_id === product_id.trim())) {
      const body: PostCartSuccessResponse = { success: true, message: 'Produk sudah ada di keranjang' };
      res.status(200).json(body);
      return;
    }

    await addCartItem(phoneNumber.trim(), product_id.trim(), image, name, priceNum, slugStr);

    const body: PostCartSuccessResponse = { success: true, message: 'Ditambah ke keranjang' };
    res.status(201).json(body);
  } catch (err) {
    console.error('POST /cart error:', err);
    const body: CartErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menambah ke keranjang',
    };
    res.status(500).json(body);
  }
});

router.delete('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const phoneNumber = (req.body?.phoneNumber ?? req.query?.phoneNumber) as string | undefined;
    const product_id = (req.body?.product_id ?? req.query?.product_id) as string | undefined;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: CartErrorResponse = { success: false, message: 'phoneNumber wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!product_id || typeof product_id !== 'string' || !product_id.trim()) {
      const err: CartErrorResponse = { success: false, message: 'product_id wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const removed = await removeCartItem(phoneNumber.trim(), product_id.trim());

    if (!removed) {
      const err: CartErrorResponse = { success: false, message: 'Item tidak ditemukan di keranjang' };
      res.status(404).json(err);
      return;
    }

    res.status(200).json({ success: true, message: 'Dihapus dari keranjang' });
  } catch (err) {
    console.error('DELETE /cart error:', err);
    const body: CartErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menghapus dari keranjang',
    };
    res.status(500).json(body);
  }
});

export default router;
