/** Not Found (404) page: branded experience with a countdown redirect to scheduler or login, via the shared ErrorPage. */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { ErrorPage } from '../components/common/ErrorPage';
import { APP_ROUTE_PATHS } from '../router/appRoutes';

const REDIRECT_DURATION_MS = 3000;
const TIMER_TICK_MS = 50;

const NotFoundComponent = memo(function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const [remainingMs, setRemainingMs] = useState(REDIRECT_DURATION_MS);

  const redirectTarget = useMemo(
    () => (isAuthenticated ? APP_ROUTE_PATHS.scheduler : APP_ROUTE_PATHS.login),
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const startedAt = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(REDIRECT_DURATION_MS - elapsed, 0);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(timer);
        void navigate(redirectTarget, { replace: true });
      }
    }, TIMER_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isAuthLoading, navigate, redirectTarget]);

  const secondsLeft = Math.max(Math.ceil(remainingMs / 1000), 0);
  const ctaTextKey = isAuthenticated
    ? 'notFound.goToScheduler'
    : 'notFound.goToLogin';

  const handleCta = useCallback(() => {
    void navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget]);

  return (
    <ErrorPage
      imageSrc="/Error-404.webp"
      imageAlt={t('notFound.imageAlt')}
      backgroundCode="404"
      titleKey="notFound.pageNotFound"
      subtitleKey="notFound.subtitle"
      ctaTextKey={ctaTextKey}
      onCtaClick={handleCta}
      countdownLabelKey="notFound.redirectIn"
      secondsLeft={secondsLeft}
    />
  );
});

NotFoundComponent.displayName = 'NotFound';

/** 404 page component with countdown-based redirect. */
export const NotFound = NotFoundComponent;
