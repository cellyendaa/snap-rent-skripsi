import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { setUser } from "../store/slices/authSlice";
import { login } from "../services/authService";
import { LogIn, Loader2, UserPlus, Eye, EyeOff } from "lucide-react";

interface LoginFormValues {
  phoneNumber: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { phoneNumber: "", password: "" },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setIsLoading(true);
    try {
      const result = await login(values.phoneNumber.trim(), values.password);
      if (result.success) {
        dispatch(setUser(result.user));
        navigate("/", { replace: true });
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Log in</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">Gunakan nomor telepon dan password untuk melanjutkan.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nomor telepon
            </label>
            <input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="contoh: 08123456789"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
              {...register("phoneNumber", {
                required: "Nomor telepon wajib diisi",
                minLength: { value: 8, message: "Nomor telepon terlalu pendek" },
                validate: (value) => value.startsWith("08") || "Nomor telepon harus dimulai dengan 08",
              })}
            />
            {errors.phoneNumber && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukan password Anda"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition pr-12"
                {...register("password", {
                  required: "Password wajib diisi",
                  minLength: { value: 1, message: "Password wajib diisi" },
                })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
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

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Belum memiliki akun?{" "}
            <Link to="/register" className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
              <UserPlus size={16} />
              Buat sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
