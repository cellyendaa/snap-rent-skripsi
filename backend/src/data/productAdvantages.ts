/**
 * Data keunggulan & cocok-untuk per produk. Dipakai untuk chat AI agar rekomendasi
 * lebih interaktif (rekomendasi berdasarkan kebutuhan: travel, vlog, wedding, pemula, dll).
 * Key bisa partial match ke nama/title produk (case-insensitive).
 */

export interface ProductAdvantage {
  keunggulan: string[];
  cocokUntuk: string[];
  tags: string[];
}

const ADVANTAGES: Record<string, ProductAdvantage> = {
  'Canon 700D': {
    keunggulan: ['Entry level friendly', 'Harga terjangkau', 'Cocok buat pemula'],
    cocokUntuk: ['Pemula fotografi', 'Sekolah/kuliah', 'Event kecil', 'Belajar dasar fotografi'],
    tags: ['pemula', 'murah', 'entry level', 'sekolah', 'kuliah'],
  },
  'Canon 7D': {
    keunggulan: ['Autofocus cepat', 'Build quality tangguh', 'Sport & wildlife ready'],
    cocokUntuk: ['Foto olahraga', 'Wildlife', 'Action photography', 'Outdoor'],
    tags: ['sport', 'wildlife', 'action', 'cepat'],
  },
  'Canon 1DX': {
    keunggulan: ['Professional flagship', 'Low light king', 'Durability extreme'],
    cocokUntuk: ['Professional work', 'Wedding', 'Photojournalism', 'Studio'],
    tags: ['profesional', 'wedding', 'kerja', 'studio'],
  },
  'Canon 77D': {
    keunggulan: ['Vlogger friendly', 'Dual Pixel AF', 'Layar artikulasi'],
    cocokUntuk: ['Vlogging', 'Content creator', 'YouTube', 'Self video'],
    tags: ['vlog', 'youtube', 'content creator', 'video'],
  },
  'Canon C100': {
    keunggulan: ['Cinema grade', 'Professional video', 'Dual Pixel AF'],
    cocokUntuk: ['Filmmaking', 'Cinema', 'Professional video', 'Documentary'],
    tags: ['cinema', 'film', 'video profesional', 'documentary'],
  },
  'Sony A7S': {
    keunggulan: ['Low light king', 'Full frame', 'Video quality superb'],
    cocokUntuk: ['Low light photography', 'Night shoot', 'Video cinematic', 'Astrophotography'],
    tags: ['low light', 'malam', 'video', 'full frame'],
  },
  'Sony A7R': {
    keunggulan: ['High resolution', 'High detail', 'Professional photo'],
    cocokUntuk: ['Studio photography', 'Landscape', 'Commercial', 'Print besar'],
    tags: ['studio', 'landscape', 'komersial', 'high resolution'],
  },
  'Sony A6700': {
    keunggulan: ['4K 120p', 'Compact', 'Content creator friendly'],
    cocokUntuk: ['Content creator', 'Travel vlog', 'Action video', 'Sehari-hari'],
    tags: ['content creator', 'travel', 'vlog', 'compact'],
  },
  'Sony FS700': {
    keunggulan: ['4K Super35', 'Professional video', 'Slow motion'],
    cocokUntuk: ['Professional video', 'Broadcast', 'Commercial video', 'Film production'],
    tags: ['video profesional', 'broadcast', 'commercial', '4k'],
  },
  'Fujifilm X-T2': {
    keunggulan: ['Film simulation', 'Build quality', 'Classic design'],
    cocokUntuk: ['Street photography', 'Travel', 'Foto artistic', 'Sehari-hari'],
    tags: ['street', 'travel', 'artistic', 'film look'],
  },
  'Fujifilm X-A3': {
    keunggulan: ['Budget friendly', 'Selfie screen', 'Stylish design'],
    cocokUntuk: ['Pemula', 'Selfie', 'Travel ringan', 'Sosial media'],
    tags: ['murah', 'selfie', 'pemula', 'sosmed'],
  },
  'Fujifilm X-T30': {
    keunggulan: ['Retro style', 'Film simulation', 'Compact power'],
    cocokUntuk: ['Street photography', 'Travel', 'Content creator', 'Artistic'],
    tags: ['retro', 'street', 'travel', 'compact'],
  },
  'Fujifilm X-H2': {
    keunggulan: ['6.2K video', 'Stacked sensor', 'Video & foto pro'],
    cocokUntuk: ['Professional hybrid', 'Video cinematic', 'Sport/action', 'Wildlife'],
    tags: ['6.2k', 'hybrid', 'pro', 'action'],
  },
  'Nikon D610': {
    keunggulan: ['Full frame affordable', 'Good low light', 'Build solid'],
    cocokUntuk: ['Landscape', 'Portrait', 'Wedding', 'Hobbyist serius'],
    tags: ['full frame', 'landscape', 'portrait', 'hobby'],
  },
  'Nikon D810': {
    keunggulan: ['High resolution', 'Dynamic range', 'Professional build'],
    cocokUntuk: ['Studio', 'Landscape', 'Commercial', 'Fashion'],
    tags: ['studio', 'landscape', 'komersial', 'fashion'],
  },
  'Nikon D5500': {
    keunggulan: ['Entry level', 'Touchscreen', 'Lightweight'],
    cocokUntuk: ['Pemula', 'Travel', 'Sekolah', 'Hobi'],
    tags: ['pemula', 'travel', 'ringan', 'touchscreen'],
  },
  'Panasonic Lumix GH4': {
    keunggulan: ['4K video pioneer', 'M43 flexible', 'Video features'],
    cocokUntuk: ['Video production', 'Vlogging', 'Content creator', 'Film'],
    tags: ['4k', 'video', 'vlog', 'film'],
  },
  'Panasonic Lumix GH6': {
    keunggulan: ['5.7K ProRes', 'Video beast', 'Professional grade'],
    cocokUntuk: ['Professional video', 'Filmmaking', 'Commercial', 'YouTube pro'],
    tags: ['5.7k', 'prores', 'video pro', 'filmmaking'],
  },
  'Pentax 645Z': {
    keunggulan: ['Medium format', '51.4MP', 'Image quality extreme'],
    cocokUntuk: ['Studio professional', 'Fashion', 'Commercial high-end', 'Landscape'],
    tags: ['medium format', 'studio', 'fashion', 'komersial'],
  },
  'RED Epic': {
    keunggulan: ['Hollywood grade', 'Super35 cinema', 'Professional production'],
    cocokUntuk: ['Film production', 'Commercial cinema', 'Broadcast', 'Netflix ready'],
    tags: ['hollywood', 'cinema', 'film', 'broadcast'],
  },
  'DJI Osmo Pocket': {
    keunggulan: ['Super compact', '1-inch sensor', 'Gimbal built-in', 'Travel friendly'],
    cocokUntuk: ['Travel', 'Vlog', 'Liburan', 'Sehari-hari', 'Content creator mobile'],
    tags: ['travel', 'vlog', 'liburan', 'compact', 'gimbal'],
  },
  'Osmo Pocket 3': {
    keunggulan: ['Super compact', '1-inch sensor', 'Gimbal built-in', 'Travel friendly'],
    cocokUntuk: ['Travel', 'Vlog', 'Liburan', 'Sehari-hari', 'Content creator mobile'],
    tags: ['travel', 'vlog', 'liburan', 'compact', 'gimbal'],
  },
};

/**
 * Cari keunggulan untuk produk berdasarkan nama/title (partial match, case-insensitive).
 * Mengembalikan entri pertama yang key-nya terkandung di productName.
 */
export function getProductAdvantages(productName: string): ProductAdvantage | null {
  if (!productName || typeof productName !== 'string') return null;
  const lower = productName.toLowerCase().trim();
  for (const [key, value] of Object.entries(ADVANTAGES)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  return null;
}

/** Keyword use-case → tags untuk filter rekomendasi (seperti di itembaru.js). */
export const USE_CASE_TAGS: Record<string, string[]> = {
  liburan: ['travel', 'compact', 'ringan', 'liburan'],
  travel: ['travel', 'compact', 'ringan', 'liburan'],
  jepang: ['travel', 'compact', 'low light'],
  bali: ['travel', 'compact', 'video'],
  vlog: ['vlog', 'video', 'content creator', 'compact'],
  vlogging: ['vlog', 'video', 'content creator'],
  youtube: ['vlog', 'video', 'content creator'],
  wedding: ['wedding', 'professional', 'full frame'],
  nikah: ['wedding', 'professional', 'full frame'],
  prewed: ['wedding', 'portrait', 'full frame'],
  sport: ['sport', 'action', 'cepat', 'wildlife'],
  olahraga: ['sport', 'action', 'cepat'],
  wildlife: ['wildlife', 'sport', 'action'],
  hewan: ['wildlife', 'sport'],
  malam: ['low light', 'night', 'malam'],
  night: ['low light', 'night'],
  studio: ['studio', 'high resolution', 'full frame'],
  film: ['cinema', 'video', 'filmmaking'],
  movie: ['cinema', 'video', 'filmmaking'],
  pemula: ['pemula', 'entry level', 'murah', 'beginner'],
  beginner: ['pemula', 'entry level', 'murah'],
  murah: ['murah', 'budget', 'entry level'],
  budget: ['murah', 'budget', 'entry level'],
  profesional: ['professional', 'pro', 'high end'],
  professional: ['professional', 'pro', 'high end'],
};
