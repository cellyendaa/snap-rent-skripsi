import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Send, MessageCircle, X, Sparkles } from "lucide-react";
import { useAppSelector } from "../hooks/useAppSelector";
import { sendChat, getChatMode, CHAT_STORAGE_KEY } from "../services/chatService";
import { getProductImageForChat, formatCurrency } from "../utils/products";

// ==================== DEBOUNCE HELPER ====================
const useDebouncedCallback = <T extends (...args: any[]) => any>(callback: T, delay: number) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};
// ========================================================

interface Message {
  role: "user" | "model";
  content: string;
  /** Ditampilkan saat user belum login; berisi pesan + link login */
  loginRequired?: boolean;
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

function loadMessagesFromStorage(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const LOGIN_REQUIRED_MESSAGE = "Silakan **login** terlebih dahulu untuk bertanya ke Assistant SnapRent. Setelah login, Anda bisa menanyakan harga, daftar produk, dan rekomendasi rental.";

const QUICK_REPLIES = ["Ada kamera apa saja?", "Kamera buat liburan", "Rekomendasi kamera vlog", "Kamera Canon yang tersedia", "Kamera murah buat pemula"];

const FloatingChat = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessagesFromStorage);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstAuthMount = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isFirstAuthMount.current) {
      isFirstAuthMount.current = false;
      return;
    }
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([]);
    setShowQuickReplies(true);
  }, [user]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) getChatMode().then((res) => setMockMode(res.mock));
  }, [isOpen]);

  // GANTI SELURUH FUNGSI sendMessage dengan ini:
  const debouncedSendMessage = useDebouncedCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    setInput("");
    setError(null);
    setShowQuickReplies(false);

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);

    if (!user) {
      setMessages((prev) => [...prev, { role: "model", content: LOGIN_REQUIRED_MESSAGE, loginRequired: true }]);
      return;
    }

    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await sendChat({ messages: history, message: text });

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: result.message,
            ...(result.products && result.products.length > 0 && { products: result.products }),
          },
        ]);
      } else {
        setError(result.message);
        setMessages((prev) => [...prev, { role: "model", content: result.message }]);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal terhubung ke asisten. Coba lagi sebentar ya.");
    } finally {
      setLoading(false);
    }
  }, 800); // 800ms debounce

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      debouncedSendMessage(input.trim());
    }
  };

  const handleQuickReply = (reply: string) => {
    if (loading) return;
    debouncedSendMessage(reply);
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickReplies(true);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 ${
          isOpen ? "rotate-90 scale-110" : ""
        }`}
        aria-label={isOpen ? "Tutup chat" : "Buka asisten"}
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full text-[10px] sm:text-xs flex items-center justify-center animate-pulse">!</span>
          </>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden
            bottom-20 right-4 w-[calc(100vw-2rem)] h-[min(75vh,420px)]
            sm:bottom-24 sm:right-6 sm:w-[calc(100vw-3rem)] sm:max-w-md sm:h-[min(72vh,480px)]
            md:max-w-lg md:h-[min(75vh,520px)]
            lg:max-w-xl lg:h-[min(80vh,600px)] lg:max-h-[min(80vh,640px)]"
          aria-label="Chat asisten"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MessageCircle size={22} className="text-amber-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Asisten Snaprent</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online • Siap bantu kamu
              </p>
              {mockMode && <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded w-fit">MOCK MODE ACTIVE</span>}
            </div>
            <button type="button" onClick={clearChat} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs underline hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
              Reset
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
            {/* {messages.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                <p>Contoh: &quot;Berapa harga sewa DJI Osmo Pocket 3?&quot;</p>
                <p className="mt-1">&quot;Apa saja kamera yang tersedia?&quot;</p>
              </div>
            )} */}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`min-w-0 max-w-[90%] rounded-2xl px-3 py-2 overflow-hidden ${
                    msg.role === "user" ? "bg-amber-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 break-words [&>*]:break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }) =>
                            href?.startsWith("/") ? (
                              <Link to={href} onClick={() => setIsOpen(false)} {...props}>
                                {children}
                              </Link>
                            ) : (
                              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined} {...props}>
                                {children}
                              </a>
                            ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.loginRequired && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <Link to="/login" onClick={() => setIsOpen(false)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
                        Login di sini →
                      </Link>
                    </div>
                  )}

                  {msg.role === "model" && msg.products && msg.products.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Produk</p>
                      <div className="grid grid-cols-2 gap-2 min-w-0">
                        {msg.products.map((p) => (
                          <div key={p.id} className="flex flex-col rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 overflow-hidden min-w-0">
                            {/* Product Image */}
                            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <img
                                src={
                                  getProductImageForChat(p) ||
                                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="80"%3E%3Crect fill="%23e5e7eb" width="120" height="80"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="10"%3E?%3C/text%3E%3C/svg%3E'
                                }
                                alt={p.title || p.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="80"%3E%3Crect fill="%23e5e7eb" width="120" height="80"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="10"%3E?%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex flex-col gap-1.5 p-2 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-xs leading-tight line-clamp-2">{p.title || p.name}</p>

                              {/* Keunggulan */}
                              {p.keunggulan && p.keunggulan.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-amber-500 flex items-center gap-0.5 mb-0.5">☆ Keunggulan:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {p.keunggulan.slice(0, 3).map((k, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] border border-gray-200 dark:border-gray-600">
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Cocok Untuk */}
                              {p.cocokUntuk && p.cocokUntuk.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-green-500 flex items-center gap-0.5 mb-0.5">◎ Cocok untuk:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {p.cocokUntuk.slice(0, 3).map((c, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] border border-gray-200 dark:border-gray-600">
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Price + CTA */}
                              <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100 dark:border-gray-700">
                                <div>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500">Harga sewa</p>
                                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(p.price)}
                                    <span className="font-normal text-[9px] text-gray-400">/hari</span>
                                  </p>
                                </div>
                                <Link
                                  to={`/product/${p.slug}`}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold transition-colors"
                                >
                                  Lihat
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                    <span>Asisten mengetik</span>
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {showQuickReplies && messages.length === 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Pertanyaan populer:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickReply(reply)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ketik pesan..."
              rows={1}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="flex-shrink-0 p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white transition-colors" aria-label="Kirim">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
