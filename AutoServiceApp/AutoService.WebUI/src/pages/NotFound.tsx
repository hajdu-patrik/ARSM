import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { ThemeLanguageControls } from '../components/layout/ThemeLanguageControls';
import { Image } from '../components/common/Image';

const REDIRECT_DURATION_MS = 3000;
const TIMER_TICK_MS = 50;

const NotFoundComponent = memo(function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const theme = useThemeStore((state) => state.theme);
  const [remainingMs, setRemainingMs] = useState(REDIRECT_DURATION_MS);

  const redirectTarget = useMemo(
    () => (isAuthenticated ? '/' : '/login'),
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthLoading) {
      setRemainingMs(REDIRECT_DURATION_MS);
      return;
    }

    const startedAt = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(REDIRECT_DURATION_MS - elapsed, 0);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(timer);
        navigate(redirectTarget, { replace: true });
      }
    }, TIMER_TICK_MS);

    return () => clearInterval(timer);
  }, [isAuthLoading, navigate, redirectTarget]);

  const isDark = theme === 'dark';
  const secondsLeft = Math.max(Math.ceil(remainingMs / 1000), 0);
  const ctaTextKey = isAuthenticated
    ? 'notFound.goToDashboard'
    : 'notFound.goToLogin';

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-[#09090F] text-[#EDE8FA]' : 'bg-[#ECECEF] text-[#2C2440]'}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-1/2 z-0 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full ${
          isDark
            ? 'bg-[radial-gradient(circle,_rgba(122,102,199,0.7)_0%,_rgba(122,102,199,0.34)_34%,_rgba(122,102,199,0.14)_50%,_rgba(122,102,199,0)_72%)]'
            : 'bg-[radial-gradient(circle,_rgba(201,179,255,0.58)_0%,_rgba(201,179,255,0.26)_32%,_rgba(201,179,255,0.1)_48%,_rgba(201,179,255,0)_72%)]'
        }`}
      />

      <ThemeLanguageControls />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1920px] items-center justify-center px-3 pt-24 sm:px-6 sm:pt-0">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[50vw] font-black leading-none tracking-tight sm:text-[30vw] ${
            isDark ? 'text-[#EDE8FA]/[0.08]' : 'text-[#2C2440]/[0.05]'
          }`}
        >
          404
        </span>

        <section className="relative w-full max-w-[74rem] rounded-[28px] border border-[#D8D2E9] bg-[#F6F4FB]/95 p-4 shadow-[0_24px_72px_rgba(44,36,64,0.18)] backdrop-blur-sm dark:border-[#3A3154] dark:bg-[#13131B]/92 dark:shadow-[0_30px_80px_rgba(0,0,0,0.52)] max-[320px]:p-3 sm:p-6 lg:p-8">
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(240px,1fr)_minmax(280px,1fr)] lg:gap-8">
            <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-3xl border border-[#D8D2E9] bg-[#EFEBFA] p-4 dark:border-[#3A3154] dark:bg-[#241F33] max-[320px]:min-h-[210px] sm:min-h-[320px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(201,179,255,0.58)_0%,_rgba(201,179,255,0.16)_48%,_rgba(201,179,255,0)_72%)] dark:bg-[radial-gradient(circle,_rgba(122,102,199,0.52)_0%,_rgba(122,102,199,0.16)_48%,_rgba(122,102,199,0)_72%)]"
              />
              <Image
                src="/404Image.webp"
                alt="AutoService 404 illustration"
                className="relative z-10 h-auto w-[min(78%,404px)] select-none max-[404px]:w-[76%]"
                draggable={false}
              />
            </div>

            <div className="flex flex-col justify-center rounded-3xl border border-[#D8D2E9] bg-white/80 p-5 text-left dark:border-[#3A3154] dark:bg-[#1A1A25]/88 max-[320px]:p-4 sm:p-6">
              <h1 className="text-[clamp(1.5rem,3.6vw,2.8rem)] text-center font-semibold leading-[1.06] tracking-tight text-[#2C2440] dark:text-[#EDE8FA]">
                {t('notFound.pageNotFound')}
              </h1>

              <p className="mt-3 text-sm text-[#6A627F] dark:text-[#B9B0D3] sm:text-base text-center">
                {t('notFound.subtitle')}
              </p>

              <button
                type="button"
                onClick={() => navigate(redirectTarget, { replace: true })}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#C9B3FF] px-8 py-3 text-sm font-semibold text-[#2C2440] shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-[#BFA6F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] dark:focus-visible:ring-[#8A75D64D] sm:w-auto sm:text-base"
              >
                {t(ctaTextKey)}
              </button>

              <div className="mt-6 border-t border-[#D8D2E9] pt-4 dark:border-[#3A3154] text-center">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6A627F] dark:text-[#B9B0D3]">
                  {t('notFound.redirectIn')}
                </p>
                <p className="mt-1 text-3xl font-semibold leading-none text-[#2C2440] dark:text-[#EDE8FA]">
                  {String(secondsLeft).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
});

NotFoundComponent.displayName = 'NotFound';

export const NotFound = NotFoundComponent;
