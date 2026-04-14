/**
 * Login page.
 *
 * Supports email or phone identifier login modes and shows localized
 * feedback for authentication and rate-limit related failures.
 * @module pages/Login/page
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth/auth.service';
import { useToastStore } from '../../store/toast.store';
import { ThemeLanguageControls } from '../../components/layout/ThemeLanguageControls';
import { Image } from '../../components/common/Image';
import { parseIdentifierByMethod, resolveLoginError, type LoginMethod } from './login.helpers';

const LoginComponent = memo(function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedIdentifier = parseIdentifierByMethod(identifier, loginMethod);

    if (parsedIdentifier.kind === 'invalid') {
      if (parsedIdentifier.reason === 'wrong_method_email') {
        showErrorToast('login.wrongMethodEmailInPhone');
      } else if (parsedIdentifier.reason === 'wrong_method_phone') {
        showErrorToast('login.wrongMethodPhoneInEmail');
      } else {
        showErrorToast('login.invalidFormat');
      }

      return;
    }

    setIsLoading(true);

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

      if (resolvedError.key === 'login.identifierNotFound') {
        showErrorToast(loginMethod === 'email' ? 'login.identifierNotFoundEmail' : 'login.identifierNotFoundPhone');
      } else if (resolvedError.key === 'login.attemptsExceededWithDuration') {
        showErrorToast(resolvedError.key, { minutes: resolvedError.minutes });
      } else {
        showErrorToast(resolvedError.key);
      }
    } finally {
      setPassword('');
      setIsLoading(false);
    }
  }, [identifier, loginMethod, navigate, password, showErrorToast]);

  const handleLoginMethodChange = useCallback((method: LoginMethod) => {
    setLoginMethod(method);
    setIdentifier('');
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#ECECEF] px-3 pb-6 pt-24 text-[#2C2440] dark:bg-[#09090F] dark:text-[#EDE8FA] sm:px-4 sm:pb-8 sm:pt-8">
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
        <div className="rounded-3xl border border-[#D8D2E9] bg-white/95 p-5 shadow-[0_14px_44px_rgba(44,36,64,0.2)] backdrop-blur-sm dark:border-[#2C2440] dark:bg-[#13131Bee] dark:shadow-[0_20px_52px_rgba(0,0,0,0.55)] max-[320px]:p-4 sm:p-8">
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
            <h1 className="mt-2 text-balance text-xl font-semibold tracking-tight text-[#2C2440] dark:text-[#EDE8FA] sm:text-2xl">
              {t('login.title')}
            </h1>
            <p className="mt-2 text-sm text-[#6A627F] dark:text-[#B9B0D3]">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5" noValidate>
            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-[#5E5672] dark:text-[#CFC5EA]">
                {identifierLabel}
              </label>
              <input
                id="identifier"
                type={identifierInputType}
                autoComplete={identifierAutoComplete}
                inputMode={identifierInputMode}
                pattern={identifierPattern}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={identifierPlaceholder}
                className="w-full rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 text-[15px] text-[#2C2440] placeholder-[#8A829F] outline-none transition focus-visible:border-[#C9B3FF] focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA] dark:placeholder-[#8C83A8] dark:focus-visible:border-[#C9B3FF] dark:focus-visible:ring-[#C9B3FF3D]"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#5E5672] dark:text-[#CFC5EA]">
                {t('login.passwordPlaceholder')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.loginPassword')}
                  className="w-full rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 pr-12 text-[15px] text-[#2C2440] placeholder-[#8A829F] outline-none transition focus-visible:border-[#C9B3FF] focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA] dark:placeholder-[#8C83A8] dark:focus-visible:border-[#C9B3FF] dark:focus-visible:ring-[#C9B3FF3D]"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6F54AD] transition hover:bg-[#EDE5FF] hover:text-[#5E4698] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] dark:text-[#C9B3FF] dark:hover:bg-[#2A253B] dark:hover:text-[#E2D9FF]"
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
              className="mt-1.5 inline-flex w-full items-center justify-center rounded-xl bg-[#C9B3FF] py-3 text-sm font-semibold text-[#2C2440] shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-[#BFA6F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:bg-[#DCCDFA] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] dark:focus-visible:ring-[#8A75D64D] dark:disabled:bg-[#4B406E] sm:text-base"
              aria-busy={isLoading}
            >
              {isLoading ? t('login.loading') : t('login.submit')}
            </button>

            <fieldset className="pt-1.5" aria-label={t('login.loginMethodLabel')}>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6A627F] dark:text-[#B9B0D3]">
                {t('login.loginMethodLabel')}
              </legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#EFEBFA] p-1 dark:bg-[#241F33]">
                <button
                  type="button"
                  onClick={() => handleLoginMethodChange('email')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] ${
                    loginMethod === 'email'
                      ? 'bg-[#C9B3FF] text-[#2C2440] shadow-[0_8px_20px_rgba(111,84,173,0.28)] dark:bg-[#7A66C7] dark:text-[#F5F2FF]'
                      : 'bg-transparent text-[#5E5672] hover:bg-[#E6DCF8] dark:text-[#CFC5EA] dark:hover:bg-[#322B47]'
                  }`}
                  aria-pressed={loginMethod === 'email'}
                  disabled={isLoading}
                >
                  {t('login.loginWithEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoginMethodChange('phone')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] ${
                    loginMethod === 'phone'
                      ? 'bg-[#C9B3FF] text-[#2C2440] shadow-[0_8px_20px_rgba(111,84,173,0.28)] dark:bg-[#7A66C7] dark:text-[#F5F2FF]'
                      : 'bg-transparent text-[#5E5672] hover:bg-[#E6DCF8] dark:text-[#CFC5EA] dark:hover:bg-[#322B47]'
                  }`}
                  aria-pressed={loginMethod === 'phone'}
                  disabled={isLoading}
                >
                  {t('login.loginWithPhone')}
                </button>
              </div>
            </fieldset>
          </form>

          <p className="mt-4 text-xs text-[#6A627F] dark:text-[#B9B0D3] sm:mt-5 sm:text-sm">
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
