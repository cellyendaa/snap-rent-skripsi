import { Router, Request, Response } from 'express';
import { getProductsWithRelations, getProductBySlugWithRelations } from '../services/sheetService.js';
import type {
  GetProductsSuccessResponse,
  GetProductBySlugSuccessResponse,
  OrderErrorResponse,
} from '../types.js';

const router = Router();

router.get('/products', async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await getProductsWithRelations(false);
    const body: GetProductsSuccessResponse = {
      success: true,
      products,
    };
    res.status(200).json(body);
  } catch (err) {
    console.error('Get products error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil produk',
    };
    res.status(500).json(errBody);
  }
});

router.get('/products/by-slug/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    if (!slug?.trim()) {
      res.status(400).json({ success: false, message: 'slug wajib diisi' });
      return;
    }
    const product = await getProductBySlugWithRelations(slug.trim());
    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      return;
    }
    const body: GetProductBySlugSuccessResponse = {
      success: true,
      product,
    };
    res.status(200).json(body);
  } catch (err) {
    console.error('Get product by slug error:', err);
    const errBody: OrderErrorResponse = {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil detail produk',
    };
    res.status(500).json(errBody);
  }
});

export default router;
