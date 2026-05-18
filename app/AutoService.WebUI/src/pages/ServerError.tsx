/**
 * Server Error page with timed reload.
 *
 * Displays a branded 500 experience and reloads the page after a short
 * countdown. Uses window.location for navigation to remain router-independent,
 * allowing it to be rendered as an ErrorBoundary fallback outside the Router
 * context.
 * Uses the shared {@link ErrorPage} component for layout.
 * @module pages/ServerError
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorPage } from '../components/common/ErrorPage';

const REDIRECT_DURATION_MS = 3000;
const TIMER_TICK_MS = 50;

/** Resolves and validates the return target passed via /500?returnTo=. */
function getReturnTarget(): string | null {
  const params = new URLSearchParams(globalThis.location.search);
  const rawReturnTo = params.get('returnTo');

  if (!rawReturnTo?.startsWith('/')) {
    return null;
  }

  if (rawReturnTo.startsWith('//') || rawReturnTo.startsWith('/500')) {
    return null;
  }

  return rawReturnTo;
}

const ServerErrorComponent = memo(function ServerError() {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(REDIRECT_DURATION_MS);
  const returnTarget = getReturnTarget();

  const handleRetry = useCallback(() => {
    if (returnTarget) {
      globalThis.location.assign(returnTarget);
      return;
    }

    globalThis.location.reload();
  }, [returnTarget]);

  useEffect(() => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(REDIRECT_DURATION_MS - elapsed, 0);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(timer);
        handleRetry();
      }
    }, TIMER_TICK_MS);

    return () => clearInterval(timer);
  }, [handleRetry]);

  const secondsLeft = Math.max(Math.ceil(remainingMs / 1000), 0);

  return (
    <ErrorPage
      imageSrc="/Error-500.webp"
      imageAlt={t('serverError.imageAlt')}
      backgroundCode="500"
      titleKey="serverError.title"
      subtitleKey="serverError.subtitle"
      ctaTextKey="serverError.reload"
      onCtaClick={handleRetry}
      countdownLabelKey="serverError.redirectIn"
      secondsLeft={secondsLeft}
    />
  );
});

ServerErrorComponent.displayName = 'ServerError';

/** 500 server error page component with countdown-based page reload. */
export const ServerError = ServerErrorComponent;
