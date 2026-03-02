import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type Content,
  type Part,
  type FunctionDeclaration,
  type FunctionDeclarationsTool,
  type ToolConfig,
  type GenerateContentResult,
} from '@google/generative-ai';
import { searchProducts, getProducts, checkStock, type ProductSearchResult } from './productSearchService.js';

  // Mengambil API key dari untuk mengaktifkan LLM (Gemini).
  function getGeminiApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key || !key.trim()) {
      throw new Error('GEMINI_API_KEY belum di-set. Tambahkan di .env backend untuk Assistant SnapRent.');
    }
    return key.trim();
  }

// Prompt engineering yang akan di baca oloh LLM saat generateContent, Berfungsi mengatur karakter, aturan, dan kapan harus panggil search_products. Ini bagian dari CONTEXT yang diberikan ke LLM.
const SYSTEM_INSTRUCTION_BASE = `Kamu adalah asisten virtual SnapRent untuk penyewaan kamera — ramah, friendly, pakai gaya bahasa casual Indonesia (boleh emoji secukupnya).

KARAKTER: Gaya casual dan informatif; jangan terlalu teknis kecuali user tanya spesifik. Target semua kalangan.

WAJIB – Produk & search_products:
- Setiap kali user tanya tentang produk, rekomendasi, harga, kamera, merek, atau kebutuhan (liburan, vlog, wedding, pemula, dll.) — LANGSUNG panggil search_products agar card produk muncul (setiap card punya link ke halaman produk).
- Rekomendasi sesuai konteks: "kamera buat liburan/vlog/wedding/pemula/murah" → panggil search_products dengan use_case: "travel"/"vlog"/"wedding"/"pemula"/"murah" dan limit 2-3. "Canon"/"Sony" → category "Canon"/"Sony". "budget 200 ribu" → price_max 200000. "rekomendasi" tanpa detail → limit 2.
- Setelah hasil search_products: jelaskan singkat kenapa cocok (pakai keunggulan/cocokUntuk dari data jika ada), sebut harga, ajak klik card.
- Pengecualian: user minta "semua produk"/"lihat semua" → JANGAN panggil search_products. Arahkan: "Kamu bisa lihat semua di Beranda. [Lihat semua produk di Beranda](/)."

CARA MENJAWAB: (1) Pertanyaan umum (lokasi, jam): jawab singkat, format harga Rp xxx/hari. (2) Rekomendasi: panggil search_products dengan use_case; jelaskan kenapa cocok. (3) Produk spesifik: panggil search_products; konfirmasi ketersediaan, tawarkan booking. (4) Tidak ada hasil: jujur, sarankan alternatif atau Beranda.

Jangan mengarang produk/harga. Harga selalu Rp xxx.000/hari. Jawab Bahasa Indonesia.`;

// Function-call RAG: get data, melakukan dynamic retrieval (search_products) berdasarkan pertanyaan user, lalu masukan hasilnya ke dalam konteks untuk generate jawaban yang lebih relevan. LLM akan memutuskan kapan panggil search_products berdasarkan pertanyaan user dan konteks chat. 
const aiTools: FunctionDeclaration[] = [
  {
    name: 'get_products',
    description:
      'Get products from the catalog (real-time from Google Sheet). Use for listing, prices, or recommendations. Untuk rekomendasi berdasarkan kebutuhan isi use_case: travel, vlog, wedding, pemula, murah.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'Product name or partial name' },
        category: { type: SchemaType.STRING, description: 'Category/keyword or use-case' },
        use_case: { type: SchemaType.STRING, description: 'Kebutuhan: travel, vlog, wedding, pemula, murah, studio, sport' },
        price_min: { type: SchemaType.NUMBER, description: 'Min price per day IDR' },
        price_max: { type: SchemaType.NUMBER, description: 'Max price per day IDR' },
        limit: { type: SchemaType.NUMBER, description: 'Max results (2-3 for recommendations)' },
      },
      required: [],
    },
  },
  {
    name: 'check_stock',
    description:
      'Check if a product is available (stock/status). Returns product info and available (true/false). Use when user asks "apakah tersedia", "stok", "ada tidak".',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        product_id: { type: SchemaType.STRING, description: 'Product ID or slug' },
        product_name: { type: SchemaType.STRING, description: 'Product name to look up' },
      },
      required: [],
    },
  },
  {
    name: 'search_products',
    description:
      'Cari produk rental (nama, kategori, rentang harga, use-case). Panggil untuk setiap pertanyaan yang meliputi produk/rekomendasi agar sistem menampilkan card produk. Untuk rekomendasi berdasarkan kebutuhan (travel, vlog, wedding, pemula, murah, dll.) isi use_case agar hasil lebih relevan.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'Product name or partial name' },
        category: { type: SchemaType.STRING, description: 'Category/keyword (Canon, Sony, kamera) atau use-case: travel, vlog, wedding, pemula, murah' },
        use_case: { type: SchemaType.STRING, description: 'Kebutuhan user: travel, vlog, wedding, pemula, murah, studio, sport, wildlife, malam' },
        price_min: { type: SchemaType.NUMBER, description: 'Min price per day IDR' },
        price_max: { type: SchemaType.NUMBER, description: 'Max price per day IDR' },
        limit: { type: SchemaType.NUMBER, description: 'Max results (2-3 untuk rekomendasi, 5-8 untuk daftar)' },
      },
      required: [],
    },
  },
];

// Tool declaration untuk search_products, yang akan dipanggil oleh LLM saat generateContent jika memenuhi kondisi tertentu (mis. user tanya rekomendasi kamera untuk vlog). LLM akan mengisi parameter sesuai kebutuhan (use_case: vlog) dan hasilnya akan dikembalikan ke dalam konteks untuk generate jawaban yang lebih relevan dan bisa menampilkan card produk.
const searchProductsTool: FunctionDeclarationsTool = {
  functionDeclarations: aiTools as FunctionDeclaration[],
};

const toolConfig: ToolConfig = {
  functionCallingConfig: {
    mode: FunctionCallingMode.AUTO,
  },
};

/** Build ringkasan katalog produk untuk konteks AI (maks ~30 produk + keunggulan). */
async function getProductCatalogForAI(): Promise<string> {
  try {
    const all = await searchProducts({}); //retrieval dari google sheet.
    const max = 30;
    const list = all.slice(0, max);
    if (list.length === 0) return 'Katalog produk saat ini kosong.';
    const lines = list.map((p) => {
      const base = `- ${p.title || p.name}: Rp ${p.price.toLocaleString('id-ID')}/hari`;
      const adv = p.keunggulan?.length || p.cocokUntuk?.length
        ? ` | Keunggulan: ${(p.keunggulan || []).join(', ')} | Cocok: ${(p.cocokUntuk || []).join(', ')}`
        : '';
      return base + adv;
    });
    const more = all.length > max ? `\n(... dan ${all.length - max} produk lainnya. Gunakan search_products untuk daftar/rekomendasi.)` : '';
    return `Katalog produk SnapRent (gunakan search_products untuk menampilkan card):\n${lines.join('\n')}${more}\n\nUse-case yang didukung: travel, vlog, wedding, pemula, murah, studio, sport, wildlife, malam. Untuk rekomendasi berdasarkan kebutuhan, panggil search_products dengan parameter use_case.`;
  } catch {
    return 'Katalog produk tidak dapat dimuat. Gunakan search_products untuk mencari produk.';
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  message: string;
  products?: ProductSearchResult[];
}

//hanya formating sebelum di kirim ke LLM 
function messagesToContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

//NLP + LLM: NLP(memahami pesan user) LLM(mengambil fakta), memutuskan perlu fungtion call atau tidak.
function getTextFromResponse(result: GenerateContentResult): string {
  const text = result.response.text();
  return text || '';
}

// Deteksi apakah LLM memanggil function, jika ada functionCall, berati LLM meminta RAG tahap 2 (dynamic retrieval).
function getFunctionCallFromResponse(result: GenerateContentResult): { name: string; args: object } | null {
  const candidate = result.response.candidates?.[0];
  if (!candidate?.content?.parts) return null;
  for (const part of candidate.content.parts) {
    if ('functionCall' in part && part.functionCall) {
      return { name: part.functionCall.name, args: part.functionCall.args || {} };
    }
  }
  return null;
}

const CHAT_HISTORY_LIMIT = 4;

// Fungsi utama Chatbot: hasil RAG tahap 1,NLP,LLM, ini RAG tahap 2, dan final response
export async function sendChat(messages: ChatMessage[], newUserMessage: string): Promise<ChatResponse> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const limitedMessages = messages.slice(-CHAT_HISTORY_LIMIT);
  const history: Content[] = messagesToContents(limitedMessages);
  const newUserContent: Content = {
    role: 'user',
    parts: [{ text: newUserMessage }],
  };
  // RAG tahap 1: ambil katalog dan suntikkan ke promt, sebelum model generate jawaban. 
  const productCatalog = await getProductCatalogForAI();
  const systemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n${productCatalog}`;
  //Analisis model gemini: membaca sytem promt, membaca history chat, memanggil tools (RAG tahp 2).
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    tools: [searchProductsTool],
    toolConfig,
  });

  let contents: Content[] = [...history, newUserContent];
  let lastProducts: ProductSearchResult[] | undefined;
  const maxTurns = 5;
  let turns = 0;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const generateWithRetry = async (): Promise<GenerateContentResult> => {
    try {
      return await model.generateContent({ contents });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('Quota exceeded');
      const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i) ?? msg.match(/"retryDelay":"(\d+)s"/);
      const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 45;
      if (is429 && retrySec > 0 && retrySec <= 120) {
        await sleep(retrySec * 1000);
        return await model.generateContent({ contents });
      }
      throw err;
    }
  };
  // loop rag workflow Selama model masih memanggil function, sistem akan: 1. Jalankan retrieval 2. Masukkan hasil ke model 3. Generate ulang
  while (turns < maxTurns) {
    turns++;
    //NLP + LLM : model memahami pesan user, katalog, dan history.
    const result = await generateWithRetry();
    const functionCall = getFunctionCallFromResponse(result);

    const handleSearchLike = async (args: {
      name?: string;
      category?: string;
      use_case?: string;
      price_min?: number;
      price_max?: number;
      limit?: number;
    }) => {
      const products = await searchProducts({
        name: args.name,
        category: args.category,
        use_case: args.use_case,
        price_min: args.price_min,
        price_max: args.price_max,
        limit: args.limit,
      });
      lastProducts = products;
      return {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title,
          slug: p.slug,
          price: p.price,
          image: p.image,
          description: p.description,
          keunggulan: p.keunggulan,
          cocokUntuk: p.cocokUntuk,
        })),
        count: products.length,
      };
    };
    
    //RAG tahap 2: Dynamic retrieval berdasarkan pertanyaan user. jika model menanggil search_prducts, maka sistem ambil data real-time dari google sheet. 
    if (functionCall && functionCall.name === 'search_products') {
      const args = functionCall.args as { name?: string; category?: string; use_case?: string; price_min?: number; price_max?: number; limit?: number };
      const response = await handleSearchLike(args);
      const modelMessageWithCall: Content = {
        role: 'model',
        parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
      };
      const functionResponsePart: Part = {
        functionResponse: { name: functionCall.name, response: response },
      };
      contents = [...contents, modelMessageWithCall, { role: 'user' as const, parts: [functionResponsePart] }];
      continue;
    }

    if (functionCall && functionCall.name === 'get_products') {
      const args = functionCall.args as { name?: string; category?: string; use_case?: string; price_min?: number; price_max?: number; limit?: number };
      const response = await handleSearchLike(args);
      const modelMessageWithCall: Content = {
        role: 'model',
        parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
      };
      const functionResponsePart: Part = {
        functionResponse: { name: functionCall.name, response: response },
      };
      contents = [...contents, modelMessageWithCall, { role: 'user' as const, parts: [functionResponsePart] }];
      continue;
    }

    if (functionCall && functionCall.name === 'check_stock') {
      const args = functionCall.args as { product_id?: string; product_name?: string };
      const { product, available } = await checkStock(args.product_id, args.product_name);
      if (product) lastProducts = available ? [product] : undefined;
      const modelMessageWithCall: Content = {
        role: 'model',
        parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
      };
      const functionResponsePart: Part = {
        functionResponse: {
          name: functionCall.name,
          response: {
            product: product
              ? { id: product.id, name: product.name, title: product.title, slug: product.slug, price: product.price, image: product.image, description: product.description }
              : null,
            available,
          },
        },
      };
      contents = [...contents, modelMessageWithCall, { role: 'user' as const, parts: [functionResponsePart] }];
      continue;
    }
    // final generation: jika tidak ada function call, berati LLM sudah menghasilkan jawaban.
    const text = getTextFromResponse(result);
    return { message: text, products: lastProducts };
  }

  const lastResult = await generateWithRetry();
  const text = getTextFromResponse(lastResult);
  return { message: text || 'Maaf, terjadi kesalahan.', products: lastProducts };
}
