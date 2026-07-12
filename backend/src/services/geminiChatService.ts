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

import { searchProducts, checkStock, type ProductSearchResult } from './productSearchService.js';
import { getNextApiKey, markKeyError } from './geminiKeyManager.js';
import { analyzeNLU } from './nluService.js';


// ==================== SYSTEM PROMPT (Diperbaiki sedikit) ====================
const SYSTEM_INSTRUCTION_BASE = `Kamu adalah asisten virtual SnapRent — ramah, santai, dan membantu. Gunakan bahasa Indonesia yang natural dan mudah dipahami.

Aturan PENTING Anti-Halusinasi:
- JANGAN PERNAH mengarang harga, stok, spesifikasi, atau keunggulan produk.
- Selalu ambil data harga, stok, dan informasi produk dari hasil search_products.
- Jika tidak ada hasil dari search_products, katakan jujur bahwa saat ini tidak ditemukan produk yang sesuai.
- Berikan maksimal 3 rekomendasi per jawaban.
- Sebutkan nama produk + harga + 1 atau 2 alasan kenapa cocok.
- Akhiri jawaban dengan ajakan action (klik card atau cek ketersediaan).

Gaya bicara: Ramah seperti teman, boleh pakai emoji secukupnya.`;

// ==================== INFO KEBIJAKAN SEWA (Static, tidak berubah-ubah) ====================
const RENTAL_POLICY_INFO = `
Informasi Kebijakan Sewa SnapRent:
- Syarat sewa: cukup menunjukkan KTP asli (tidak perlu jaminan lain).
- Pembayaran dilakukan LANGSUNG di toko saat pengambilan barang (bukan lewat payment gateway online).
- Untuk detail pembayaran, metode, atau pertanyaan teknis lain terkait transaksi, karyawan toko akan menjelaskan langsung saat proses pembayaran berlangsung.
- Jika user bertanya hal di luar cakupan di atas (misalnya nominal DP, cicilan, atau kebijakan yang tidak disebutkan di sini), arahkan user untuk menanyakannya langsung ke karyawan saat datang ke toko / saat pembayaran, JANGAN mengarang jawaban.
`;

const aiTools: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description: 'Cari produk rental berdasarkan nama, kategori, use-case, atau rentang harga.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'Product name or partial name' },
        category: { type: SchemaType.STRING, description: 'Category/keyword atau merk' },
        use_case: { type: SchemaType.STRING, description: 'travel, vlog, wedding, pemula, murah, studio, sport, wildlife, malam' },
        price_min: { type: SchemaType.NUMBER, description: 'Min price per day' },
        price_max: { type: SchemaType.NUMBER, description: 'Max price per day' },
        limit: { type: SchemaType.NUMBER, description: 'Max results' },
      },
      required: [],
    },
  },
  {
    name: 'check_stock',
    description: 'Check stok produk tertentu.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        product_id: { type: SchemaType.STRING },
        product_name: { type: SchemaType.STRING },
      },
      required: [],
    },
  },
];

const searchProductsTool: FunctionDeclarationsTool = { functionDeclarations: aiTools };
/** AUTO: model boleh memanggil tool ATAU langsung jawab teks (bukan ANY yang memaksa tool terus-menerus). */
const toolConfigAuto: ToolConfig = { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
/** NONE: setelah tool dijalankan, paksa model jawab teks tanpa tool lagi. */
const toolConfigNone: ToolConfig = { functionCallingConfig: { mode: FunctionCallingMode.NONE } };

// ==================== HELPER FUNCTIONS ====================
async function getProductCatalogForAI(): Promise<string> {
  try {
    const all = await searchProducts({});
    const max = 30;
    const list = all.slice(0, max);
    const lines = list.map((p) => {
      const base = `- ${p.title || p.name}: Rp ${p.price.toLocaleString('id-ID')}/hari`;
      const adv = p.keunggulan?.length || p.cocokUntuk?.length
        ? ` | Keunggulan: ${(p.keunggulan || []).join(', ')} | Cocok: ${(p.cocokUntuk || []).join(', ')}`
        : '';
      return base + adv;
    });
    const more = all.length > max ? `\n(... dan ${all.length - max} produk lainnya)` : '';
    return `Katalog produk SnapRent:\n${lines.join('\n')}${more}`;
  } catch {
    return 'Katalog produk tidak dapat dimuat.';
  }
}

function messagesToContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function getTextFromResponse(result: GenerateContentResult): string {
  try {
    return result.response.text() || '';
  } catch {
    // Response hanya berisi functionCall (tanpa text part)
    return '';
  }
}

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

function buildFallbackUserMessage(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  if (msg.includes('semua_gemini_key_limit')) {
    return 'Semua API key Gemini sedang limit. Coba lagi dalam beberapa menit ya 🙂';
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('too many requests')) {
    return 'Kuota AI lagi penuh nih. Coba tanya lagi setelah 1–2 menit ya 🙂';
  }
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('service unavailable')) {
    return 'Maaf, AI lagi capek nih. Coba tanya lagi setelah 1–2 menit ya 🙂';
  }
  if (msg.includes('api key') || msg.includes('api_key') || msg.includes('invalid') || msg.includes('permission')) {
    return 'Ada masalah konfigurasi API key Gemini. Cek GEMINI_API_KEYS di server ya.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Responsenya lama banget. Coba kirim ulang pesan kamu.';
  }
  return 'Maaf, lagi ada gangguan di sistem AI. Coba tanya lagi dalam 10–20 detik ya 🙂';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  message: string;
  products?: ProductSearchResult[];
}

const CHAT_HISTORY_LIMIT = 4;
const MAX_TURNS = 5;

export async function sendChat(messages: ChatMessage[], newUserMessage: string): Promise<ChatResponse> {
  const MAX_RETRIES = 3;
  let lastError: unknown;

  const nlu = analyzeNLU(newUserMessage);
  console.log(`[NLU] Intent: ${nlu.intent} | Confidence: ${nlu.confidence}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let apiKey = '';
    try {
      apiKey = getNextApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);

      const limitedMessages = messages.slice(-CHAT_HISTORY_LIMIT);
      const history: Content[] = messagesToContents(limitedMessages);
      const newUserContent: Content = { role: 'user', parts: [{ text: newUserMessage }] };

      const productCatalog = await getProductCatalogForAI();
      const systemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n${RENTAL_POLICY_INFO}\n\n${productCatalog}`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        tools: [searchProductsTool],
        toolConfig: toolConfigAuto,
      });

      let contents: Content[] = [...history, newUserContent];
      let lastProducts: ProductSearchResult[] | undefined;
      let turns = 0;
      let usedTool = false;

      while (turns < MAX_TURNS) {
        turns++;

        // Setelah tool dijalankan, paksa jawaban teks agar tidak loop function-calling.
        const result = await model.generateContent({
          contents,
          tools: [searchProductsTool],
          toolConfig: usedTool ? toolConfigNone : toolConfigAuto,
        });

        const functionCall = getFunctionCallFromResponse(result);
        console.log(`🔎 [DEBUG] Turn ${turns} - Has functionCall:`, !!functionCall, '| usedTool:', usedTool);

        if (functionCall && (functionCall.name === 'search_products' || functionCall.name === 'get_products')) {
          const args = functionCall.args as Record<string, unknown>;
          const products = await searchProducts({
            name: typeof args.name === 'string' ? args.name : undefined,
            category: typeof args.category === 'string' ? args.category : undefined,
            use_case: typeof args.use_case === 'string' ? args.use_case : undefined,
            price_min: typeof args.price_min === 'number' ? args.price_min : undefined,
            price_max: typeof args.price_max === 'number' ? args.price_max : undefined,
            limit: typeof args.limit === 'number' ? args.limit : 4,
          });

          lastProducts = products;
          usedTool = true;

          const modelMessageWithCall: Content = {
            role: 'model',
            parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
          };

          const functionResponsePart: Part = {
            functionResponse: {
              name: functionCall.name,
              response: {
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
              },
            },
          };

          contents = [...contents, modelMessageWithCall, { role: 'user' as const, parts: [functionResponsePart] }];
          continue;
        }

        if (functionCall && functionCall.name === 'check_stock') {
          const args = functionCall.args as Record<string, unknown>;
          const { product, available } = await checkStock(
            typeof args.product_id === 'string' ? args.product_id : undefined,
            typeof args.product_name === 'string' ? args.product_name : undefined,
          );
          if (product) lastProducts = available ? [product] : undefined;
          usedTool = true;

          const modelMessageWithCall: Content = {
            role: 'model',
            parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
          };

          const functionResponsePart: Part = {
            functionResponse: { name: functionCall.name, response: { product, available } },
          };

          contents = [...contents, modelMessageWithCall, { role: 'user' as const, parts: [functionResponsePart] }];
          continue;
        }

        const text = getTextFromResponse(result);
        if (text.trim()) {
          return { message: text, products: lastProducts };
        }

        // Tidak ada text dan tidak ada function call yang dikenali
        throw new Error(`Empty Gemini response at turn ${turns} (no text, no known function call)`);
      }

      // Loop habis tanpa jawaban teks — kalau sudah ada produk, kasih jawaban fallback yang berguna
      if (lastProducts && lastProducts.length > 0) {
        const lines = lastProducts.slice(0, 3).map((p) => {
          const name = p.title || p.name;
          return `- **${name}**: Rp ${p.price.toLocaleString('id-ID')}/hari`;
        });
        return {
          message: `Ini beberapa rekomendasi yang cocok:\n\n${lines.join('\n')}\n\nKlik card di bawah buat lihat detail atau sewa ya 🙂`,
          products: lastProducts,
        };
      }

      throw new Error('Function-calling loop selesai tanpa jawaban teks dari Gemini');
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Percobaan ${attempt}/${MAX_RETRIES} gagal:`, msg);

      const lower = msg.toLowerCase();
      if (
        apiKey &&
        (lower.includes('429') ||
          lower.includes('quota') ||
          lower.includes('too many requests') ||
          lower.includes('semua_gemini_key_limit'))
      ) {
        // Blokir key yang BENAR-BENAR gagal, bukan key berikutnya
        markKeyError(apiKey, true);
      }

      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 1500;
        console.log(`⏳ Menunggu ${waitTime / 1000} detik sebelum retry...`);
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }
    }
  }

  console.error('All retries failed:', lastError);
  return {
    message: buildFallbackUserMessage(lastError),
    products: undefined,
  };
}