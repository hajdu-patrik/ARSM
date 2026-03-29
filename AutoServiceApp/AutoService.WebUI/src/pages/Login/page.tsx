import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { ThemeLanguageControls } from '../../components/layout/ThemeLanguageControls';

interface ApiErrorPayload {
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly message?: string;
  readonly error?: string;
}

type LoginErrorKey =
  | 'login.passwordIncorrect'
  | 'login.identifierNotFound'
  | 'login.serverError500'
  | 'login.databaseUnavailable'
  | 'login.error';

function resolveLoginErrorKey(err: unknown): LoginErrorKey {
  const axiosError = err as AxiosError<ApiErrorPayload>;
  const status = axiosError?.response?.status;
  const responseData = axiosError?.response?.data;

  const normalizedErrorText = [
    responseData?.code,
    responseData?.title,
    responseData?.detail,
    responseData?.message,
    responseData?.error,
    axiosError?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (status === 500 || normalizedErrorText.includes('500')) {
    return 'login.serverError500';
  }

  if (
    normalizedErrorText.includes('database') ||
    normalizedErrorText.includes('db') ||
    normalizedErrorText.includes('npgsql') ||
    normalizedErrorText.includes('connection') ||
    normalizedErrorText.includes('socket') ||
    normalizedErrorText.includes('econnrefused') ||
    normalizedErrorText.includes('network error') ||
    normalizedErrorText.includes('failed to fetch')
  ) {
    return 'login.databaseUnavailable';
  }

  if (
    status === 404 ||
    normalizedErrorText.includes('identifier_not_found') ||
    normalizedErrorText.includes('does not exist') ||
    normalizedErrorText.includes('not found')
  ) {
    return 'login.identifierNotFound';
  }

  if (status === 401) {
    return 'login.passwordIncorrect';
  }

  return 'login.error';
}

const LoginComponent = memo(function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [identifier, setIdentifier] = useState<'email' | 'phone'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setAuthError = useAuthStore((state) => state.setError);

  const handleSubmit = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginRequest = {
        email: identifier === 'email' ? email : undefined,
        phoneNumber: identifier === 'phone' ? phoneNumber : undefined,
        password,
      };

      await authService.login(loginRequest);

      // Successful login - redirect to dashboard
      navigate('/');
    } catch (err) {
      const errorMessage = t(resolveLoginErrorKey(err));
      setError(errorMessage);
      setAuthError(errorMessage);
    } finally {
      // Clear sensitive field from UI state after every submit attempt.
      setPassword('');
      setIsLoading(false);
    }
  }, [identifier, email, phoneNumber, password, navigate, t, setAuthError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <ThemeLanguageControls />
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-purple-100 dark:border-slate-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              AutoService
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t('login.subtitle')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier Toggle */}
            <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setIdentifier('email')}
                className={`flex-1 py-2 rounded-md transition-all font-medium text-sm ${
                  identifier === 'email'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {t('login.email')}
              </button>
              <button
                type="button"
                onClick={() => setIdentifier('phone')}
                className={`flex-1 py-2 rounded-md transition-all font-medium text-sm ${
                  identifier === 'phone'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {t('login.phone')}
              </button>
            </div>

            {/* Email Input */}
            {identifier === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mechanic@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Phone Input */}
            {identifier === 'phone' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  {t('login.phone')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+36 30 123 4567"
                  className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 dark:disabled:bg-purple-900 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? t('login.loading') : t('login.submit')}
            </button>
          </form>

          {/* Info Text */}
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            {t('login.mechanicOnly')}
          </p>
        </div>
      </div>
    </div>
  );
});

LoginComponent.displayName = 'Login';

export const Login = LoginComponent;
