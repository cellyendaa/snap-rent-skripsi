import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup untuk ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

// Validate API Key
if (!process.env.GEMINI_API_KEY) {
  console.error(" GEMINI_API_KEY tidak ditemukan di .env file!");
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load products data with multiple path attempts
let products = [];
const possiblePaths = [path.join(__dirname, "../src/data/products.json"), path.join(__dirname, "../../src/data/products.json"), path.join(__dirname, "./data/products.json"), path.join(__dirname, "../data/products.json")];

let loadedPath = null;
for (const productPath of possiblePaths) {
  try {
    console.log(`🔍 Trying to load: ${productPath}`);
    const productsData = fs.readFileSync(productPath, "utf-8");
    products = JSON.parse(productsData);
    loadedPath = productPath;
    console.log(`✅ SUCCESS! Loaded ${products.length} products from: ${productPath}`);
    break;
  } catch (error) {
    console.log(`    Failed: ${error.message}`);
  }
}

if (products.length === 0) {
  console.error("\n CRITICAL ERROR: NO PRODUCTS LOADED! ");
  console.error("\nServer will continue but chatbot won't work properly!");
}

// ============================================
//  DATA KEUNGGULAN KAMERA (Tambahan Baru!)
// ============================================
const cameraAdvantages = {
  // Canon
  "Camera DSLR Canon 700D": {
    keunggulan: ["Entry level friendly", "Harga terjangkau", "Cocok buat pemula"],
    cocokUntuk: ["Pemula fotografi", "Sekolah/kuliah", "Event kecil", "Belajar dasar fotografi"],
    tags: ["pemula", "murah", "entry level", "sekolah", "kuliah"],
  },
  "Camera DSLR Canon 7D Mark II": {
    keunggulan: ["Autofocus cepat", "Build quality tangguh", "Sport & wildlife ready"],
    cocokUntuk: ["Foto olahraga", "Wildlife", "Action photography", "Outdoor"],
    tags: ["sport", "wildlife", "action", "cepat"],
  },
  "Camera DSLR Canon 1DX": {
    keunggulan: ["Professional flagship", "Low light king", "Durability extreme"],
    cocokUntuk: ["Professional work", "Wedding", "Photojournalism", "Studio"],
    tags: ["profesional", "wedding", "kerja", "studio"],
  },
  "Camera DSLR Canon 77D": {
    keunggulan: ["Vlogger friendly", "Dual Pixel AF", "Layar artikulasi"],
    cocokUntuk: ["Vlogging", "Content creator", "YouTube", "Self video"],
    tags: ["vlog", "youtube", "content creator", "video"],
  },
  "Canon C100 Mark II": {
    keunggulan: ["Cinema grade", "Professional video", "Dual Pixel AF"],
    cocokUntuk: ["Filmmaking", "Cinema", "Professional video", "Documentary"],
    tags: ["cinema", "film", "video profesional", "documentary"],
  },

  // Sony
  "Camera Sony A7S": {
    keunggulan: ["Low light king", "Full frame", "Video quality superb"],
    cocokUntuk: ["Low light photography", "Night shoot", "Video cinematic", "Astrophotography"],
    tags: ["low light", "malam", "video", "full frame"],
  },
  "Camera Sony A7R IV": {
    keunggulan: ["61MP resolution", "High detail", "Professional photo"],
    cocokUntuk: ["Studio photography", "Landscape", "Commercial", "Print besar"],
    tags: ["studio", "landscape", "komersial", "high resolution"],
  },
  "Camera Sony A7R V": {
    keunggulan: ["AI Autofocus", "8K video", "8-stops IBIS", "Terbaru & canggih"],
    cocokUntuk: ["Professional hybrid", "Video 8K", "Foto high-end", "Content creator pro"],
    tags: ["8k", "terbaru", "canggih", "hybrid"],
  },
  "Camera Sony A6700": {
    keunggulan: ["4K 120p", "Compact", "Content creator friendly"],
    cocokUntuk: ["Content creator", "Travel vlog", "Action video", "Sehari-hari"],
    tags: ["content creator", "travel", "vlog", "compact"],
  },
  "Camera Sony FS700": {
    keunggulan: ["4K Super35", "Professional video", "Slow motion"],
    cocokUntuk: ["Professional video", "Broadcast", "Commercial video", "Film production"],
    tags: ["video profesional", "broadcast", "commercial", "4k"],
  },

  // Fujifilm
  "Camera Fujifilm X-T2": {
    keunggulan: ["Film simulation", "Build quality", "Classic design"],
    cocokUntuk: ["Street photography", "Travel", "Foto artistic", "Sehari-hari"],
    tags: ["street", "travel", "artistic", "film look"],
  },
  "Camera Fujifilm X-A3": {
    keunggulan: ["Budget friendly", "Selfie screen", "Stylish design"],
    cocokUntuk: ["Pemula", "Selfie", "Travel ringan", "Sosial media"],
    tags: ["murah", "selfie", "pemula", "sosmed"],
  },
  "Camera Fujifilm X-A5": {
    keunggulan: ["4K video", "Phase detection AF", "Stylish"],
    cocokUntuk: ["Vlogging", "Travel", "Sehari-hari", "Sosial media"],
    tags: ["4k", "vlog", "travel", "stylish"],
  },
  "Camera Fujifilm X-T30": {
    keunggulan: ["Retro style", "Film simulation", "Compact power"],
    cocokUntuk: ["Street photography", "Travel", "Content creator", "Artistic"],
    tags: ["retro", "street", "travel", "compact"],
  },
  "Camera Fujifilm X-H2s": {
    keunggulan: ["6.2K video", "Stacked sensor", "Video & foto pro"],
    cocokUntuk: ["Professional hybrid", "Video cinematic", "Sport/action", "Wildlife"],
    tags: ["6.2k", "hybrid", "pro", "action"],
  },

  // Nikon
  "Camera DLSR Nikon D610": {
    keunggulan: ["Full frame affordable", "Good low light", "Build solid"],
    cocokUntuk: ["Landscape", "Portrait", "Wedding", "Hobbyist serius"],
    tags: ["full frame", "landscape", "portrait", "hobby"],
  },
  "Camera DLSR Nikon D810": {
    keunggulan: ["High resolution", "Dynamic range", "Professional build"],
    cocokUntuk: ["Studio", "Landscape", "Commercial", "Fashion"],
    tags: ["studio", "landscape", "komersial", "fashion"],
  },
  "Camera DSLR Nikon D5500": {
    keunggulan: ["Entry level", "Touchscreen", "Lightweight"],
    cocokUntuk: ["Pemula", "Travel", "Sekolah", "Hobi"],
    tags: ["pemula", "travel", "ringan", "touchscreen"],
  },

  // Panasonic
  "Camera Panasonic Lumix GH4": {
    keunggulan: ["4K video pioneer", "M43 flexible", "Video features"],
    cocokUntuk: ["Video production", "Vlogging", "Content creator", "Film"],
    tags: ["4k", "video", "vlog", "film"],
  },
  "Camera Panasonic Lumix GH6": {
    keunggulan: ["5.7K ProRes", "Video beast", "Professional grade"],
    cocokUntuk: ["Professional video", "Filmmaking", "Commercial", "YouTube pro"],
    tags: ["5.7k", "prores", "video pro", "filmmaking"],
  },

  // Pentax & RED
  "Camera Pentax 645Z": {
    keunggulan: ["Medium format", "51.4MP", "Image quality extreme"],
    cocokUntuk: ["Studio professional", "Fashion", "Commercial high-end", "Landscape"],
    tags: ["medium format", "studio", "fashion", "komersial"],
  },
  "RED Epic-X": {
    keunggulan: ["Hollywood grade", "Super35 cinema", "Professional production"],
    cocokUntuk: ["Film production", "Commercial cinema", "Broadcast", "Netflix ready"],
    tags: ["hollywood", "cinema", "film", "broadcast"],
  },

  // DJI
  "DJI Osmo Pocket 3": {
    keunggulan: ["Super compact", "1-inch sensor", "Gimbal built-in", "Travel friendly"],
    cocokUntuk: ["Travel", "Vlog", "Liburan", "Sehari-hari", "Content creator mobile"],
    tags: ["travel", "vlog", "liburan", "compact", "gimbal"],
  },
};

// Helper: Get keunggulan untuk produk
function getProductAdvantages(productName) {
  // Cari match di cameraAdvantages
  for (const [key, value] of Object.entries(cameraAdvantages)) {
    if (productName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return null;
}

// Helper: Safely get string from field with extensive fallbacks
function getStringField(product, fieldName) {
  try {
    const field = product[fieldName];
    if (typeof field === "string") return field.toLowerCase();
    if (field && typeof field === "object" && field.name) {
      return String(field.name).toLowerCase();
    }
    if (Array.isArray(field) && field.length > 0) {
      const first = field[0];
      if (typeof first === "string") return first.toLowerCase();
      if (first && first.name) return String(first.name).toLowerCase();
    }
  } catch (e) {
    return "";
  }
  return "";
}

// ============================================
// 🔍 ENHANCED SEARCH SYSTEM
// ============================================
function searchProducts(query) {
  console.log(`\n🔎 SEARCH REQUEST: "${query}"`);

  const queryLower = query.toLowerCase();

  //  PERTANYAAN UMUM - Return SEMUA produk
  const generalQueries = ["ada kamera apa", "kamera apa saja", "kamera apa aja", "list kamera", "daftar kamera", "semua kamera", "kamera yang tersedia", "show all", "lihat semua", "apa aja", "apa saja"];

  const isGeneralQuery = generalQueries.some((q) => queryLower.includes(q));

  if (isGeneralQuery) {
    console.log(" GENERAL QUERY detected! Returning ALL products");
    return {
      type: "ALL_PRODUCTS",
      products: products,
      message: "Berikut semua kamera yang tersedia di SnapRent! 📷",
    };
  }

  //  REKOMENDASI BERDASAR KEBUTUHAN
  const useCaseKeywords = {
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
  };

  for (const [keyword, tags] of Object.entries(useCaseKeywords)) {
    if (queryLower.includes(keyword)) {
      console.log(` USE CASE detected: "${keyword}"`);
      const matchedProducts = products.filter((p) => {
        const name = p.name || p.title || "";
        const advantages = getProductAdvantages(name);
        if (!advantages) return false;
        return tags.some((tag) => advantages.tags.includes(tag) || advantages.cocokUntuk.some((c) => c.toLowerCase().includes(tag)));
      });

      if (matchedProducts.length > 0) {
        return {
          type: "RECOMMENDATION",
          products: matchedProducts,
          message: `Berdasarkan kebutuhan kamu untuk **${keyword}**, ini rekomendasi terbaiknya! `,
        };
      }
    }
  }

  // 🔍 PENCARIAN NORMAL (existing logic)
  const stopWords = ["ada", "yang", "untuk", "saya", "mau", "cari", "butuh", "perlu", "kak", "nya"];
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2 && !stopWords.includes(w));

  console.log(`📝 Query words: [${queryWords.join(", ")}]`);

  const scoredProducts = products
    .map((p) => {
      let score = 0;

      const name = getStringField(p, "name") || getStringField(p, "title");
      const manufacturer = getStringField(p, "manufacturer");
      const category = getStringField(p, "category");
      const title = getStringField(p, "title");

      const searchableText = `${name} ${title} ${manufacturer} ${category}`.toLowerCase();

      // Exact phrase match
      if (searchableText.includes(queryLower)) {
        score += 1000;
      }

      // Word matching
      queryWords.forEach((word) => {
        if (searchableText.includes(word)) {
          score += 100;
        }
      });

      // Brand matching
      const brands = ["canon", "sony", "nikon", "fuji", "fujifilm", "panasonic", "dji", "pentax", "red"];
      brands.forEach((brand) => {
        if (queryLower.includes(brand) && (manufacturer.includes(brand) || name.includes(brand))) {
          score += 200;
        }
      });

      // Model number detection
      const modelPattern = /[a-z]*\d+[a-z]*/gi;
      const queryModels = queryLower.match(modelPattern) || [];
      queryModels.forEach((model) => {
        if (searchableText.includes(model)) {
          score += 500;
        }
      });

      return { product: p, score, name };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`\n📊 Search Results: ${scoredProducts.length} products found`);

  if (scoredProducts.length > 0) {
    return {
      type: "SEARCH",
      products: scoredProducts.slice(0, 8).map((item) => item.product),
      message: `Nih aku temuin ${scoredProducts.length} kamera yang cocok! 📸`,
    };
  }

  //  TIDAK ADA HASIL - Return semua dengan saran
  return {
    type: "NO_RESULTS",
    products: products.slice(0, 6),
    message: `Hmm, aku gak nemu kamera yang persis seperti itu 😅\n\nTapi jangan khawatir! Ini beberapa kamera populer dari kita yang mungkin cocok buat kamu:`,
  };
}

// Build detailed product context for AI
function buildProductContext(searchResult) {
  const { type, products: foundProducts, message } = searchResult;

  if (foundProducts.length === 0) {
    return {
      text: " TIDAK ADA PRODUK YANG COCOK",
      count: 0,
      message: "Maaf, tidak ada produk yang ditemukan.",
    };
  }

  let contextText = `📦 ${message}\n`;
  contextText += "=".repeat(60) + "\n\n";

  foundProducts.forEach((p, idx) => {
    const name = p.name || p.title || "Unknown";
    const manufacturer = p.manufacturer?.name || p.manufacturer || "Unknown";
    const category = p.category?.name || p.category || "Unknown";
    const price = p.price || 0;
    const imageFile = p.images?.[0]?.image || null;

    //  AMBIL KEUNGGULAN
    const advantages = getProductAdvantages(name);

    contextText += `${idx + 1}. ${name}\n`;
    contextText += `   Brand: ${manufacturer}\n`;
    contextText += `   Kategori: ${category}\n`;
    contextText += `   Harga: Rp ${price.toLocaleString("id-ID")}/hari\n`;

    if (advantages) {
      contextText += `   ⭐ Keunggulan: ${advantages.keunggulan.join(", ")}\n`;
      contextText += `    Cocok untuk: ${advantages.cocokUntuk.join(", ")}\n`;
    }

    contextText += `   🖼️ Gambar: ${imageFile || "_default.jpg"}\n`;
    contextText += `   ID: ${p.id}\n\n`;
  });

  contextText += "=".repeat(60) + "\n";

  return {
    text: contextText,
    count: foundProducts.length,
    message: message,
    type: type,
  };
}

// ============================================
// 🤖 CHATBOT ENDPOINT
// ============================================
app.post("/api/chatbot", async (req, res) => {
  console.log("\n" + "=".repeat(70));
  console.log("🤖 NEW CHATBOT REQUEST");
  console.log("=".repeat(70));

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`💬 User message: "${message}"`);

    // STEP 1: Search products dengan enhanced logic
    const searchResult = searchProducts(message);

    // STEP 2: Build context
    const productContext = buildProductContext(searchResult);
    console.log(`\n📊 Context built: ${productContext.count} products`);
    console.log(`📋 Type: ${searchResult.type}`);

    // STEP 3: Build product list for response
    let productList = [];
    if (searchResult.products.length > 0) {
      searchResult.products.forEach((p) => {
        const name = p.name || p.title || "Unknown";
        const manufacturer = p.manufacturer?.name || p.manufacturer || "Unknown";
        const price = p.price || 0;
        const imageFile = p.images?.[0]?.image || null;
        const category = p.category?.name || p.category || "Unknown";

        //  TAMBAHKAN KEUNGGULAN KE RESPONSE
        const advantages = getProductAdvantages(name);

        productList.push({
          id: p.id,
          name: name,
          manufacturer: manufacturer,
          price: price,
          images: imageFile ? [{ image: imageFile }] : [],
          category: category,
          keunggulan: advantages?.keunggulan || [],
          cocokUntuk: advantages?.cocokUntuk || [],
        });
      });
    }

    // STEP 4: Enhanced System Prompt
    const systemPrompt = `Kamu adalah asisten virtual "SnapRent" untuk penyewaan kamera - ramah, friendly, dan penuh gaya bahasa anak muda Indonesia!

🎭 KARAKTER:
- Nama: Asisten SnapRent
- Gaya: Casual, friendly, pakai emoji, humor ringan, tapi tetap informatif
- Target: Semua kalangan (IT & non-IT), jangan terlalu teknis

📊 STATUS DATABASE:
- Total produk: ${products.length} kamera
- Produk ditemukan: ${productContext.count}
- Tipe pencarian: ${searchResult.type}

${productContext.text}

💬 CARA MENJAWAB:

1️⃣ JIKA PERTANYAAN UMUM ("ada kamera apa saja?"):
   - Sambut dengan ramah dan semangat
   - Sebutkan ada berapa total kamera
   - Kelompokkan berdasarkan brand (Canon X kamera, Sony X kamera, dll)
   - Sebutkan range harga dari yang termurah sampai termahal
   - Tanyakan kebutuhan spesifik user

2️⃣ JIKA REKOMENDASI ("kamera buat liburan ke Jepang"):
   - Analisis kebutuhan user
   - Rekomendasikan 2-3 kamera PALING COCOK
   - Jelaskan kenapa cocok berdasarkan keunggulan produk
   - Sebutkan harga
   - Kasih saran akhir "pilih A aja kak karena..."

3️⃣ JIKA PENCARIAN SPESIFIK ("Canon 700D"):
   - Konfirmasi ketersediaan
   - Sebutkan harga
   - Jelaskan keunggulan
   - Tanyakan mau booking?

4️⃣ JIKA TIDAK ADA HASIL:
   - Jawab dengan jujur dan ramah
   - Sarankan alternatif dari produk yang tersedia
   - Tanyakan apakah mau lihat semua kamera?

🚫 LARANGAN:
- JANGAN mengarang produk yang tidak ada
- JANGAN mengarang harga
- JANGAN terlalu teknis (megapixel, ISO, dll) kecuali ditanya

✅ WAJIB:
- Selalu cek data dari database
- Gunakan emoji yang sesuai
- Tanyakan kebutuhan spesifik untuk rekomendasi lebih baik
- Format harga: Rp XXX.000/hari

💰 FORMAT HARGA:
Selalu format: Rp [harga].000/hari (contoh: Rp 125.000/hari)`;

    // STEP 5: Call Gemini API
    console.log("\n🚀 Calling Gemini API...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const formattedHistory = history
      .filter((msg) => msg && msg.content)
      .slice(-5)
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Siap! Aku Asisten SnapRent, siap bantu kamu cari kamera terbaik! 📸✨",
            },
          ],
        },
        ...formattedHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    console.log(`✅ Response generated (length: ${response.length} chars)`);
    console.log("=".repeat(70) + "\n");

    res.json({
      response,
      products: productList,
      metadata: {
        productsFound: searchResult.products.length,
        totalProducts: products.length,
        searchType: searchResult.type,
        isDataBased: true,
        databaseLoaded: loadedPath !== null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("\n CHATBOT ERROR:");
    console.error("Message:", error.message);

    res.status(500).json({
      error: "Terjadi kesalahan pada chatbot",
      message: error.message,
      debug: {
        productsLoaded: products.length,
        apiKeyPresent: !!process.env.GEMINI_API_KEY,
      },
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: products.length > 0 ? "OK" : "WARNING",
    message: "Chatbot server is running with Enhanced RAG",
    products: products.length,
    hasApiKey: !!process.env.GEMINI_API_KEY,
    ragEnabled: true,
    databasePath: loadedPath,
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 SNAPRENT CHATBOT SERVER - ENHANCED VERSION");
  console.log("=".repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`📦 Products loaded: ${products.length}`);
  console.log(`🧠 RAG System: ✅ Enhanced with Advantages`);
  console.log(`💾 Database: ${loadedPath || " Not loaded"}`);
  console.log("=".repeat(70));
  console.log("\n✅ Server ready for requests!\n");
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("\n Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("\n Unhandled Rejection:", error);
});
