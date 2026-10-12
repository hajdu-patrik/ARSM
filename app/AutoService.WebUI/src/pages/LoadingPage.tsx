/** Full-page-load splash: an animated branded intro that stays until the app is ready (session restored,
 * translations loaded) and for a short anti-flash minimum, then goes away for good. */

import { memo, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { Image } from '../components/common/Image';
import { isSplashRoute } from '../router/appRoutes';
import { consumeSkipLoadingSplashOnNextBoot } from '../utils/serverErrorRecoverySession';
import { removeLoginShell } from '../utils/loginShell';
import { readStorage, writeStorage } from '../utils/safeStorage';

/** Anti-flash minimum: a splash that is up for less than this would only flicker on a fast load. */
const SPLASH_MIN_VISIBLE_MS = 250;

/** Minimum for the first splash of a browser tab, so the branded intro is seen once per tab. */
const FIRST_LOAD_SPLASH_MIN_VISIBLE_MS = 2500;

/** sessionStorage flag that is set once a tab has shown its first splash. */
const SPLASH_SHOWN_STORAGE_KEY = 'arsm-splash-shown';

/** Whether this boot shows the splash: not right after a server-error retry, and only on an app route. */
function shouldShowSplash(): boolean {
  if (consumeSkipLoadingSplashOnNextBoot()) {
    return false;
  }

  return isSplashRoute(globalThis.location.pathname);
}

/** Minimum visible time of this boot's splash, or null when the splash is not shown. */
function resolveSplashMinVisibleMs(): number | null {
  if (!shouldShowSplash()) {
    return null;
  }

  return readStorage('session', SPLASH_SHOWN_STORAGE_KEY) === null
    ? FIRST_LOAD_SPLASH_MIN_VISIBLE_MS
    : SPLASH_MIN_VISIBLE_MS;
}

/** Splash lifetime: visible from the first render until the app is ready and the minimum has passed.
 * Once dismissed it never returns, whatever the readiness does later. */
function useSplashVisible(isAppReady: boolean): boolean {
  const [minVisibleMs] = useState(resolveSplashMinVisibleMs);
  const [isDismissed, setIsDismissed] = useState(minVisibleMs === null);
  const [hasMinimumPassed, setHasMinimumPassed] = useState(false);

  useEffect(() => {
    if (isDismissed || minVisibleMs === null) {
      return;
    }

    writeStorage('session', SPLASH_SHOWN_STORAGE_KEY, '1');

    const timer = setTimeout(() => {
      setHasMinimumPassed(true);
    }, minVisibleMs);

    return () => {
      clearTimeout(timer);
    };
  }, [isDismissed, minVisibleMs]);

  const shouldDismiss = hasMinimumPassed && isAppReady;

  if (shouldDismiss && !isDismissed) {
    setIsDismissed(true);
  }

  return !isDismissed && !shouldDismiss;
}

/** Class pairs of the three desktop background shapes, defined in `loadingPageAnimations.css`. */
const DESKTOP_SHAPE_CLASS_NAMES = [
  'shape-base shape-bottom-right',
  'shape-base shape-left',
  'shape-base shape-top-right',
] as const;

/** Decorative desktop shapes; size/aspect/accent live on the CSS shape classes, since CSP forbids inline style (CLAUDE.md). */
function LoadingDesktopShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none max-[320px]:hidden" aria-hidden="true">
      {DESKTOP_SHAPE_CLASS_NAMES.map((className) => (
        <div key={className} className={className} />
      ))}
    </div>
  );
}

/** Decorative single orb shown instead of the desktop shapes at viewports <= 320px. */
function LoadingMobileOrb() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden max-[320px]:block" aria-hidden="true">
      <div className="arsm-loading-mobile-orb mobile-orb" />
    </div>
  );
}

/** Props of {@link LoadingCenterLogo}: the theme-resolved logo asset and its translated alt text. */
interface LoadingCenterLogoProps {
  readonly logoAlt: string;
  readonly logoSrc: string;
}

/** Centered spinning app logo inside its halo; the logo asset is chosen by theme in the parent. */
function LoadingCenterLogo({ logoAlt, logoSrc }: LoadingCenterLogoProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="arsm-loading-logo-halo relative z-10 flex items-center justify-center rounded-full">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={789}
          height={662}
          draggable={false}
          loading="eager"
          decoding="async"
          className="logo-spin opacity-70 select-none"
        />
      </div>
    </div>
  );
}

const LoadingPageComponent = memo(function LoadingPage() {
  const { t: translate, ready: isI18nReady } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isVisible = useSplashVisible(isI18nReady && !isAuthLoading);

  // index.html paints a static copy of this splash's first frame on /login; this first commit
  // has the live splash in the DOM, so dropping the copy before the browser paints is seamless.
  useLayoutEffect(removeLoginShell, []);

  if (!isVisible) {
    return null;
  }

  const logoSrc = theme === 'dark' ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';
  const logoAlt = translate('login.logoAlt');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ui-surface">
      <LoadingDesktopShapes />
      <LoadingMobileOrb />
      <LoadingCenterLogo logoSrc={logoSrc} logoAlt={logoAlt} />
    </div>
  );
});

LoadingPageComponent.displayName = 'LoadingPage';

/** Animated loading splash shown on a full browser load of an app route, until the app is ready. */
export const LoadingPage = LoadingPageComponent;
