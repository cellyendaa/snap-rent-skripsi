import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const CHAT_STORAGE_KEY = 'snap_rent_chat';

export interface ChatModeResponse {
  mock: boolean;
}

export async function getChatMode(): Promise<ChatModeResponse> {
  try {
    const { data } = await api.get<ChatModeResponse>('/chat/mode');
    return data;
  } catch {
    return { mock: false };
  }
}

export interface ChatProduct {
  id: string;
  name: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  description: string;
}

export interface ChatResponseSuccess {
  success: true;
  message: string;
  products?: ChatProduct[];
}

export interface ChatResponseError {
  success: false;
  message: string;
}

export type ChatResponse = ChatResponseSuccess | ChatResponseError;

export interface SendChatParams {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  message: string;
}

export async function sendChat(params: SendChatParams): Promise<ChatResponse> {
  try {
    const { data } = await api.post<ChatResponse>('/chat', params);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return { success: false, message: (err.response.data as ChatResponseError).message };
    }
    return { success: false, message: err instanceof Error ? err.message : 'Gagal mengirim pesan.' };
  }
}
