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
import { ErrorPage } from '../components/common/ErrorPage';

const REDIRECT_DURATION_MS = 3000;
const TIMER_TICK_MS = 50;

const ServerErrorComponent = memo(function ServerError() {
  const [remainingMs, setRemainingMs] = useState(REDIRECT_DURATION_MS);

  useEffect(() => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(REDIRECT_DURATION_MS - elapsed, 0);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(timer);
        globalThis.location.reload();
      }
    }, TIMER_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const secondsLeft = Math.max(Math.ceil(remainingMs / 1000), 0);

  const handleCta = useCallback(() => {
    globalThis.location.reload();
  }, []);

  return (
    <ErrorPage
      imageSrc="/Error-500.webp"
      imageAlt="AutoService 500 illustration"
      backgroundCode="500"
      titleKey="serverError.title"
      subtitleKey="serverError.subtitle"
      ctaTextKey="serverError.reload"
      onCtaClick={handleCta}
      countdownLabelKey="serverError.redirectIn"
      secondsLeft={secondsLeft}
    />
  );
});

ServerErrorComponent.displayName = 'ServerError';

/** 500 server error page component with countdown-based page reload. */
export const ServerError = ServerErrorComponent;
