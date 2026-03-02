import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import LoginModal from '../components/LoginModal';

type OnSuccessCallback = () => void;

interface AuthModalContextValue {
  /** Jika user sudah login, panggil onSuccess. Jika belum, tampilkan modal login; setelah login berhasil panggil onSuccess. */
  requireLogin: (onSuccess: OnSuccessCallback, message?: string) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const onSuccessRef = useRef<OnSuccessCallback | null>(null);

  const requireLogin = useCallback((onSuccess: OnSuccessCallback, modalMessage?: string) => {
    if (user) {
      onSuccess();
      return;
    }
    onSuccessRef.current = onSuccess;
    setMessage(modalMessage);
    setOpen(true);
  }, [user]);

  const handleClose = useCallback(() => {
    setOpen(false);
    onSuccessRef.current = null;
    setMessage(undefined);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    onSuccessRef.current?.();
    onSuccessRef.current = null;
    setOpen(false);
    setMessage(undefined);
  }, []);

  return (
    <AuthModalContext.Provider value={{ requireLogin }}>
      {children}
      <LoginModal
        open={open}
        onClose={handleClose}
        onLoginSuccess={handleLoginSuccess}
        message={message}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
