/**
 * productAdvantages.ts
 *
 * Data keunggulan & cocok-untuk per produk dibaca dari Google Sheet
 * tab "Camera_advantages" — tidak ada data hardcode di sini.
 *
 * Dipakai untuk chat AI agar rekomendasi lebih interaktif
 * (rekomendasi berdasarkan kebutuhan: travel, vlog, wedding, pemula, dll).
 */

import { getAdvantagesFromSheet } from "../services/sheetService.js";

export interface ProductAdvantage {
  keunggulan: string[];
  cocokUntuk: string[];
  tags: string[];
}

// ─── In-memory cache (runtime) ───────────────────────────────────────────────
// Terpisah dari cache Sheet-level di sheetService agar bisa di-rebuild
// sebagai Map<advantageKey, ProductAdvantage> sekali saja per TTL.

const RUNTIME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

let advantagesMap: Map<string, ProductAdvantage> | null = null;
let cacheBuiltAt = 0;

/**
 * Build atau kembalikan Map<advantageKey, ProductAdvantage> dari Sheet.
 * Key = advantage_key (kolom C di Sheet, misal "Sony A7 IV", "Canon EOS R5 II").
 */
async function getAdvantagesMap(): Promise<Map<string, ProductAdvantage>> {
  const now = Date.now();
  if (advantagesMap && now - cacheBuiltAt < RUNTIME_CACHE_TTL_MS) {
    return advantagesMap;
  }

  const rows = await getAdvantagesFromSheet();
  const map = new Map<string, ProductAdvantage>();

  for (const row of rows) {
    const key = row.advantage_key;
    if (!key || key.startsWith("⚠️")) continue; // skip baris no-match

    // Kumpulkan keunggulan (hingga 4 kolom, skip yang kosong)
    const keunggulan = [row.keunggulan_1, row.keunggulan_2, row.keunggulan_3, row.keunggulan_4].filter(Boolean);

    // Kumpulkan cocokUntuk (hingga 5 kolom, skip yang kosong)
    const cocokUntuk = [row.cocokUntuk_1, row.cocokUntuk_2, row.cocokUntuk_3, row.cocokUntuk_4, row.cocokUntuk_5].filter(Boolean);

    // Tags: comma-separated string → array
    const tags = row.tags
      ? row.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Jika key sudah ada (duplikat), merge keunggulan & cocokUntuk
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        keunggulan: [...new Set([...existing.keunggulan, ...keunggulan])],
        cocokUntuk: [...new Set([...existing.cocokUntuk, ...cocokUntuk])],
        tags: [...new Set([...existing.tags, ...tags])],
      });
    } else {
      map.set(key, { keunggulan, cocokUntuk, tags });
    }
  }

  advantagesMap = map;
  cacheBuiltAt = now;
  return map;
}

/**
 * Cari keunggulan untuk produk berdasarkan nama/title.
 *
 * Strategi matching (urutan prioritas):
 * 1. Exact match advantage_key di Map (case-insensitive)
 * 2. productName mengandung advantage_key (partial match)
 * 3. advantage_key mengandung productName (partial match)
 *
 * Async karena data diambil dari Google Sheet.
 */
export async function getProductAdvantages(productName: string): Promise<ProductAdvantage | null> {
  if (!productName || typeof productName !== "string") return null;

  const map = await getAdvantagesMap();
  const lower = productName.toLowerCase().trim();

  // Pass 1: productName contains key
  for (const [key, value] of map.entries()) {
    if (lower.includes(key.toLowerCase())) return value;
  }

  // Pass 2: key contains productName (untuk nama pendek seperti "Sony FX3")
  for (const [key, value] of map.entries()) {
    if (key.toLowerCase().includes(lower)) return value;
  }

  return null;
}

/**
 * Invalidate runtime cache (misal setelah update Sheet).
 * Biasanya tidak perlu dipanggil manual — cache auto-refresh setiap 5 menit.
 */
export function invalidateAdvantagesCache(): void {
  advantagesMap = null;
  cacheBuiltAt = 0;
}

// ─── USE_CASE_TAGS tetap di sini (static, tidak perlu dari Sheet) ────────────
/** Keyword use-case → tags untuk filter rekomendasi. */
export const USE_CASE_TAGS: Record<string, string[]> = {
  liburan: ["travel", "compact", "ringan", "liburan"],
  travel: ["travel", "compact", "ringan", "liburan"],
  jepang: ["travel", "compact", "low light"],
  bali: ["travel", "compact", "video"],
  vlog: ["vlog", "video", "content creator", "compact"],
  vlogging: ["vlog", "video", "content creator"],
  youtube: ["vlog", "video", "content creator"],
  wedding: ["wedding", "professional", "full frame"],
  nikah: ["wedding", "professional", "full frame"],
  prewed: ["wedding", "portrait", "full frame"],
  sport: ["sport", "action", "cepat", "wildlife"],
  olahraga: ["sport", "action", "cepat"],
  wildlife: ["wildlife", "sport", "action"],
  hewan: ["wildlife", "sport"],
  malam: ["low light", "night", "malam"],
  night: ["low light", "night"],
  studio: ["studio", "high resolution", "full frame"],
  film: ["cinema", "video", "filmmaking"],
  movie: ["cinema", "video", "filmmaking"],
  pemula: ["pemula", "entry level", "murah", "beginner"],
  beginner: ["pemula", "entry level", "murah"],
  murah: ["murah", "budget", "entry level"],
  budget: ["murah", "budget", "entry level"],
  profesional: ["professional", "pro", "high end"],
  professional: ["professional", "pro", "high end"],
  action: ["action", "sport", "outdoor", "waterproof"],
  outdoor: ["outdoor", "adventure", "action", "waterproof"],
  cinema: ["cinema", "film", "cinematic", "broadcast"],
  broadcast: ["broadcast", "cinema", "commercial"],
  commercial: ["commercial", "cinema", "studio"],
  portrait: ["portrait", "studio", "wedding", "full frame"],
  landscape: ["landscape", "high resolution", "full frame"],
  street: ["street", "travel", "compact", "retro"],
};
