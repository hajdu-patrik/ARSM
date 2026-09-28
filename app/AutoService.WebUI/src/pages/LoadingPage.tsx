/**
 * Full-page-load loading splash screen.
 *
 * Displays an animated branded intro for roughly 3 seconds on browser reload
 * (for example F5 / Ctrl+F5), then renders nothing.
 * @module pages/LoadingPage
 */

import { memo, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme.store';
import { Image } from '../components/common/Image';
import { consumeSkipLoadingSplashOnNextBoot } from '../utils/serverErrorRecoverySession';
import { removeLoginShell } from '../utils/loginShell';

/** How long the splash stays visible after a full browser reload. */
const LOADING_PAGE_DURATION_MS = 3000;
/** Canonical (lower-case, no trailing slash) app routes on which the splash renders. */
const SPLASH_ENABLED_PATHS = new Set([
  '/',
  '/login',
  '/customers',
  '/admin/register',
  '/settings',
  '/scheduler',
  '/dashboard',
]);

/** Strips trailing slashes so pathname variants match one canonical form. */
function normalizePathname(pathname: string): string {
  if (pathname.length <= 1) {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

/** Decides whether the loading splash should render for the given route. */
function shouldShowSplashForPathname(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname.toLowerCase());
  return SPLASH_ENABLED_PATHS.has(normalizedPathname);
}

/** Class pairs of the three desktop background shapes, defined in `loadingPageAnimations.css`. */
const DESKTOP_SHAPE_CLASS_NAMES = [
  'shape-base shape-bottom-right',
  'shape-base shape-left',
  'shape-base shape-top-right',
] as const;

/**
 * Decorative desktop background shapes. Size, aspect ratio and the
 * light/dark accent background all live on the shape classes themselves
 * in `loadingPageAnimations.css`, so no per-instance style is needed here.
 */
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
  const [isVisible, setIsVisible] = useState(() => {
    if (consumeSkipLoadingSplashOnNextBoot()) {
      return false;
    }

    return shouldShowSplashForPathname(globalThis.location.pathname);
  });
  const { t: translate } = useTranslation();
  const theme = useThemeStore((state) => state.theme);

  // index.html paints a static copy of this splash's first frame on /login; this first commit
  // has the live splash in the DOM, so dropping the copy before the browser paints is seamless.
  useLayoutEffect(removeLoginShell, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, LOADING_PAGE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';
  const logoAlt = translate('login.logoAlt');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-arsm-surface dark:bg-arsm-surface-dark">
      <LoadingDesktopShapes />
      <LoadingMobileOrb />
      <LoadingCenterLogo logoSrc={logoSrc} logoAlt={logoAlt} />
    </div>
  );
});

LoadingPageComponent.displayName = 'LoadingPage';

/** Animated loading splash shown once per full browser reload on app routes. */
export const LoadingPage = LoadingPageComponent;
