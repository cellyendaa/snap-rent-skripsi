// services/geminiKeyManager.ts
import { createHash } from 'crypto';

interface KeyInfo {
  key: string;
  lastUsed: Date;
  requestCount: number;
  errorCount: number;
  isBlocked: boolean;
  blockedUntil?: Date;
}

class GeminiKeyManager {
  private keys: KeyInfo[] = [];
  private currentIndex = 0;
  private readonly BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 menit

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    const rawKeys = process.env.GEMINI_API_KEYS || '';
    const keyList = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 20);

    if (keyList.length === 0) throw new Error('GEMINI_API_KEYS belum diisi di .env');

    this.keys = keyList.map(key => ({
      key, lastUsed: new Date(), requestCount: 0, errorCount: 0, isBlocked: false
    }));

    console.log(`🔑 Gemini Key Manager loaded dengan ${this.keys.length} API Key`);
  }

  getNextKey(): string {
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const keyInfo = this.keys[idx];

      if (keyInfo.isBlocked && keyInfo.blockedUntil && Date.now() > keyInfo.blockedUntil.getTime()) {
        keyInfo.isBlocked = false;
      }

      if (!keyInfo.isBlocked) {
        this.currentIndex = (idx + 1) % this.keys.length;
        keyInfo.lastUsed = new Date();
        keyInfo.requestCount++;
        console.log(`🔑 [Key #${idx+1}] digunakan | Request: ${keyInfo.requestCount}`);
        return keyInfo.key;
      }
    }
    throw new Error('SEMUA_GEMINI_KEY_LIMIT');
  }

  markError(key: string, isQuotaError: boolean = true) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (!keyInfo) return;
    keyInfo.errorCount++;
    if (isQuotaError) {
      keyInfo.isBlocked = true;
      keyInfo.blockedUntil = new Date(Date.now() + this.BLOCK_DURATION_MS);
      console.log(`🚫 Key diblokir sementara (5 menit)`);
    }
  }
}

const keyManager = new GeminiKeyManager();
export const getNextApiKey = () => keyManager.getNextKey();
export const markKeyError = (key: string, isQuota = true) => keyManager.markError(key, isQuota);