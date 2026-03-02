import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginSuccess {
  success: true;
  message: string;
  user: { name: string; phoneNumber: string };
}

export interface LoginError {
  success: false;
  message: string;
}

export type LoginResponse = LoginSuccess | LoginError;

export async function login(phoneNumber: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/login', {
      phoneNumber,
      password,
    } as LoginRequest);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return {
        success: false,
        message: (err.response.data as LoginError).message,
      };
    }
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Network error. Please try again.',
    };
  }
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  name: string;
}

export interface RegisterSuccess {
  success: true;
  message: string;
  user: { name: string; phoneNumber: string };
}

export interface RegisterError {
  success: false;
  message: string;
}

export type RegisterResponse = RegisterSuccess | RegisterError;

export async function register(
  phoneNumber: string,
  password: string,
  name: string
): Promise<RegisterResponse> {
  try {
    const { data } = await api.post<RegisterResponse>('/register', {
      phoneNumber,
      password,
      name,
    } as RegisterRequest);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return {
        success: false,
        message: (err.response.data as RegisterError).message,
      };
    }
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Network error. Please try again.',
    };
  }
}
