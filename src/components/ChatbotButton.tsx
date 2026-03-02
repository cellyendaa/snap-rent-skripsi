"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, ShoppingCart, Camera, Star, Target, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProductImageUrl } from "../utils/products";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  products?: Product[];
}

interface Product {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  price: number;
  images: { image: string }[];
  model: string;
  slug?: string;
  keunggulan?: string[];
  cocokUntuk?: string[];
}

//  KOMPONEN PRODUCT CARD
function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  console.log("Product images raw:", product.images);
  console.log("First image value:", product.images?.[0]?.image);
  console.log("Generated URL:", product.images?.[0]?.image ? getProductImageUrl(product.images[0].image) : "KOSONG");

  // ✅ FIX: Cek lebih ketat — pastikan images ada, length > 0, dan field image-nya tidak kosong
  const rawImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]?.image ?? ""
      : "";

  // ✅ FIX: Hanya panggil getProductImageUrl jika rawImage benar-benar ada isinya
  const imageUrl = rawImage ? getProductImageUrl(rawImage) : "";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 mt-3 hover:-translate-y-1">
      <div className="relative h-32 sm:h-36 bg-gray-100">
        {/* ✅ FIX: Gunakan imageUrl yang sudah divalidasi, fallback ke Camera icon jika kosong */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // ✅ FIX: Saat error, ganti dengan placeholder SVG bukan hide elemen
              // Hide element lalu tampilkan fallback container
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className =
                  "w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 absolute inset-0";
                fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          // Fallback jika memang tidak ada image sama sekali dari data
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <Camera className="w-14 h-14 text-blue-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full uppercase">{product.manufacturer}</span>
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h4>
        <p className="text-xs text-gray-500 mb-2">{product.category}</p>

        {product.keunggulan && product.keunggulan.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
              <Star className="w-3 h-3" /> Keunggulan:
            </p>
            <div className="flex flex-wrap gap-1">
              {product.keunggulan.slice(0, 3).map((item, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.cocokUntuk && product.cocokUntuk.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Cocok untuk:
            </p>
            <div className="flex flex-wrap gap-1">
              {product.cocokUntuk.slice(0, 2).map((item, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Harga sewa</p>
            <p className="text-blue-600 font-bold text-sm">
              {formatPrice(product.price)}
              <span className="text-xs font-normal text-gray-500">/hari</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/book-now", { state: { product } })}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingCart className="w-3 h-3" />
            Lihat
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductList({ products, searchType }: { products: Product[]; searchType?: string }) {
  if (products.length === 0) return null;

  return (
    <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        {searchType === "ALL_PRODUCTS" ? `Semua ${products.length} kamera tersedia:` : `${products.length} kamera ditemukan:`}
      </p>
      <div className={`grid gap-2 sm:gap-3 ${products.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Halo halo! 👋\n\nMau sewa kamera apa nih? Jangan bilang cuma buat foto mantan ya 😌",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchType, setLastSearchType] = useState<string>("");
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const quickReplies = ["Ada kamera apa saja?", "Kamera buat liburan", "Rekomendasi kamera vlog", "Kamera Canon yang tersedia", "Kamera murah buat pemula"];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const saved = localStorage.getItem("snaprent_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const messagesWithDate = parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDate);
        if (messagesWithDate.length > 1) {
          setShowQuickReplies(false);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("snaprent_chat_history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node)) {
        // Optional: close on outside click
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendMessage = useCallback(
    async (messageText: string = input) => {
      if (!messageText.trim() || isLoading || isSending) return;

      const userMessage: Message = {
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setIsSending(true);
      setShowQuickReplies(false);

      try {
        const response = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText, history: messages }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.metadata?.searchType) setLastSearchType(data.metadata.searchType);

        const assistantMessage: Message = {
          role: "assistant",
          content: data.response || "Maaf, tidak ada respons.",
          timestamp: new Date(),
          products: data.products || [],
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Yahh sinyalnya lagi drama 😭 Coba refresh dikit yaa, biar kita lanjut ngobrol~.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsSending(false);
      }
    },
    [input, isLoading, isSending, messages],
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
    setShowQuickReplies(false);
    setTimeout(() => {
      sendMessage(reply);
      inputRef.current?.focus();
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.length > 0 && showQuickReplies) {
      setShowQuickReplies(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Halo halo! 👋\n\nMau sewa kamera apa nih? Jangan bilang cuma buat foto mantan ya 😌",
        timestamp: new Date(),
      },
    ]);
    setShowQuickReplies(true);
    localStorage.removeItem("snaprent_chat_history");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 ${isOpen ? "rotate-90 scale-110" : "animate-bounce-subtle"}`}
        aria-label="Open chatbot"
      >
        {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
        {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full text-[10px] sm:text-xs flex items-center justify-center animate-pulse">!</span>}
      </button>

      {isOpen && (
        <div
          ref={chatContainerRef}
          className="fixed bottom-20 sm:bottom-24 right-0 sm:right-6 left-0 sm:left-auto w-full sm:w-[400px] md:w-[450px] lg:w-[500px] xl:w-[550px] h-[calc(100vh-120px)] sm:h-[500px] md:h-[550px] lg:h-[600px] xl:h-[650px] max-h-[calc(100vh-140px)] mx-0 sm:mx-0 bg-white sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 sm:rounded-t-2xl flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Asisten SnapRent</h3>
                <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online • Siap bantu kamu
                </p>
              </div>
            </div>
            <button onClick={clearChat} className="text-blue-100 hover:text-white text-xs underline hover:bg-white/10 px-2 py-1 rounded transition-colors" title="Hapus riwayat chat">
              Reset
            </button>
          </div>

          <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-50 space-y-3 sm:space-y-4 scroll-smooth min-h-0">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
                <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 ${message.role === "user" ? "bg-blue-600 text-white rounded-br-none shadow-md" : "bg-white text-gray-800 shadow-sm rounded-bl-none border border-gray-100"}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.role === "assistant" && message.products && message.products.length > 0 && <ProductList products={message.products} searchType={lastSearchType} />}
                  <span className={`text-xs mt-2 block ${message.role === "user" ? "text-blue-100" : "text-gray-400"}`}>{formatTime(message.timestamp)}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Asisten mengetik...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showQuickReplies ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Pertanyaan populer:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    disabled={isLoading || isSending}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white border-t border-gray-200 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isLoading ? "Tunggu sebentar..." : "Ketik pesan Anda..."}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm transition-all"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim() || isSending}
                className={`bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0 ${isSending ? "animate-pulse" : ""}`}
              >
                <Send className={`w-5 h-5 ${isSending ? "animate-ping" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
