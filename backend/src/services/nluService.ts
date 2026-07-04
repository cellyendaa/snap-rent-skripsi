// services/nluService.ts
export interface NLUResult {
  intent: 'greeting' | 'product_inquiry' | 'technical_detail' | 'booking' | 'general_info' | 'unknown';
  slots: {
    brand?: string;
    productName?: string;
    priceMin?: number;
    priceMax?: number;
    useCase?: string;
    date?: string;
  };
  confidence: number; // 0.0 - 1.0
}

/**
 * Natural Language Understanding untuk Chatbot SnapRent
 * Menggabungkan rule-based + keyword matching
 */
export function analyzeNLU(userMessage: string): NLUResult {
  const lower = userMessage.toLowerCase().trim();
  const result: NLUResult = {
    intent: 'unknown',
    slots: {},
    confidence: 0.6,
  };

  // === INTENT RECOGNITION ===
  
  // 1. Greeting
  if (/^(halo|hai|hi|selamat|assalamualaikum|haii)/.test(lower)) {
    result.intent = 'greeting';
    result.confidence = 0.95;
  }

  // 2. Product Inquiry (umum)
  else if (/(ada apa|daftar|katalog|rekomendasi|apa saja|lihat)/.test(lower)) {
    result.intent = 'product_inquiry';
    result.confidence = 0.9;
  }

  // 3. Technical Detail Inquiry (spesifik)   
  else if (
    /(spek|spesifikasi|harga|berapa|review|keunggulan|cocok untuk|low light|4k|vlog|wedding|travel)/.test(lower) ||
    /(canon|sony|fujifilm|nikon|dji)/.test(lower)
  ) {
    result.intent = 'technical_detail';
    result.confidence = 0.85;
  }

  // 4. Booking / Pemesanan
  else if (/(pesan|booking|sewa|ambil|pickup|tanggal|besok)/.test(lower)) {
    result.intent = 'booking';
    result.confidence = 0.8;
  }

  // 5. General Info (lokasi, syarat, dll)
  else if (/(lokasi|alamat|jam|syara?t|ktp|bayar|dp)/.test(lower)) {
    result.intent = 'general_info';
    result.confidence = 0.85;
  }

  // === SLOT FILLING (Ekstraksi Entitas) ===
  
  // Brand
  const brands = ['canon', 'sony', 'fujifilm', 'nikon', 'dji'];
  for (const brand of brands) {
    if (lower.includes(brand)) {
      result.slots.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // Price Range
  const priceMatch = lower.match(/(\d+)(?:rb|ribu|juta)?/g);
  if (priceMatch) {
    const prices = priceMatch.map(p => parseInt(p.replace(/\D/g, '')) * (p.includes('juta') ? 1000000 : 1000));
    if (lower.includes('bawah') || lower.includes('max') || lower.includes('kurang')) {
      result.slots.priceMax = Math.max(...prices);
    } else if (lower.includes('atas') || lower.includes('min')) {
      result.slots.priceMin = Math.min(...prices);
    }
  }

  // Use Case
  const useCases = ['vlog', 'wisuda', 'wedding', 'travel', 'liburan', 'low light', 'malam', 'snorkeling'];
  for (const uc of useCases) {
    if (lower.includes(uc)) {
      result.slots.useCase = uc;
      break;
    }
  }

  return result;
}

// Contoh penggunaan
export function getIntentDescription(intent: string): string {
  const descriptions: Record<string, string> = {
    greeting: "Sapaan awal pengguna",
    product_inquiry: "Permintaan informasi produk secara umum",
    technical_detail: "Permintaan spesifikasi teknis / detail produk",
    booking: "Intent pemesanan atau booking",
    general_info: "Pertanyaan tentang layanan (lokasi, syarat, dll)",
    unknown: "Intent tidak terdeteksi",
  };
  return descriptions[intent] || "Intent tidak dikenali";
}