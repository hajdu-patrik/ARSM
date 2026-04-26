/**
 * Login page.
 *
 * Supports email or phone identifier login modes and shows localized
 * feedback for authentication and rate-limit related failures.
 * @module pages/Login/page
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, TriangleAlert } from 'lucide-react';
import { authService } from '../../services/auth/auth.service';
import { useToastStore } from '../../store/toast.store';
import { ThemeLanguageControls } from '../../components/layout/ThemeLanguageControls';
import { Image } from '../../components/common/Image';
import { parseIdentifierByMethod, resolveLoginError, type LoginMethod } from './login.helpers';

type SystemLoginErrorKey = 'login.serverError500' | 'login.databaseUnavailable';

type InvalidIdentifierReason = 'wrong_method_email' | 'wrong_method_phone' | 'format';

const LoginComponent = memo(function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemErrorKey, setSystemErrorKey] = useState<SystemLoginErrorKey | null>(null);

  useEffect(() => {
    if (!systemErrorKey) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setSystemErrorKey(null);
    }, 5000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [systemErrorKey]);

  const showInvalidIdentifierError = useCallback((reason: InvalidIdentifierReason) => {
    if (reason === 'wrong_method_email') {
      showErrorToast('login.wrongMethodEmailInPhone');
      return;
    }

    if (reason === 'wrong_method_phone') {
      showErrorToast('login.wrongMethodPhoneInEmail');
      return;
    }

    showErrorToast('login.invalidFormat');
  }, [showErrorToast]);

  const showResolvedLoginError = useCallback((
    resolvedError: ReturnType<typeof resolveLoginError>,
    method: LoginMethod,
  ) => {
    if (resolvedError.key === 'login.identifierNotFound') {
      showErrorToast(method === 'email' ? 'login.identifierNotFoundEmail' : 'login.identifierNotFoundPhone');
      return;
    }

    if (resolvedError.key === 'login.attemptsExceededWithDuration') {
      showErrorToast(resolvedError.key, { minutes: resolvedError.minutes });
      return;
    }

    showErrorToast(resolvedError.key);
  }, [showErrorToast]);

  const handleSubmit = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedIdentifier = parseIdentifierByMethod(identifier, loginMethod);

    if (parsedIdentifier.kind === 'invalid') {
      showInvalidIdentifierError(parsedIdentifier.reason);
      return;
    }

    setIsLoading(true);
    setSystemErrorKey(null);

    try {
      const loginRequest = {
        email: parsedIdentifier.kind === 'email' ? parsedIdentifier.email : undefined,
        phoneNumber: parsedIdentifier.kind === 'phone' ? parsedIdentifier.phoneNumber : undefined,
        password,
      };

      await authService.login(loginRequest);
      navigate('/');
    } catch (err) {
      const resolvedError = resolveLoginError(err);

      if (resolvedError.key === 'login.serverError500' || resolvedError.key === 'login.databaseUnavailable') {
        setSystemErrorKey(resolvedError.key);
      }

      showResolvedLoginError(resolvedError, loginMethod);
    } finally {
      setPassword('');
      setIsLoading(false);
    }
  }, [identifier, loginMethod, navigate, password, showInvalidIdentifierError, showResolvedLoginError]);

  const handleLoginMethodChange = useCallback((method: LoginMethod) => {
    setLoginMethod(method);
    setIdentifier('');
    setSystemErrorKey(null);
  }, []);

  const identifierLabel = useMemo(
    () => (loginMethod === 'email' ? t('login.email') : t('login.phone')),
    [loginMethod, t],
  );

  const identifierPlaceholder = useMemo(
    () => (loginMethod === 'email' ? t('login.emailPlaceholder') : t('login.phonePlaceholder')),
    [loginMethod, t],
  );

  const identifierInputType = loginMethod === 'email' ? 'email' : 'tel';
  const identifierAutoComplete = loginMethod === 'email' ? 'username' : 'tel';
  const identifierInputMode = loginMethod === 'email' ? 'email' : 'tel';
  const identifierPattern = loginMethod === 'email' ? undefined : String.raw`[0-9+()\s-]+`;
  const canSubmit = identifier.trim().length > 0 && password.trim().length > 0 && !isLoading;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-arsm-surface px-3 pb-6 pt-24 text-arsm-primary dark:bg-arsm-surface-dark dark:text-arsm-primary-dark sm:px-4 sm:pb-8 sm:pt-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(201,179,255,0.58)_0%,_rgba(201,179,255,0.26)_32%,_rgba(201,179,255,0.1)_48%,_rgba(201,179,255,0)_72%)] dark:bg-[radial-gradient(circle,_rgba(122,102,199,0.7)_0%,_rgba(122,102,199,0.34)_34%,_rgba(122,102,199,0.14)_50%,_rgba(122,102,199,0)_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_45%)]"
      />

      <ThemeLanguageControls />

      <div className="relative z-10 w-full max-w-[28rem] max-[320px]:max-w-[19.5rem]">
        <div className="rounded-3xl border border-arsm-border bg-arsm-card/95 p-5 shadow-[0_14px_44px_rgba(44,36,64,0.2)] backdrop-blur-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark/95 dark:shadow-[0_20px_52px_rgba(0,0,0,0.55)] max-[320px]:p-4 sm:p-8">
          <div className="relative mb-6 flex flex-col items-center text-center max-[320px]:mb-5 sm:mb-8">
            <div className="mt-1 flex items-center justify-center">
              <Image
                src="/AppLogoFrameBlack.webp"
                alt="AutoService logo"
                className="block h-20 w-auto select-none opacity-75 dark:hidden sm:h-24"
              />
              <Image
                src="/AppLogoFrameWhite.webp"
                alt="AutoService logo"
                className="hidden h-20 w-auto select-none opacity-75 dark:block sm:h-24"
              />
            </div>
            <h1 className="mt-2 text-balance text-xl font-semibold tracking-tight text-arsm-primary dark:text-arsm-primary-dark sm:text-2xl">
              {t('login.title')}
            </h1>
            <p className="mt-2 text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5" noValidate>
            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark">
                {identifierLabel}
              </label>
              <input
                id="identifier"
                type={identifierInputType}
                autoComplete={identifierAutoComplete}
                inputMode={identifierInputMode}
                pattern={identifierPattern}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setSystemErrorKey(null);
                }}
                placeholder={identifierPlaceholder}
                className="w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/25"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark">
                {t('login.passwordPlaceholder')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSystemErrorKey(null);
                  }}
                  placeholder={t('login.loginPassword')}
                  className="w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 pr-12 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/25"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-purple-700 transition hover:bg-purple-100 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:text-arsm-accent dark:hover:bg-purple-950/40 dark:hover:text-purple-100"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1.5 inline-flex w-full items-center justify-center rounded-xl bg-arsm-accent py-3 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:bg-purple-200 dark:bg-arsm-accent-dark dark:text-purple-50 dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-focus-ring/30 dark:disabled:bg-purple-900/60 sm:text-base"
              aria-busy={isLoading}
            >
              {isLoading ? t('login.loading') : t('login.submit')}
            </button>

            {systemErrorKey ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-arsm-error-border bg-[linear-gradient(145deg,#FFF2F2_0%,#FFE7E8_100%)] p-3 text-arsm-error-text shadow-[0_8px_20px_rgba(165,42,51,0.12)] dark:border-red-700 dark:bg-[linear-gradient(145deg,rgba(73,26,31,0.92)_0%,rgba(52,16,20,0.92)_100%)] dark:text-red-200"
              >
                <div className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 h-4.5 w-4.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium leading-5">{t(systemErrorKey)}</p>
                </div>
              </div>
            ) : null}

            <fieldset className="pt-1.5" aria-label={t('login.loginMethodLabel')}>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
                {t('login.loginMethodLabel')}
              </legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-arsm-toggle-bg p-1 dark:bg-arsm-toggle-bg-dark">
                <button
                  type="button"
                  onClick={() => handleLoginMethodChange('email')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 ${
                    loginMethod === 'email'
                      ? 'bg-arsm-accent text-arsm-primary shadow-[0_8px_20px_rgba(111,84,173,0.28)] dark:bg-arsm-accent-dark dark:text-purple-50'
                      : 'bg-transparent text-arsm-label hover:bg-purple-100 dark:text-arsm-label-dark dark:hover:bg-purple-950/30'
                  }`}
                  aria-pressed={loginMethod === 'email'}
                  disabled={isLoading}
                >
                  {t('login.loginWithEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoginMethodChange('phone')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 ${
                    loginMethod === 'phone'
                      ? 'bg-arsm-accent text-arsm-primary shadow-[0_8px_20px_rgba(111,84,173,0.28)] dark:bg-arsm-accent-dark dark:text-purple-50'
                      : 'bg-transparent text-arsm-label hover:bg-purple-100 dark:text-arsm-label-dark dark:hover:bg-purple-950/30'
                  }`}
                  aria-pressed={loginMethod === 'phone'}
                  disabled={isLoading}
                >
                  {t('login.loginWithPhone')}
                </button>
              </div>
            </fieldset>
          </form>

          <p className="mt-4 text-xs text-arsm-muted dark:text-arsm-muted-dark sm:mt-5 sm:text-sm">
            {t('login.helpText')}
          </p>
        </div>
      </div>
    </div>
  );
});

LoginComponent.displayName = 'Login';

/** Login route component for unauthenticated users. */
export const Login = LoginComponent;
