import { Router, Request, Response } from 'express';
import { getCartByUser, addCartItem, removeCartItem } from '../services/sheetService.js';
import type { OrderErrorResponse } from '../types.js';

const router = Router();

export interface CartItemDto {
  product_id: string;
  product_image: string;
  product_name: string;
  price: number;
  slug: string;
  added_at: string;
}

export interface GetCartSuccessResponse {
  success: true;
  items: CartItemDto[];
}

export interface AddToCartRequestBody {
  phoneNumber: string;
  product_id: string;
  product_image: string;
  product_name?: string;
  price?: number;
  slug?: string;
}

export interface AddToCartSuccessResponse {
  success: true;
  message: string;
}

export interface RemoveFromCartRequestBody {
  phoneNumber: string;
  product_id: string;
}

// GET /cart?phoneNumber=xxx
router.get('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const phoneNumber = req.query.phoneNumber;
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'phoneNumber query wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const items = await getCartByUser(phoneNumber.trim());
    const payload: CartItemDto[] = items.map((i) => ({
      product_id: i.product_id,
      product_image: i.product_image,
      product_name: i.product_name,
      price: i.price,
      slug: i.slug,
      added_at: i.added_at,
    }));

    const successBody: GetCartSuccessResponse = { success: true, items: payload };
    res.status(200).json(successBody);
  } catch (err) {
    console.error('Get cart error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil keranjang',
    };
    res.status(500).json(errBody);
  }
});

// POST /cart
router.post('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<AddToCartRequestBody>;
    const { phoneNumber, product_id, product_image, product_name, price, slug } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'phoneNumber wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!product_id || typeof product_id !== 'string' || !product_id.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'product_id wajib diisi' };
      res.status(400).json(err);
      return;
    }

    await addCartItem(
      phoneNumber.trim(),
      product_id.trim(),
      product_image ?? '',
      product_name ?? '',
      typeof price === 'number' ? price : Number(price) || 0,
      slug ?? ''
    );

    const successBody: AddToCartSuccessResponse = {
      success: true,
      message: 'Produk berhasil ditambahkan ke keranjang',
    };
    res.status(201).json(successBody);
  } catch (err) {
    console.error('Add to cart error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menambah ke keranjang',
    };
    res.status(500).json(errBody);
  }
});

// DELETE /cart (body: { phoneNumber, product_id })
router.delete('/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<RemoveFromCartRequestBody>;
    const { phoneNumber, product_id } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'phoneNumber wajib diisi' };
      res.status(400).json(err);
      return;
    }
    if (!product_id || typeof product_id !== 'string' || !product_id.trim()) {
      const err: OrderErrorResponse = { success: false, message: 'product_id wajib diisi' };
      res.status(400).json(err);
      return;
    }

    const removed = await removeCartItem(phoneNumber.trim(), product_id.trim());
    if (!removed) {
      const err: OrderErrorResponse = { success: false, message: 'Item keranjang tidak ditemukan' };
      res.status(404).json(err);
      return;
    }

    res.status(200).json({ success: true, message: 'Produk berhasil dihapus dari keranjang' });
  } catch (err) {
    console.error('Remove from cart error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus dari keranjang',
    };
    res.status(500).json(errBody);
  }
});

export default router;