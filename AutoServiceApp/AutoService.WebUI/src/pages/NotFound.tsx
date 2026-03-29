import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';
import { useThemeStore } from '../store/theme.store';
import { ThemeLanguageControls } from '../components/layout/ThemeLanguageControls';

const REDIRECT_DURATION_MS = 3000;
const TIMER_TICK_MS = 50;

const NotFoundComponent = memo(function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const [remainingMs, setRemainingMs] = useState(REDIRECT_DURATION_MS);

  const redirectTarget = useMemo(
    () => (authService.isAuthenticated() ? '/dashboard' : '/login'),
    [],
  );

  useEffect(() => {
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
  }, [navigate, redirectTarget]);

  const isDark = theme === 'dark';
  const secondsLeft = Math.max(Math.ceil(remainingMs / 1000), 0);
  const progress = ((REDIRECT_DURATION_MS - remainingMs) / REDIRECT_DURATION_MS) * 100;
  const redirectTextKey =
    redirectTarget === '/dashboard'
      ? 'notFound.redirectDashboard'
      : 'notFound.redirectLogin';

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-[#09090F] text-[#EDE8FA]' : 'bg-[#ECECEF] text-[#2C2440]'}`}
    >
      <ThemeLanguageControls />

      <main className="mx-auto flex min-h-screen w-full max-w-[1920px] items-center justify-center px-6">
        <section className="text-center">
          <h1 className="text-[clamp(112px,11vw,176px)] font-semibold leading-none tracking-tight">
            404
          </h1>

          <p className="mt-4 text-[clamp(34px,2.2vw,44px)] font-medium leading-tight">
            {t('notFound.pageNotFound')}
          </p>

          <p
            className={`mt-4 text-[clamp(16px,1.05vw,20px)] ${
              isDark ? 'text-[#B9B0D3]' : 'text-[#6A627F]'
            }`}
          >
            {t(redirectTextKey, { seconds: secondsLeft })}
          </p>

          <div
            className="mx-auto mt-3 h-2 w-[300px] overflow-hidden rounded-full"
            style={{ backgroundColor: isDark ? '#2C2440' : '#D8D2E9' }}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: '#C9B3FF',
                transition: `width ${TIMER_TICK_MS}ms linear`,
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
});

NotFoundComponent.displayName = 'NotFound';

export const NotFound = NotFoundComponent;
