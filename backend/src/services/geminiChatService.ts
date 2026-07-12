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
const toolConfig: ToolConfig = { functionCallingConfig: { mode: FunctionCallingMode.ANY } };

// ==================== HELPER FUNCTIONS (Sama seperti aslimu) ====================
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
  return result.response.text() || '';
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

// ==================== MAIN FUNCTION (RAG 1 & 2 tetap sama) ====================
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

// ==================== MAIN FUNCTION DENGAN RETRY KUAT ====================
export async function sendChat(messages: ChatMessage[], newUserMessage: string): Promise<ChatResponse> {
  const MAX_RETRIES = 3;           // Total percobaan
  let lastError: any;

const nlu = analyzeNLU(newUserMessage);
console.log(`[NLU] Intent: ${nlu.intent} | Confidence: ${nlu.confidence}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = getNextApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);

      const limitedMessages = messages.slice(-CHAT_HISTORY_LIMIT);
      const history: Content[] = messagesToContents(limitedMessages);
      const newUserContent: Content = { role: 'user', parts: [{ text: newUserMessage }] };

      // ==================== RAG TAHAP 1 (ditambah policy info) ====================
      const productCatalog = await getProductCatalogForAI();
      const systemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n${RENTAL_POLICY_INFO}\n\n${productCatalog}`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        tools: [searchProductsTool],
        toolConfig,
      });

      let contents: Content[] = [...history, newUserContent];
      let lastProducts: ProductSearchResult[] | undefined;
      let turns = 0;

      // ==================== RAG TAHAP 2 (Function Calling Loop - TIDAK DIUBAH) ====================
      while (turns < MAX_TURNS) {
        turns++;

        const result = await model.generateContent({ contents });
        console.log(`🔎 [DEBUG] Turn ${turns} - Has functionCall:`, !!getFunctionCallFromResponse(result));
        const functionCall = getFunctionCallFromResponse(result);
        
        if (functionCall && (functionCall.name === 'search_products' || functionCall.name === 'get_products')) {
          const args = functionCall.args as any;
          const products = await searchProducts({
            name: args.name,
            category: args.category,
            use_case: args.use_case,
            price_min: args.price_min,
            price_max: args.price_max,
            limit: args.limit || 4,
          });

          lastProducts = products;

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
          // ... (biarkan sesuai kode lama kamu)
          const args = functionCall.args as any;
          const { product, available } = await checkStock(args.product_id, args.product_name);
          if (product) lastProducts = available ? [product] : undefined;

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

        // Final Answer
        const text = getTextFromResponse(result);
        return { message: text, products: lastProducts };

      } // end while

    } catch (err: any) {
      lastError = err;
      const msg = err.message || String(err);

      console.log(`❌ Percobaan ${attempt}/${MAX_RETRIES} gagal: ${msg.substring(0, 100)}...`);

      if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
        markKeyError(getNextApiKey(), true);
      }

      // Tunggu sebelum retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`⏳ Menunggu ${waitTime/1000} detik sebelum retry...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
    }
  }

  // Jika semua retry gagal
  console.error('All retries failed:', lastError);
  return {
    message: 'Maaf, lagi banyak yang pakai sistemnya nih. Coba tanya lagi dalam 10-20 detik ya 🙂',
    products: undefined
  };
}