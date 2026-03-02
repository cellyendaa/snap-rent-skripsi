import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, LogIn, Loader2, UserPlus } from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setUser } from '../store/slices/authSlice';
import { login, register as registerApi } from '../services/authService';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  message?: string;
}

interface LoginFormValues {
  phoneNumber: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const LoginModal = ({ open, onClose, onLoginSuccess, message }: LoginModalProps) => {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<'login' | 'register'>('login');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    defaultValues: { phoneNumber: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    defaultValues: { name: '', phoneNumber: '', password: '', confirmPassword: '' },
  });

  const handleClose = () => {
    setSubmitError(null);
    setView('login');
    loginForm.reset();
    registerForm.reset();
    onClose();
  };

  const onLoginSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setIsLoading(true);
    try {
      const result = await login(values.phoneNumber.trim(), values.password);
      if (result.success) {
        dispatch(setUser(result.user));
        handleClose();
        onLoginSuccess();
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    if (values.password !== values.confirmPassword) {
      setSubmitError('Password dan konfirmasi password tidak sama.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await registerApi(
        values.phoneNumber.trim(),
        values.password,
        values.name.trim()
      );
      if (result.success) {
        dispatch(setUser(result.user));
        handleClose();
        onLoginSuccess();
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const isLogin = view === 'login';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={isLogin ? 'login-modal-title' : 'register-modal-title'}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2
              id={isLogin ? 'login-modal-title' : 'register-modal-title'}
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              {isLogin ? 'Log in untuk melanjutkan' : 'Buat akun baru'}
            </h2>
            {message && isLogin && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{message}</p>
            )}
            {!isLogin && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Daftar dengan nomor telepon dan isi data di bawah.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Tutup"
          >
            <X size={24} />
          </button>
        </div>

        {isLogin ? (
          <>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="p-6 space-y-5">
              <div>
                <label htmlFor="login-modal-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nomor telepon
                </label>
                <input
                  id="login-modal-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="contoh: 08123456789"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...loginForm.register('phoneNumber', {
                    required: 'Nomor telepon wajib diisi',
                    minLength: { value: 8, message: 'Nomor telepon terlalu pendek' },
                  })}
                />
                {loginForm.formState.errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {loginForm.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="login-modal-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="login-modal-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...loginForm.register('password', {
                    required: 'Password wajib diisi',
                    minLength: { value: 1, message: 'Password wajib diisi' },
                  })}
                />
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Masuk...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Masuk</span>
                  </>
                )}
              </button>
            </form>
            <div className="px-6 pb-6 pt-0">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => { setView('register'); setSubmitError(null); }}
                  className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Buat sekarang
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="p-6 space-y-4">
              <div>
                <label htmlFor="register-modal-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nama lengkap
                </label>
                <input
                  id="register-modal-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nama Anda"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...registerForm.register('name', {
                    required: 'Nama wajib diisi',
                    minLength: { value: 2, message: 'Nama terlalu pendek' },
                  })}
                />
                {registerForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="register-modal-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nomor telepon
                </label>
                <input
                  id="register-modal-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="contoh: 08123456789"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...registerForm.register('phoneNumber', {
                    required: 'Nomor telepon wajib diisi',
                    minLength: { value: 8, message: 'Nomor telepon terlalu pendek' },
                  })}
                />
                {registerForm.formState.errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {registerForm.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="register-modal-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="register-modal-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 6 karakter"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...registerForm.register('password', {
                    required: 'Password wajib diisi',
                    minLength: { value: 6, message: 'Password minimal 6 karakter' },
                  })}
                />
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="register-modal-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Konfirmasi password
                </label>
                <input
                  id="register-modal-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Ulangi password"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  {...registerForm.register('confirmPassword', {
                    required: 'Konfirmasi password wajib diisi',
                  })}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Mendaftar...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    <span>Daftar</span>
                  </>
                )}
              </button>
            </form>
            <div className="px-6 pb-6 pt-0">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setView('login'); setSubmitError(null); }}
                  className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Masuk
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
