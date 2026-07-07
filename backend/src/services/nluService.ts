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
  debugScores?: Record<string, number>; // opsional, buat debugging di terminal
}

/**
 * Natural Language Understanding untuk Chatbot SnapRent
 * Menggabungkan rule-based + keyword matching + scoring
 *
 * Perubahan dari versi sebelumnya:
 * - Tidak lagi pakai if...else if berurutan (yang menyebabkan intent pertama
 *   yang match "menang" walau intent lain sebenarnya lebih relevan).
 * - Setiap intent dihitung skornya berdasarkan jumlah & bobot keyword yang cocok.
 * - Intent dengan skor tertinggi yang dipilih di akhir.
 * - Beberapa keyword diberi bobot lebih tinggi karena lebih spesifik/jarang ambigu
 *   (misal "ktp", "syarat" untuk general_info; "booking", "pesan sekarang" untuk booking).
 */
export function analyzeNLU(userMessage: string): NLUResult {
  const lower = userMessage.toLowerCase().trim();

  const result: NLUResult = {
    intent: 'unknown',
    slots: {},
    confidence: 0.6,
  };

  // === SCORING SETIAP INTENT ===
  const scores: Record<string, number> = {
    greeting: 0,
    product_inquiry: 0,
    technical_detail: 0,
    booking: 0,
    general_info: 0,
  };

  // 1. Greeting — biasanya di awal kalimat, jadi tetap pakai anchor ^
  if (/^(halo|hai|hi|selamat|assalamualaikum|haii)\b/.test(lower)) {
    scores.greeting += 3;
  }

  // 2. Product Inquiry (umum) — nanya daftar/katalog
  if (/\b(ada apa|daftar|katalog|rekomendasi|apa saja|lihat.?lihat)\b/.test(lower)) {
    scores.product_inquiry += 2;
  }

  // 3. Technical Detail — spek, harga per unit, nama brand
  if (/\b(spek|spesifikasi|review|keunggulan|cocok untuk|low light|4k)\b/.test(lower)) {
    scores.technical_detail += 2;
  }
  if (/\b(harga|berapa)\b/.test(lower)) {
    scores.technical_detail += 1; // lebih rendah krn "harga" & "berapa" juga bisa muncul di konteks lain
  }
  if (/\b(canon|sony|fujifilm|nikon|dji)\b/.test(lower)) {
    scores.technical_detail += 2;
  }

  // 4. Booking — niat transaksi konkret. Kata "sewa" sendirian dibuat lebih ringan
  // karena sering muncul juga di kalimat general_info ("syarat sewa", "berapa lama sewa").
  if (/\b(pesan|booking|ambil|pickup)\b/.test(lower)) {
    scores.booking += 2;
  }
  if (/\b(mau sewa|sewa besok|sewa sekarang|sewa hari ini)\b/.test(lower)) {
    scores.booking += 3; // frasa spesifik = sinyal kuat
  } else if (/\bsewa\b/.test(lower)) {
    scores.booking += 1; // kata "sewa" tunggal = sinyal lemah
  }
  if (/\b(besok|tanggal)\b/.test(lower)) {
    scores.booking += 1;
  }

  // 5. General Info — lokasi, syarat, pembayaran, dll.
  // Diberi bobot lebih tinggi karena kata-katanya jarang ambigu.
  if (/\b(lokasi|alamat|jam operasional|jam buka)\b/.test(lower)) {
    scores.general_info += 2;
  }
  if (/\b(syara?t|ktp|bayar|pembayaran|dp)\b/.test(lower)) {
    scores.general_info += 3; // paling spesifik, jadi bobot paling tinggi
  }

  // === PILIH INTENT DENGAN SKOR TERTINGGI ===
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = sorted[0];

  if (topScore === 0) {
    result.intent = 'unknown';
    result.confidence = 0.4;
  } else {
    result.intent = topIntent as NLUResult['intent'];
    // confidence dihitung proporsional: makin dominan skor tertinggi vs total, makin yakin
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    result.confidence = Math.min(0.95, 0.5 + (topScore / (totalScore || 1)) * 0.45);
  }

  result.debugScores = scores; // hapus/pakai sesuai kebutuhan logging di terminal

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
    const prices = priceMatch.map(
      (p) => parseInt(p.replace(/\D/g, ''), 10) * (p.includes('juta') ? 1000000 : 1000)
    );
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
    greeting: 'Sapaan awal pengguna',
    product_inquiry: 'Permintaan informasi produk secara umum',
    technical_detail: 'Permintaan spesifikasi teknis / detail produk',
    booking: 'Intent pemesanan atau booking',
    general_info: 'Pertanyaan tentang layanan (lokasi, syarat, dll)',
    unknown: 'Intent tidak terdeteksi',
  };
  return descriptions[intent] || 'Intent tidak dikenali';
}