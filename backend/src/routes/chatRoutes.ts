import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { sendChat } from '../services/geminiChatService.js';
import type { OrderErrorResponse } from '../types.js';

const router = Router();
const MOCK_AI = process.env.MOCK_AI === 'true';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map<string, { body: ChatSuccessResponse; cachedAt: number }>();

export interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  message: string;
}

export interface ChatSuccessResponse {
  success: true;
  message: string;
  products?: Array<{
    id: string;
    name: string;
    title: string;
    slug: string;
    price: number;
    image: string;
    description: string;
    keunggulan?: string[];
    cocokUntuk?: string[];
  }>;
}

const MOCK_RESPONSES: Array<{ keywords: string[]; message: string; products?: ChatSuccessResponse['products'] }> = [
  {
    keywords: ['harga', 'price', 'berapa', 'tarif', 'sewa'],
    message: 'Harga sewa kamera bervariasi mulai dari **Rp 150.000/hari** untuk paket basic hingga **Rp 1.500.000/hari** untuk kamera profesional. Mau lihat daftar lengkap? [Lihat produk](/).',
  },
  {
    keywords: ['list', 'daftar', 'semua produk', 'apa saja', 'katalog'],
    message: 'Anda bisa melihat semua produk di halaman beranda. [Lihat semua produk di Beranda](/).',
  },
  {
    keywords: ['lokasi', 'location', 'alamat', 'dimana', 'pickup', 'ambil'],
    message: 'Kami melayani pickup dan return di **Jakarta**. Lokasi tepat dan jam operasional bisa disepakati saat pemesanan.',
  },
  {
    keywords: ['rekomendasi', 'sarankan', 'bagus', 'terbaik'],
    message: 'Berikut dua rekomendasi populer: **DJI Osmo Pocket 3** (Rp 250.000/hari) dan **Canon EOS R5** (harga bervariasi). Klik [Beranda](/) untuk lihat detail dan sewa.',
  },
];

function getMockResponse(userMessage: string): ChatSuccessResponse {
  const lower = userMessage.toLowerCase().trim();
  for (const { keywords, message } of MOCK_RESPONSES) {
    if (keywords.some((k) => lower.includes(k))) {
      return { success: true, message };
    }
  }
  return {
    success: true,
    message: 'Terima kasih sudah menghubungi kami. Anda bisa tanya tentang **harga**, **daftar produk**, atau **lokasi** pickup. Atau [lihat semua produk](/).',
  };
}

function cacheKey(history: Array<{ role: string; content: string }>, message: string): string {
  return createHash('sha256').update(JSON.stringify({ history, message })).digest('hex');
}

router.get('/chat/mode', (_req: Request, res: Response): void => {
  res.json({ mock: MOCK_AI });
});

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<ChatRequestBody>;
    const { messages = [], message } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        message: 'Pesan (message) wajib diisi.',
      } as OrderErrorResponse);
      return;
    }

    const history = Array.isArray(messages)
      ? messages
          .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.content === 'string')
          .map((m) => ({ role: m.role as 'user' | 'model', content: String(m.content) }))
      : [];

    const trimmedMessage = message.trim();

    if (MOCK_AI) {
      const successBody = getMockResponse(trimmedMessage);
      res.status(200).json(successBody);
      return;
    }

    const key = cacheKey(history, trimmedMessage);
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      res.status(200).json(cached.body);
      return;
    }

    const result = await sendChat(history, trimmedMessage);

    const successBody: ChatSuccessResponse = {
      success: true,
      message: result.message,
      ...(result.products && result.products.length > 0 && { products: result.products }),
    };
    responseCache.set(key, { body: successBody, cachedAt: Date.now() });
    if (responseCache.size > 500) {
      const oldest = responseCache.keys().next().value;
      if (oldest) responseCache.delete(oldest);
    }
    res.status(200).json(successBody);
  } catch (err) {
    console.error('Chat error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    let userMessage: string;
    let statusCode = 500;

    if (lower.includes('429') || lower.includes('too many requests') || lower.includes('quota exceeded')) {
      statusCode = 429;
      userMessage = 'Kuota AI lagi penuh nih. Coba tanya lagi setelah 1–2 menit ya 🙂';
    } else if (
      lower.includes('503') ||
      lower.includes('service unavailable') ||
      lower.includes('high demand') ||
      lower.includes('experiencing high demand')
    ) {
      statusCode = 503;
      userMessage = 'Maaf, AI lagi capek nih. Coba tanya lagi setelah 1–2 menit ya 🙂';
    } else if (lower.includes('500') || lower.includes('internal server error')) {
      userMessage = 'Waduh, server lagi sibuk. Coba lagi sebentar ya.';
    } else if (lower.includes('timeout') || lower.includes('timed out')) {
      userMessage = 'Responsenya lama banget. Coba kirim ulang pesan kamu.';
    } else if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch')) {
      userMessage = 'Koneksi terganggu. Cek internet kamu lalu coba lagi ya.';
    } else {
      userMessage = msg && msg.length < 200 ? msg : 'Ada yang error nih. Coba lagi dalam beberapa saat ya.';
    }

    const errBody: OrderErrorResponse = { success: false, message: userMessage };
    res.status(statusCode).json(errBody);
  }
});

export default router;
